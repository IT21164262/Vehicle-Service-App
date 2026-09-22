const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
    tokenVersion: { type: Number, default: 0, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
    resetRequestedAt: { type: Date, select: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
