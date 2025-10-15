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

## Database

SQLite database is created/bootstrapped automatically from `database.sql` if needed on first run.

Migration from filesystem to DB:

- Script scans `/manga/<manga-slug>/<chapter-slug>/` and inserts missing manga + chapters into SQLite.
- Run: `npm run migrate-fs`

## Auth & Admin

- Local username/password with Passport Local and bcrypt.
- Create default admin user "asagippo": already created in prior step. To recreate:
  - `npm run create-admin` (prints a temporary password)
- Promote any existing user to admin:
  - `npm run make-admin -- <username>`

## Run

- Dev: `npm run dev`
- Prod: `npm start`
- The server binds to `PORT` env var or 3000. If port is in use, it retries on subsequent ports and logs the chosen one.

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

## Notes

- If you want to adjust the palette, edit `tailwind.config.js` and re-run `npm run css:build`.
- We added `@tailwindcss/line-clamp` and use classes like `line-clamp-2` in the UI.
- If you deploy to a host that doesn’t run a build step, commit `public/css/tailwind.css` after running `npm run css:build` locally so the app can serve it directly.

