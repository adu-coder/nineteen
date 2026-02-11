const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  photoUrl: {
    type: String,
    default: ''
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  friendIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequestsSent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequestsReceived: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shareWithFriends: {
    type: Boolean,
    default: false
  },
  analyticsShareEnabled: {
    type: Boolean,
    default: false
  },
  transactionShareFriendIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  balanceShareFriendIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
