# AutoNexa frontend

Expo and React Native app for vehicle services, appointments, profiles, notifications, and administrator tools.

## Run

1. Install dependencies with `npm.cmd ci` in this folder.
2. Set `EXPO_PUBLIC_API_URL` in your local environment to the backend URL ending in `/api`.
3. Run `npm.cmd start` and open the app in a compatible Expo Go client, or run `npm.cmd run web`.

The hosted Render backend can be used directly. A local backend is optional. Restart Expo after changing the API URL. Production connections require HTTPS.

## Checks

From the project root:

`npm.cmd --prefix frontend run typecheck`

`node --test tests/appointment-delete.cjs`

The deletion test uses simulated database records and does not contact Render. Verify native screens on a device after deployment.

## Sessions

Login tokens are stored in SecureStore on native devices and localStorage on the web. Startup validates saved sessions. Expired or revoked sessions require login; network failures allow retry. Signed-in users can change their password in Profile.
