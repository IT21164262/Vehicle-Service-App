# Authentication configuration and checks

## API URL and persistent sessions

Copy `frontend/.env.example` to `frontend/.env` and set `EXPO_PUBLIC_API_URL` to the backend base URL **ending in `/api`**, without `/auth`. Restart Expo after changing it. Use `http://10.0.2.2:5000/api` for the Android emulator, your computer's LAN IPv4 address for a physical phone, and `http://localhost:5000/api` for a local browser or iOS simulator. Deployment requires an HTTPS API URL. Public frontend variables never contain secrets.

Native sessions use Expo SecureStore; browser sessions use localStorage (accessible to scripts on the app's origin, unlike native secure storage). Sessions are scoped to the API URL. Startup validates a stored token against `/me`. A 401 clears storage; connection failures preserve it for retry. Tokens still expire after one hour; persistence does not extend their lifetime. `getAuthToken()` and `logout()` now return promises. No dashboard or new landing page was added.

## Password recovery

Merge the names in `backend/.env.example` into your existing `backend/.env`; do not replace existing database or JWT settings. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` using your email provider. Port 465 uses immediate TLS; other ports require STARTTLS. SMTP settings stay on the backend. See [Nodemailer SMTP configuration](https://nodemailer.com/smtp) and [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

The existing login form now supports **Forgot password → send reset code → paste emailed code and new password → log in**. Codes expire in 15 minutes. Only their SHA-256 hashes are stored; atomic consumption prevents reuse and concurrent resets. A successful reset invalidates previously issued access tokens. No raw code is returned through the API or logged. Unknown accounts receive the same 202 message as known accounts; missing SMTP configuration returns 503 for everyone. Delivery failures are logged without account details and invalidate the undelivered code.

Endpoints:

- `POST /api/auth/forgot-password`: `{ "email": "user@example.com" }`
- `POST /api/auth/reset-password`: `{ "token": "code-from-email", "password": "new-password" }`

Recovery requests are limited per IP (5 requests / 15 minutes; 20 reset attempts / 15 minutes). Per-account sending has a database-backed 60-second cooldown. The IP limiter uses process memory; a multi-instance deployment needs a shared rate-limit store and correctly configured trusted proxy settings.

## Tests (Node.js 24)

From the project root:

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run typecheck
```

Default tests use isolated database/email/storage/network doubles. They do not connect to Atlas, send email, or build the frontend. Frontend tests transpile source in memory and test the API/session logic, not device rendering.

The explicitly named backend `test:live:login` and `test:live:registration` commands require Atlas and create disposable accounts. Run those only when you intend to exercise the live database. Email delivery and native device persistence still require a configured provider/device for end-to-end verification.
