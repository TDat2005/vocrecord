const { normalize, foldAccents } = require('./vi-text');

// Tách điều kiện cứng (giá, loại sản phẩm, còn hàng) khỏi câu tìm kiếm tự nhiên.
// "nhạc buồn nghe lúc mưa, dưới 800k" -> lọc giá <= 800.000đ, chỉ đĩa nhạc; phần "nhạc buồn nghe lúc mưa" đem đi tìm theo nghĩa.
// Mọi biểu thức chạy trên bản bỏ dấu nên "duoi 800k" và "dưới 800k" như nhau.

const KINDS = {
    vinyl: { label: 'Đĩa than', pattern: /(?<![a-z])(dia than|dia nhua|vinyl|lp)(?![a-z])/g },
    cassette: { label: 'Cassette', pattern: /(?<![a-z])(bang cassette|bang cat ?set|cassette|cat-?set|bang tu|bang nhac|tape)(?![a-z])/g },
    turntable: { label: 'Mâm đĩa', pattern: /(?<![a-z])(mam dia than|mam dia|mam than|may quay dia|may nghe dia|may phat dia|turntable)(?![a-z])/g },
    accessory: { label: 'Phụ kiện', pattern: /(?<![a-z])(phu kien)(?![a-z])/g },
};
const MUSIC_KINDS = ['vinyl', 'cassette'];
const MUSIC_INTENT = /(?<![a-z])(nhac|album|bai hat|ca khuc|ca si|nghe si|ban nhac)(?![a-z])/;
const IN_STOCK = /(?<![a-z])(con hang|san hang)(?![a-z])/g;

// Số tiền: 800k, 800 nghìn, 1tr2, 1,5 triệu, 1.000.000đ, 2 củ...
const AMOUNT = String.raw`(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:(k|nghin|ngan|n|tr|trieu|cu|d|dong|vnd)(?![a-z])(\d(?!\d))?)?`;
const KW_START = String.raw`(?<![a-z])`;
// group: vị trí nhóm số tiền đầu tiên trong regex (nhóm 1 là từ khóa nếu có).
const PRICE_RULES = [
    { type: 'range', re: new RegExp(`(?:${KW_START}(tu|khoang tu|trong khoang)\\s+)?${AMOUNT}\\s*(?:-|~|den|toi)\\s*${AMOUNT}`, 'g') },
    { type: 'max', group: 2, re: new RegExp(`${KW_START}(duoi|nho hon|it hon|re hon|khong qua|khong vuot qua|toi da|chua toi|chua den|ngan sach|budget|max|<=?)\\s*${AMOUNT}`, 'g') },
    { type: 'min', group: 2, re: new RegExp(`${KW_START}(tren|lon hon|nhieu hon|cao hon|it nhat|toi thieu|tu|min|>=?)\\s*${AMOUNT}(?:\\s*tro len)?`, 'g') },
    { type: 'min', group: 1, re: new RegExp(`${AMOUNT}\\s*tro len`, 'g') },
    { type: 'around', group: 2, re: new RegExp(`${KW_START}(khoang|tam khoang|tam|chung|gia)\\s*${AMOUNT}`, 'g') },
    // Chỉ có số tiền kèm đơn vị ("đĩa jazz 800k"): hiểu là ngân sách tối đa.
    { type: 'max', group: 1, re: new RegExp(AMOUNT, 'g'), requireUnit: true },
];

function toAmount(numberText, unit, extraDigit) {
    let value = /^\d{1,3}([.,]\d{3})+$/.test(numberText)
        ? Number(numberText.replace(/[.,]/g, ''))
        : Number(numberText.replace(',', '.'));
    if (!Number.isFinite(value)) return null;
    if (extraDigit && ['tr', 'trieu', 'cu'].includes(unit)) value += Number(extraDigit) / 10; // "1tr2" = 1,2 triệu
    if (['k', 'nghin', 'ngan', 'n'].includes(unit)) return Math.round(value * 1e3);
    if (['tr', 'trieu', 'cu'].includes(unit)) return Math.round(value * 1e6);
    if (['d', 'dong', 'vnd'].includes(unit)) return Math.round(value);
    // Không có đơn vị: "dưới 800" trong ngữ cảnh mua sắm là 800k; 1000–9999 thường là năm hoặc mã máy, bỏ qua.
    if (value < 1000) return Math.round(value * 1e3);
    return value < 10000 ? null : Math.round(value);
}

function formatVnd(value) {
    return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

function kindOfCategory(categoryName) {
    const folded = foldAccents(categoryName);
    if (folded.includes('vinyl') || folded.includes('dia than')) return 'vinyl';
    if (folded.includes('cassette')) return 'cassette';
    if (folded.includes('turntable') || folded.includes('quay dia') || folded.includes('mam dia')) return 'turntable';
    if (folded.includes('phu kien')) return 'accessory';
    return 'other';
}

function parseQuery(raw) {
    const original = normalize(raw).slice(0, 300);
    let folded = foldAccents(original);
    let text = original;
    const filters = { minPrice: null, maxPrice: null, kinds: [], inStock: false };

    // Xóa đoạn đã hiểu khỏi cả hai bản (thay bằng khoảng trắng cùng độ dài để vị trí vẫn khớp).
    const consume = (start, end) => {
        const blank = ' '.repeat(end - start);
        folded = folded.slice(0, start) + blank + folded.slice(end);
        text = text.slice(0, start) + blank + text.slice(end);
    };

    for (const rule of PRICE_RULES) {
        if (filters.minPrice !== null || filters.maxPrice !== null) break;
        for (const match of folded.matchAll(rule.re)) {
            if (rule.type === 'range') {
                const [, keyword, n1, u1, d1, n2, u2, d2] = match;
                if (!keyword && !u1 && !u2) continue; // "70 - 80" không phải khoảng giá
                const max = toAmount(n2, u2, d2);
                const min = toAmount(n1, u1 || u2, u1 ? d1 : undefined);
                if (min === null || max === null) continue;
                filters.minPrice = Math.min(min, max);
                filters.maxPrice = Math.max(min, max);
            } else {
                const [numberText, unit, extraDigit] = match.slice(rule.group, rule.group + 3);
                if (rule.requireUnit && !unit) continue;
                const value = toAmount(numberText, unit, extraDigit);
                if (value === null || value <= 0) continue;
                if (rule.type === 'max') filters.maxPrice = value;
                if (rule.type === 'min') filters.minPrice = value;
                if (rule.type === 'around') {
                    filters.minPrice = Math.round(value * 0.7);
                    filters.maxPrice = Math.round(value * 1.1);
                }
            }
            consume(match.index, match.index + match[0].length);
            break;
        }
    }
    for (const [kind, { pattern }] of Object.entries(KINDS)) {
        let found = false;
        for (const match of folded.matchAll(pattern)) {
            found = true;
            consume(match.index, match.index + match[0].length);
        }
        if (found) filters.kinds.push(kind);
    }
    // Hỏi về "nhạc/album/ca sĩ" mà không nói loại: chỉ tìm trong đĩa than và cassette, bỏ mâm đĩa, phụ kiện.
    if (filters.kinds.length === 0 && MUSIC_INTENT.test(folded)) filters.kinds.push(...MUSIC_KINDS);

    for (const match of folded.matchAll(IN_STOCK)) {
        filters.inStock = true;
        consume(match.index, match.index + match[0].length);
    }

    const rest = text.replace(/[,.;:!?()"']+/g, ' ').replace(/\s+/g, ' ').trim();
    return { original, text: rest, filters, chips: describeFilters(filters) };
}

// Nhãn hiển thị cho điều kiện lọc ("Giá ≤ 800.000đ", "Đĩa nhạc", "Còn hàng").
function describeFilters(filters) {
    const chips = [];
    if (filters.minPrice !== null && filters.maxPrice !== null) {
        chips.push({ type: 'price', label: `Giá ${formatVnd(filters.minPrice)} – ${formatVnd(filters.maxPrice)}` });
    } else if (filters.maxPrice !== null) {
        chips.push({ type: 'price', label: `Giá ≤ ${formatVnd(filters.maxPrice)}` });
    } else if (filters.minPrice !== null) {
        chips.push({ type: 'price', label: `Giá ≥ ${formatVnd(filters.minPrice)}` });
    }
    const isMusicOnly = filters.kinds.length === MUSIC_KINDS.length && MUSIC_KINDS.every((kind) => filters.kinds.includes(kind));
    if (isMusicOnly) chips.push({ type: 'category', label: 'Đĩa nhạc' });
    else filters.kinds.forEach((kind) => chips.push({ type: 'category', label: KINDS[kind].label }));
    if (filters.inStock) chips.push({ type: 'stock', label: 'Còn hàng' });
    return chips;
}

function matchesFilters(product, filters) {
    const price = Number(product.price) || 0;
    if (filters.maxPrice !== null && price > filters.maxPrice) return false;
    if (filters.minPrice !== null && price < filters.minPrice) return false;
    if (filters.inStock && !(Number(product.stock) > 0)) return false;
    if (filters.kinds.length && !filters.kinds.includes(kindOfCategory(product.category))) return false;
    return true;
}

module.exports = { parseQuery, describeFilters, matchesFilters, kindOfCategory, formatVnd };
