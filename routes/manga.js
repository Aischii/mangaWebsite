
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
  let mangaLibrary = mangaUtils.getMangaLibrary();
  const allGenres = mangaUtils.getAllGenres();
  const { q, genre, page = 1 } = req.query;
  const limit = 10;
  const offset = (page - 1) * limit;

  if (req.user && !req.user.familySafe) {
    // do not filter for logged in user with family safe off
  } else {
    mangaLibrary = mangaLibrary.filter(manga => manga.rating !== '18+');
  }

  if (q) {
    mangaLibrary = mangaLibrary.filter(manga => manga.title.toLowerCase().includes(q.toLowerCase()));
  }

  if (genre) {
    mangaLibrary = mangaLibrary.filter(manga => manga.genre.includes(genre));
  }

  const paginatedManga = mangaLibrary.slice(offset, offset + limit);
  const totalPages = Math.ceil(mangaLibrary.length / limit);

  res.render('index', { 
    mangaLibrary: paginatedManga, 
    title: 'Manga Library', 
    allGenres, 
    currentPage: page, 
    totalPages, 
    q, 
    genre 
  });
});

router.get('/manga/:id', (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    res.render('manga', { manga, title: manga.title });
  }
  else {
    res.status(404).send('Manga not found');
  }
});

router.get('/manga/:id/edit', checkAuthenticated, (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    res.render('edit-manga', { manga, title: 'Edit Manga' });
  }
  else {
    res.status(404).send('Manga not found');
  }
});

router.post('/manga/:id/edit', checkAuthenticated, async (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    const { title, otherTitle, author, artist, genre, synopsis, rating } = req.body;
    manga.title = title;
    manga.otherTitle = otherTitle;
    manga.author = author;
    manga.artist = artist;
    manga.genre = genre.split(',').map(g => g.trim());
    manga.synopsis = synopsis;
    manga.rating = rating ? '18+' : '';

    const detailsPath = path.join(__dirname, '../manga', manga.id, 'details.json');
    await fs.promises.writeFile(detailsPath, JSON.stringify(manga, null, 2));

    res.redirect(`/manga/${manga.id}`);
  } else {
    res.status(404).send('Manga not found');
  }
});

router.get('/manga/:id/upload-chapter', checkAuthenticated, (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    res.render('upload-chapter', { manga, title: 'Upload Chapter' });
  } else {
    res.status(404).send('Manga not found');
  }
});

router.post('/manga/:id/upload-chapter', checkAuthenticated, chapterUpload.array('pages'), async (req, res) => {
  const manga = mangaUtils.getMangaById(req.params.id);
  if (manga) {
    const chapterTitle = req.body.chapterTitle;
    const chapterId = chapterTitle.replace(/\s+/g, '-').toLowerCase();

    if (manga.chapters.some(c => c.id === chapterId)) {
      return res.status(400).send('Chapter with this title already exists.');
    }
    
    if (!manga.chapters) {
      manga.chapters = [];
    }

    manga.chapters.push({ id: chapterId, title: chapterTitle });

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
    res.render('edit-chapter', { manga, chapter, title: 'Edit Chapter' });
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
  const chapter = manga.chapters.find(c => c.id === req.params.chapter);
  const pages = mangaUtils.getChapterPages(req.params.id, req.params.chapter);
  if (manga && pages.length > 0) {
    res.render('chapter', { manga, chapter: chapter, pages, title: `${manga.title} - ${chapter.title}` });
  } else {
    res.status(404).send('Chapter not found');
  }
});

router.get('/bookmarks', checkAuthenticated, (req, res) => {
  const mangaLibrary = mangaUtils.getMangaLibrary();
  const bookmarkedManga = mangaLibrary.filter(manga => req.user.bookmarks.includes(manga.id));
  res.render('bookmarks', { mangaLibrary: bookmarkedManga, title: 'My Bookmarks' });
});

router.post('/manga/:id/bookmark', checkAuthenticated, (req, res) => {
  const mangaId = req.params.id;
  const user = req.user;
  if (user && !user.bookmarks.includes(mangaId)) {
    user.bookmarks.push(mangaId);
  }
  res.redirect(`/manga/${mangaId}`);
});

router.post('/manga/:id/unbookmark', checkAuthenticated, (req, res) => {
  const mangaId = req.params.id;
  const user = req.user;
  if (user) {
    user.bookmarks = user.bookmarks.filter(id => id !== mangaId);
  }
  res.redirect(`/manga/${mangaId}`);
});

router.post('/manga/:id/delete', checkAuthenticated, async (req, res) => {
  const mangaId = req.params.id;
  const mangaPath = path.join(__dirname, '../manga', mangaId);
  await fs.promises.rm(mangaPath, { recursive: true, force: true });
  res.redirect('/');
});

router.post('/manga/:id/:chapter/delete', checkAuthenticated, async (req, res) => {
  const mangaId = req.params.id;
  const chapterId = req.params.chapter;
  const manga = mangaUtils.getMangaById(mangaId);
  if (manga) {
    const chapterPath = path.join(__dirname, '../manga', mangaId, chapterId);
    await fs.promises.rm(chapterPath, { recursive: true, force: true });

    manga.chapters = manga.chapters.filter(c => c.id !== chapterId);
    const detailsPath = path.join(__dirname, '../manga', mangaId, 'details.json');
    await fs.promises.writeFile(detailsPath, JSON.stringify(manga, null, 2));

    res.redirect(`/manga/${mangaId}`);
  } else {
    res.status(404).send('Manga not found');
  }
});

module.exports = router;
