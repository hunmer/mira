const assert = require('assert');
const { parseGalleryOutput } = require('./dist/index.js');

const output = JSON.stringify([
  [2, { category: 'example', filename: 'ignored', extension: 'jpg' }],
  [3, 'https://cdn.example.com/image/one.jpg', {
    category: 'example',
    subcategory: 'post',
    filename: 'one',
    extension: 'jpg',
    image_width: 1200,
    image_height: 800,
    preview_url: 'https://cdn.example.com/image/preview.jpg',
  }],
]);

const items = parseGalleryOutput(output, 'https://example.com/post/1');
assert.strictEqual(items.length, 1);
assert.strictEqual(items[0].name, 'one.jpg');
assert.strictEqual(items[0].site, 'example / post');
assert.strictEqual(items[0].width, 1200);
assert.strictEqual(items[0].sourceUrl, 'https://example.com/post/1');
console.log('mira_gallery_dl parser test passed');
