
const users = [];

const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

const findUserById = (id) => {
  return users.find(user => user.id === id);
};

const addUser = (user) => {
  users.push(user);
};

module.exports = { findUserByUsername, findUserById, addUser };
