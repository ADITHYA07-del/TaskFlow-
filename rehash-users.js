require('dotenv').config();
const bcrypt = require('bcrypt');
const supabase = require('./db');

async function rehashUsers() {
  console.log('Starting user password rehash...');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, password');

  if (error) {
    console.error('Error fetching users from database:', error);
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s) in database.`);
  let updatedCount = 0;

  for (const user of users) {
    // Check if password already matches standard bcrypt format ($2a$, $2b$, or $2y$ followed by cost and hash)
    const isBcrypt = typeof user.password === 'string' &&
                     user.password.startsWith('$2') &&
                     user.password.length === 60;

    if (!isBcrypt) {
      console.log(`Hashing plaintext password for user: ${user.email} (ID: ${user.id})...`);
      const hashedPassword = await bcrypt.hash(user.password || '', 10);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error(`Failed to update user ${user.email}:`, updateError);
      } else {
        console.log(`Successfully updated password for ${user.email}`);
        updatedCount++;
      }
    } else {
      console.log(`User ${user.email} already has a hashed password. Skipping.`);
    }
  }

  console.log(`\nRehash complete. ${updatedCount} user(s) updated.`);
  process.exit(0);
}

rehashUsers().catch((err) => {
  console.error('Unhandled error during rehash:', err);
  process.exit(1);
});
