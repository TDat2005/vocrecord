const { ApiError, ThinkingLevel } = require('@google/genai');
const { getClient, isConfigured } = require('../ai/gemini');
const { searchByImage, loadProducts } = require('../ai/catalog-search');
const { foldAccents } = require('../ai/vi-text');
const { GRADE_CODES, POLICY, quote } = require('./pricing');

// Thẩm định sơ bộ một đĩa cũ từ ảnh khách chụp:
//  1. Gemini xem ảnh: nhận diện album (tên, nghệ sĩ, định dạng) và chấm tình trạng đĩa/bìa theo thang Goldmine.
//  2. Tìm album trong catalog của cửa hàng (khớp tên, hoặc CLIP so ảnh bìa) để lấy giá bản mới làm giá tham chiếu.
//  3. Tính giá đề xuất (thu mua đứt, niêm yết) theo chính sách trong pricing.js.
// AI chỉ là gợi ý: nhân viên luôn thẩm định lại khi nhận đĩa. Không có key hoặc AI lỗi thì vẫn trả về giá
// ước tính theo tình trạng khách tự đánh giá.

const MODEL = process.env.AI_VISION_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODEL = process.env.AI_VISION_FALLBACK_MODEL ?? 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 30000;
// Coi là cùng album khi ảnh rất giống, hoặc khá giống và bỏ xa bìa đứng thứ hai
// (ảnh chụp nghiêng, lóa, bìa ố chỉ còn ~0,75 nhưng các bìa khác thường dưới 0,6).
const CLIP_MATCH = 0.85;
const CLIP_MATCH_WITH_MARGIN = { similarity: 0.7, margin: 0.1 };

const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        is_record: { type: 'boolean', description: 'Ảnh có chụp đĩa than hoặc băng cassette (đĩa, bìa, nhãn) không' },
        format: { type: 'string', enum: ['vinyl', 'cassette', 'khac'] },
        title: { type: 'string', description: 'Tên album đọc được trên bìa hoặc nhãn đĩa; để trống nếu không đọc được' },
        artist: { type: 'string', description: 'Nghệ sĩ đọc được trên bìa hoặc nhãn; để trống nếu không đọc được' },
        year: { type: 'integer', description: 'Năm phát hành nếu biết chắc, 0 nếu không rõ' },
        media_visible: { type: 'boolean', description: 'Ảnh có thấy rõ mặt đĩa (hoặc băng) để chấm tình trạng không' },
        media_grade: { type: 'string', enum: GRADE_CODES, description: 'Tình trạng đĩa/băng theo thang Goldmine' },
        sleeve_grade: { type: 'string', enum: GRADE_CODES, description: 'Tình trạng bìa/vỏ theo thang Goldmine' },
        defects: { type: 'array', items: { type: 'string' }, description: 'Các lỗi nhìn thấy, mỗi lỗi một câu ngắn tiếng Việt' },
        confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Mức tin cậy của việc chấm tình trạng' },
        summary: { type: 'string', description: 'Nhận xét 1-2 câu tiếng Việt cho khách' },
    },
    required: ['is_record', 'format', 'title', 'artist', 'year', 'media_visible', 'media_grade', 'sleeve_grade', 'defects', 'confidence', 'summary'],
};

const PROMPT = (hint) => `Bạn là chuyên viên thẩm định đĩa than và băng cassette cũ của cửa hàng Vọc Records.
Xem các ảnh khách chụp và trả lời theo schema JSON.

Thang Goldmine (chấm riêng đĩa và bìa):
- M (Mint): như mới, còn seal hoặc chưa từng phát.
- NM (Near Mint): gần như mới, không xước; bìa không nếp gấp.
- VG+ (Very Good Plus): vài vết xước rất nhẹ không ảnh hưởng tiếng; bìa mòn nhẹ ở góc.
- VG (Very Good): xước thấy rõ, có thể lách tách nhẹ; bìa có nếp gấp, ố hoặc mòn vòng tròn.
- G+ / G (Good): nhiều xước, tiếng ồn nền rõ; bìa rách mép, có chữ viết, băng dính.
- P (Poor): cong vênh, nứt, nhảy kim; bìa hư hỏng nặng.

Quy tắc:
- Chỉ dựa trên những gì thấy trong ảnh. Không thấy rõ mặt đĩa thì đặt media_visible = false, chấm đĩa thận trọng (không cao hơn VG+) và giảm confidence.
- Đọc tên album, nghệ sĩ từ chữ trên bìa/nhãn nếu có; nhận ra bìa album nổi tiếng thì ghi tên. Không chắc thì để trống, không đoán.
- Ảnh không phải đĩa than hay cassette thì is_record = false.
- Thông tin khách tự khai (có thể sai): ${hint}`;

const normalizeText = (text) => foldAccents(String(text || '')).replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

function withTimeout(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function gradeWithGemini({ photos, title, artist, format }) {
    const hint = JSON.stringify({ title: title || '', artist: artist || '', format: format || '' });
    const parts = [
        ...photos.map((photo) => ({ inlineData: { mimeType: photo.mime, data: photo.buffer.toString('base64') } })),
        { text: PROMPT(hint) },
    ];
    const models = [MODEL, FALLBACK_MODEL].filter((model, i, list) => model && list.indexOf(model) === i);
    let lastError = null;
    for (const model of models) {
        const timeout = withTimeout(TIMEOUT_MS);
        try {
            const response = await getClient().models.generateContent({
                model,
                contents: [{ role: 'user', parts }],
                config: {
                    responseMimeType: 'application/json',
                    responseJsonSchema: RESPONSE_SCHEMA,
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                    maxOutputTokens: 2048,
                    abortSignal: timeout.signal,
                },
            });
            const result = JSON.parse(response.text || '{}');
            if (!GRADE_CODES.includes(result.media_grade) || !GRADE_CODES.includes(result.sleeve_grade)) throw new Error('AI trả về tình trạng không hợp lệ');
            return { ...result, model };
        } catch (error) {
            lastError = timeout.signal.aborted ? new Error(`${model} không phản hồi sau ${TIMEOUT_MS / 1000} giây`) : error;
            const retryable = timeout.signal.aborted || (error instanceof ApiError && [429, 500, 503, 504].includes(error.status));
            console.warn(`[tradein] Thẩm định AI bằng ${model} lỗi: ${lastError.message}`);
            if (!retryable) break;
        } finally {
            timeout.done();
        }
    }
    throw lastError;
}

// Tìm bản mới cùng album, cùng định dạng trong catalog: ưu tiên khớp tên + nghệ sĩ, không có thì so ảnh bìa bằng CLIP.
// Chỉ so cùng định dạng: đĩa than và cassette cùng album giá chênh nhiều (trước đây đĩa than Nevermind lấy giá bản cassette).
async function findCatalogMatch({ title, artist, format, frontPhoto }) {
    const products = (await loadProducts()).filter((p) => p.item_type !== 'cu' && p.kind === (format || 'vinyl'));
    const wantTitle = normalizeText(title);
    const wantArtist = normalizeText(artist);
    if (wantTitle) {
        const byText = products
            .filter((p) => normalizeText(p.title) === wantTitle && (!wantArtist || normalizeText(p.artist).includes(wantArtist.split(' ')[0]) || wantArtist.includes(normalizeText(p.artist).split(' ')[0])));
        if (byText.length) return { product: byText[0], method: 'text', similarity: null };
    }
    if (!frontPhoto) return null;
    try {
        const { results } = await searchByImage({ image: frontPhoto.buffer }, { limit: 8 });
        const allowed = new Set(products.map((p) => p.id));
        const [best, second] = results.filter((p) => allowed.has(p.id));
        const margin = best ? best.match.similarity - (second ? second.match.similarity : 0) : 0;
        if (best && (best.match.similarity >= CLIP_MATCH
            || (best.match.similarity >= CLIP_MATCH_WITH_MARGIN.similarity && margin >= CLIP_MATCH_WITH_MARGIN.margin))) {
            return { product: products.find((p) => p.id === best.id), method: 'image', similarity: best.match.similarity };
        }
    } catch (error) {
        console.warn('[tradein] Không so được ảnh bìa với catalog:', error.message);
    }
    return null;
}

// photos: [{ buffer, mime }], ảnh đầu tiên là mặt trước bìa.
async function appraise({ title, artist, format, selfGrade, photos }) {
    let ai = null;
    let aiStatus = 'tat';
    let aiError = null;
    if (isConfigured()) {
        try {
            ai = await gradeWithGemini({ photos, title, artist, format });
            aiStatus = 'xong';
        } catch (error) {
            aiStatus = 'loi';
            aiError = error.message;
        }
    }

    const identified = ai && ai.is_record ? { title: ai.title, artist: ai.artist } : {};
    const match = await findCatalogMatch({
        title: title || identified.title,
        artist: artist || identified.artist,
        format,
        frontPhoto: photos[0],
    }) || (identified.title && normalizeText(identified.title) !== normalizeText(title)
        ? await findCatalogMatch({ title: identified.title, artist: identified.artist, format })
        : null);

    const mediaGrade = (ai && ai.is_record && ai.media_grade) || (GRADE_CODES.includes(selfGrade) ? selfGrade : 'VG');
    const sleeveGrade = (ai && ai.is_record && ai.sleeve_grade) || mediaGrade;
    const basePrice = match ? Number(match.product.price) : POLICY.defaultBasePrice[format] || POLICY.defaultBasePrice.vinyl;
    return {
        aiStatus,
        aiError,
        ai: ai && {
            isRecord: Boolean(ai.is_record),
            format: ai.format,
            title: ai.title || null,
            artist: ai.artist || null,
            year: Number(ai.year) || null,
            mediaVisible: Boolean(ai.media_visible),
            mediaGrade: ai.media_grade,
            sleeveGrade: ai.sleeve_grade,
            defects: Array.isArray(ai.defects) ? ai.defects.slice(0, 8).map((d) => String(d).slice(0, 200)) : [],
            confidence: Math.min(Math.max(Number(ai.confidence) || 0, 0), 1),
            summary: String(ai.summary || '').slice(0, 600),
            model: ai.model,
        },
        match: match && {
            productId: match.product.id,
            title: match.product.title,
            artist: match.product.artist,
            price: Number(match.product.price),
            method: match.method,
            similarity: match.similarity,
        },
        basePrice,
        grades: { media: mediaGrade, sleeve: sleeveGrade },
        suggestion: quote(basePrice, mediaGrade, sleeveGrade),
    };
}

module.exports = { appraise, MODEL };
