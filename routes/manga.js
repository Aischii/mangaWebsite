const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const mangaUtils = require('../utils/manga');

const chapterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mangaSlug = req.params.slug;
    const chapterSlug = req.body.chapterTitle.replace(/\s+/g, '-').toLowerCase();
    const dir = path.join(__dirname, '../manga', mangaSlug, chapterSlug);
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

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Forbidden');
}

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

router.get('/', (req, res) => {
  mangaUtils.getMangaLibrary((err, mangaLibrary) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    mangaUtils.getAllGenres((err, allGenres) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      const { q, genre, page = 1 } = req.query;
      const limit = 10;
      const offset = (page - 1) * limit;

      let filteredManga = mangaLibrary;

      if (req.user && !req.user.familySafe) {
        // do not filter for logged in user with family safe off
      } else {
        filteredManga = filteredManga.filter(manga => manga.rating !== '18+');
      }

      if (q) {
        filteredManga = filteredManga.filter(manga => manga.title.toLowerCase().includes(q.toLowerCase()));
      }

      if (genre) {
        filteredManga = filteredManga.filter(manga => manga.genre.includes(genre));
      }

      const paginatedManga = filteredManga.slice(offset, offset + limit);
      const totalPages = Math.ceil(filteredManga.length / limit);

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
  });
});

router.get('/manga/:slug', (req, res) => {
  mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    if (manga) {
      mangaUtils.getChaptersByMangaId(manga.id, (err, chapters) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Internal Server Error');
        }
        manga.chapters = chapters;
        res.render('manga', { manga, title: manga.title });
      });
    } else {
      res.status(404).send('Manga not found');
    }
  });
});

router.get('/manga/:slug/edit', isAdmin, (req, res) => {
  mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    if (manga) {
      res.render('edit-manga', { manga, title: 'Edit Manga' });
    } else {
      res.status(404).send('Manga not found');
    }
  });
});

router.post('/manga/:slug/edit', isAdmin,
  body('title').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).redirect(`/manga/${req.params.slug}/edit`);
    }

    mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            const { title, otherTitle, author, artist, genre, synopsis, rating } = req.body;
            const updatedManga = {
              title,
              otherTitle,
              author,
              artist,
              genre: genre,
              synopsis,
              rating: rating ? '18+' : ''
            };

            mangaUtils.updateManga(manga.id, updatedManga, (err, results) => {
              if (err) {
                console.error(err);
                return res.redirect(`/manga/${manga.slug}/edit`);
              }
              res.redirect(`/manga/${updatedManga.slug}`);
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
  }
);

router.get('/manga/:slug/upload-chapter', isAdmin, (req, res) => {
    mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            res.render('upload-chapter', { manga, title: 'Upload Chapter' });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

router.post('/manga/:slug/upload-chapter', isAdmin, chapterUpload.array('pages'),
  body('chapterTitle').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).redirect(`/manga/${req.params.slug}/upload-chapter`);
    }

    mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            const chapterTitle = req.body.chapterTitle;
            const chapterSlug = chapterTitle.replace(/\s+/g, '-').toLowerCase();
            const pages = req.files.map(file => `/manga/${manga.slug}/${chapterSlug}/${file.filename}`);

            const chapter = {
              manga_id: manga.id,
              title: chapterTitle,
              pages: JSON.stringify(pages)
            };

            mangaUtils.addChapter(chapter, (err, insertId) => {
              if (err) {
                console.error(err);
                return res.redirect(`/manga/${manga.slug}/upload-chapter`);
              }
              res.redirect(`/manga/${manga.slug}`);
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
  }
);

router.get('/manga/:mangaSlug/:chapterSlug/edit', isAdmin, (req, res) => {
    mangaUtils.getMangaBySlug(req.params.mangaSlug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (err, chapter) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                if (chapter) {
                    res.render('edit-chapter', { manga, chapter, title: 'Edit Chapter' });
                } else {
                    res.status(404).send('Chapter not found');
                }
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

router.post('/manga/:mangaSlug/:chapterSlug/edit', isAdmin,
    body('title').notEmpty(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).redirect(`/manga/${req.params.mangaSlug}/${req.params.chapterSlug}/edit`);
        }

        mangaUtils.getMangaBySlug(req.params.mangaSlug, (err, manga) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (manga) {
                mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (err, chapter) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Internal Server Error');
                    }
                    if (chapter) {
                        const { title } = req.body;
                        const updatedChapter = {
                            title: title
                        };
                        mangaUtils.updateChapter(chapter.id, updatedChapter, (err, results) => {
                            if (err) {
                                console.error(err);
                                return res.redirect(`/manga/${manga.slug}/${chapter.slug}/edit`);
                            }
                            res.redirect(`/manga/${manga.slug}`);
                        });
                    } else {
                        res.status(404).send('Chapter not found');
                    }
                });
            } else {
                res.status(404).send('Manga not found');
            }
        });
    }
);

router.get('/manga/:mangaSlug/:chapterSlug', (req, res) => {
    mangaUtils.getMangaBySlug(req.params.mangaSlug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (err, chapter) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                if (chapter) {
                    const pages = JSON.parse(chapter.pages);
                    res.render('chapter', { manga, chapter, pages, title: `${manga.title} - ${chapter.title}` });
                } else {
                    res.status(404).send('Chapter not found');
                }
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

router.get('/profile', checkAuthenticated, (req, res) => {
  mangaUtils.getBookmarkedManga(req.user.id, (err, mangaLibrary) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('profile', { mangaLibrary, title: 'My Profile' });
  });
});

router.post('/manga/:slug/bookmark', checkAuthenticated, (req, res) => {
    mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            mangaUtils.addBookmark(req.user.id, manga.id, (err, results) => {
                if (err) {
                    console.error(err);
                }
                res.redirect(`/manga/${req.params.slug}`);
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

router.post('/manga/:slug/unbookmark', checkAuthenticated, (req, res) => {
    mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            mangaUtils.removeBookmark(req.user.id, manga.id, (err, results) => {
                if (err) {
                    console.error(err);
                }
                res.redirect(`/manga/${req.params.slug}`);
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

router.post('/manga/:slug/delete', isAdmin, (req, res) => {
    mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            const mangaPath = path.join(__dirname, '../manga', manga.slug);
            fs.rm(mangaPath, { recursive: true, force: true }, (err) => {
                if (err) {
                    console.error(err);
                }
            });
            mangaUtils.deleteManga(manga.id, (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                res.redirect('/');
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

router.post('/manga/:mangaSlug/:chapterSlug/delete', isAdmin, (req, res) => {
    mangaUtils.getMangaBySlug(req.params.mangaSlug, (err, manga) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (manga) {
            mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (err, chapter) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                if (chapter) {
                    const chapterPath = path.join(__dirname, '../manga', manga.slug, chapter.slug);
                    fs.rm(chapterPath, { recursive: true, force: true }, (err) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                    mangaUtils.deleteChapter(chapter.id, (err, results) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }
                        res.redirect(`/manga/${manga.slug}`);
                    });
                } else {
                    res.status(404).send('Chapter not found');
                }
            });
        } else {
            res.status(404).send('Manga not found');
        }
    });
});

module.exports = router;