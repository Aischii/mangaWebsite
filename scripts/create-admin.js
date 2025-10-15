const bcrypt = require('bcrypt');
const db = require('../utils/db');

async function main() {
  const username = 'asagippo';
  const password = Math.random().toString(36).slice(-10) + '!A1';
  const hashed = await bcrypt.hash(password, 10);

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('DB error:', err.message);
      process.exit(1);
    }
    if (row) {
      db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', row.id], function(updErr){
        if (updErr) {
          console.error('Failed to update role:', updErr.message);
          process.exit(1);
        }
        console.log(`User '${username}' already existed; role set to admin.`);
        console.log('You can set a password via your existing flow.');
        process.exit(0);
      });
    } else {
      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashed, 'admin'], function(insErr){
        if (insErr) {
          console.error('Failed to create user:', insErr.message);
          process.exit(1);
        }
        console.log(`Created admin user '${username}'`);
        console.log(`Temporary password: ${password}`);
        process.exit(0);
      });
    }
  });
}

main().catch((e)=>{
  console.error(e);
  process.exit(1);
});

