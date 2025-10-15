const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { findUserByUsername, findUserById } = require('./utils/user');

function initialize(passport) {
  const authenticateUser = (username, password, done) => {
    findUserByUsername(username, async (err, user) => {
      if (err) {
        return done(err);
      }
      if (user == null) {
        return done(null, false, { message: 'No user with that username' });
      }

      try {
        if (await bcrypt.compare(password, user.password)) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (e) {
        return done(e);
      }
    });
  };

  passport.use(new LocalStrategy({ usernameField: 'username' }, authenticateUser));
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    findUserById(id, (err, user) => {
      if (err) {
        return done(err);
      }
      return done(null, user);
    });
  });
}

module.exports = initialize;