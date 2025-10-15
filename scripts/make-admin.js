const db = require('../utils/db');

const username = process.argv[2];
if (!username) {
  console.error('Usage: node scripts/make-admin.js <username>');
  process.exit(1);
}

db.run('UPDATE users SET role = \"admin\" WHERE username = ?', [username], function(err) {
  if (err) {
    console.error('Failed to update user:', err.message);
    process.exit(1);
  }
  if (this.changes === 0) {
    console.error('No user found with that username.');
    process.exit(1);
  }
  console.log(`User '${username}' promoted to admin.`);
  process.exit(0);
});

