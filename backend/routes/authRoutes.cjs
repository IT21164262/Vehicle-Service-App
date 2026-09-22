const express = require("express");
const { register, login, getMe, updateProfile, updatePassword } = require("../controllers/authController.cjs");
const { authenticate } = require("../middleware/authMiddleware.cjs");
const { handleProfileUpload } = require("../middleware/profileUpload.cjs");
const { uploadProfileImage } = require("../controllers/authController.cjs");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.patch("/profile", authenticate, updateProfile);
router.patch("/password", authenticate, updatePassword);
router.post("/profile/image", authenticate, handleProfileUpload, uploadProfileImage);

module.exports = router;
