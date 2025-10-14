
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const natural = require('natural');

const mangaDir = path.join(__dirname, '../manga');
let mangaLibrary = [];
const mangaCache = new Map();
const chapterCache = new Map();

const scanMangaLibrary = () => {
  const newMangaLibrary = [];
  fs.readdirSync(mangaDir).forEach(manga => {
    const mangaPath = path.join(mangaDir, manga);
    if (fs.lstatSync(mangaPath).isDirectory()) {
      const detailsPath = path.join(mangaPath, 'details.json');
      if (fs.existsSync(detailsPath)) {
        const details = JSON.parse(fs.readFileSync(detailsPath, 'utf-8'));
        if (!details.chapters) {
          const chapters = fs.readdirSync(mangaPath).filter(file => fs.lstatSync(path.join(mangaPath, file)).isDirectory());
          chapters.sort(natural.compare);
          details.chapters = chapters.map(chapter => ({ id: chapter, title: chapter }));
        }
        newMangaLibrary.push({ ...details, id: manga });
      }
    }
  });
  mangaLibrary = newMangaLibrary;
  mangaCache.clear();
  chapterCache.clear();
};

chokidar.watch(mangaDir, { ignored: /details\.json/ }).on('all', (event, path) => {
  scanMangaLibrary();
});

scanMangaLibrary();

const getMangaLibrary = () => mangaLibrary;

const getMangaById = (id) => mangaLibrary.find(manga => manga.id === id);

const getChapterPages = (mangaId, chapter) => {
  const manga = getMangaById(mangaId);
  if (!manga) return [];
  const chapterPath = path.join(mangaDir, mangaId, chapter);
  if (!fs.existsSync(chapterPath) || !fs.lstatSync(chapterPath).isDirectory()) return [];
  return fs.readdirSync(chapterPath).map(page => `/manga/${mangaId}/${chapter}/${page}`);
};

module.exports = { getMangaLibrary, getMangaById, getChapterPages };
