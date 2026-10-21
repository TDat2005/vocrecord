// Xử lý văn bản tiếng Việt cho tìm kiếm từ khóa.
// Có hai dạng: giữ dấu ("mưa" khác "mua") và bỏ dấu (khớp được khi người dùng gõ không dấu).

const COMBINING_MARKS = /[̀-ͯ]/g;

// Từ không mang nghĩa tìm kiếm. Viết có dấu; dạng bỏ dấu được thêm tự động bên dưới.
const STOPWORDS_VI = [
    'tôi', 'mình', 'em', 'anh', 'chị', 'bạn', 'shop', 'muốn', 'cần', 'tìm', 'kiếm', 'giúp', 'gợi', 'ý', 'xin',
    'cho', 'có', 'không', 'nào', 'gì', 'các', 'những', 'một', 'vài', 'là', 'của', 'và', 'với', 'để', 'thì', 'mà',
    'ạ', 'nhé', 'nha', 'đi', 'hãy', 'được', 'ở', 'trong', 'này', 'kia', 'đó', 'cái', 'chiếc', 'loại', 'nên', 'hay',
    'the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'on', 'with',
];

function normalize(text) {
    return String(text || '').normalize('NFC').toLowerCase();
}

function foldChar(ch) {
    return ch.normalize('NFD').replace(COMBINING_MARKS, '').replace(/đ/g, 'd');
}

// Bỏ dấu nhưng giữ nguyên độ dài chuỗi, để vị trí tìm được trên bản bỏ dấu cắt được trên bản gốc.
function foldAccents(text) {
    let out = '';
    for (const ch of normalize(text)) {
        const folded = foldChar(ch);
        out += folded.length === ch.length ? folded : ch;
    }
    return out;
}

function hasDiacritics(text) {
    return normalize(text) !== foldAccents(text);
}

const STOPWORDS = new Set(STOPWORDS_VI);
const STOPWORDS_FOLDED = new Set(STOPWORDS_VI.map(foldAccents));

// Tách âm tiết và ghép thêm cặp âm tiết liền nhau ("đĩa than", "nhạc buồn") để cụm từ được ưu tiên.
function tokenize(text, { fold = false } = {}) {
    const base = fold ? foldAccents(text) : normalize(text);
    const stopwords = fold ? STOPWORDS_FOLDED : STOPWORDS;
    const words = base.split(/[^\p{L}\p{N}]+/u).filter((word) => word && !stopwords.has(word));
    const terms = [...words];
    for (let i = 0; i + 1 < words.length; i += 1) terms.push(`${words[i]}_${words[i + 1]}`);
    return terms;
}

module.exports = { normalize, foldAccents, hasDiacritics, tokenize };
