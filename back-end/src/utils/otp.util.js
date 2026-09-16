const crypto = require('crypto');

const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % digits.length];
  }
  return otp;
};

const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const verifyOTP = (inputOtp, hashedOtp) => {
  const inputHashed = hashOTP(inputOtp);
  return crypto.timingSafeEqual(Buffer.from(inputHashed, 'hex'), Buffer.from(hashedOtp, 'hex'));
};

module.exports = { generateOTP, hashOTP, verifyOTP };
