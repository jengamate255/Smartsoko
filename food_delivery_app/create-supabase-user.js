const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createDriverUser() {
  const email = 'pipsr101@gmail.com';
  const password = 'Tanzania101';

  console.log('Creating/updating user in Supabase Auth...');

  // First, try to get the user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    console.log('User exists, updating password...');
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
      email_confirm: true
    });
    if (error) {
      console.error('Error updating user:', error);
    } else {
      console.log('User updated successfully:', data.user?.id);
    }
  } else {
    console.log('Creating new user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    if (error) {
      console.error('Error creating user:', error);
    } else {
      console.log('User created successfully:', data.user?.id);
    }
  }
}

createDriverUser().catch(console.error);