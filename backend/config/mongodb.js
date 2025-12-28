const mongoose = require('mongoose');

async function connectMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      readPreference: 'primaryPreferred',
      w: 'majority',
      retryWrites: true
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB replica set connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

module.exports = { connectMongoDB };
