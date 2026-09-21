// Creates two disposable accounts through HTTP; never prints credentials.
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const path = require("node:path");
const net = require("node:net");

async function main() {
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const server = spawn(process.execPath, ["server.cjs"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const password = randomBytes(24).toString("hex");
  const email = `registration-check-${randomUUID()}@example.com`;
  const base = { name: " Registration Test ", email, password };

  async function post(body, raw = false) {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    assert.ok(!text.includes(password), "Response leaked test password");
    assert.ok(!/"password(?:Hash)?"\s*:|\$2[aby]\$/.test(text), "Response leaked a password field or bcrypt hash");
    assert.ok(response.headers.get("content-type")?.includes("application/json"), "Expected JSON response");
    return { status: response.status, body: JSON.parse(text) };
  }

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Backend startup timed out; check database connectivity locally.")), 45000);
      server.once("error", () => { clearTimeout(timer); reject(new Error("Could not launch backend.")); });
      server.once("exit", () => { clearTimeout(timer); reject(new Error("Backend startup failed; check local configuration and database access. Output withheld to protect credentials.")); });
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
    console.log("PASS: backend started after MongoDB connection and User index initialization");

    for (const [label, input] of [
      ["missing fields", {}],
      ["wrong field type", { ...base, name: 42 }],
      ["blank name", { ...base, name: "   " }],
      ["invalid email", { ...base, email: "invalid" }],
      ["short password", { ...base, password: password.slice(0, 7) }],
      ["password over 72 bytes", { ...base, password: "é".repeat(37) }],
    ]) {
      assert.equal((await post(input)).status, 400, label);
      console.log(`PASS: ${label} returns 400`);
    }
    assert.equal((await post(`{"password":"${password}",`, true)).status, 400);
    console.log("PASS: malformed JSON returns safe 400");
    assert.equal((await post({ ...base, name: "x".repeat(110000) })).status, 413);
    console.log("PASS: oversized JSON returns safe 413");

    const created = await post({ ...base, email: ` ${email.toUpperCase()} `, isAdmin: true });
    assert.equal(created.status, 201, "Valid registration");
    assert.equal(created.body.user.name, "Registration Test");
    assert.equal(created.body.user.email, email);
    assert.equal(created.body.user.isAdmin, false);
    assert.deepEqual(Object.keys(created.body.user).sort(), ["email", "id", "isAdmin", "name"]);
    console.log("PASS: valid registration returns 201, normalized fields, and isAdmin false");
    assert.equal((await post(base)).status, 409);
    console.log("PASS: duplicate email returns 409");

    const simultaneous = { ...base, email: `registration-check-${randomUUID()}@example.com` };
    const results = await Promise.all([post(simultaneous), post(simultaneous)]);
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    console.log("PASS: simultaneous registrations return one 201 and one 409");
    console.log("All registration checks passed. Two disposable registration-check-* accounts remain in the database.");
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
