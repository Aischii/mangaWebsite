const db = require('./db');

function addComment({ user_id, target_type, target_id, body }, cb) {
  db.run('INSERT INTO comments (user_id, target_type, target_id, body) VALUES (?, ?, ?, ?)', [user_id, target_type, target_id, body], function(err){
    if (err) return cb(err);
    cb(null, this.lastID);
  });
}

function getComments(target_type, target_id, cb) {
  const sql = `SELECT c.*, u.username, u.nickname, u.avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.target_type = ? AND c.target_id = ? ORDER BY c.created_at DESC`;
  db.all(sql, [target_type, target_id], (err, rows) => {
    if (err) return cb(err);
    cb(null, rows);
  });
}

function setReaction(user_id, target_type, target_id, emoji, cb) {
  db.run("INSERT INTO reactions (user_id, target_type, target_id, emoji, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id, target_type, target_id) DO UPDATE SET emoji=excluded.emoji, updated_at=excluded.updated_at", [user_id, target_type, target_id, emoji], function(err){
    if (err) return cb(err);
    cb(null, this.changes);
  });
}

function getReactionCounts(target_type, target_id, cb) {
  db.all('SELECT emoji, COUNT(*) AS cnt FROM reactions WHERE target_type = ? AND target_id = ? GROUP BY emoji', [target_type, target_id], (err, rows) => {
    if (err) return cb(err);
    const map = {};
    rows.forEach(r => { map[r.emoji] = r.cnt; });
    cb(null, map);
  });
}

// Bulk counts for many targets; returns map[target_id] = { emoji: count }
function getReactionCountsBulk(target_type, target_ids, cb) {
  const ids = (target_ids || []).filter(Boolean);
  if (!ids.length) return cb(null, {});
  const placeholders = ids.map(() => '?').join(',');
  const sql = `SELECT target_id, emoji, COUNT(*) AS cnt FROM reactions WHERE target_type = ? AND target_id IN (${placeholders}) GROUP BY target_id, emoji`;
  db.all(sql, [target_type, ...ids], (err, rows) => {
    if (err) return cb(err);
    const out = {};
    rows.forEach(r => {
      if (!out[r.target_id]) out[r.target_id] = {};
      out[r.target_id][r.emoji] = r.cnt;
    });
    cb(null, out);
  });
}

module.exports = { addComment, getComments, setReaction, getReactionCounts, getReactionCountsBulk };
