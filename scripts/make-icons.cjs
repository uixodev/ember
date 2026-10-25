// Draws assets/icon.svg into the PNG icons. Run: node scripts/make-icons.cjs (needs playwright).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'assets/icon.svg'), 'utf8');

const sizes = [
  ['public/icons/icon-512.png', 512, 1], ['public/icons/icon-192.png', 192, 1],
  ['public/icons/apple-touch-icon.png', 180, 1], ['public/favicon.png', 64, 1],
  // maskable: the art sits inside the middle 70% so round and squircle crops never cut it
  ['public/icons/maskable-512.png', 512, 0.7],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [file, size, scale] of sizes) {
    await p.setViewportSize({ width: size, height: size });
    const inner = svg.replace('<g id="art">', `<g transform="translate(${256 - 256 * scale} ${256 - 270 * scale}) scale(${scale})">`);
    await p.setContent(`<body style="margin:0;background:#3F38B4"><div style="width:${size}px;height:${size}px">${inner.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</div></body>`);
    await p.screenshot({ path: path.join(root, file), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close();
})();
