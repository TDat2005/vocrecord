// Candidate search results are private to the model. Publish only its final selection,
// using the same catalog records to build both the text and the product cards.
function createRecommendations(send) {
    const candidates = new Map();
    let published = false;
    return {
        get published() { return published; },
        remember(products) {
            for (const product of products) candidates.set(Number(product.id), product);
        },
        present(items) {
            const ids = items.map((item) => Number(item.product_id));
            if (new Set(ids).size !== ids.length || ids.some((id) => !candidates.has(id))) {
                return { error: 'Chỉ chọn ID từ kết quả công cụ trong lượt này, mỗi ID một lần.' };
            }
            if (!ids.length) return { error: 'Cần chọn ít nhất một sản phẩm.' };
            const products = ids.map((id) => candidates.get(id));
            const lines = products.map((p, index) => {
                const name = [p.artist, p.title].filter(Boolean).join(' – ');
                const price = Number(p.price).toLocaleString('vi-VN');
                const reason = String(items[index].reason || '').trim();
                return `- **${name}** (${price}đ)${reason ? `: ${reason}` : ''}`;
            });
            send({ type: 'text', text: lines.join('\n') });
            send({ type: 'products', items: products, replace: true });
            published = true;
            return { shown: ids };
        },
        fallback() {
            if (!candidates.size) return false;
            this.present([...candidates.keys()].slice(0, 6).map((id) => ({ product_id: id })));
            return true;
        },
    };
}

module.exports = { createRecommendations };
