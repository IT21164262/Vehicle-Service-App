# Authentication middleware

`middleware/authMiddleware.cjs` provides `authenticate` and `requireAdmin`.

`authenticate` verifies the bearer token signature, HS256 algorithm, expiry, user ID, and token version. It loads the current user and role from the database. Missing, invalid, or revoked credentials return `401`.

`requireAdmin` runs after authentication and requires the current database role to be administrator. Customers receive `403`.

`GET /api/auth/me` returns the authenticated account's ID, name, email, role, and profile image URL. Password hashes and tokens are excluded.

Changing a password increments the token version, invalidating existing sessions. Authenticated responses use `Cache-Control: no-store`.

Run `node --test tests/appointment-delete.cjs` from the project root for the local deletion regression test, including ownership and administrator access checks. It uses simulated database records.
