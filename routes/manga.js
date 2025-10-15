const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const csrfProtection = csurf();
const mangaUtils = require('../utils/manga');
const comments = require('../utils/comments');

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
const { optimizeImage } = require('../utils/image');

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

      // Compute chapter counts to mark HOT and get latest chapters map
      mangaUtils.getChapterCounts((cntErr, counts) => {
        if (cntErr) {
          console.error(cntErr);
          return res.status(500).send('Internal Server Error');
        }
        mangaUtils.getLatestChaptersMap(2, (lcErr, latestMap) => {
          if (lcErr) {
            console.error(lcErr);
            return res.status(500).send('Internal Server Error');
          }

          const { q, genre, page = 1 } = req.query;
          const limit = 10;
          const offset = (page - 1) * limit;

          // Mark NEW as top 5 newest by id
          const newestIds = [...mangaLibrary]
            .sort((a,b)=>b.id-a.id)
            .slice(0,5)
            .map(m => m.id);

          // Filter and annotate
          let filteredManga = mangaLibrary.map(m => ({
            ...m,
            isAdult: m.rating === '18+',
            isHot: (counts[m.id] || 0) >= 3,
            isNew: newestIds.includes(m.id),
            latestChapters: latestMap[m.id] || []
          }));

          if (!(req.user && !req.user.familySafe)) {
            filteredManga = filteredManga.filter(m => !m.isAdult);
          }

          if (q) {
            filteredManga = filteredManga.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
          }

          if (genre) {
            filteredManga = filteredManga.filter(m => (m.genre || '').includes(genre));
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
        const latest = chapters && chapters.length ? chapters[chapters.length - 1] : null;
        // Reading progress
        const finalize = (progress) => {
          const description = manga.synopsis ? manga.synopsis.slice(0, 180) : manga.title;
          comments.getReactionCounts('manga', manga.id, (rErr, reacts) => {
            comments.getComments('manga', manga.id, (cErr, list) => {
              res.render('manga', { manga, title: manga.title, progress, latest, reactions: reacts || {}, comments: list || [], meta: { description, ogTitle: manga.title, image: manga.cover } });
            });
          });
        };
        if (req.isAuthenticated && req.isAuthenticated()) {
          mangaUtils.getReadingProgress(req.user.id, manga.id, (pErr, progress) => finalize(progress));
        } else {
          finalize(null);
        }
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
            const { title, otherTitle, author, artist, genre, status, type, synopsis, rating } = req.body;
            const updatedManga = {
              title,
              otherTitle,
              author,
              artist,
              genre: genre,
              status,
              type,
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

// Apply csrf after multer for multipart form
router.post('/manga/:slug/upload-chapter', isAdmin, chapterUpload.array('pages'), csrfProtection,
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
            // Try to optimize each page (optional)
            req.files.forEach(f => {
              const abs = path.join(__dirname, '../manga', manga.slug, chapterSlug, f.filename);
              optimizeImage(abs, { maxWidth: 1280, quality: 80, outPath: abs }).then(()=>{});
            });

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
        if (!manga) {
            return res.status(404).send('Manga not found');
        }
        mangaUtils.getChaptersByMangaId(manga.id, (chapErr, chapters) => {
            if (chapErr) {
                console.error(chapErr);
                return res.status(500).send('Internal Server Error');
            }
            manga.chapters = chapters || [];
            mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (err2, chapter) => {
                if (err2) {
                    console.error(err2);
                    return res.status(500).send('Internal Server Error');
                }
                if (!chapter) {
                    return res.status(404).send('Chapter not found');
                }
                const pages = JSON.parse(chapter.pages);
                // Save reading progress for logged-in users
                if (req.isAuthenticated && req.isAuthenticated()) {
                  mangaUtils.setReadingProgress(req.user.id, manga.id, chapter.id, () => {});
                }
                comments.getReactionCounts('chapter', chapter.id, (rErr, reacts) => {
                  comments.getComments('chapter', chapter.id, (cErr, list) => {
                    res.render('chapter', { manga, chapter, pages, reactions: reacts || {}, comments: list || [], title: `${manga.title} - ${chapter.title}` });
                  });
                });
            });
        });
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

// Comments and reactions - Manga
router.post('/manga/:slug/comment', checkAuthenticated, csrfProtection, (req, res) => {
  mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
    if (err || !manga) return res.redirect(`/manga/${req.params.slug}`);
    const body = (req.body.body || '').trim();
    if (!body) return res.redirect(`/manga/${manga.slug}`);
    comments.addComment({ user_id: req.user.id, target_type: 'manga', target_id: manga.id, body }, () => res.redirect(`/manga/${manga.slug}`));
  });
});

router.post('/manga/:slug/react', checkAuthenticated, csrfProtection, (req, res) => {
  mangaUtils.getMangaBySlug(req.params.slug, (err, manga) => {
    if (err || !manga) return res.redirect(`/manga/${req.params.slug}`);
    const emoji = (req.body.emoji || '').trim();
    comments.setReaction(req.user.id, 'manga', manga.id, emoji, () => res.redirect(`/manga/${manga.slug}`));
  });
});

// Comments and reactions - Chapter
router.post('/manga/:mangaSlug/:chapterSlug/comment', checkAuthenticated, csrfProtection, (req, res) => {
  mangaUtils.getMangaBySlug(req.params.mangaSlug, (err, manga) => {
    if (err || !manga) return res.redirect(`/manga/${req.params.mangaSlug}/${req.params.chapterSlug}`);
    mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (e2, chapter) => {
      if (e2 || !chapter) return res.redirect(`/manga/${manga.slug}`);
      const body = (req.body.body || '').trim();
      if (!body) return res.redirect(`/manga/${manga.slug}/${chapter.slug}`);
      comments.addComment({ user_id: req.user.id, target_type: 'chapter', target_id: chapter.id, body }, () => res.redirect(`/manga/${manga.slug}/${chapter.slug}`));
    });
  });
});

router.post('/manga/:mangaSlug/:chapterSlug/react', checkAuthenticated, csrfProtection, (req, res) => {
  mangaUtils.getMangaBySlug(req.params.mangaSlug, (err, manga) => {
    if (err || !manga) return res.redirect(`/manga/${req.params.mangaSlug}/${req.params.chapterSlug}`);
    mangaUtils.getChapterBySlug(manga.id, req.params.chapterSlug, (e2, chapter) => {
      if (e2 || !chapter) return res.redirect(`/manga/${manga.slug}`);
      const emoji = (req.body.emoji || '').trim();
      comments.setReaction(req.user.id, 'chapter', chapter.id, emoji, () => res.redirect(`/manga/${manga.slug}/${chapter.slug}`));
    });
  });
});

module.exports = router;
