const assert = require('assert');
const { parseGalleryCommandLine, parseGalleryOutput } = require('./dist/index.js');

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

assert.deepStrictEqual(
  parseGalleryCommandLine('gallery-dl --proxy "http://127.0.0.1:7890"'),
  ['--proxy', 'http://127.0.0.1:7890/'],
);
assert.deepStrictEqual(
  parseGalleryCommandLine('--proxy=socks5://127.0.0.1:1080'),
  ['--proxy', 'socks5://127.0.0.1:1080'],
);
assert.throws(() => parseGalleryCommandLine('gallery-dl --exec calc.exe'), /仅允许/);
console.log('mira_gallery_dl parser test passed');
