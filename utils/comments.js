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

module.exports = { addComment, getComments, setReaction, getReactionCounts };

