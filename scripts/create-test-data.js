// ============================================
// CREATE TEST DATA
// Creates sample school with users for testing
// ============================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');

dotenv.config();

async function createTestData() {
  try {
    console.log('🔄 Creating test data...\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database\n');

    // Create Test School 1
    console.log('📦 Creating Test School 1...');
    const school1 = await Tenant.create({
      name: 'ABC Academy',
      email: 'contact@abcacademy.com',
      phone: '+92 300 1234567',
      subdomain: 'abc-academy',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      isVerified: true,
      onboardingCompleted: true,
      address: {
        street: '123 Main Street',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        pincode: '75500',
      },
    });
    console.log('  ✓ Created:', school1.name);

    // Create Admin for School 1
    const admin1 = await User.create({
      name: 'Admin User',
      email: 'admin@abcacademy.com',
      password: 'Admin@123',
      role: 'admin',
      tenantId: school1._id,
      isVerified: true,
      isActive: true,
    });
    console.log('  ✓ Admin:', admin1.email, '| Password: Admin@123');

    // Create Teacher for School 1
    const teacher1 = await User.create({
      name: 'John Teacher',
      email: 'teacher@abcacademy.com',
      password: 'Teacher@123',
      role: 'teacher',
      tenantId: school1._id,
      isVerified: true,
      isActive: true,
    });
    console.log('  ✓ Teacher:', teacher1.email, '| Password: Teacher@123');

    // Create Student for School 1
    const student1 = await User.create({
      name: 'Alice Student',
      email: 'student@abcacademy.com',
      password: 'Student@123',
      role: 'student',
      tenantId: school1._id,
      isVerified: true,
      isActive: true,
    });
    console.log('  ✓ Student:', student1.email, '| Password: Student@123\n');

    // Update tenant admin reference
    school1.adminUserId = admin1._id;
    await school1.save();

    // Create Test School 2
    console.log('📦 Creating Test School 2...');
    const school2 = await Tenant.create({
      name: 'XYZ School',
      email: 'contact@xyzschool.com',
      phone: '+92 300 7654321',
      subdomain: 'xyz-school',
      subscriptionPlan: 'basic',
      subscriptionStatus: 'active',
      isVerified: true,
      onboardingCompleted: true,
      address: {
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
      },
    });
    console.log('  ✓ Created:', school2.name);

    // Create Admin for School 2
    const admin2 = await User.create({
      name: 'XYZ Admin',
      email: 'admin@xyzschool.com',
      password: 'Admin@123',
      role: 'admin',
      tenantId: school2._id,
      isVerified: true,
      isActive: true,
    });
    console.log('  ✓ Admin:', admin2.email, '| Password: Admin@123\n');

    school2.adminUserId = admin2._id;
    await school2.save();

    console.log('✅ Test data created successfully!\n');
    console.log('📊 Summary:');
    console.log('  - 2 Schools');
    console.log('  - 5 Users (2 admins, 1 teacher, 1 student)\n');
    console.log('🎉 You can now login with any of the above credentials!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestData();
