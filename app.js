
const express = require('express');
const path = require('path');
const mangaRouter = require('./routes/manga');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

const initializePassport = require('./passport-config');
const { addUser, findUserByUsername } = require('./utils/user');

initializePassport(passport);

const app = express();
const port = 3000;

// Add a user for testing
const saltRounds = 10;
const password = 'password';
bcrypt.hash(password, saltRounds, (err, hash) => {
  addUser({ id: Date.now().toString(), username: 'admin', password: hash });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mangaId = req.body.title.replace(/\s+/g, '-').toLowerCase();
    const dir = path.join(__dirname, 'manga', mangaId);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false
}));

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/upload', checkAuthenticated, (req, res) => {
  res.render('upload');
});

app.post('/upload', checkAuthenticated, upload.single('cover'), (req, res) => {
  const { title, otherTitle, author, artist, genre, synopsis } = req.body;
  const mangaId = title.replace(/\s+/g, '-').toLowerCase();
  const details = {
    title,
    otherTitle,
    author,
    artist,
    genre: genre.split(',').map(g => g.trim()),
    synopsis,
    cover: req.file.filename
  };

  fs.writeFileSync(path.join(__dirname, 'manga', mangaId, 'details.json'), JSON.stringify(details, null, 2));

  res.redirect('/');
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.use('/', mangaRouter);

app.listen(port, () => {
  console.log(`Manga website listening at http://localhost:${port}`);
});
