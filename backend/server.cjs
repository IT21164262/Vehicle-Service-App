const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const app = require("./app.cjs");
const mongoose = require("mongoose");
const User = require("./models/user.cjs");
const { getJwtSecret } = require("./config/jwt.cjs");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Optional workaround for local networks that cannot resolve Atlas SRV records.
    // Render must continue using its platform DNS, even if local settings are copied.
    if (process.env.RENDER !== 'true' && process.env.DNS_SERVERS?.trim()) {
      require('node:dns').setServers(process.env.DNS_SERVERS.split(',').map(value => value.trim()).filter(Boolean));
    }
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
