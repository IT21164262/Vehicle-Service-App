# Authentication configuration and checks

## API URL and sessions

Set `EXPO_PUBLIC_API_URL` in the frontend environment to your backend URL ending in `/api`. Use HTTPS for the hosted Render backend. Restart Expo after changing the URL.

Native sessions use Expo SecureStore; browser sessions use localStorage. Sessions are scoped to the API URL. Startup validates saved tokens. Expired or revoked tokens require login; connection failures allow retry. Tokens expire after one hour.

## Backend configuration

Configure `MONGODB_URI` and a random `JWT_SECRET` of at least 32 bytes in the backend environment. Keep credentials out of source control.

Customers can register, log in, and change their password while signed in through Profile. Changing a password requires the current password and invalidates existing sessions.

## Local checks

From the project root:

`node --test tests/appointment-delete.cjs`

`npm.cmd --prefix frontend run typecheck`

The deletion test uses simulated database records without contacting Render or Atlas. Device testing is needed to verify native screens.
