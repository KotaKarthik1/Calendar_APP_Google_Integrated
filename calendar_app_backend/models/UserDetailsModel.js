const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  refreshToken: { type: String },
  events: [{ // Array to store multiple events for the user
    id: String,
    summary: String,
    description:String,
    start: Date,
    end: Date,
  }],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
