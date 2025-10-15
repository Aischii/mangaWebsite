const pool = require('./db');
const fs = require('fs');
const path = require('path');

const generateSlug = (title) => {
  return title.replace(/\s+/g, '-').toLowerCase();
};

const addManga = (manga, callback) => {
  manga.slug = generateSlug(manga.title);
  pool.query('INSERT INTO manga SET ?', manga, (err, results) => {
    if (err) {
      return callback(err);
    }
    return callback(null, results.insertId);
  });
};

const getMangaLibrary = (callback) => {
  pool.query('SELECT * FROM manga', (err, results) => {
    if (err) {
      return callback(err);
    }
    return callback(null, results);
  });
};

const getAllGenres = (callback) => {
    pool.query('SELECT DISTINCT genre FROM manga', (err, results) => {
        if (err) {
            return callback(err);
        }
        const genres = results.map(row => row.genre).join(',').split(',').map(g => g.trim()).filter(g => g);
        const uniqueGenres = [...new Set(genres)];
        return callback(null, uniqueGenres);
    });
};

const getMangaById = (id, callback) => {
    pool.query('SELECT * FROM manga WHERE id = ?', [id], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results[0]);
    });
};

const getMangaBySlug = (slug, callback) => {
    pool.query('SELECT * FROM manga WHERE slug = ?', [slug], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results[0]);
    });
};

const getChaptersByMangaId = (mangaId, callback) => {
    pool.query('SELECT * FROM chapters WHERE manga_id = ?', [mangaId], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const getChapterBySlug = (mangaId, slug, callback) => {
    pool.query('SELECT * FROM chapters WHERE manga_id = ? AND slug = ?', [mangaId, slug], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results[0]);
    });
};

const updateManga = (id, manga, callback) => {
    if (manga.title) {
        manga.slug = generateSlug(manga.title);
    }
    pool.query('UPDATE manga SET ? WHERE id = ?', [manga, id], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const addChapter = (chapter, callback) => {
  chapter.slug = generateSlug(chapter.title);
  pool.query('INSERT INTO chapters SET ?', chapter, (err, results) => {
    if (err) {
      return callback(err);
    }
    return callback(null, results.insertId);
  });
};

const updateChapter = (id, chapter, callback) => {
    if (chapter.title) {
        chapter.slug = generateSlug(chapter.title);
    }
    pool.query('UPDATE chapters SET ? WHERE id = ?', [chapter, id], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const deleteChapter = (id, callback) => {
    pool.query('DELETE FROM chapters WHERE id = ?', [id], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const deleteManga = (id, callback) => {
    pool.query('DELETE FROM manga WHERE id = ?', [id], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const addBookmark = (userId, mangaId, callback) => {
    pool.query('INSERT INTO bookmarks SET ?', { user_id: userId, manga_id: mangaId }, (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const removeBookmark = (userId, mangaId, callback) => {
    pool.query('DELETE FROM bookmarks WHERE user_id = ? AND manga_id = ?', [userId, mangaId], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
    });
};

const getBookmarkedManga = (userId, callback) => {
    pool.query('SELECT m.* FROM manga m JOIN bookmarks b ON m.id = b.manga_id WHERE b.user_id = ?', [userId], (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results);
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
  getBookmarkedManga
};