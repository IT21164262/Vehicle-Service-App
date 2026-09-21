// Live HTTP checks: creates one disposable customer; prints no tokens or secrets.
const { spawn, spawnSync } = require("node:child_process");
const { randomBytes, randomUUID } = require("node:crypto");
const net = require("node:net");
const path = require("node:path");
const jwt = require("jsonwebtoken");

function check(condition, label) {
  if (!condition) throw new Error(label);
}

async function main() {
  const backend = path.join(__dirname, "..");
  for (const secret of ["", "   ", "short"]) {
    const result = spawnSync(process.execPath, ["server.cjs"], {
      cwd: backend,
      env: { ...process.env, JWT_SECRET: secret },
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    });
    check(result.status === 1 && result.stderr.includes("JWT_SECRET"), "Invalid JWT configuration must fail clearly at startup");
  }
  console.log("PASS: missing, blank, and short JWT secrets fail at startup");

  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const secret = randomBytes(32).toString("hex");
  const password = randomBytes(24).toString("hex");
  const email = `login-check-${randomUUID()}@example.com`;
  const server = spawn(process.execPath, ["server.cjs"], {
    cwd: backend,
    env: { ...process.env, JWT_SECRET: secret, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  async function post(route, body) {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    check(!text.includes(password) && !text.includes(secret), "Response must not expose credentials");
    check(!/"password(?:Hash)?"\s*:|\$2[aby]\$/.test(text), "Response must not expose a password field or hash");
    const data = JSON.parse(text);
    if (response.status !== 200) check(!Object.hasOwn(data, "token"), "Failed request must not issue a token");
    return { status: response.status, data, headers: response.headers };
  }

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Backend startup timed out; check database access locally.")), 45000);
      server.once("error", () => { clearTimeout(timer); reject(new Error("Backend launch failed.")); });
      server.once("exit", () => { clearTimeout(timer); reject(new Error("Backend startup failed; output withheld to protect credentials.")); });
      let output = "";
      server.stdout.on("data", (chunk) => {
        output += chunk.toString();
        if (output.includes(`Server running at http://localhost:${port}`)) {
          clearTimeout(timer);
          resolve();
        }
      });
      server.stderr.on("data", () => {});
    });

    const registration = await post("register", { name: "Login Test", email, password, isAdmin: true });
    check(registration.status === 201, "Test customer registration must succeed");
    check(registration.data.user.isAdmin === false, "Public registration must ignore administrator requests");
    console.log("PASS: registration still creates a customer");

    const valid = await post("login", { email: ` ${email.toUpperCase()} `, password });
    check(valid.status === 200, "Valid normalized login must return 200");
    check(JSON.stringify(valid.data.user) === JSON.stringify(registration.data.user), "Login must return the same safe user fields as registration");
    check(valid.headers.get("cache-control") === "no-store", "Login response must disable caching");
    const claims = jwt.verify(valid.data.token, secret, { algorithms: ["HS256"] });
    check(claims.sub === registration.data.user.id, "JWT subject must be the user ID");
    check(claims.exp - claims.iat === 3600, "JWT must expire after one hour");
    check(Object.keys(claims).sort().join(",") === "exp,iat,sub", "JWT must contain only identity and timing claims");
    let expiredRejected = false;
    try { jwt.verify(valid.data.token, secret, { algorithms: ["HS256"], clockTimestamp: claims.exp }); }
    catch (error) { expiredRejected = error.name === "TokenExpiredError"; }
    check(expiredRejected, "Expired JWT must fail verification");
    let wrongKeyRejected = false;
    try { jwt.verify(valid.data.token, randomBytes(32).toString("hex"), { algorithms: ["HS256"] }); }
    catch (error) { wrongKeyRejected = error.name === "JsonWebTokenError"; }
    check(wrongKeyRejected, "Wrong signing key must fail verification");
    console.log("PASS: valid login, normalized email, safe user fields, signed JWT, and one-hour expiry");
    console.log("PASS: JWT verification rejects expired tokens and wrong signing keys");

    // Exercise the real protected route without printing Authorization headers.
    async function getMe(token) {
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(15000),
      });
      const text = await response.text();
      check(!text.includes(password) && !text.includes(secret), "/me must not expose credentials");
      check(!token || !text.includes(token), "/me must not echo a token");
      check(!/"password(?:Hash)?"\s*:|\$2[aby]\$/.test(text), "/me must not expose password fields or hashes");
      return { status: response.status, data: JSON.parse(text) };
    }

    const me = await getMe(valid.data.token);
    check(me.status === 200, "Valid token must return 200 from /me");
    check(JSON.stringify(me.data.user) === JSON.stringify(registration.data.user), "/me must return only the current safe user fields");
    console.log("PASS: /me returns 200 with safe database user details");

    for (const [label, token] of [
      ["missing", undefined],
      ["invalid", randomBytes(24).toString("hex")],
      ["expired", jwt.sign({ sub: claims.sub }, secret, { algorithm: "HS256", expiresIn: -1 })],
      ["wrong signature", jwt.sign({ sub: claims.sub }, randomBytes(32), { algorithm: "HS256", expiresIn: "1h" })],
      ["wrong algorithm", jwt.sign({ sub: claims.sub }, secret, { algorithm: "HS384", expiresIn: "1h" })],
      ["nonexistent user", jwt.sign({ sub: randomBytes(12).toString("hex") }, secret, { algorithm: "HS256", expiresIn: "1h" })],
    ]) {
      const result = await getMe(token);
      check(result.status === 401, `${label} token must return 401 from /me`);
      check(result.data.message === "Authentication required.", "/me credential errors must be generic");
      console.log(`PASS: /me rejects ${label} token with 401`);
    }

    const incorrect = await post("login", { email, password: randomBytes(24).toString("hex") });
    const unknown = await post("login", { email: `unknown-${randomUUID()}@example.com`, password });
    check(incorrect.status === 401 && unknown.status === 401, "Credential failures must return 401");
    check(JSON.stringify(incorrect.data) === JSON.stringify(unknown.data), "Credential failures must have identical responses");
    check(incorrect.data.message === "Invalid email or password.", "Credential failure must use the generic message");
    console.log("PASS: incorrect password and unknown email return identical generic 401 responses");

    for (const [label, body] of [
      ["missing fields", {}],
      ["non-text email", { email: {}, password }],
      ["non-text password", { email, password: 12345678 }],
      ["blank email", { email: "  ", password }],
      ["malformed email", { email: "invalid", password }],
      ["empty password", { email, password: "" }],
      ["short password", { email, password: "short" }],
      ["password over 72 bytes", { email, password: "\u00e9".repeat(37) }],
    ]) {
      check((await post("login", body)).status === 400, `${label} must return 400`);
      console.log(`PASS: ${label} returns 400 without a token`);
    }
    console.log("Login verified using an ephemeral test secret. One disposable login-check-* account remains in Atlas.");
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  // Only our explicit check labels are safe to print; other errors may contain data.
  console.error(error.constructor === Error ? `FAIL: ${error.message}` : "FAIL: login checks encountered an unexpected error; sensitive details withheld.");
  process.exitCode = 1;
});
