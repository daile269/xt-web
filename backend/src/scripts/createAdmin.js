require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
    } else {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@pkweb.com',
        password: 'admin@Axxa', // Will be hashed automatically
        displayName: 'Administrator',
        isAdmin: true,
        coins: 999999999,
        authMethod: 'local'
      });

      await adminUser.save();
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
