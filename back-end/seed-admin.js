require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { ensureWalkInCustomer, WALKIN_EMAIL } = require('./src/utils/walkin.util');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/salonDB');
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admiN@123';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists!');
    } else {
      const adminUser = new User({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isVerified: true,
      });
      await adminUser.save();
      console.log(`Admin created successfully!`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    }

    const walkIn = await ensureWalkInCustomer();
    console.log(`Walk-in customer ready: ${walkIn.name} <${WALKIN_EMAIL}> (no password)`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
