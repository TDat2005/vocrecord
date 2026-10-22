import { useEffect, useState } from 'react';
import { api } from './api';

// Chính sách thu mua lấy từ server (GET /tradein/policy) để giao diện luôn khớp con số server dùng khi tính giá.
let policyPromise = null;

export function usePolicy() {
  const [policy, setPolicy] = useState(null);
  useEffect(() => {
    if (!policyPromise) {
      policyPromise = api.get('/tradein/policy')
        .then((data) => (data.success ? data.data : null))
        .catch(() => null)
        .then((value) => {
          if (!value) policyPromise = null; // lỗi mạng: lần sau thử lại
          return value;
        });
    }
    let cancelled = false;
    policyPromise.then((value) => { if (!cancelled) setPolicy(value); });
    return () => { cancelled = true; };
  }, []);
  return policy;
}

const roundPrice = (value) => Math.max(0, Math.round(value / 10000) * 10000);

// Cùng công thức với server/src/services/tradein/pricing.js: dùng để nhân viên xem giá đề xuất khi đổi tình trạng.
export function quote(policy, basePrice, mediaGrade, sleeveGrade) {
  if (!policy) return null;
  const factor = (code) => (policy.grades.find((grade) => grade.code === code) || policy.grades[3]).factor;
  const listPrice = roundPrice(Number(basePrice) * (policy.mediaWeight * factor(mediaGrade) + policy.sleeveWeight * factor(sleeveGrade || mediaGrade)));
  return {
    listPrice,
    buyPrice: roundPrice(listPrice * policy.buyoutRate),
    consignPayout: roundPrice(listPrice * (1 - policy.commissionRate)),
  };
}

export const gradeText = (policy, code) => {
  const grade = policy?.grades.find((item) => item.code === code);
  return grade ? `${grade.code} · ${grade.label}` : code || '—';
};

export const percent = (value) => `${Math.round(Number(value) * 100)}%`;

// Thu nhỏ ảnh chụp từ điện thoại (thường vài MB) về cạnh dài 1280px: đủ rõ để thấy vết xước, nhẹ khi gửi lên.
export async function photoToDataUrl(file, maxSize = 1280) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}
