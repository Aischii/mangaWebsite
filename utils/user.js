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

// exports consolidated at end of file
const updateFamilySafe = (id, familySafe, callback) => {
  const value = familySafe ? 1 : 0;
  db.run('UPDATE users SET familySafe = ? WHERE id = ?', [value, id], function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, this.changes);
  });
};

module.exports = { findUserByUsername, findUserById, addUser, updateFamilySafe };
