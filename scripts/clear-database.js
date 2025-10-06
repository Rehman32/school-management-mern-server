// ============================================
// CLEAR DATABASE SCRIPT (ENHANCED)
// Shows which database will be cleared
// ============================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    
    console.log('\n⚠️  WARNING: DANGER ZONE ⚠️\n');
    console.log('🎯 Target Database:');
    console.log(`   Database: ${dbName}`);
    console.log(`   Host: ${host}`);
    console.log(`   Connection: ${process.env.MONGO_URI}\n`);
    
    // Get collections
    const collections = await mongoose.connection.db.collections();
    console.log('📦 Collections to be deleted:');
    for (const collection of collections) {
      const count = await collection.countDocuments();
      console.log(`   - ${collection.collectionName} (${count} documents)`);
    }
    console.log('');

    rl.question('Type "DELETE ALL DATA" to confirm: ', async (answer) => {
      if (answer === 'DELETE ALL DATA') {
        console.log('\n🗑️  Starting database cleanup...\n');

        let deletedCount = 0;
        for (const collection of collections) {
          const result = await collection.deleteMany({});
          console.log(`  ✓ Deleted ${result.deletedCount} documents from ${collection.collectionName}`);
          deletedCount += result.deletedCount;
        }

        console.log('\n✅ Database cleared successfully!');
        console.log(`📊 Total documents deleted: ${deletedCount}`);
        console.log(`🎯 Database: ${dbName}\n`);
        console.log('🎉 Ready for fresh start!\n');

        process.exit(0);
      } else {
        console.log('\n❌ Cancelled. Database not cleared.\n');
        process.exit(0);
      }
    });
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

clearDatabase();
