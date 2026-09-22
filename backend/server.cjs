const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
require("node:dns").setServers(["8.8.8.8", "8.8.4.4"]);

const app = require("./app.cjs");
const mongoose = require("mongoose");
const User = require("./models/user.cjs");
const { getJwtSecret } = require("./config/jwt.cjs");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Fail before connecting or listening when JWT configuration is invalid.
    getJwtSecret();

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
