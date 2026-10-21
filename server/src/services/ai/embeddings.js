const path = require('path');

// Mô hình embedding chạy ngay trong tiến trình Node (transformers.js + onnxruntime), không gọi API trả phí.
// Lần đầu dùng sẽ tải mô hình từ Hugging Face rồi lưu vào AI_MODEL_CACHE; các lần sau đọc từ ổ đĩa.
//  - Văn bản: multilingual-e5-small (hiểu tiếng Việt), vector 384 chiều.
//  - Ảnh: CLIP ViT-B/32, vector 512 chiều. Trình duyệt chạy đúng mô hình này nên vector hai bên so được với nhau.
const MODELS = {
    text: process.env.AI_TEXT_MODEL || 'Xenova/multilingual-e5-small',
    image: process.env.AI_IMAGE_MODEL || 'Xenova/clip-vit-base-patch32',
};
const DTYPE = process.env.AI_MODEL_DTYPE || 'q8';
const RETRY_AFTER_MS = 5 * 60 * 1000;
const enabled = !['off', 'false', '0'].includes(String(process.env.AI_EMBEDDINGS || '').toLowerCase());

let libraryPromise = null;
const loaders = {}; // kind -> { promise, status, error, failedAt }

function loadLibrary() {
    if (!libraryPromise) {
        libraryPromise = import('@huggingface/transformers').then((lib) => {
            lib.env.cacheDir = process.env.AI_MODEL_CACHE || path.resolve(__dirname, '../../../.cache/models');
            return lib;
        });
    }
    return libraryPromise;
}

async function createModel(kind) {
    const lib = await loadLibrary();
    if (kind === 'text') {
        return lib.pipeline('feature-extraction', MODELS.text, { dtype: DTYPE });
    }
    const [processor, model] = await Promise.all([
        lib.AutoProcessor.from_pretrained(MODELS.image),
        lib.CLIPVisionModelWithProjection.from_pretrained(MODELS.image, { dtype: DTYPE }),
    ]);
    return { lib, processor, model };
}

// Tải mô hình một lần, dùng chung cho mọi request. Lỗi (mất mạng, hết RAM) thì báo "không khả dụng"
// và thử lại sau 5 phút, để tìm kiếm vẫn chạy bằng từ khóa thay vì trả lỗi.
function getModel(kind) {
    if (!enabled) return Promise.reject(new Error('Đã tắt embedding (AI_EMBEDDINGS=off)'));
    const current = loaders[kind];
    if (current && (current.status !== 'error' || Date.now() - current.failedAt < RETRY_AFTER_MS)) {
        return current.status === 'error' ? Promise.reject(current.error) : current.promise;
    }
    const state = { status: 'loading', error: null, failedAt: 0 };
    state.promise = createModel(kind).then((model) => {
        state.status = 'ready';
        return model;
    }, (error) => {
        state.status = 'error';
        state.error = error;
        state.failedAt = Date.now();
        console.error(`[ai] Không tải được mô hình ${MODELS[kind]}:`, error.message);
        throw error;
    });
    loaders[kind] = state;
    return state.promise;
}

function normalizeVector(data) {
    const vector = Float32Array.from(data);
    let norm = 0;
    for (const value of vector) norm += value * value;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
    return vector;
}

// e5 cần tiền tố "query: " cho câu hỏi và "passage: " cho tài liệu.
async function embedTexts(texts, role = 'passage') {
    if (texts.length === 0) return [];
    const extractor = await getModel('text');
    const output = await extractor(texts.map((text) => `${role}: ${text}`), { pooling: 'mean', normalize: true });
    const [count, dims] = output.dims;
    return Array.from({ length: count }, (_, i) => Float32Array.from(output.data.subarray(i * dims, (i + 1) * dims)));
}

// source: Buffer (ảnh upload hoặc file đọc từ ổ đĩa) hoặc URL http(s).
async function embedImage(source) {
    const { lib, processor, model } = await getModel('image');
    const image = Buffer.isBuffer(source)
        ? await lib.RawImage.fromBlob(new Blob([source]))
        : await lib.RawImage.read(source);
    const inputs = await processor(image);
    const { image_embeds: embeds } = await model(inputs);
    return normalizeVector(embeds.data);
}

function cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
    return dot; // vector đã chuẩn hóa nên tích vô hướng chính là cosine
}

function status() {
    return Object.fromEntries(Object.entries(MODELS).map(([kind, id]) => {
        const state = loaders[kind];
        return [kind, {
            model: id,
            dtype: DTYPE,
            status: !enabled ? 'disabled' : (state ? state.status : 'idle'),
            error: state && state.error ? state.error.message : null,
        }];
    }));
}

module.exports = {
    MODELS, embedTexts, embedImage, normalizeVector, cosine, status,
    preload: (kind) => getModel(kind).then(() => undefined),
    isEnabled: () => enabled,
};
