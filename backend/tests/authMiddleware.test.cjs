// Isolated middleware tests: no database connection, credential files, or HTTP test routes.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/user.cjs");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware.cjs");
const { getMe } = require("../controllers/authController.cjs");

const secret = randomBytes(32).toString("hex");
process.env.JWT_SECRET = secret;
const userId = randomBytes(12).toString("hex");

function sign(payload = { sub: userId }, options = {}) {
  return jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "1h", ...options });
}

function request(authorization) {
  return { get: (name) => name === "Authorization" ? authorization : undefined };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function mockUserLookup(t, lookup) {
  return t.mock.method(User, "findById", (id) => ({
    select: async (fields) => {
      assert.equal(id, userId);
      assert.equal(fields, "name email isAdmin");
      return lookup();
    },
  }));
}

test("missing, malformed, invalid, expired, and wrong-algorithm tokens return 401 before database access", async (t) => {
  const lookup = t.mock.method(User, "findById", () => { throw new Error("Unexpected database access"); });
  const expired = sign({ sub: userId }, { expiresIn: -1 });
  const noExpiry = jwt.sign({ sub: userId }, secret, { algorithm: "HS256" });
  const wrongKey = jwt.sign({ sub: userId }, randomBytes(32), { algorithm: "HS256", expiresIn: "1h" });
  for (const header of [
    undefined, "", "Bearer", "Basic invalid", "Bearer invalid", "Bearer invalid extra",
    `Bearer ${expired}`, `Bearer ${noExpiry}`, `Bearer ${wrongKey}`,
    `Bearer ${sign({ sub: userId }, { algorithm: "HS384" })}`,
    `Bearer ${sign({ sub: "not-an-object-id" })}`,
    `Bearer ${sign({})}`,
    `Bearer ${sign({ sub: userId }, { notBefore: "1h" })}`,
  ]) {
    const req = request(header);
    const res = response();
    let continued = false;
    await authenticate(req, res, () => { continued = true; });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { message: "Authentication required." });
    assert.equal(continued, false);
    assert.equal(req.user, undefined);
  }
  assert.equal(lookup.mock.callCount(), 0);
});

test("valid authentication attaches safe current user fields and /me returns only those fields", async (t) => {
  const currentUser = { _id: userId, name: "Middleware Test", email: "middleware@example.com", isAdmin: false };
  mockUserLookup(t, () => currentUser);
  const req = request(`bearer ${sign()}`);
  const res = response();
  await authenticate(req, res, () => getMe(req, res));
  assert.equal(req.user, currentUser);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.deepEqual(res.body, { user: { id: userId, name: currentUser.name, email: currentUser.email, isAdmin: false } });
});

test("a user who no longer exists returns 401", async (t) => {
  mockUserLookup(t, () => null);
  const req = request(`Bearer ${sign()}`);
  const res = response();
  await authenticate(req, res, () => assert.fail("Deleted user must not continue"));
  assert.equal(res.statusCode, 401);
  assert.equal(req.user, undefined);
});

test("customer receives 403, administrator continues, and demotion takes effect with the same token", async (t) => {
  let isAdmin = false;
  const lookup = mockUserLookup(t, () => ({ _id: userId, name: "Role Test", email: "role@example.com", isAdmin }));
  // Even an extra role claim in a correctly signed token must not grant access.
  const token = sign({ sub: userId, isAdmin: true });
  for (const currentRole of [false, true, false]) {
    isAdmin = currentRole;
    const req = request(`Bearer ${token}`);
    const res = response();
    let continued = false;
    await authenticate(req, res, () => requireAdmin(req, res, () => { continued = true; }));
    assert.equal(continued, currentRole);
    assert.equal(res.statusCode, currentRole ? 200 : 403);
    if (!currentRole) assert.deepEqual(res.body, { message: "Administrator access required." });
  }
  assert.equal(lookup.mock.callCount(), 3);
});

test("administrator middleware returns 401 when authentication has not run", () => {
  const res = response();
  requireAdmin({}, res, () => assert.fail("Unauthenticated request must not continue"));
  assert.equal(res.statusCode, 401);
});

test("database failures return safe 500 responses instead of misreporting invalid credentials", async (t) => {
  mockUserLookup(t, () => { throw new Error("Database unavailable"); });
  t.mock.method(console, "error", () => {});
  const res = response();
  await authenticate(request(`Bearer ${sign()}`), res, () => assert.fail("Database failure must not continue"));
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Unable to authenticate. Please try again." });
});
