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
