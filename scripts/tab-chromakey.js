// 将 PNG 白色背景转为透明。适用于 tab 图标。
// 依赖：jimp
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const dir = path.join(process.cwd(), 'miniprogram', 'images', 'tab');
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));

const FUZZ = 12; // 容差 0-255，数值越大越宽松

async function run() {
  for (const f of files) {
    const p = path.join(dir, f);
    const img = await Jimp.read(p);
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      // 接近白色的像素变为透明
      if (r >= 255 - FUZZ && g >= 255 - FUZZ && b >= 255 - FUZZ) {
        this.bitmap.data[idx + 3] = 0; // alpha
      }
    });
    await img.writeAsync(p);
    const sizeKb = (fs.statSync(p).size / 1024).toFixed(1);
    console.log(`[transparent] ${f} -> ${sizeKb}KB`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


