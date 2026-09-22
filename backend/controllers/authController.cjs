const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.cjs");
const { getJwtSecret } = require("../config/jwt.cjs");

async function register(req, res) {
  const { name, email, password } = req.body || {};

  // Check types before using string methods.
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

  // A basic format check; this does not verify email ownership.
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

    // sub identifies the user; expiresIn adds the expiration claim.
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
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
    },
  });
}

module.exports = { register, login, getMe };
