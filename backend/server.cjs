const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const app = require("./app.cjs");
const mongoose = require("mongoose");
const User = require("./models/user.cjs");
const { getJwtSecret } = require("./config/jwt.cjs");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    
    if (process.env.RENDER !== 'true' && process.env.DNS_SERVERS?.trim()) {
      require('node:dns').setServers(process.env.DNS_SERVERS.split(',').map(value => value.trim()).filter(Boolean));
    }
    getJwtSecret();

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "vehicle_service_db",
    });
    
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
