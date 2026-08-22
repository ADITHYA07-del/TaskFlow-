require('dotenv').config();
const bcrypt = require('bcrypt');
const supabase = require('./db');

async function testHash() {
  console.log('--- Inspecting Users & Testing Bcrypt Hashes ---');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, password, role');

  if (error) {
    console.error('Error querying users:', error);
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s):\n`);

  for (const user of users) {
    const isHash = typeof user.password === 'string' && user.password.startsWith('$2');
    console.log(`User: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    console.log(`  Stored password: ${user.password}`);
    console.log(`  Is bcrypt format? ${isHash}`);

    if (isHash) {
      const matchesTest123 = await bcrypt.compare('test123', user.password);
      console.log(`  bcrypt.compare('test123', stored_password): ${matchesTest123}`);
    } else {
      console.log(`  Stored value is plaintext.`);
      const matchesTest123 = user.password === 'test123';
      console.log(`  Matches 'test123' plaintext: ${matchesTest123}`);
    }
    console.log('--------------------------------------------------');
  }
}

testHash().catch(console.error);
