const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user.model');
const bcrypt = require('bcryptjs');

dotenv.config();

async function debugLogin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to database\n');

  // TEST EMAIL - Change this to the email you're trying to login with
  const testEmail = 'admin@iqra.gmail.com'; // ← CHANGE THIS
  const testPassword = 'admin@123'; // ← CHANGE THIS

  console.log('🔍 Testing login for:', testEmail);
  console.log('');

  // Step 1: Find user
  console.log('Step 1: Finding user...');
  const user = await User.findOne({
    email: testEmail.toLowerCase(),
  }).select('+password');

  if (!user) {
    console.log('❌ USER NOT FOUND!');
    console.log('');
    console.log('All users in database:');
    const allUsers = await User.find().select('email');
    allUsers.forEach(u => console.log('  -', u.email));
    process.exit(1);
  }

  console.log('✅ User found!');
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Has password:', !!user.password);
  console.log('   TenantId:', user.tenantId);
  console.log('   IsDeleted:', user.isDeleted);
  console.log('');

  // Step 2: Check password
  console.log('Step 2: Checking password...');
  const isMatch = await bcrypt.compare(testPassword, user.password);
  
  if (isMatch) {
    console.log('✅ PASSWORD CORRECT!');
  } else {
    console.log('❌ PASSWORD WRONG!');
    console.log('');
    console.log('💡 Password hash in DB:', user.password.substring(0, 20) + '...');
  }

  console.log('');
  console.log('📊 Summary:');
  console.log('   User exists:', !!user);
  console.log('   Password match:', isMatch);
  console.log('   Can login:', !!user && isMatch);

  process.exit(0);
}

debugLogin();
