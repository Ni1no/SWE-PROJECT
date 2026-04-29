const mongoose = require("mongoose");

/**
 * User document in MongoDB Atlas.
 * - `password`: bcrypt hash only (never plain text).
 * - `resetPasswordToken` / `resetPasswordExpires`: one-time reset flow (1 hour window).
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
