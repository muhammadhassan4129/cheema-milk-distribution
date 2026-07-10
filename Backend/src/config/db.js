const mongoose = require('mongoose');

// Vercel serverless: connection ko cache karo taake har request pe reconnect na ho
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✓ Using cached MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`✗ MongoDB Connection Error: ${error.message}`);
    // Serverless mein process.exit mat karo - error throw karo
    throw error;
  }
};

module.exports = connectDB;
