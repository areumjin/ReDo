// ─── ReDo PWA Icon Generator (sharp 사용) ─────────────────────────────────────

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const PUBLIC = path.resolve(__dirname, "../public");

// SVG 아이콘 템플릿 — 크기별로 생성
function makeSVG(size) {
  const r = size / 2;
  const fontSize = Math.round(size * 0.38);
  const fontSizeSmall = Math.round(size * 0.22);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#6A70FF"/>
  <text
    x="${r}"
    y="${r + fontSize * 0.36}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${fontSize}"
    font-weight="800"
    fill="white"
    text-anchor="middle"
    letter-spacing="-${Math.round(size * 0.01)}"
  >Re</text>
  <text
    x="${r + fontSize * 0.52}"
    y="${r + fontSize * 0.36 + fontSizeSmall * 0.1}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${fontSizeSmall}"
    font-weight="700"
    fill="rgba(255,255,255,0.7)"
    text-anchor="middle"
  >Do</text>
</svg>`;
}

async function generate() {
  const sizes = [
    { file: "icon-192.png", size: 192 },
    { file: "icon-512.png", size: 512 },
    { file: "apple-touch-icon.png", size: 180 },
  ];

  for (const { file, size } of sizes) {
    const svg = Buffer.from(makeSVG(size));
    const outPath = path.join(PUBLIC, file);

    await sharp(svg)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    const bytes = fs.statSync(outPath).size;
    console.log(`✓ ${file} (${size}×${size}) — ${(bytes / 1024).toFixed(1)} KB`);
  }

  console.log("\n✅ PWA 아이콘 생성 완료! public/ 폴더에 저장됐어요.");
}

generate().catch((err) => {
  console.error("❌ 오류:", err.message);
  process.exit(1);
});
