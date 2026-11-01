const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRecommendations } = require('../src/services/ai/recommendations');

const products = [
    { id: 1, title: '3', artist: 'Other artist', price: 599000, image: '/3.jpg' },
    { id: 2, title: 'Rumours', artist: 'Fleetwood Mac', price: 749000, image: '/rumours.jpg' },
    { id: 3, title: 'Back to Black', artist: 'Amy Winehouse', price: 799000, image: '/amy.jpg' },
];

test('only chosen records appear, in recommendation order, with matching names, prices and images', () => {
    const events = [];
    const recommendations = createRecommendations((event) => events.push(event));
    recommendations.remember(products);
    assert.equal(events.length, 0, 'search candidates must not leak into the product strip');
    recommendations.present([
        { product_id: 3, reason: 'Soul cho ngày mưa.' },
        { product_id: 2, reason: 'Rock nhẹ nhàng.' },
    ]);
    assert.deepEqual(events[1], { type: 'products', items: [products[2], products[1]], replace: true });
    assert.match(events[0].text, /Amy Winehouse – Back to Black/);
    assert.match(events[0].text, /799[.,]000đ/);
    assert.ok(events[0].text.indexOf('Back to Black') < events[0].text.indexOf('Rumours'));
    assert.doesNotMatch(events[0].text, /Other artist/);
});

test('unknown or duplicate IDs fail without publishing a partial answer', () => {
    const events = [];
    const recommendations = createRecommendations((event) => events.push(event));
    recommendations.remember(products);
    for (const ids of [[2, 999], [2, 2], []]) {
        assert.ok(recommendations.present(ids.map((product_id) => ({ product_id }))).error);
    }
    assert.equal(events.length, 0);
    assert.equal(recommendations.published, false);
});

test('if the model skips selection, fallback still builds text and cards from identical records', () => {
    const events = [];
    const recommendations = createRecommendations((event) => events.push(event));
    assert.equal(recommendations.fallback(), false);
    recommendations.remember(products);
    assert.equal(recommendations.fallback(), true);
    assert.deepEqual(events[1].items, products);
    for (const product of products) assert.ok(events[0].text.includes(product.title));
});
