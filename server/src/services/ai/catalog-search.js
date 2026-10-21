const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../../config/database');
const embeddings = require('./embeddings');
const { Bm25Index } = require('./bm25');
const { hasDiacritics } = require('./vi-text');
const { parseQuery, matchesFilters, kindOfCategory } = require('./query-parser');

// Tìm kiếm kết hợp (hybrid) trên catalog:
//  1. Tách điều kiện cứng (giá, loại, còn hàng) -> lọc trước.
//  2. Xếp hạng theo từ khóa (BM25) và theo nghĩa (cosine giữa embedding câu hỏi và sản phẩm).
//  3. Gộp hai bảng xếp hạng bằng Reciprocal Rank Fusion: không cần chuẩn hóa điểm của hai cách về cùng thang.
// Catalog nhỏ (vài trăm, vài nghìn sản phẩm) nên vector giữ trong RAM và so sánh tuần tự;
// MySQL chỉ là nơi lưu vector để khởi động lại không phải tính lại.

const RRF_K = 60;
const SEMANTIC_TOP = 10;
const SEMANTIC_MARGIN = 0.06; // chỉ lấy sản phẩm có độ tương đồng gần với kết quả tốt nhất
const PUBLIC_DIR = path.resolve(process.env.WEB_PUBLIC_DIR || path.resolve(__dirname, '../../../../DiaNhac/public'));
const WEB_BASE_URL = process.env.WEB_BASE_URL || '';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const sha1 = (text) => crypto.createHash('sha1').update(text).digest('hex');

// Server vẫn chạy được khi chưa chạy migration 09 (chỉ thiếu từ khóa AI và không lưu vector vào DB).
let schemaCache = null;
async function detectSchema() {
    if (schemaCache && (schemaCache.complete || Date.now() - schemaCache.checkedAt < 60 * 1000)) return schemaCache;
    const [rows] = await pool.query(
        `SELECT TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND ((TABLE_NAME = 'SanPham' AND COLUMN_NAME = 'TuKhoaAI') OR (TABLE_NAME = 'SanPhamVector' AND COLUMN_NAME = 'MaSP'))`
    );
    const hasKeywords = rows.some((row) => row.tableName === 'SanPham');
    const hasVectorTable = rows.some((row) => row.tableName === 'SanPhamVector');
    if (!schemaCache && !(hasKeywords && hasVectorTable)) {
        console.warn('[ai] Chưa chạy database/09_ai_search.sql: tìm kiếm vẫn chạy nhưng thiếu từ khóa AI và không lưu vector.');
    }
    schemaCache = { hasKeywords, hasVectorTable, complete: hasKeywords && hasVectorTable, checkedAt: Date.now() };
    return schemaCache;
}

async function loadProducts() {
    const { hasKeywords } = await detectSchema();
    const [rows] = await pool.query(
        `SELECT sp.MaSP AS id, sp.TenSP AS title, sp.NgheSi AS artist, COALESCE(dm.TenDM, sp.TheLoai) AS category,
                sp.TheLoaiNhac AS music_genre, sp.GiaBan AS price, sp.SoLuongTon AS stock, sp.MoTa AS description,
                sp.HinhAnh AS image, sp.DinhDang AS format, sp.NamPhatHanh AS year,
                ${hasKeywords ? 'sp.TuKhoaAI' : 'NULL'} AS ai_keywords
         FROM SanPham sp LEFT JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
         WHERE sp.TinhTrang <> 'ngungkinhdoanh'`
    );
    return rows.map((row) => ({ ...row, genre: row.category, price: Number(row.price), stock: Number(row.stock), kind: kindOfCategory(row.category) }));
}

const passageOf = (product) => [
    `${product.title} – ${product.artist || ''}`,
    product.category,
    product.music_genre,
    product.description,
    product.ai_keywords,
].filter(Boolean).join('. ');

// ---------- Từ khóa (BM25) ----------
let keywordCache = { signature: null, accented: null, folded: null };

function keywordIndexes(products) {
    const signature = sha1(products.map((p) => `${p.id}|${passageOf(p)}`).join('\n'));
    if (keywordCache.signature !== signature) {
        const docs = products.map((p) => ({
            id: p.id,
            fields: [
                { text: p.title, weight: 3 },
                { text: p.artist, weight: 2 },
                { text: p.music_genre, weight: 2 },
                { text: p.ai_keywords, weight: 2 },
                { text: p.category, weight: 1 },
                { text: p.description, weight: 1 },
            ],
        }));
        keywordCache = {
            signature,
            accented: new Bm25Index(docs),
            folded: new Bm25Index(docs, { fold: true }),
        };
    }
    return keywordCache;
}

// ---------- Vector ----------
const vectorCache = { text: new Map(), image: new Map() }; // MaSP -> { fingerprint, vector }
const loadedFromDb = { text: false, image: false };
const indexing = { text: null, image: null };

const fingerprintOf = (kind, product) => sha1(kind === 'text' ? passageOf(product) : String(product.image || ''));
const toBuffer = (vector) => Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
const fromBuffer = (buffer) => new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

async function loadStoredVectors(kind) {
    if (loadedFromDb[kind]) return;
    const { hasVectorTable } = await detectSchema();
    if (hasVectorTable) {
        const [rows] = await pool.query(
            'SELECT MaSP, DauVanTay, Vector FROM SanPhamVector WHERE Loai = ? AND MoHinh = ?',
            [kind, embeddings.MODELS[kind]]
        );
        for (const row of rows) vectorCache[kind].set(row.MaSP, { fingerprint: row.DauVanTay, vector: fromBuffer(row.Vector) });
    }
    loadedFromDb[kind] = true;
}

async function saveVectors(kind, entries) {
    const { hasVectorTable } = await detectSchema();
    if (!hasVectorTable || entries.length === 0) return;
    const values = entries.map(({ id, fingerprint, vector }) => [id, kind, embeddings.MODELS[kind], fingerprint, vector.length, toBuffer(vector)]);
    await pool.query(
        `INSERT INTO SanPhamVector (MaSP, Loai, MoHinh, DauVanTay, SoChieu, Vector) VALUES ?
         ON DUPLICATE KEY UPDATE DauVanTay = VALUES(DauVanTay), SoChieu = VALUES(SoChieu), Vector = VALUES(Vector)`,
        [values]
    );
}

async function fetchImage(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Ảnh quá lớn');
    return buffer;
}

// Ảnh sản phẩm là đường dẫn trong thư mục public của web (/images/...) hoặc URL đầy đủ.
async function readProductImage(image) {
    if (/^https?:\/\//i.test(image)) return fetchImage(image);
    const relative = String(image || '').replace(/^\/+/, '');
    const localPath = path.resolve(PUBLIC_DIR, relative);
    if (relative && localPath.startsWith(PUBLIC_DIR + path.sep)) {
        try {
            return await fs.readFile(localPath);
        } catch {
            // Không có trên ổ đĩa của API (vd: chạy bằng Docker): thử lấy qua web server.
        }
    }
    if (WEB_BASE_URL) return fetchImage(new URL(relative, WEB_BASE_URL.replace(/\/?$/, '/')));
    throw new Error(`Không đọc được ảnh ${image} (đặt WEB_PUBLIC_DIR hoặc WEB_BASE_URL)`);
}

async function computeVectors(kind, products) {
    const entries = [];
    if (kind === 'text') {
        for (let i = 0; i < products.length; i += 16) {
            const batch = products.slice(i, i + 16);
            const vectors = await embeddings.embedTexts(batch.map(passageOf), 'passage');
            batch.forEach((product, j) => entries.push({ id: product.id, fingerprint: fingerprintOf(kind, product), vector: vectors[j] }));
        }
    } else {
        await embeddings.preload('image'); // mô hình lỗi thì dừng luôn, không báo lỗi lặp lại cho từng ảnh
        for (const product of products) {
            try {
                const vector = await embeddings.embedImage(await readProductImage(product.image));
                entries.push({ id: product.id, fingerprint: fingerprintOf(kind, product), vector });
            } catch (error) {
                console.warn(`[ai] Bỏ qua ảnh sản phẩm #${product.id}: ${error.message}`);
            }
        }
    }
    return entries;
}

// Tính vector cho sản phẩm mới hoặc vừa sửa nội dung. Nhiều request cùng lúc chỉ tính một lần.
async function ensureVectors(kind, products) {
    while (indexing[kind]) await indexing[kind].catch(() => {});
    await loadStoredVectors(kind);
    const stale = products.filter((p) => {
        const cached = vectorCache[kind].get(p.id);
        return !cached || cached.fingerprint !== fingerprintOf(kind, p);
    });
    if (stale.length === 0) return;
    indexing[kind] = (async () => {
        const entries = await computeVectors(kind, stale);
        for (const entry of entries) vectorCache[kind].set(entry.id, entry);
        await saveVectors(kind, entries);
        if (entries.length) console.log(`[ai] Đã cập nhật ${entries.length} vector ${kind}`);
    })();
    try {
        await indexing[kind];
    } finally {
        indexing[kind] = null;
    }
}

function publicProduct(product) {
    const { kind, ...rest } = product;
    return rest;
}

// ---------- Tìm kiếm ----------
async function searchProducts(rawQuery, { mode = 'hybrid', limit = 12 } = {}) {
    const parsed = parseQuery(rawQuery);
    const products = await loadProducts();
    const byId = new Map(products.map((p) => [p.id, p]));
    const candidates = products.filter((p) => matchesFilters(p, parsed.filters));
    const allowedIds = new Set(candidates.map((p) => p.id));
    const semantic = { available: embeddings.isEnabled(), used: false, error: null };
    const matches = new Map(); // id -> { keyword, semantic, score }
    const entry = (id) => {
        if (!matches.has(id)) matches.set(id, { keyword: null, semantic: null, score: 0 });
        return matches.get(id);
    };

    if (!parsed.text) {
        // Chỉ có điều kiện lọc ("cassette dưới 500k"): còn hàng trước, rẻ trước.
        candidates
            .sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.price - b.price)
            .forEach((p, i) => { entry(p.id).score = 1 / (RRF_K + i + 1); });
    } else {
        if (mode !== 'semantic') {
            const indexes = keywordIndexes(products);
            const index = hasDiacritics(parsed.text) ? indexes.accented : indexes.folded;
            index.search(parsed.text, { allowedIds }).forEach((hit, i) => {
                const match = entry(hit.id);
                match.keyword = { rank: i + 1, terms: hit.terms };
                match.score += 1 / (RRF_K + i + 1);
            });
        }
        if (mode !== 'keyword' && semantic.available && candidates.length) {
            try {
                await ensureVectors('text', products);
                const [queryVector] = await embeddings.embedTexts([parsed.text], 'query');
                const scored = candidates
                    .filter((p) => vectorCache.text.has(p.id))
                    .map((p) => ({ id: p.id, similarity: embeddings.cosine(queryVector, vectorCache.text.get(p.id).vector) }))
                    .sort((a, b) => b.similarity - a.similarity);
                const best = scored.length ? scored[0].similarity : 0;
                scored
                    .filter((hit, i) => i < SEMANTIC_TOP && hit.similarity >= best - SEMANTIC_MARGIN)
                    .forEach((hit, i) => {
                        const match = entry(hit.id);
                        match.semantic = { rank: i + 1, similarity: Number(hit.similarity.toFixed(4)) };
                        match.score += 1 / (RRF_K + i + 1);
                    });
                semantic.used = true;
            } catch (error) {
                semantic.error = error.message;
            }
        }
    }

    const results = [...matches.entries()]
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, limit)
        .map(([id, match]) => ({ ...publicProduct(byId.get(id)), match: { ...match, score: Number(match.score.toFixed(5)) } }));

    return {
        query: rawQuery,
        mode,
        understood: { text: parsed.text, filters: parsed.filters, chips: parsed.chips },
        semantic,
        total: results.length,
        results,
    };
}

// query: { vector } (trình duyệt đã chạy CLIP) hoặc { image: Buffer } (server tự chạy CLIP).
async function searchByImage({ vector, image }, { limit = 8 } = {}) {
    if (!embeddings.isEnabled()) {
        const error = new Error('Tìm kiếm bằng ảnh đang tắt trên server (AI_EMBEDDINGS=off)');
        error.status = 503;
        throw error;
    }
    const queryVector = vector ? embeddings.normalizeVector(vector) : await embeddings.embedImage(image);
    const products = await loadProducts();
    await ensureVectors('image', products);
    const scored = products
        .filter((p) => vectorCache.image.has(p.id))
        .map((p) => {
            const stored = vectorCache.image.get(p.id).vector;
            if (stored.length !== queryVector.length) {
                const error = new Error(`Vector ảnh phải có ${stored.length} chiều (mô hình ${embeddings.MODELS.image})`);
                error.status = 400;
                throw error;
            }
            return { product: p, similarity: embeddings.cosine(queryVector, stored) };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    return {
        model: embeddings.MODELS.image,
        indexed: vectorCache.image.size,
        results: scored.map(({ product, similarity }) => ({ ...publicProduct(product), match: { similarity: Number(similarity.toFixed(4)) } })),
    };
}

async function getStatus() {
    const schema = await detectSchema();
    return {
        models: embeddings.status(),
        index: { text: vectorCache.text.size, image: vectorCache.image.size },
        migration09: schema.complete,
    };
}

// Tải mô hình và tính vector ngay khi server khởi động để người dùng đầu tiên không phải chờ.
async function warmUp() {
    if (!embeddings.isEnabled() || ['off', 'false', '0'].includes(String(process.env.AI_WARMUP || '').toLowerCase())) return;
    try {
        const products = await loadProducts();
        await ensureVectors('text', products);
        await ensureVectors('image', products);
    } catch (error) {
        console.warn('[ai] Khởi động trước chỉ mục thất bại, sẽ thử lại khi có lượt tìm kiếm:', error.message);
    }
}

module.exports = { searchProducts, searchByImage, getStatus, warmUp, loadProducts };
