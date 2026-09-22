const { randomBytes, createHash } = require("node:crypto");
const bcrypt = require("bcrypt");
const User = require("../models/user.cjs");
const mailer = require("../services/resetMailer.cjs");
const accepted = { message: "If an account exists for this email, a password reset code will be sent. Check your inbox and spam folder." };
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

async function forgotPassword(req, res) {
  res.set("Cache-Control", "no-store");
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  let sender;
  try { sender = mailer.createResetMailer(); }
  catch {
    return res.status(503).json({ message: "Password recovery is temporarily unavailable. Please try again later." });
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  try {
    // Atomic cooldown works across server processes and avoids repeated emails.
    const user = await User.findOneAndUpdate({
      email,
      $or: [{ resetRequestedAt: { $exists: false } }, { resetRequestedAt: { $lt: new Date(Date.now() - 60000) } }],
    }, { $set: {
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: new Date(Date.now() + 15 * 60000),
      resetRequestedAt: new Date(),
    } });
    if (user) {
      try { await sender.send(email, token); }
      catch {
        // Do not clear a newer request, and do not expose account existence.
        await User.updateOne({ _id: user._id, resetTokenHash: tokenHash }, {
          $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1, resetRequestedAt: 1 },
        });
        console.error("Password recovery email delivery failed.");
      }
    }
    return res.status(202).json(accepted);
  } catch {
    return res.status(503).json({ message: "Password recovery is temporarily unavailable. Please try again later." });
  }
}

async function resetPassword(req, res) {
  res.set("Cache-Control", "no-store");
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: "Invalid or expired reset code. Request a new code." });
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Password must have at least 8 characters and at most 72 bytes." });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    // Check expiry and consume the code in the same update: only one caller wins.
    const user = await User.findOneAndUpdate({
      resetTokenHash: hashToken(token), resetTokenExpiresAt: { $gt: new Date() },
    }, {
      $set: { passwordHash }, $inc: { tokenVersion: 1 },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1, resetRequestedAt: 1 },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset code. Request a new code." });
    return res.json({ message: "Password updated. Log in with your new password." });
  } catch {
    return res.status(503).json({ message: "Unable to reset your password. Please try again." });
  }
}

module.exports = { forgotPassword, resetPassword };
