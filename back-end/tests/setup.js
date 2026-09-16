const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

jest.mock('../src/utils/email.util', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendBookingConfirmation: jest.fn().mockResolvedValue(true),
  sendAppointmentReminder: jest.fn().mockResolvedValue(true),
  sendCancellationEmail: jest.fn().mockResolvedValue(true),
  sendPromotionalEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/config/cloudinary', () => ({
  cloudinary: { uploader: { destroy: jest.fn().mockResolvedValue({}) } },
  createStorage: jest.fn(),
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
