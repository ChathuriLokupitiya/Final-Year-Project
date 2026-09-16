const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    serviceInterest: {
      type: String,
      default: 'General Inquiry'
    },
    message: {
      type: String,
      required: [true, 'Please provide your message'],
      maxlength: [2000, 'Message cannot be more than 2000 characters']
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'replied'],
      default: 'unread'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
