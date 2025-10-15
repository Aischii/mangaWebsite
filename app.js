
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
const { addUser, findUserByUsername, updateFamilySafe } = require('./utils/user');
const { addManga } = require('./utils/manga');
const { getUserBookmarkIds } = require('./utils/manga');

initializePassport(passport);

const app = express();
const basePort = parseInt(process.env.PORT || '3000', 10);



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

// Global CSRF for non-multipart requests; multipart routes will apply per-route after multer
app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) return next();
  csrfProtection(req, res, (err) => {
    if (err) return next(err);
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.locals.csrfToken = req.csrfToken();
    }
    next();
  });
});

// Attach user and bookmarks to views; set csrfToken if not already set
app.use((req, res, next) => {
  const finish = () => {
    res.locals.user = req.user;
    // Only generate tokens on safe methods to avoid rotating during POST
    if (!res.locals.csrfToken && (req.method === 'GET' || req.method === 'HEAD') && typeof req.csrfToken === 'function') {
      try { res.locals.csrfToken = req.csrfToken(); } catch (_) {}
    }
    next();
  };
  if (req.isAuthenticated && req.isAuthenticated()) {
    getUserBookmarkIds(req.user.id, (err, ids) => {
      if (!err) req.user.bookmarks = ids;
      finish();
    });
  } else {
    finish();
  }
});

const { optimizeImage, isSharpAvailable } = require('./utils/image');

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
    const origExt = path.extname(file.originalname || '').toLowerCase();
    const safeExt = origExt && origExt.length <= 5 ? origExt : '.jpg';
    const finalExt = isSharpAvailable ? '.webp' : safeExt;
    cb(null, `cover${finalExt}`);
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

// Apply csrf after multer for multipart form
app.post('/upload', isAdmin, coverUpload.single('cover'), csrfProtection,
  body('title').notEmpty(),
  (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).redirect('/upload');
  }

  const { title, otherTitle, author, artist, genre, status, type, synopsis, rating } = req.body;
  const mangaId = title.replace(/\s+/g, '-').toLowerCase();
  const manga = {
    title,
    otherTitle,
    author,
    artist,
    genre: genre,
    status,
    type,
    synopsis,
    cover: `/manga/${mangaId}/${req.file && req.file.filename ? req.file.filename : 'cover.webp'}`,
    rating: rating ? '18+' : ''
  };

  // Try to optimize the saved cover (optional if sharp is installed)
  const absCover = path.join(__dirname, 'manga', mangaId, (req.file && req.file.filename) ? req.file.filename : 'cover.webp');
  optimizeImage(absCover, { maxWidth: 600, quality: 80, outPath: absCover }).then(()=>{});

  addManga(manga, (err, insertId) => {
    if (err) {
      console.error(err);
      return res.redirect('/upload');
    }
    res.redirect('/');
  });
});

app.post('/settings/family-safe', checkAuthenticated, (req, res) => {
  const newValue = !req.user.familySafe;
  updateFamilySafe(req.user.id, newValue, (err) => {
    if (err) {
      console.error('Failed to update Family Safe:', err);
      return res.redirect(req.get('referer') || '/');
    }
    // reflect immediately for this request/session
    req.user.familySafe = newValue;
    res.redirect(req.get('referer') || '/');
  });
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

let server;
let started = false;
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const startApp = () => {
    if (started) return;
    started = true;
    const bind = (portToUse, attempts) => {
        server = app.listen(portToUse, () => {
            console.log(`Manga website listening at http://localhost:${portToUse}`);
        });
        server.on('close', () => {
            console.log('HTTP server closed');
        });
        server.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE' && attempts < 5) {
                const nextPort = portToUse + 1;
                console.warn(`Port ${portToUse} in use, retrying on ${nextPort}...`);
                bind(nextPort, attempts + 1);
            } else {
                console.error('HTTP server error:', err);
            }
        });
    };
    bind(basePort, 0);
};

const db = require('./utils/db');
// Ensure schema exists and migrate columns as needed
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('DB check failed:', err.message);
    return startApp();
  }
  if (!row) {
    const dbSetup = fs.readFileSync(path.resolve(__dirname, 'database.sql'), 'utf8');
    db.exec(dbSetup, (execErr) => {
      if (execErr) {
        console.error('DB setup error:', execErr.message);
      } else {
        console.log('Database created successfully.');
      }
      startApp();
    });
  } else {
    // Migrate: add status and type columns to manga if missing
    db.all("PRAGMA table_info(manga)", (piErr, cols) => {
      if (piErr) {
        console.error('DB pragma error:', piErr.message);
        return startApp();
      }
      const names = cols.map(c => c.name);
      const actions = [];
      if (!names.includes('status')) actions.push("ALTER TABLE manga ADD COLUMN status TEXT");
      if (!names.includes('type')) actions.push("ALTER TABLE manga ADD COLUMN type TEXT");
      // chapters.created_at
      db.all("PRAGMA table_info(chapters)", (pi2Err, cols2) => {
        if (!pi2Err) {
          const names2 = cols2.map(c => c.name);
          if (!names2.includes('created_at')) {
            // Older SQLite cannot add a column with a non-constant default
            // Step 1: add nullable column
            actions.push("ALTER TABLE chapters ADD COLUMN created_at TEXT");
            // Step 2 happens below after exec: backfill values
          }
        }
        // reading_progress table
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='reading_progress'", (tErr, tRow) => {
          const needCreateProgress = !tErr && !tRow;
          const execSQL = actions.join(';\n') + (needCreateProgress ? ';\n' +
            "CREATE TABLE IF NOT EXISTS reading_progress (user_id INTEGER NOT NULL, manga_id INTEGER NOT NULL, chapter_id INTEGER NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, manga_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (manga_id) REFERENCES manga(id) ON DELETE CASCADE, FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE)" : '');
          if (!execSQL.trim()) return startApp();
          db.exec(execSQL, (alErr) => {
            if (alErr) console.error('DB migrate error:', alErr.message);
            else console.log('DB migrated.');
            // Backfill created_at if we just added it
            db.run("UPDATE chapters SET created_at = datetime('now') WHERE created_at IS NULL", [], () => {
              startApp();
            });
          });
        });
      });
    });
  }
});
