const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    consulton: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
