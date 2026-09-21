# Registration milestone

## How the request reaches your code

1. `express.json()` parses the request body.
2. `app.use("/api/auth", authRoutes)` selects the authentication router.
3. `router.post("/register", register)` calls your registration controller.
4. The controller validates input, normalizes email, hashes the password with bcrypt, and creates a customer.
5. The response explicitly includes only `id`, `name`, `email`, and `isAdmin`.

Your model had no functional error. Its filename is `user.cjs`, matching the import. `select: false` hides the hash in normal queries, but does not remove it from a newly created document. Keep the controller's explicit response fields; do not return the whole document.

`unique: true` declares a MongoDB index, rather than a Mongoose validator. The server now waits for `User.init()` before listening. The initial email lookup gives a friendly duplicate response, while the unique index and error-code `11000` handler protect against simultaneous requests.

The controller's obsolete temporary-response comment and indentation were corrected. bcrypt is now declared in the backend package. Malformed and oversized JSON receive safe JSON errors. Credential filenames ending in `.env` are ignored by Git.

## Manual test in Windows PowerShell

These blocks are terminal commands, not file contents. From the project root, start the backend in terminal 1:

```powershell
Set-Location .\backend
node .\server.cjs
```

The app loads its existing environment configuration. Do not paste or print credentials. In terminal 2, use the port shown by the server (normally 5000):

```powershell
$registerUrl = 'http://localhost:5000/api/auth/register'
$testEmail = 'manual-' + [guid]::NewGuid().ToString('N') + '@example.com'
$testBody = @{
    name = ' Manual Test '
    email = $testEmail
    password = [guid]::NewGuid().ToString('N')
    isAdmin = $true
}

function Send-RegistrationTest {
    param([hashtable]$Body)
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $registerUrl -ContentType 'application/json' -Body ($Body | ConvertTo-Json) -ErrorAction Stop
        Write-Output ([int]$response.StatusCode)
        Write-Output $response.Content
    } catch {
        if ($null -eq $_.Exception.Response) {
            Write-Output 'No HTTP response. Check that the backend is running and the port is correct.'
        } else {
            Write-Output ([int]$_.Exception.Response.StatusCode)
            Write-Output $_.ErrorDetails.Message
        }
    }
}

# Valid input: expect 201, trimmed name, and isAdmin false.
Send-RegistrationTest -Body $testBody

# Invalid input: expect 400 and a validation message.
$testBody.email = 'invalid'
Send-RegistrationTest -Body $testBody

# Duplicate email, including case and whitespace: expect 409.
$testBody.email = ' ' + $testEmail.ToUpperInvariant() + ' '
Send-RegistrationTest -Body $testBody
```

Inspect each response: none should contain a password, `passwordHash`, or bcrypt hash. The success response should contain only a message and the four safe user fields listed above. Each walkthrough creates one disposable customer account. Stop the server with Ctrl+C when finished.

## Verification

Live HTTP checks passed for missing fields, wrong types, blank names, invalid emails, password length limits, malformed JSON, oversized JSON, normalized registration, forced customer role, duplicate emails, concurrent duplicate requests, and safe response fields. The local verification script is not included in this milestone. Two disposable `registration-check-*` accounts remain from verification.

Login/JWT, services, image uploads, appointments, and administrator workflows remain for later milestones.
