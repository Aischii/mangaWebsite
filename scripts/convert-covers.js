const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
let sharp;
try { sharp = require('sharp'); } catch (_) {}

if (!sharp) {
  console.error('sharp is not installed. Run `npm i -D sharp` and re-run this script.');
  process.exit(1);
}

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true }).catch(() => {});
}

async function convertToWebp(srcPath, destPath) {
  try {
    await sharp(srcPath).rotate().webp({ quality: 80 }).toFile(destPath);
    return true;
  } catch (e) {
    console.error('Convert failed for', srcPath, e.message);
    return false;
  }
}

function fileExists(p) { try { return fs.existsSync(p); } catch { return false; } }

async function processMangaRow(row) {
  const slug = row.slug;
  const folder = path.resolve(__dirname, '..', 'manga', slug);
  const expected = path.resolve(__dirname, '..', row.cover.replace(/^\//, ''));
  await ensureDir(folder);

  if (fileExists(expected)) {
    // Re-encode in place (via temp) to make sure it is a real WebP
    const tmp = expected + '.tmp';
    const ok = await convertToWebp(expected, tmp);
    if (ok) {
      try { fs.renameSync(tmp, expected); } catch { /* ignore */ }
    } else {
      try { fs.unlinkSync(tmp); } catch {}
    }
    return;
  }

  // Expected file missing; look for cover with other extensions
  const candidates = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.JPG', 'cover.PNG'];
  let found = null;
  for (const c of candidates) {
    const p = path.join(folder, c);
    if (fileExists(p)) { found = p; break; }
  }
  if (!found) {
    console.warn('No cover found for', slug);
    return;
  }
  const ok = await convertToWebp(found, expected);
  if (ok) {
    console.log('Wrote', expected);
  }
}

db.all('SELECT id, slug, cover FROM manga', [], async (err, rows) => {
  if (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  }
  for (const row of rows) {
    // Normalize DB path to /manga/<slug>/cover.webp for legacy entries
    const desired = `/manga/${row.slug}/cover.webp`;
    if (row.cover !== desired) {
      await new Promise((resolve) => {
        db.run('UPDATE manga SET cover = ? WHERE id = ?', [desired, row.id], () => resolve());
      });
      row.cover = desired;
    }
    await processMangaRow(row);
  }
  console.log('Cover conversion completed.');
  process.exit(0);
});

