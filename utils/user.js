const db = require('./db');

const findUserByUsername = (username, callback) => {
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return callback(err);
    }
    return callback(null, row);
  });
};

const findUserById = (id, callback) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      return callback(err);
    }
    return callback(null, row);
  });
};

const addUser = (user, callback) => {
  const { username, password, role } = user;
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role], function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, this.lastID);
  });
};

// Profile updates
const updateNickname = (id, nickname, callback) => {
  db.run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, id], function(err){
    if (err) return callback(err);
    callback(null, this.changes);
  });
};

const updatePasswordHash = (id, passwordHash, callback) => {
  db.run('UPDATE users SET password = ? WHERE id = ?', [passwordHash, id], function(err){
    if (err) return callback(err);
    callback(null, this.changes);
  });
};

const updateAvatarPath = (id, avatarPath, callback) => {
  db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, id], function(err){
    if (err) return callback(err);
    callback(null, this.changes);
  });
};
const updateFamilySafe = (id, familySafe, callback) => {
  const value = familySafe ? 1 : 0;
  db.run('UPDATE users SET familySafe = ? WHERE id = ?', [value, id], function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, this.changes);
  });
};

module.exports = { findUserByUsername, findUserById, addUser, updateFamilySafe, updateNickname, updatePasswordHash, updateAvatarPath };
