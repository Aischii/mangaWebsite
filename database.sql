CREATE TABLE `users` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `username` TEXT NOT NULL,
  `password` TEXT NOT NULL,
  `role` TEXT NOT NULL DEFAULT 'user',
  `familySafe` INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE `manga` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `title` TEXT NOT NULL,
  `slug` TEXT NOT NULL UNIQUE,
  `otherTitle` TEXT,
  `author` TEXT,
  `artist` TEXT,
  `genre` TEXT,
  `status` TEXT,
  `type` TEXT,
  `synopsis` TEXT,
  `cover` TEXT NOT NULL,
  `rating` TEXT
);

CREATE TABLE `chapters` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `manga_id` INTEGER NOT NULL,
  `title` TEXT NOT NULL,
  `slug` TEXT NOT NULL,
  `pages` TEXT NOT NULL,
  `volume` TEXT NOT NULL DEFAULT 'Unknown Volume',
  `published_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`manga_id`) REFERENCES `manga` (`id`) ON DELETE CASCADE,
  UNIQUE (`manga_id`, `slug`)
);

CREATE TABLE `bookmarks` (
  `user_id` INTEGER NOT NULL,
  `manga_id` INTEGER NOT NULL,
  PRIMARY KEY (`user_id`, `manga_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`manga_id`) REFERENCES `manga` (`id`) ON DELETE CASCADE
);

CREATE TABLE `reading_progress` (
  `user_id` INTEGER NOT NULL,
  `manga_id` INTEGER NOT NULL,
  `chapter_id` INTEGER NOT NULL,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`user_id`, `manga_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`manga_id`) REFERENCES `manga` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
);
