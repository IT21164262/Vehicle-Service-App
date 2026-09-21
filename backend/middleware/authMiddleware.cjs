const jwt = require("jsonwebtoken");
const User = require("../models/user.cjs");
const { getJwtSecret } = require("../config/jwt.cjs");

async function authenticate(req, res, next) {
  res.set("Cache-Control", "no-store");
  const authorization = req.get("Authorization");
  const bearer = typeof authorization === "string"
    ? authorization.match(/^Bearer[ \t]+(\S+)$/i)
    : null;

  if (!bearer) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    // Verification checks the signature and expiration; decoding alone does not.
    const claims = jwt.verify(bearer[1], getJwtSecret(), {
      algorithms: ["HS256"],
    });

    // Require the identity and expiration claims issued by our login endpoint.
    if (
      !claims ||
      typeof claims !== "object" ||
      typeof claims.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(claims.sub) ||
      !Number.isInteger(claims.exp)
    ) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Fetch the current role on every request; never trust a role from the JWT.
    const user = await User.findById(claims.sub).select("name email isAdmin");
    if (!user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError
    ) {
      return res.status(401).json({ message: "Authentication required." });
    }

    console.error("Authentication failed:", error.name);
    return res.status(500).json({
      message: "Unable to authenticate. Please try again.",
    });
  }
}

function requireAdmin(req, res, next) {
  // Defensive check: routes must place authenticate before requireAdmin.
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (req.user.isAdmin !== true) {
    return res.status(403).json({ message: "Administrator access required." });
  }

  return next();
}

module.exports = { authenticate, requireAdmin };
