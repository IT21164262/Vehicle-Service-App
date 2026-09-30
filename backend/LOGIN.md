# Login

`POST /api/auth/login` accepts an email and password. Routes are mounted in `app.cjs`; `controllers/authController.cjs` validates credentials and compares the password using bcrypt.

Email addresses are trimmed and lowercased. Passwords are compared without normalization. Unknown accounts and incorrect passwords both return `401`.

Successful login returns safe account fields and an HS256 token valid for one hour. The token contains the user ID and token version. Responses use `Cache-Control: no-store`.

Configure `JWT_SECRET` as a random secret of at least 32 bytes in the backend environment. Changing it invalidates existing tokens. Keep credentials out of source control.

Protected requests must include `Authorization: Bearer <token>`. See [authentication middleware](AUTH_MIDDLEWARE.md).
