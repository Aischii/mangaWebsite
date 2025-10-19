# AsagiScans – Dev Guide (Tailwind + SQLite)

This repo is a Node.js/Express manga reader/uploader with EJS views, Passport auth, SQLite, and Tailwind CSS for styling.

## Prerequisites

- Node.js 18+
- npm

## Install

1. Install dependencies (app + Tailwind build tooling):

   - Windows PowerShell:
     - `npm install`
   - If you previously used the CDN Tailwind, now we build locally.

2. Create an environment file `.env` (already present):

   - `SESSION_SECRET=your-super-secret-key`

## Tailwind CSS (local build)

We use Tailwind locally via PostCSS. Relevant files:

- `tailwind.config.js` – content globs + theme extension (colors: `bg`, `surface`, `surface2`, `brand`).
- `postcss.config.js` – PostCSS plugins (tailwindcss, autoprefixer).
- `src/tailwind.css` – Tailwind entry with `@tailwind base; @tailwind components; @tailwind utilities;`.
- Output: `public/css/tailwind.css` – served by Express.

Scripts:

- Build once: `npm run css:build`
- Watch (during dev): `npm run css:watch`

Steps to get styles:

1) `npm install` (installs tailwindcss, postcss, autoprefixer, and line-clamp plugin)
2) `npm run css:build` (generates `public/css/tailwind.css`)
3) `npm run dev` (start the app with nodemon) or `npm start`

Note: A very small placeholder `public/css/tailwind.css` is checked in so the site won’t break before your first build, but it only contains minimal styles. Run the build for the full UI.

## Recent Updates (What’s New)

- Homepage
  - Recently Updated section (top): shows up to 5 manga with the most‑recent chapter timestamp and links to their latest 2 chapters.
  - Cards are fully self‑contained (cover → title → chapter links) with badges: NEW (top 5 newest by id), HOT (≥3 chapters), 18+ (adult).
- Manga & Chapter
  - Comments and reactions (Upvote, Funny, Love, Surprised, Angry, Sad).
  - Reading progress (auto‑saves last read chapter per manga).
  - Timestamps on chapters (created_at) and ordered lists.
- Profile
  - Change nickname, password (with current password check), and avatar upload (auto‑crop 250×250 WebP).
  - Cleaner, responsive layout with cards and spacing.
- Mobile UX
  - Reliable mobile drawer (Menu) and optional bottom nav bar (Home, Search, Profile/Login, Upload).
- Security & Performance
  - Helmet with CSP + referrer policy, secure cookies, gzip compression.
  - CSRF applied (and fixed for multipart), stricter image upload filters and file limits.
  - Discourage image saving (block context menu/drag) and lazy‑load images.
  - Session cookie sameSite=lax, httpOnly, secure (prod).
- Favicon pipeline
  - `site_logo.webp` is used to generate `favicon-32.png` and `apple-touch-icon.png` in `public/favicon/`.

## Database

SQLite database is created/bootstrapped automatically from `database.sql` if needed on first run.

Migration from filesystem to DB:

- Script scans `/manga/<manga-slug>/<chapter-slug>/` and inserts missing manga + chapters into SQLite.
- Run: `npm run migrate-fs`

### Schema additions

- `manga.status`, `manga.type`
- `chapters.created_at` (auto‑backfilled on migrate)
- `reading_progress(user_id, manga_id, chapter_id, updated_at)`
- `comments(id, user_id, target_type, target_id, body, created_at)`
- `reactions(user_id, target_type, target_id, emoji, updated_at)`
- `users.avatar`, `users.nickname`

## Auth & Admin

- Local username/password with Passport Local and bcrypt.
- Create default admin user "asagippo": already created in prior step. To recreate:
  - `npm run create-admin` (prints a temporary password)
- Promote any existing user to admin:
  - `npm run make-admin -- <username>`

### Profile management

- Change nickname: POST `/profile/nickname`
- Change password: POST `/profile/password` (requires current password)
- Change avatar: POST `/profile/avatar` (auto‑crop 250×250 and convert to WebP)

## Run

- Dev: `npm run dev`
- Prod: `npm start`
- The server binds to `PORT` env var or 3000. If port is in use, it retries on subsequent ports and logs the chosen one.

## Scripts

- `npm run css:build` – Build Tailwind CSS
- `npm run css:watch` – Watch Tailwind CSS during development
- `npm run migrate-fs` – Import `manga/` filesystem into DB
- `npm run convert-covers` – Normalize DB cover paths and write real WebP covers
- `npm run make-favicon` – Generate `favicon-32.png` and `apple-touch-icon.png` from `public/favicon/site_logo.webp`
- `npm run make-admin -- <username>` – Promote a user to admin
- `npm run create-admin` – Create admin `asagippo` with temp password

## Project Structure (partial)

- `app.js` – Express app, routes, middleware, DB bootstrap
- `routes/` – Express routers (manga browsing, upload, edit)
- `utils/` – DB helpers (`db.js`, `manga.js`, `user.js`)
- `views/` – EJS templates (Tailwind-based UI)
- `public/` – static assets
- `scripts/` – utilities
  - `create-admin.js` – create or promote `asagippo` to admin
  - `make-admin.js` – promote arbitrary username to admin
  - `migrate-fs-to-db.js` – import `/manga` folder structure into DB
  - `convert-covers.js` – convert existing covers to real WebP and normalize DB paths
  - `make-favicon.js` – generate favicon images from webp logo

## Notes

- If you want to adjust the palette, edit `tailwind.config.js` and re-run `npm run css:build`.
- We added `@tailwindcss/line-clamp` and use classes like `line-clamp-2` in the UI.
- If you deploy to a host that doesn’t run a build step, commit `public/css/tailwind.css` after running `npm run css:build` locally so the app can serve it directly.

### Security & hardening

- Helmet CSP and referrer policy are enabled; inline scripts/styles are currently allowed for simplicity. For stricter CSP, move inline scripts into external files and remove `'unsafe-inline'` from CSP.
- CSRF is applied to all non‑multipart requests, and explicitly after Multer for multipart forms.
- Session cookies are httpOnly + sameSite=lax; set `NODE_ENV=production` for Secure cookies.
- Right‑click/drag saving of images is discouraged (not bulletproof) and images are lazily loaded.
