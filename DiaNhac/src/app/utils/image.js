// Thu nhỏ ảnh chụp từ điện thoại (thường vài MB) về cạnh dài maxSize px, vẽ lên canvas.
export async function resizeToCanvas(file, maxSize) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

// Ảnh khách gửi lên (thẩm định đĩa cũ, bằng chứng trả hàng): cạnh dài 1280px đủ rõ để thấy vết xước,
// nén JPEG nên nhẹ, luôn dưới giới hạn 2MB mỗi ảnh của server.
export async function photoToDataUrl(file, maxSize = 1280) {
  return (await resizeToCanvas(file, maxSize)).toDataURL('image/jpeg', 0.85);
}
