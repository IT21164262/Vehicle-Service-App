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
    profileImageUrl: { type: String, default: '', trim: true, maxlength: 2048 },
    profileImagePublicId: { type: String, default: null },
    profileImageAssetId: { type: String, default: null },
    notifications: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      type: { type: String, required: true, maxlength: 40 },
      title: { type: String, required: true, maxlength: 160 },
      message: { type: String, required: true, maxlength: 500 },
      appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
