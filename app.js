
require('dotenv').config();
const express = require('express');
const path = require('path');
const mangaRouter = require('./routes/manga');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const ejsLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const initializePassport = require('./passport-config');
const { addUser, findUserByUsername } = require('./utils/user');
const { addManga } = require('./utils/manga');

initializePassport(passport);

const app = express();
const port = 3000;



app.use(helmet());
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use('/manga', express.static(path.join(__dirname, 'manga'), { maxAge: '1d' }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
const csurf = require('csurf');

const csrfProtection = csurf();

app.use(bodyParser.urlencoded({ extended: false }));

app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mangaId = req.body.title.replace(/\s+/g, '-').toLowerCase();
    const dir = path.join(__dirname, 'manga', mangaId);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'cover.webp');
  }
});



app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

const { body, validationResult } = require('express-validator');

app.post('/register', 
  body('username').notEmpty(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).redirect('/register');
  }

  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = {
      username: req.body.username,
      password: hashedPassword,
      role: 'user'
    };
    addUser(user, (err, insertId) => {
      if (err) {
        console.error(err);
        return res.redirect('/register');
      }
      res.redirect('/login');
    });
  } catch {
    res.redirect('/register');
  }
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

app.post('/login', 
  body('username').notEmpty(),
  body('password').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).redirect('/login');
    }
    next();
  },
  passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false
}));

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});



app.get('/upload', isAdmin, (req, res) => {
  res.render('upload', { title: 'Upload Manga' });
});

const coverUpload = multer({ storage: coverStorage });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/login', authLimiter);
app.use('/register', authLimiter);

app.post('/upload', isAdmin, coverUpload.single('cover'), 
  body('title').notEmpty(),
  (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).redirect('/upload');
  }

  const { title, otherTitle, author, artist, genre, synopsis, rating } = req.body;
  const mangaId = title.replace(/\s+/g, '-').toLowerCase();
  const manga = {
    title,
    otherTitle,
    author,
    artist,
    genre: genre,
    synopsis,
    cover: `/manga/${mangaId}/cover.webp`,
    rating: rating ? '18+' : ''
  };

  addManga(manga, (err, insertId) => {
    if (err) {
      console.error(err);
      return res.redirect('/upload');
    }
    res.redirect('/');
  });
});

app.post('/settings/family-safe', checkAuthenticated, (req, res) => {
  req.user.familySafe = !req.user.familySafe;
  res.redirect(req.get('referer') || '/');
});

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Forbidden');
}

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
