const db = require('./db');
const fs = require('fs');
const path = require('path');

const generateSlug = (title) => {
  return title.replace(/\s+/g, '-').toLowerCase();
};

const addManga = (manga, callback) => {
  manga.slug = generateSlug(manga.title);
  const { title, slug, otherTitle, author, artist, genre, synopsis, cover, rating } = manga;
  db.run('INSERT INTO manga (title, slug, otherTitle, author, artist, genre, synopsis, cover, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, slug, otherTitle, author, artist, genre, synopsis, cover, rating], function(err) {
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
    db.all('SELECT * FROM chapters WHERE manga_id = ? ORDER BY id ASC', [mangaId], (err, rows) => {
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
    const { title, slug, otherTitle, author, artist, genre, synopsis, rating } = manga;
    db.run('UPDATE manga SET title = ?, slug = ?, otherTitle = ?, author = ?, artist = ?, genre = ?, synopsis = ?, rating = ? WHERE id = ?',
        [title, slug, otherTitle, author, artist, genre, synopsis, rating, id], function(err) {
        if (err) {
            return callback(err);
        }
        return callback(null, this.changes);
    });
};

const addChapter = (chapter, callback) => {
  chapter.slug = generateSlug(chapter.title);
  const { manga_id, title, slug, pages } = chapter;
  db.run('INSERT INTO chapters (manga_id, title, slug, pages) VALUES (?, ?, ?, ?)',
    [manga_id, title, slug, pages], function(err) {
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
    const { title, slug } = chapter;
    db.run('UPDATE chapters SET title = ?, slug = ? WHERE id = ?', [title, slug, id], function(err) {
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
  getUserBookmarkIds
};
