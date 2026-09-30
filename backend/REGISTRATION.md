# Registration

`POST /api/auth/register` accepts a name, email, and password. The controller trims the name, normalizes the email, hashes the password with bcrypt, and creates a customer account.

Passwords require at least 8 characters and at most 72 UTF-8 bytes. Registration cannot grant administrator access.

Successful requests return `201` with safe account fields. Invalid input returns `400`; duplicate email addresses return `409`. The unique email index also protects against concurrent registrations. Startup waits for the user indexes before accepting requests.

Password hashes are excluded from normal queries and API responses.
