const fs = require('fs');
const path = require('path');
let sharp = null; try { sharp = require('sharp'); } catch (_) {}

async function run(){
  const src = path.resolve(__dirname, '..', 'public', 'favicon', 'site_logo.webp');
  const out32 = path.resolve(__dirname, '..', 'public', 'favicon', 'favicon-32.png');
  const out180 = path.resolve(__dirname, '..', 'public', 'favicon', 'apple-touch-icon.png');
  if (!fs.existsSync(src)) { console.error('Missing', src); process.exit(1); }
  if (!sharp) { console.error('sharp not installed'); process.exit(1); }
  await sharp(src).resize(32,32).png().toFile(out32);
  await sharp(src).resize(180,180).png().toFile(out180);
  console.log('Generated', path.basename(out32), 'and', path.basename(out180));
}
run().catch(e=>{ console.error(e); process.exit(1); });

