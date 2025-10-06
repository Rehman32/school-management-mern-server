// ============================================
// USER MIGRATION SCRIPT
// Run this ONCE to fix old users
// ============================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');

dotenv.config();

async function migrateUsers() {
  try {
    console.log('🔄 Starting user migration...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Step 1: Find or create a default tenant for old users
    let defaultTenant = await Tenant.findOne({ email: 'default@school.com' });
    
    if (!defaultTenant) {
      console.log('📦 Creating default tenant...');
      defaultTenant = await Tenant.create({
        name: 'Default School',
        email: 'default@school.com',
        phone: '',
        address: {},
        subscriptionPlan: 'trial',
        subscriptionStatus: 'active',
        isVerified: true,
        onboardingCompleted: true,
      });
      console.log('✅ Default tenant created:', defaultTenant._id);
    } else {
      console.log('✅ Default tenant exists:', defaultTenant._id);
    }

    // Step 2: Find all users without tenantId
    const usersWithoutTenant = await User.find({
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    });

    console.log(`📊 Found ${usersWithoutTenant.length} users without tenantId`);

    // Step 3: Update users
    let updatedCount = 0;
    for (const user of usersWithoutTenant) {
      // If user has schoolId, use it as tenantId
      if (user.schoolId) {
        user.tenantId = user.schoolId;
        console.log(`  ✓ User ${user.email}: using existing schoolId as tenantId`);
      } else {
        // Use default tenant
        user.tenantId = defaultTenant._id;
        console.log(`  ✓ User ${user.email}: assigned to default tenant`);
      }
      
      // Make sure user has required new fields
      if (user.isVerified === undefined) user.isVerified = true; // Allow login
      if (user.isActive === undefined) user.isActive = true;
      if (!user.lastLogin) user.lastLogin = new Date();
      
      await user.save();
      updatedCount++;
    }

    console.log('');
    console.log('✅ Migration completed!');
    console.log(`📊 Updated ${updatedCount} users`);
    console.log('');
    console.log('🎉 You can now login with your existing credentials!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUsers();
