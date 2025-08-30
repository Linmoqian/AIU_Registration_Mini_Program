// 标准化 Tab 图标：81x81 透明 PNG-8，输出到 miniprogram/images/tab/
// 依赖：sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const srcDir = path.join(root, 'miniprogram', 'images');
const outDir = path.join(srcDir, 'tab');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const bases = ['了解协会', '报名', '录取查询', '聊天机器人'];
const variants = ['', '激活'];

const tasks = [];
for (const base of bases) {
  for (const v of variants) {
    const inName = `${base}${v}.png`;
    const inPath = path.join(srcDir, inName);
    if (!fs.existsSync(inPath)) {
      console.warn(`[skip] ${inName} 不存在`);
      continue;
    }
    const outName = `${base}${v}.png`;
    const outPath = path.join(outDir, outName);
    tasks.push(
      sharp(inPath)
        .resize({ width: 81, height: 81, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ palette: true, quality: 80 })
        .toFile(outPath)
        .then(() => {
          const bytes = fs.statSync(outPath).size;
          console.log(`[ok] ${outName} -> ${(bytes / 1024).toFixed(1)}KB`);
        })
    );
  }
}

Promise.all(tasks)
  .then(() => {
    console.log('全部完成。请在 app.json 中指向 miniprogram/images/tab/*.png');
  })
  .catch((e) => {
    console.error('处理失败：', e);
    process.exit(1);
  });


