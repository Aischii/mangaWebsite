const fs = require('fs');
const path = require('path');
const db = require('../utils/db');

function titleCase(str){
  return str.replace(/[-_]+/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

function ensureManga(slug, callback){
  db.get('SELECT * FROM manga WHERE slug = ?', [slug], (err, row) => {
    if (err) return callback(err);
    if (row) return callback(null, row);
    const title = titleCase(slug);
    const coverRel = `/manga/${slug}/cover.webp`;
    db.run('INSERT INTO manga (title, slug, cover) VALUES (?, ?, ?)', [title, slug, coverRel], function(insErr){
      if (insErr) return callback(insErr);
      db.get('SELECT * FROM manga WHERE id = ?', [this.lastID], (gerr, created)=> callback(gerr, created));
    });
  });
}

function ensureChapter(mangaId, title, slug, pages, callback){
  db.get('SELECT * FROM chapters WHERE manga_id = ? AND slug = ?', [mangaId, slug], (err, row)=>{
    if (err) return callback(err);
    if (row) return callback(null, row);
    db.run('INSERT INTO chapters (manga_id, title, slug, pages) VALUES (?, ?, ?, ?)', [mangaId, title, slug, JSON.stringify(pages)], function(insErr){
      if (insErr) return callback(insErr);
      db.get('SELECT * FROM chapters WHERE id = ?', [this.lastID], (gerr, created)=> callback(gerr, created));
    });
  });
}

function main(){
  const root = path.resolve(__dirname, '..', 'manga');
  if (!fs.existsSync(root)) {
    console.log('No manga folder found; nothing to migrate.');
    process.exit(0);
  }
  const mangaSlugs = fs.readdirSync(root, { withFileTypes: true }).filter(d=>d.isDirectory()).map(d=>d.name);
  const doNext = (i) => {
    if (i >= mangaSlugs.length) { console.log('Migration complete.'); process.exit(0); }
    const slug = mangaSlugs[i];
    ensureManga(slug, (err, mangaRow)=>{
      if (err) { console.error('Error creating manga', slug, err.message); return doNext(i+1); }
      const mangaDir = path.join(root, slug);
      const entries = fs.readdirSync(mangaDir, { withFileTypes: true });
      const chapterDirs = entries.filter(e=>e.isDirectory()).map(e=>e.name);
      const doChapter = (j) => {
        if (j >= chapterDirs.length) return doNext(i+1);
        const chSlug = chapterDirs[j];
        const chTitle = titleCase(chSlug);
        const chPath = path.join(mangaDir, chSlug);
        const pages = fs.readdirSync(chPath).filter(f=>!f.startsWith('.')).sort().map(fn=>`/manga/${slug}/${chSlug}/${fn}`);
        ensureChapter(mangaRow.id, chTitle, chSlug, pages, (cerr)=>{
          if (cerr) console.error('Chapter error', slug, chSlug, cerr.message);
          doChapter(j+1);
        });
      };
      doChapter(0);
    });
  };
  doNext(0);
}

main();

