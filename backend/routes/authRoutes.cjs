const express = require("express");
const { register, login, getMe } = require("../controllers/authController.cjs");
const { authenticate } = require("../middleware/authMiddleware.cjs");
const { rateLimit } = require("express-rate-limit");
const { forgotPassword, resetPassword } = require("../controllers/passwordRecovery.cjs");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
const recoveryLimit = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Too many recovery attempts. Please try again in 15 minutes." },
});
router.post("/forgot-password", recoveryLimit(5), forgotPassword);
router.post("/reset-password", recoveryLimit(20), resetPassword);

module.exports = router;
