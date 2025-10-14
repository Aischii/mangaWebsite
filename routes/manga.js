
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mangaUtils = require('../utils/manga');

const chapterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mangaId = req.params.id;
    const chapterId = req.body.chapterTitle.replace(/\s+/g, '-').toLowerCase();
    const dir = path.join(__dirname, '../manga', mangaId, chapterId);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const chapterUpload = multer({ storage: chapterStorage });

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

router.get('/', (req, res) => {
  const mangaLibrary = mangaUtils.getMangaLibrary();
  res.render('index', { mangaLibrary });
});

router.get('/manga/:id', (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    res.render('manga', { manga });
  }
  else {
    res.status(404).send('Manga not found');
  }
});

router.get('/manga/:id/edit', checkAuthenticated, (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    res.render('edit-manga', { manga });
  }
  else {
    res.status(404).send('Manga not found');
  }
});

router.post('/manga/:id/edit', checkAuthenticated, async (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    const { title, otherTitle, author, artist, genre, synopsis } = req.body;
    manga.title = title;
    manga.otherTitle = otherTitle;
    manga.author = author;
    manga.artist = artist;
    manga.genre = genre.split(',').map(g => g.trim());
    manga.synopsis = synopsis;

    const detailsPath = path.join(__dirname, '../manga', manga.id, 'details.json');
    await fs.promises.writeFile(detailsPath, JSON.stringify(manga, null, 2));

    res.redirect(`/manga/${manga.id}`);
  } else {
    res.status(404).send('Manga not found');
  }
});

router.get('/manga/:id/:chapter/edit', checkAuthenticated, (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  const chapter = manga.chapters.find(c => c.id === req.params.chapter);
  if (manga && chapter) {
    res.render('edit-chapter', { manga, chapter });
  }
  else {
    res.status(404).send('Chapter not found');
  }
});

router.post('/manga/:id/:chapter/edit', checkAuthenticated, (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  const chapter = manga.chapters.find(c => c.id === req.params.chapter);
  if (manga && chapter) {
    chapter.title = req.body.title;

    const detailsPath = path.join(__dirname, '../manga', manga.id, 'details.json');
    fs.writeFileSync(detailsPath, JSON.stringify(manga, null, 2));

    res.redirect(`/manga/${manga.id}`);
  }
  else {
    res.status(404).send('Chapter not found');
  }
});

router.get('/manga/:id/:chapter', (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  const pages = mangaUtils.getChapterPages(req.params.id, req.params.chapter);
  if (manga && pages.length > 0) {
    res.render('chapter', { manga, chapter: req.params.chapter, pages });
  }
  else {
    res.status(404).send('Chapter not found');
  }
});

module.exports = router;
