// Web Worker chạy mô hình CLIP ngay trong trình duyệt (transformers.js + WebAssembly).
// Chạy trong worker để giao diện không bị đứng khi mô hình đang tính.
// Lần đầu tải mô hình (~90MB) từ Hugging Face; trình duyệt lưu cache cho các lần sau.
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from '@huggingface/transformers';

// Phải trùng mô hình phía server (AI_IMAGE_MODEL) thì vector mới so sánh được với nhau.
const MODEL_ID = 'Xenova/clip-vit-base-patch32';
env.allowLocalModels = false;

let modelPromise = null;
const fileProgress = new Map();

function loadModel(report) {
  if (!modelPromise) {
    const progress_callback = (event) => {
      if (event.status !== 'progress' || !event.total) return;
      fileProgress.set(event.file, { loaded: event.loaded, total: event.total });
      let loaded = 0;
      let total = 0;
      for (const file of fileProgress.values()) {
        loaded += file.loaded;
        total += file.total;
      }
      report({ type: 'progress', loaded, total });
    };
    modelPromise = Promise.all([
      AutoProcessor.from_pretrained(MODEL_ID, { progress_callback }),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8', progress_callback }),
    ]).catch((error) => {
      modelPromise = null; // lần sau thử tải lại
      throw error;
    });
  }
  return modelPromise;
}

self.onmessage = async ({ data }) => {
  const { id, blob } = data;
  const reply = (message) => self.postMessage({ id, ...message });
  try {
    const [processor, model] = await loadModel(reply);
    reply({ type: 'status', stage: 'embedding' });
    const image = await RawImage.fromBlob(blob);
    const inputs = await processor(image);
    const { image_embeds: embeds } = await model(inputs);
    reply({ type: 'result', vector: Array.from(embeds.data), model: MODEL_ID });
  } catch (error) {
    reply({ type: 'error', message: error.message || String(error) });
  }
};
