const express = require("express");
const { register, login, getMe } = require("../controllers/authController.cjs");
const { authenticate } = require("../middleware/authMiddleware.cjs");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);

module.exports = router;
