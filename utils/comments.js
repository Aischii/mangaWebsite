const db = require('./db');

function addComment({ user_id, target_type, target_id, parent_id, body }, cb) {
  db.run('INSERT INTO comments (user_id, target_type, target_id, parent_id, body) VALUES (?, ?, ?, ?, ?)', [user_id, target_type, target_id, parent_id || null, body], function(err){
    if (err) return cb(err);
    cb(null, this.lastID);
  });
}

function getComments(target_type, target_id, sort, cb) {
  const baseSql = `
    SELECT c.*, u.username, u.nickname, u.avatar,
      SUM(CASE WHEN r.emoji = 'up' THEN 1 ELSE 0 END) AS upvotes,
      SUM(CASE WHEN r.emoji = 'down' THEN 1 ELSE 0 END) AS downvotes
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN reactions r ON r.target_type = 'comment' AND r.target_id = c.id
    WHERE c.target_type = ? AND c.target_id = ?
    GROUP BY c.id
  `;
  db.all(baseSql, [target_type, target_id], (err, rows) => {
    if (err) return cb(err);
    const map = {};
    rows.forEach(r => { r.replies = []; map[r.id] = r; });
    const roots = [];
    rows.forEach(r => {
      if (r.parent_id) {
        if (map[r.parent_id]) map[r.parent_id].replies.push(r);
      } else {
        roots.push(r);
      }
    });
    roots.forEach(p => p.replies.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at)));
    const mode = (sort || 'new').toLowerCase();
    if (mode === 'old' || mode === 'oldest') roots.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
    else if (mode === 'best') roots.sort((a,b)=> ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0)) || new Date(b.created_at) - new Date(a.created_at));
    else roots.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    cb(null, roots);
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
