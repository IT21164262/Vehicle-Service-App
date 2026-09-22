# AutoNexa frontend

Expo SDK 57, React Native and TypeScript. Includes the welcome, signup, and login screens. Password recovery is outside the project scope. Signed-in password changes remain available in Profile.

## Configure and run

1. Run `npm.cmd ci` inside this folder (Node.js 24).
2. Copy `.env.example` to `.env` and choose the API URL for your device. The URL must end in `/api`; do not append `/auth`.
3. Start the backend with `npm.cmd --prefix ../backend start` in another terminal.
4. Run `npm.cmd run android` with a running Android emulator, or `npm.cmd run web` for a browser. For a physical phone, run `npm.cmd start` and use compatible Expo Go on the same network.

Changing the public API URL requires restarting Expo. The Android emulator uses `10.0.2.2` for the host computer; a physical phone needs the computer's LAN IPv4 address. Production URLs must use HTTPS.

## Authentication

Native login tokens persist in Expo SecureStore; browser tokens persist in localStorage. Startup validates the saved session. Expired or revoked tokens are removed; network failures preserve the session for retry. Token lifetime remains one hour. Authentication navigation to a dashboard remains a future milestone.

No email-provider configuration is required. See [authentication setup](../AUTH_SETUP.md).

## Checks without a build

`npm.cmd test` runs API/session unit tests with mocked network and platform storage. `npm.cmd run typecheck` checks TypeScript. Neither command builds or exports the app. Native rendering and actual device storage still need device testing.

## Source map

- `App.tsx`: existing screen switching and session restoration.
- `src/services/authApi.ts`: API configuration, requests, session storage.
- `src/screens/LoginScreen.tsx`: login form.
- `src/screens/SignUpScreen.tsx`: registration.
- `src/screens/WelcomeScreen.tsx`: existing welcome page.
- `src/theme.ts`: shared design values.
