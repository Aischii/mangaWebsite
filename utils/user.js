const pool = require('./db');

const findUserByUsername = (username, callback) => {
  pool.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) {
      return callback(err);
    }
    return callback(null, results[0]);
  });
};

const findUserById = (id, callback) => {
  pool.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) {
      return callback(err);
    }
    return callback(null, results[0]);
  });
};

const addUser = (user, callback) => {
  pool.query('INSERT INTO users SET ?', user, (err, results) => {
    if (err) {
      return callback(err);
    }
    return callback(null, results.insertId);
  });
};

module.exports = { findUserByUsername, findUserById, addUser };