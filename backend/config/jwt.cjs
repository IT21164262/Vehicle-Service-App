function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error("JWT_SECRET is required in backend environment configuration.");
  }

  if (Buffer.byteLength(secret.trim(), "utf8") < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes; generate a random secret locally.");
  }

  return secret;
}

module.exports = { getJwtSecret };
