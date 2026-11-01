const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('search followed by final selection discards intermediate prose and unrelated candidate cards', async () => {
    const events = [];
    const products = [
        { id: 1, title: '3', artist: 'Other artist', price: 599000, image: '/3.jpg', stock: 3 },
        { id: 2, title: 'Back to Black', artist: 'Amy Winehouse', price: 799000, image: '/amy.jpg', stock: 2 },
    ];
    const turns = [
        [{ text: 'Premature invented recommendation' }, { functionCall: { name: 'search_products', args: { query: 'nhạc buồn dưới 800k' } } }],
        [{ text: 'Another unrelated product' }, { functionCall: { name: 'recommend_products', args: { items: [{ product_id: 2, reason: 'Soul cho ngày mưa.' }] } } }],
    ];
    const client = { models: { async *generateContentStream() {
        const parts = turns.shift();
        assert.ok(parts, 'selection should end the model loop');
        yield { candidates: [{ content: { parts }, finishReason: 'STOP' }] };
    } } };
    // Replace external services only while loading the assistant. No DB or model API calls.
    const load = Module._load;
    const assistantPath = require.resolve('../src/services/ai/assistant');
    Module._load = function (request, parent, ...rest) {
        if (parent?.filename === assistantPath) {
            if (request === './gemini') return { getClient: () => client, isConfigured: () => true };
            if (request === './catalog-search') return { searchProducts: async () => ({ results: products, understood: { filters: { kinds: [] } } }) };
            if (request.startsWith('../../models/')) return {};
        }
        return load.call(this, request, parent, ...rest);
    };
    let runAssistant;
    try {
        ({ runAssistant } = require(assistantPath));
    } finally {
        Module._load = load;
    }
    await runAssistant({ history: [{ role: 'user', content: 'Nhạc buồn dưới 800k' }], user: null,
        send: (event) => events.push(event), signal: new AbortController().signal });
    const text = events.filter((e) => e.type === 'text').map((e) => e.text).join('');
    assert.match(text, /Amy Winehouse – Back to Black/);
    assert.doesNotMatch(text, /invented|unrelated|Other artist/);
    const cards = events.filter((e) => e.type === 'products');
    assert.equal(cards.length, 1);
    assert.deepEqual(cards[0].items.map((p) => [p.id, p.image]), [[2, '/amy.jpg']]);
    assert.equal(cards[0].replace, true);
    assert.equal(turns.length, 0);
});
