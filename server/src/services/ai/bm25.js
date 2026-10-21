const { tokenize } = require('./vi-text');

// Chỉ mục BM25 trong bộ nhớ: đủ nhanh cho vài nghìn sản phẩm, không cần dịch vụ tìm kiếm riêng.
// Mỗi trường có trọng số (tên sản phẩm quan trọng hơn mô tả) bằng cách lặp lại từ của trường đó.
class Bm25Index {
    constructor(docs, { fold = false, k1 = 1.2, b = 0.75 } = {}) {
        this.fold = fold;
        this.k1 = k1;
        this.b = b;
        this.docs = docs.map(({ id, fields }) => {
            const tf = new Map();
            let length = 0;
            for (const { text, weight = 1 } of fields) {
                for (const term of tokenize(text, { fold })) {
                    tf.set(term, (tf.get(term) || 0) + weight);
                    length += weight;
                }
            }
            return { id, tf, length };
        });
        this.avgLength = this.docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(this.docs.length, 1);
        this.df = new Map();
        for (const doc of this.docs) {
            for (const term of doc.tf.keys()) this.df.set(term, (this.df.get(term) || 0) + 1);
        }
    }

    idf(term) {
        const n = this.docs.length;
        const df = this.df.get(term) || 0;
        return Math.log(1 + (n - df + 0.5) / (df + 0.5));
    }

    // Trả về [{ id, score, terms }] theo điểm giảm dần; terms là các từ trong câu hỏi khớp với sản phẩm.
    search(query, { allowedIds = null } = {}) {
        const terms = [...new Set(tokenize(query, { fold: this.fold }))];
        if (terms.length === 0) return [];
        const results = [];
        for (const doc of this.docs) {
            if (allowedIds && !allowedIds.has(doc.id)) continue;
            let score = 0;
            const matched = [];
            for (const term of terms) {
                const freq = doc.tf.get(term);
                if (!freq) continue;
                const norm = freq + this.k1 * (1 - this.b + this.b * (doc.length / this.avgLength));
                score += this.idf(term) * ((freq * (this.k1 + 1)) / norm);
                if (!term.includes('_')) matched.push(term);
            }
            if (score > 0) results.push({ id: doc.id, score, terms: matched });
        }
        return results.sort((a, b) => b.score - a.score);
    }
}

module.exports = { Bm25Index };
