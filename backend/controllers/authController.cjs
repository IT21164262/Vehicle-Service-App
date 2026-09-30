const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.cjs");
const { getJwtSecret } = require("../config/jwt.cjs");
const { replaceImage, ImageError } = require("../services/replaceImage.cjs");


async function register(req, res) {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email and password must be provided as text.",
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({
      message: "Name and email are required.",
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(cleanEmail)) {
    return res.status(400).json({
      message: "Enter a valid email address.",
    });
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message: "Password must have at least 8 characters and at most 72 bytes.",
    });
  }

  try {
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      isAdmin: false,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        profileImageUrl: user.profileImageUrl || "",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration failed:", error.name);

    return res.status(500).json({
      message: "Unable to create your account. Please try again.",
    });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      message: "Email and password must be provided as text.",
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(cleanEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      message: "Password must have at least 8 characters and at most 72 bytes.",
    });
  }

  try {
    // passwordHash is excluded by default in the User schema.
    const user = await User.findOne({ email: cleanEmail }).select("+passwordHash +tokenVersion");
    const passwordMatches = user && await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ sub: user._id.toString(), ver: user.tokenVersion || 0 }, getJwtSecret(), {
      algorithm: "HS256",
      expiresIn: "1h",
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Logged in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        profileImageUrl: user.profileImageUrl || "",
      },
    });
  } catch (error) {
    console.error("Login failed:", error.name);
    return res.status(500).json({
      message: "Unable to log in. Please try again.",
    });
  }
}

function getMe(req, res) {
  return res.status(200).json({
    user: safeUser(req.user),
  });
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function safeUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, isAdmin: user.isAdmin, profileImageUrl: user.profileImageUrl || '' };
}
function validateProfile(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: "Provide a profile object." };
  const fields = ["name", "email"];
  if (Object.keys(body).some(key => !fields.includes(key)) || !Object.keys(body).length) return { error: "Only name and email may be updated." };
  const data = {};
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) return { error: "Name must contain 1â€“120 characters." };
    data.name = body.name.trim();
  }
  if (Object.hasOwn(body, "email")) {
    if (typeof body.email !== "string" || !emailPattern.test(body.email.trim().toLowerCase())) return { error: "Enter a valid email address." };
    data.email = body.email.trim().toLowerCase();
  }
  return { data };
}
async function updateProfile(req, res) {
  const result = validateProfile(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: result.data }, { returnDocument: "after", runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    console.error("Profile update failed:", error.name);
    return res.status(503).json({ message: "Unable to update your profile. Please try again." });
  }
}
async function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") return res.status(400).json({ message: "Current and new passwords are required." });
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) return res.status(400).json({ message: "Password must have at least 8 characters and at most 72 bytes." });
  try {
    const user = await User.findById(req.user._id).select("+passwordHash +tokenVersion");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!await bcrypt.compare(currentPassword, user.passwordHash)) return res.status(401).json({ message: "Current password is incorrect." });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Password update failed:", error.name);
    return res.status(503).json({ message: "Unable to change your password. Please try again." });
  }
}
async function uploadProfileImage(req, res) {
  if (!req.file?.buffer) return res.status(400).json({ message: 'Select a JPEG, PNG or WebP image.' });
  try {
    const user = await replaceImage(User, req.user._id, 'profileImageUrl', 'profileImage', 'profiles', req.file.buffer);
    return res.json({ user: safeUser(user) });
  } catch (error) {
    return res.status(error instanceof ImageError ? error.status : 503).json({ message: error instanceof ImageError ? error.message : 'Unable to save profile image. Please try again.' });
  }
}

module.exports = { register, login, getMe, updateProfile, updatePassword, uploadProfileImage };
