// ============================================
// DATABASE CONFIGURATION - IMPROVED
// ============================================

const mongoose = require('mongoose');

class Database {
  static async connect() {
    try {
      // Check for MongoDB URI
      const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
      
      if (!mongoUri) {
        console.error('❌ MongoDB URI not found!');
        console.error('   Please set MONGO_URI or MONGODB_URI in your .env file');
        process.exit(1);
      }

      const options = {
        // Connection pool settings
        maxPoolSize: 10,
        minPoolSize: 2,
        
        // Timeout settings (increased for slow connections)
        socketTimeoutMS: 60000,
        serverSelectionTimeoutMS: 30000, // Increased from 5000
        connectTimeoutMS: 30000,
        
        // Retry settings
        retryWrites: true,
        retryReads: true,
      };

      console.log('🔄 Connecting to MongoDB...');
      
      await mongoose.connect(mongoUri, options);

      console.log('✅ MongoDB Connected Successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);

      // Connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // Helpful error messages
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.error('   → Check your internet connection');
        console.error('   → Verify the MongoDB hostname is correct');
      } else if (error.message.includes('authentication failed')) {
        console.error('   → Check your MongoDB username and password');
      } else if (error.message.includes('timed out')) {
        console.error('   → MongoDB server may be down or unreachable');
        console.error('   → Check if your IP is whitelisted in MongoDB Atlas');
      }
      
      process.exit(1);
    }
  }

  static async disconnect() {
    await mongoose.connection.close();
    console.log('MongoDB disconnected');
  }

  static getConnectionStatus() {
    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };
    return states[mongoose.connection.readyState];
  }
}

module.exports = Database;
