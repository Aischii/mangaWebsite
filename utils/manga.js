const db = require('./db');

const generateSlug = (title) => {
  return title.replace(/\s+/g, '-').toLowerCase();
};

const addManga = (manga, callback) => {
  manga.slug = generateSlug(manga.title);
  const { title, slug, otherTitle, author, artist, genre, status, type, synopsis, cover, rating } = manga;
  db.run('INSERT INTO manga (title, slug, otherTitle, author, artist, genre, status, type, synopsis, cover, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, slug, otherTitle, author, artist, genre, status, type, synopsis, cover, rating], function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, this.lastID);
  });
};

const getMangaLibrary = (callback) => {
  db.all('SELECT * FROM manga', [], (err, rows) => {
    if (err) {
      return callback(err);
    }
    return callback(null, rows);
  });
};

const getLatestChaptersForMangaIds = (ids, limit, callback) => {
  if (!ids.length) {
    return callback(null, {});
  }

  const placeholders = ids.map(() => '?').join(',');
  const sql = `
    SELECT manga_id AS mangaId, title, slug, created_at
    FROM chapters
    WHERE manga_id IN (${placeholders})
    ORDER BY manga_id ASC, datetime(created_at) DESC, id DESC
  `;

  db.all(sql, ids, (err, rows) => {
    if (err) {
      return callback(err);
    }

    const grouped = ids.reduce((acc, id) => {
      acc[id] = [];
      return acc;
    }, {});

    rows.forEach(row => {
      const list = grouped[row.mangaId] || (grouped[row.mangaId] = []);
      if (list.length < limit) {
        list.push({
          title: row.title,
          slug: row.slug,
          created_at: row.created_at
        });
      }
    });

    callback(null, grouped);
  });
};

const getAllGenres = (callback) => {
    db.all('SELECT DISTINCT genre FROM manga', [], (err, rows) => {
        if (err) {
            return callback(err);
        }
        const genres = rows.map(row => row.genre).join(',').split(',').map(g => g.trim()).filter(g => g);
        const uniqueGenres = [...new Set(genres)];
        return callback(null, uniqueGenres);
    });
};

const getMangaById = (id, callback) => {
    db.get('SELECT * FROM manga WHERE id = ?', [id], (err, row) => {
        if (err) {
            return callback(err);
        }
        return callback(null, row);
    });
};

const getMangaBySlug = (slug, callback) => {
    db.get('SELECT * FROM manga WHERE slug = ?', [slug], (err, row) => {
        if (err) {
            return callback(err);
        }
        return callback(null, row);
    });
};

const getChaptersByMangaId = (mangaId, callback) => {
    db.all('SELECT * FROM chapters WHERE manga_id = ? ORDER BY created_at ASC, id ASC', [mangaId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        return callback(null, rows);
    });
};

const getChapterBySlug = (mangaId, slug, callback) => {
    db.get('SELECT * FROM chapters WHERE manga_id = ? AND slug = ?', [mangaId, slug], (err, row) => {
        if (err) {
            return callback(err);
        }
        return callback(null, row);
    });
};

const updateManga = (id, manga, callback) => {
    if (manga.title) {
        manga.slug = generateSlug(manga.title);
    }
    const { title, slug, otherTitle, author, artist, genre, status, type, synopsis, rating } = manga;
    db.run('UPDATE manga SET title = ?, slug = ?, otherTitle = ?, author = ?, artist = ?, genre = ?, status = ?, type = ?, synopsis = ?, rating = ? WHERE id = ?',
        [title, slug, otherTitle, author, artist, genre, status, type, synopsis, rating, id], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.changes);
    });
};

const addChapter = (chapter, callback) => {
  chapter.slug = generateSlug(chapter.title);
  const vol = (chapter.volume && String(chapter.volume).trim()) || 'Unknown Volume';
  const { manga_id, title, slug, pages } = chapter;
  db.run("INSERT INTO chapters (manga_id, title, slug, pages, volume, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
    [manga_id, title, slug, pages, vol], function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, this.lastID);
  });
};

const updateChapter = (id, chapter, callback) => {
    if (chapter.title) {
        chapter.slug = generateSlug(chapter.title);
    }
    const vol = (chapter.volume !== undefined) ? ((String(chapter.volume).trim()) || 'Unknown Volume') : undefined;
    const { title, slug } = chapter;
    const fields = ['title = ?', 'slug = ?'];
    const params = [title, slug];
    if (vol !== undefined) { fields.push('volume = ?'); params.push(vol); }
    params.push(id);
    db.run(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, params, function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.changes);
    });
};

const deleteChapter = (id, callback) => {
    db.run('DELETE FROM chapters WHERE id = ?', [id], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.changes);
    });
};

const deleteManga = (id, callback) => {
    db.run('DELETE FROM manga WHERE id = ?', [id], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.changes);
    });
};

const addBookmark = (userId, mangaId, callback) => {
    db.run('INSERT INTO bookmarks (user_id, manga_id) VALUES (?, ?)', [userId, mangaId], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.lastID);
    });
};

const removeBookmark = (userId, mangaId, callback) => {
    db.run('DELETE FROM bookmarks WHERE user_id = ? AND manga_id = ?', [userId, mangaId], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.changes);
    });
};

const getBookmarkedManga = (userId, callback) => {
    db.all('SELECT m.* FROM manga m JOIN bookmarks b ON m.id = b.manga_id WHERE b.user_id = ?', [userId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        return callback(null, rows);
    });
};

const getUserBookmarkIds = (userId, callback) => {
    db.all('SELECT manga_id FROM bookmarks WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            return callback(err);
        }
        const ids = rows.map(r => r.manga_id);
        return callback(null, ids);
    });
};

module.exports = {
  addManga,
  getMangaLibrary,
  getAllGenres,
  getMangaById,
  getMangaBySlug,
  getChaptersByMangaId,
  getChapterBySlug,
  updateManga,
  addChapter,
  updateChapter,
  deleteChapter,
  deleteManga,
  addBookmark,
  removeBookmark,
  getBookmarkedManga,
  getUserBookmarkIds,
  getChapterCounts,
  setReadingProgress,
  getReadingProgress,
  getLatestChaptersMap
};

// Return a map of manga_id -> chapter count for all manga
function getChapterCounts(callback) {
  db.all('SELECT manga_id AS id, COUNT(*) AS cnt FROM chapters GROUP BY manga_id', [], (err, rows) => {
    if (err) return callback(err);
    const map = {};
    rows.forEach(r => { map[r.id] = r.cnt; });
    callback(null, map);
  });
}

// Reading progress helpers
function setReadingProgress(userId, mangaId, chapterId, callback) {
  db.run(
    "INSERT INTO reading_progress (user_id, manga_id, chapter_id, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, manga_id) DO UPDATE SET chapter_id = excluded.chapter_id, updated_at = excluded.updated_at",
    [userId, mangaId, chapterId],
    function (err) { if (err) return callback(err); callback(null, this.changes); }
  );
}

function getReadingProgress(userId, mangaId, callback) {
  db.get('SELECT * FROM reading_progress WHERE user_id = ? AND manga_id = ?', [userId, mangaId], (err, row) => {
    if (err) return callback(err);
    callback(null, row);
  });
}

// Get a map of manga_id -> latest chapters array (up to `limit`)
function getLatestChaptersMap(limit, callback) {
  const lim = Number(limit) > 0 ? Number(limit) : 2;
  const sql = 'SELECT id, manga_id, title, slug, created_at FROM chapters ORDER BY created_at DESC, id DESC';
  db.all(sql, [], (err, rows) => {
    if (err) return callback(err);
    const map = {};
    for (const r of rows) {
      if (!map[r.manga_id]) map[r.manga_id] = [];
      if (map[r.manga_id].length < lim) map[r.manga_id].push(r);
    }
    callback(null, map);
  });
}
