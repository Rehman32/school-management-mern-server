// ============================================
// DATABASE CONFIGURATION (FIXED)
// ============================================

const mongoose = require('mongoose');

class Database {
  static async connect() {
    try {
      const options = {
        // Connection pool settings
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,

        // REMOVED: dbName override
        // dbName: process.env.DB_NAME || 'school_management',

        // Retry settings
        retryWrites: true,
        retryReads: true,
      };

      await mongoose.connect(process.env.MONGO_URI, options);

      console.log('✅ MongoDB Connected Successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);

      // Connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
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
