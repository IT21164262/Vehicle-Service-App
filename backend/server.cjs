require("dotenv").config();
require("node:dns").setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/user.cjs");
const authRoutes = require("./routes/authRoutes.cjs");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
// Return safe JSON instead of parser errors that can contain request data.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must be valid JSON." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }
  next(error);
});

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "vehicle_service_db",
    });
    // unique: true declares an index; wait for it before accepting registrations.
    await User.init();

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
