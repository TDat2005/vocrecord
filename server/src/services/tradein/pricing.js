// Chính sách giá thu mua & ký gửi đĩa cũ. Giao diện đọc lại qua GET /api/tradein/policy
// nên mọi con số chỉ cần sửa ở đây.

// Thang Goldmine (chuẩn chấm tình trạng đĩa than dùng trên Discogs), chấm riêng đĩa và bìa.
// factor: giá trị còn lại so với bản mới cùng album.
const GRADES = [
    { code: 'M', label: 'Mint', factor: 1, description: 'Như mới, còn seal hoặc chưa từng phát.' },
    { code: 'NM', label: 'Near Mint', factor: 0.85, description: 'Gần như mới, không vết xước, bìa không nếp gấp.' },
    { code: 'VG+', label: 'Very Good Plus', factor: 0.65, description: 'Vài vết xước nhẹ không ảnh hưởng tiếng; bìa mòn nhẹ ở góc.' },
    { code: 'VG', label: 'Very Good', factor: 0.45, description: 'Xước thấy rõ, có tiếng lách tách nhẹ khi phát; bìa có nếp gấp, ố nhẹ.' },
    { code: 'G+', label: 'Good Plus', factor: 0.3, description: 'Nhiều xước, tiếng rè nền rõ nhưng phát hết bài; bìa rách mép, có chữ viết.' },
    { code: 'G', label: 'Good', factor: 0.2, description: 'Phát được nhưng ồn nhiều; bìa hư hỏng nặng.' },
    { code: 'P', label: 'Poor', factor: 0.08, description: 'Cong vênh, nhảy kim hoặc nứt; chủ yếu để trưng bày.' },
];
const GRADE_CODES = GRADES.map((grade) => grade.code);

const POLICY = {
    mediaWeight: 0.7, // tình trạng đĩa quyết định chất lượng tiếng nên nặng hơn bìa
    sleeveWeight: 0.3,
    buyoutRate: 0.45, // bán đứt: cửa hàng trả 45% giá sẽ bán lại (phần còn lại bù chi phí vệ sinh, lưu kho, rủi ro)
    creditBonus: 0.1, // nhận bằng ví tín dụng được cộng thêm 10%
    commissionRate: 0.2, // ký gửi: cửa hàng giữ 20% giá bán thực tế
    consignmentDays: 90, // hợp đồng ký gửi kéo dài 90 ngày
    defaultBasePrice: { vinyl: 600000, cassette: 250000 }, // khi không tìm thấy album trong catalog
    maxItemsPerRequest: 20,
    maxPhotosPerItem: 4,
};

const gradeFactor = (code) => (GRADES.find((grade) => grade.code === code) || GRADES[3]).factor;
const roundPrice = (value) => Math.max(0, Math.round(value / 10000) * 10000); // làm tròn 10.000đ

// Giá có thể bán lại (niêm yết) của bản đĩa cũ dựa trên giá bản mới và tình trạng đĩa/bìa.
function resaleValue(basePrice, mediaGrade, sleeveGrade) {
    const factor = POLICY.mediaWeight * gradeFactor(mediaGrade) + POLICY.sleeveWeight * gradeFactor(sleeveGrade || mediaGrade);
    return roundPrice(Number(basePrice) * factor);
}

function quote(basePrice, mediaGrade, sleeveGrade) {
    const listPrice = resaleValue(basePrice, mediaGrade, sleeveGrade);
    return {
        listPrice,
        buyPrice: roundPrice(listPrice * POLICY.buyoutRate),
        consignPayout: roundPrice(listPrice * (1 - POLICY.commissionRate)),
    };
}

// Tiền khách thực nhận khi bán đứt: chọn nhận vào ví thì được cộng thêm.
const buyoutPayout = (buyPrice, payoutMethod) => roundPrice(Number(buyPrice) * (payoutMethod === 'tindung' ? 1 + POLICY.creditBonus : 1));
const consignmentPayout = (salePrice, rate = POLICY.commissionRate) => Math.round(Number(salePrice) * (1 - Number(rate)));

module.exports = { GRADES, GRADE_CODES, POLICY, quote, resaleValue, roundPrice, buyoutPayout, consignmentPayout };
