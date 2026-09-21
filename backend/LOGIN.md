# Login learning milestone

## 1. Follow the request

`POST /api/auth/login` reaches the `/api/auth` router mounted in `server.cjs`. The router's `/login` handler calls `login` in `controllers/authController.cjs`.

The controller checks that email and password are strings. It uses the same email normalization and password length limits as registration. Only the email is trimmed and lowercased; changing a password before comparison would change its meaning.

## 2. Retrieve and compare the hash

`User.findOne({ email: cleanEmail }).select("+passwordHash")` explicitly retrieves the field hidden by the schema's `select: false` setting. `bcrypt.compare(password, user.passwordHash)` checks the supplied password against the stored hash. Do not hash the supplied password again and compare strings: bcrypt hashes use salts.

Unknown email and incorrect password both return status `401` with `Invalid email or password.` Invalid input returns `400`. This keeps credential failure messages consistent; it does not make response timing identical.

## 3. Issue an expiring token

`jwt.sign` uses HS256 and the backend's secret. The token includes `sub` (the user's ID), `iat` (issued at), and `exp` (one hour later). It contains no password, hash, or role. A JWT signature protects integrity; it does not encrypt the payload. See the [jsonwebtoken documentation](https://github.com/auth0/node-jsonwebtoken#usage).

The response includes a token and only the safe user fields: `id`, `name`, `email`, and `isAdmin`. `Cache-Control: no-store` tells clients and intermediaries not to cache the login response. Future protected routes must verify the token signature and expiration; merely decoding a token is not authentication. Route protection is outside this login milestone.

## 4. Configure your secret locally

No credential file was inspected or changed for this milestone. The application loads `backend/.env` at runtime regardless of the launch directory. Run this **PowerShell terminal command yourself** to generate 32 random bytes encoded as hex and copy the result without printing it:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | Set-Clipboard
```

In your local `backend/.env`, add a single `JWT_SECRET=` entry and paste the generated value after the equals sign. If the entry already exists, replace it instead of adding a duplicate. Keep the existing database configuration. Save the file. Do not paste the value into chat or source code. Clear the clipboard afterward:

```powershell
Set-Clipboard -Value ''
```

The server refuses to start when the secret is missing, blank, or shorter than 32 bytes. Length checking alone does not ensure randomness; use the generation command. Existing process environment variables take precedence over the file. Changing the secret invalidates previously signed tokens.

## 5. Test manually without printing tokens

These are **PowerShell terminal commands**, not file contents. From the project root, start the backend in terminal 1:

```powershell
node .\backend\server.cjs
```

In terminal 2, use the port shown by the server (normally 5000). This creates one disposable customer. The generated password stays in a variable and is not printed:

```powershell
$authUrl = 'http://localhost:5000/api/auth'
$testEmail = 'manual-login-' + [guid]::NewGuid().ToString('N') + '@example.com'
$testPassword = [guid]::NewGuid().ToString('N')
$registration = Invoke-RestMethod -Method Post -Uri "$authUrl/register" -ContentType 'application/json' -Body (@{ name = 'Login Test'; email = $testEmail; password = $testPassword } | ConvertTo-Json)

function Test-Login {
    param([hashtable]$Body)
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$authUrl/login" -ContentType 'application/json' -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        [pscustomobject]@{
            Status = [int]$response.StatusCode
            Message = $data.message
            TokenReceived = [bool]$data.token
            UserId = $data.user.id
            IsAdmin = $data.user.isAdmin
            HasPasswordField = [bool]($data.user.PSObject.Properties.Name -match '^password(Hash)?$')
        }
    } catch {
        if ($null -eq $_.Exception.Response) {
            Write-Output 'No HTTP response. Check the server and port.'
        } else {
            $message = 'No JSON error message available.'
            try { $message = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {}
            [pscustomobject]@{ Status = [int]$_.Exception.Response.StatusCode; Message = $message }
        }
    }
}

# Expect 200, TokenReceived True, IsAdmin False, HasPasswordField False.
Test-Login @{ email = (' ' + $testEmail.ToUpperInvariant() + ' '); password = $testPassword }

# Both expect 401 and exactly: Invalid email or password.
Test-Login @{ email = $testEmail; password = [guid]::NewGuid().ToString('N') }
Test-Login @{ email = ('unknown-' + [guid]::NewGuid().ToString('N') + '@example.com'); password = $testPassword }

# Both expect 400 and an input validation message.
Test-Login @{ email = 'invalid'; password = $testPassword }
Test-Login @{ email = $testEmail }
```

Do not print the full response object, because it contains the token. Stop the server with Ctrl+C after testing.

## Automated verification

From the project root:

```powershell
node .\backend\scripts\check-login.cjs
```

The script injects its own random in-memory JWT secret into a temporary backend process. It does not inspect your configured secret, and it prints no secrets or tokens. It checks configuration failures, successful login, normalized email, safe fields, identical credential-failure responses, invalid inputs, JWT signature, user ID, and one-hour expiry. It also checks that verification rejects expired tokens and a wrong signing key. Each successful run leaves one disposable `login-check-*` customer in Atlas.

This verifies login independently of your own JWT secret configuration. Configure your local secret and run the manual steps to verify your normal development setup.
