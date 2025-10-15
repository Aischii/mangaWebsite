let sharp = null;
try { sharp = require('sharp'); } catch (_) {}
const isSharpAvailable = !!sharp;

async function optimizeImage(inputPath, opts = {}) {
  if (!sharp) return false;
  const { maxWidth = 1280, quality = 80, outPath = inputPath } = opts;
  try {
    const img = sharp(inputPath).rotate();
    const meta = await img.metadata();
    const width = meta.width || maxWidth;
    const resizeWidth = Math.min(width, maxWidth);
    await img
      .resize({ width: resizeWidth })
      .webp({ quality })
      .toFile(outPath);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { optimizeImage, isSharpAvailable };
