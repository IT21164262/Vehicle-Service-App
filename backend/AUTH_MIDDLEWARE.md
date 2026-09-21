# Authentication and authorization middleware

Authentication identifies the caller. Authorization checks what that caller may do. A valid customer is authenticated, but is not authorized to perform administrator operations.

## Step 1: Read and verify the Bearer token

Open `middleware/authMiddleware.cjs` and follow `authenticate` from top to bottom:

1. Read the `Authorization` header and require one Bearer credential. Missing or malformed headers return `401`.
2. Call `jwt.verify` with the existing configured secret and `algorithms: ["HS256"]`. This checks the signature and expiry. `jwt.decode` alone would not establish trust.
3. Require a MongoDB user ID in `sub` and an integer `exp`. An otherwise valid signed token without expiry is rejected too.
4. Look up the current user with `User.findById(...).select("name email isAdmin")`. MongoDB includes `_id` automatically; the projection excludes the hash and other unnecessary fields.
5. Return `401` if the user no longer exists. Otherwise attach the database result to `req.user` and call `next()`.

All authentication failures use the same safe message. Database or configuration failures return a generic `500`, because an infrastructure failure does not mean the caller supplied invalid credentials. No error response echoes a token or database error details.

## Step 2: Check authorization

`requireAdmin` expects `authenticate` to have run first. It returns `401` if `req.user` is absent, `403` if `req.user.isAdmin !== true`, and calls `next()` for an administrator.

The role comes from the current database lookup, not request input or a JWT role claim. Demoting a user therefore takes effect on the next authenticated request, even with the same unexpired token. Public registration still explicitly creates customers.

For a future administrator route, the order will be: `authenticate`, then `requireAdmin`, then the route controller. No administrator route or role-changing endpoint is introduced in this milestone.

## Step 3: Connect the protected endpoint

The only new application route is:

```js
router.get("/me", authenticate, getMe);
```

The server already mounts this router at `/api/auth`, making the complete path `GET /api/auth/me`. The `getMe` controller returns only `id`, `name`, `email`, and `isAdmin`. Authentication responses use `Cache-Control: no-store`.

Both customers and administrators may use `/me`. A `403` is expected only when the administrator middleware is applied; `/me` is not an administrator endpoint.

Before running the tests, predict what happens when `authenticate` returns `401`: it never calls `next()`, so `getMe` never runs. The same stopping rule applies when `requireAdmin` returns `403`.

## Step 4: Manually call /me without printing credentials

These are **PowerShell terminal commands**, not file contents. Use the existing backend environment configuration from the login milestone. No credential file needs to be shared or displayed.

From the project root, start the server in terminal 1:

```powershell
node .\backend\server.cjs
```

In terminal 2, use the server's actual port (normally 5000). This creates one disposable customer and captures the login response in memory. Do not print the credential variables or the complete login response.

```powershell
$authUrl = 'http://localhost:5000/api/auth'
$testEmail = 'manual-me-' + [guid]::NewGuid().ToString('N') + '@example.com'
$testPassword = [guid]::NewGuid().ToString('N')
$registration = Invoke-RestMethod -Method Post -Uri "$authUrl/register" -ContentType 'application/json' -Body (@{ name = 'Middleware Test'; email = $testEmail; password = $testPassword; isAdmin = $true } | ConvertTo-Json)
$authSession = Invoke-RestMethod -Method Post -Uri "$authUrl/login" -ContentType 'application/json' -Body (@{ email = $testEmail; password = $testPassword } | ConvertTo-Json)

function Test-Me {
    param([hashtable]$Headers = @{})
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$authUrl/me" -Headers $Headers -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        [pscustomobject]@{
            Status = [int]$response.StatusCode
            UserId = $data.user.id
            IsAdmin = $data.user.isAdmin
            UserFields = ($data.user.PSObject.Properties.Name -join ', ')
            HasSensitiveFields = [bool]((@($data.PSObject.Properties.Name) + @($data.user.PSObject.Properties.Name)) -match '^(password|passwordHash|token)$')
        }
    } catch {
        if ($null -eq $_.Exception.Response) {
            Write-Output 'No HTTP response. Check the server and port.'
        } else {
            Write-Output ([int]$_.Exception.Response.StatusCode)
        }
    }
}

# Valid token: expect 200, IsAdmin False, and HasSensitiveFields False.
Test-Me -Headers @{ Authorization = 'Bearer ' + $authSession.token }

# Missing token: expect 401.
Test-Me

# Random invalid token: expect 401; the value is never printed.
Test-Me -Headers @{ Authorization = 'Bearer ' + [guid]::NewGuid().ToString('N') }
```

The successful response's user fields must be exactly `id, name, email, isAdmin`. The attempted registration role must still be `false`.

For a manual expiry check, keep the same PowerShell session and repeat the valid-token command more than one hour after login, without logging in again. Expect `401`. For an immediate check, run the live test command below: it signs an already expired token using an isolated in-memory test secret and sends it to the real `/me` route. Do not change your normal token lifetime or secret to test expiry.

## Step 5: Test administrator middleware without adding endpoints

From the project root, run just the administrator scenario:

```powershell
node --test --test-name-pattern="customer receives 403" .\backend\tests\authMiddleware.test.cjs
```

Read that test alongside the middleware. It uses real JWT verification and a simulated database lookup, then directly calls `authenticate` followed by `requireAdmin`. The three assertions are:

| Current database result | Expected outcome |
| --- | --- |
| Customer | `403`, next handler not called |
| Administrator | Next handler called |
| Same user demoted to customer, same token | `403`, next handler not called |

The test deliberately includes an administrator claim in the token and proves that only the database role controls access. No real database account is promoted or demoted. This is an isolated middleware test, not an administrator HTTP endpoint or a test against a real Atlas administrator account.

Run all isolated middleware tests:

```powershell
node --test .\backend\tests\authMiddleware.test.cjs
```

Run the real HTTP checks against Atlas, including registration, login, valid `/me`, missing/invalid/expired credentials, wrong signature, wrong algorithm, nonexistent user, and safe response fields:

```powershell
node .\backend\scripts\check-login.cjs
```

The live script starts and stops its own server with a random in-memory test secret. It prints only check results, and leaves one disposable `login-check-*` customer per successful run. It does not inspect your configured secret. The isolated tests do not connect to Atlas or load credential files. Neither test adds an application endpoint.

Stop your manually started server with Ctrl+C when finished. Review the middleware and test outcomes before moving to another milestone.
