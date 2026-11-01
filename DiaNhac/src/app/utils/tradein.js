import { useCachedGet } from '../hooks/useCachedGet';

// Chính sách thu mua lấy từ server (GET /tradein/policy) để giao diện luôn khớp con số server dùng khi tính giá.
export const usePolicy = () => useCachedGet('/tradein/policy');

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

// Tiền nhận khi bán đứt và chọn nhận vào ví (được cộng thêm), cùng công thức buyoutPayout ở server.
export const withCreditBonus = (policy, amount) => roundPrice(Number(amount) * (1 + (policy?.creditBonus || 0)));
// Tiền người ký gửi nhận khi đĩa bán được ở giá niêm yết (cửa hàng giữ hoa hồng).
export const consignPayout = (policy, listPrice) => Math.round(Number(listPrice) * (1 - (policy?.commissionRate || 0)));

export const gradeText = (policy, code) => {
  const grade = policy?.grades.find((item) => item.code === code);
  return grade ? `${grade.code} · ${grade.label}` : code || '—';
};

export const percent = (value) => `${Math.round(Number(value) * 100)}%`;
