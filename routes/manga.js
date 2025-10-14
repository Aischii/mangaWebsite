
const express = require('express');
const router = express.Router();
const mangaUtils = require('../utils/manga');

router.get('/', (req, res) => {
  const mangaLibrary = mangaUtils.getMangaLibrary();
  res.render('index', { mangaLibrary });
});

router.get('/manga/:id', (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    res.render('manga', { manga });
  } else {
    res.status(404).send('Manga not found');
  }
});

router.get('/manga/:id/:chapter', (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  const pages = mangaUtils.getChapterPages(req.params.id, req.params.chapter);
  if (manga && pages.length > 0) {
    res.render('chapter', { manga, chapter: req.params.chapter, pages });
  } else {
    res.status(404).send('Chapter not found');
  }
});

module.exports = router;
