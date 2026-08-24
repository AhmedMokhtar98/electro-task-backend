# Electro Task Backend

REST API for Electro Task's client authentication, profile, and task-management
flows. The service provides registration, email verification, login, JWT
rotation, password recovery, localized responses, Redis-backed OTP storage,
distributed rate limiting, and authenticated task CRUD with filtering and
drag-and-drop order persistence.

## Features

- Client registration and login
- Authenticated profile retrieval and updates
- Email verification with six-digit OTP codes
- Password-reset links with short-lived JWTs
- Access and refresh token generation and rotation
- Per-client task creation, retrieval, update, and deletion
- Task search, status/priority/date filters, pagination, and sorting
- Persistent task status and position updates for drag-and-drop boards
- Ownership checks so clients can access only their own tasks
- AES-encrypted password fields in API requests
- English and Arabic responses through `Accept-Language`
- MongoDB persistence with Mongoose
- Redis-backed OTP state and distributed rate limits
- Separate API and authentication rate-limit policies
- Joi request validation and a consistent error format
- Helmet, CORS, request logging, body-size limits, and graceful shutdown
- Health endpoint for deployment checks

## Technology

- Node.js 18+
- Express 4
- MongoDB and Mongoose
- Redis and `rate-limit-redis`
- JSON Web Tokens
- Joi, bcrypt, CryptoJS, Nodemailer, i18n, and EJS

## Project structure

```text
.
├── config/                 # MongoDB, localization, and locale files
├── controllers/            # HTTP controllers
├── helpers/                # JWT, email, authorization, and validation helpers
├── middlewares/            # Encryption, error, and response middleware
├── models/                 # Mongoose models and repositories
├── public/                 # Static assets
├── redis/                  # Redis connection and OTP persistence
├── routes/                 # Express routers
├── scripts/                # One-time data migration scripts
├── utils/                  # Email templates and utilities
├── validations/            # Joi schemas
├── views/                  # EJS views
└── index.js                # Application entry point
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB
- Redis
- SMTP credentials for email verification and password recovery

The API does not start until MongoDB and Redis are available. Redis must also
grant the application user the commands described in
[Redis ACL configuration](#redis-acl-configuration).

## Installation

```bash
npm install
```

Create a `.env` file in the project root and configure the values below. Never
commit the real file or production secrets.

```dotenv
# Application
NODE_ENV=development
ENV=dev
PORT=7000
SESSION_SECRET=replace-with-a-long-random-value
X_APP_TOKEN_SECRET=replace-with-a-long-random-value
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGO_URL=mongodb://127.0.0.1:27017/electro-task

# Redis: use REDIS_URL or the individual connection fields
# REDIS_URL=redis://username:password@127.0.0.1:6379
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=

# JWT
ACCESS_TOKEN_SECRET=replace-with-a-long-random-value
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-value
PASSWORD_RESET_TOKEN_SECRET=replace-with-another-long-random-value
ACCESS_TOKEN_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d
PASSWORD_RESET_TOKEN_EXPIRY=15m

# Request password encryption
SECRET_KEY_ENCRYPTION=replace-with-the-shared-client-encryption-key

# SMTP
EMAIL_HOST=mail.privateemail.com
EMAIL_PORT=465
EMAIL_USER=notifications@example.com
EMAIL_PASS=replace-with-the-smtp-password
EMAIL_FROM="Electro Task Team <notifications@example.com>"
EMAIL_VERIFY_ON_START=false

# OTP policy
OTP_TTL_SECONDS=600
OTP_RESEND_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_SALT_ROUNDS=10

# Rate limiting
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20

# HTTP and proxy behavior
JSON_BODY_LIMIT=200kb
URLENCODED_BODY_LIMIT=200kb
TRUST_PROXY=false
```

Generate secrets with a cryptographically secure tool. For example:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Use a different generated value for each secret.

## Running the service

Development with automatic restart:

```bash
npm run dev
```

Direct execution:

```bash
node index.js
```

The default base URL is:

```text
http://localhost:7000
```

Useful service routes:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Renders the public EJS view |
| `GET` | `/health` | Reports service and Redis status |

## Request requirements

### Application token

Every route under `/api/v1` requires the application token header:

```http
x-app-token: <X_APP_TOKEN_SECRET>
```

The health check and public root route do not require this header.

### Authentication

Protected client routes require an access token:

```http
Authorization: Bearer <access-token>
```

Refresh tokens belong in the refresh endpoint request body and cannot be used
as bearer access tokens.

### Localization

Set `Accept-Language` to `en` or `ar`:

```http
Accept-Language: ar
```

English is used when the header is missing or unsupported.

### Password encryption

The API decrypts every request-body field whose name contains `password`.
Clients must encrypt those fields with the shared `SECRET_KEY_ENCRYPTION`
value before sending them.

Browser/Node.js example with CryptoJS:

```js
import CryptoJS from "crypto-js";

const encryptedPassword = CryptoJS.AES.encrypt(
  "StrongPassword!123",
  process.env.SECRET_KEY_ENCRYPTION
).toString();
```

Plaintext or ciphertext created with a different key returns `400 Invalid
encrypted password`.

Passwords must contain at least eight characters, including a lowercase
letter, uppercase letter, number, and special character. The bcrypt input limit
is 72 UTF-8 bytes.

## API endpoints

All paths below are relative to `/api/v1` and require `x-app-token`.

### Public authentication endpoints

| Method | Path | Authentication | Request body |
| --- | --- | --- | --- |
| `POST` | `/client/auth/register` | Public | `firstName`, `lastName`, `email`, `password` |
| `POST` | `/client/auth/login` | Public | `email`, `password` |
| `POST` | `/client/auth/email-verify` | Public | `email`, `otp` |
| `POST` | `/client/auth/email-verify/otp-resend` | Public | `email` |
| `POST` | `/client/auth/password/forgot` | Public | `email` |
| `POST` | `/client/auth/password/reset` | Public | `token`, `newPassword` |
| `POST` | `/client/auth/refresh-token` | Public | `refreshToken` |

### Protected client endpoints

These endpoints also require `Authorization: Bearer <access-token>`.

| Method | Path | Description | Request body or query |
| --- | --- | --- | --- |
| `GET` | `/client/profile` | Get the authenticated client's profile | None |
| `PUT` | `/client/profile` | Update name and optionally password | `firstName`, `lastName`, or both `oldPassword` and `newPassword` |
| `POST` | `/client/tasks` | Create a task | `title`, `description`, `dueDate`; optional `status`, `priority` |
| `GET` | `/client/tasks` | List the client's tasks | Query parameters documented below |
| `GET` | `/client/tasks/:id` | Get one owned task | None |
| `PUT`, `PATCH` | `/client/tasks/:id` | Update one owned task | Any supported task field |
| `DELETE` | `/client/tasks/:id` | Delete one owned task | None |
| `PUT`, `PATCH` | `/client/tasks/reorder` | Save task status and board position | `tasks` array |

`password`, `oldPassword`, and `newPassword` in this document mean
AES-encrypted values, not plaintext.

### Registration example

```bash
curl --request POST "http://localhost:7000/api/v1/client/auth/register" \
  --header "Content-Type: application/json" \
  --header "Accept-Language: en" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --data '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "password": "AES_ENCRYPTED_PASSWORD"
  }'
```

Registration creates an unverified client and sends an email-confirmation OTP.
The client must verify the email address before login succeeds.

### Login example

```bash
curl --request POST "http://localhost:7000/api/v1/client/auth/login" \
  --header "Content-Type: application/json" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --data '{
    "email": "jane@example.com",
    "password": "AES_ENCRYPTED_PASSWORD"
  }'
```

A successful login returns both access and refresh tokens.

### Profile

The profile endpoint uses the authenticated client ID from the access token;
clients cannot provide a different client ID. Email is returned for display but
is not editable through this endpoint.

```bash
curl "http://localhost:7000/api/v1/client/profile" \
  --header "Accept-Language: en" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Update the name, password, or both:

```bash
curl --request PUT "http://localhost:7000/api/v1/client/profile" \
  --header "Content-Type: application/json" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --data '{
    "firstName": "Jane",
    "lastName": "Smith",
    "oldPassword": "AES_ENCRYPTED_CURRENT_PASSWORD",
    "newPassword": "AES_ENCRYPTED_NEW_PASSWORD"
  }'
```

When a profile update succeeds, `result.token` contains rotated access and
refresh tokens. Replace both stored tokens before making subsequent requests.

### Tasks

Task status values are `To Do`, `In Progress`, and `Done`. Priority values are
`Low`, `Medium`, and `High`. New tasks default to `To Do` and `Medium` when
those optional fields are omitted.

Create a task:

```bash
curl --request POST "http://localhost:7000/api/v1/client/tasks" \
  --header "Content-Type: application/json" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --data '{
    "title": "Prepare release notes",
    "description": "Summarize the completed work for the next release.",
    "status": "To Do",
    "priority": "High",
    "dueDate": "2026-08-31T23:59:59.999Z"
  }'
```

The list endpoint supports the following query parameters:

| Parameter | Allowed values | Default |
| --- | --- | --- |
| `page` | Positive integer | `1` |
| `limit` | Integer from `1` to `100` | `10` |
| `search` | Task-title text, up to 100 characters | None |
| `status` | `To Do`, `In Progress`, `Done` | None |
| `priority` | `Low`, `Medium`, `High` | None |
| `dueDate` | ISO date; matches the full UTC day | None |
| `sortBy` | `position`, `title`, `status`, `priority`, `dueDate`, `createdAt`, `updatedAt` | `position` |
| `sortOrder` | `asc`, `desc` | `asc` |

Example filtered request:

```bash
curl --get "http://localhost:7000/api/v1/client/tasks" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --data-urlencode "search=release" \
  --data-urlencode "status=To Do" \
  --data-urlencode "priority=High" \
  --data-urlencode "sortBy=dueDate" \
  --data-urlencode "sortOrder=asc" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=10"
```

Save drag-and-drop status and positions:

```bash
curl --request PUT "http://localhost:7000/api/v1/client/tasks/reorder" \
  --header "Content-Type: application/json" \
  --header "x-app-token: YOUR_APP_TOKEN" \
  --header "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --data '{
    "tasks": [
      {
        "id": "64f000000000000000000001",
        "status": "In Progress",
        "position": 1000
      },
      {
        "id": "64f000000000000000000002",
        "status": "In Progress",
        "position": 2000
      }
    ]
  }'
```

Every task query includes the authenticated client ID. Requests for tasks owned
by another client return `404` rather than exposing whether the task exists.

## Response format

Successful responses generally use:

```json
{
  "success": true,
  "code": 200,
  "message": "Request completed successfully",
  "result": {}
}
```

Some authentication responses include a `token` object either inside `result`
or at the top level, depending on the operation.

Errors use:

```json
{
  "success": false,
  "message": "Validation failed",
  "code": 422,
  "errors": [
    {
      "field": "email",
      "message": "A valid email is required"
    }
  ]
}
```

Rate-limit responses use status `429` and include standard `RateLimit` headers.

## Rate limiting

Two Redis-backed policies are configured:

| Policy | Default window | Default limit | Scope |
| --- | ---: | ---: | --- |
| Authentication | 15 minutes | 20 failed requests | `/client/auth/**` |
| General API | 15 minutes | 300 requests | Other `/api/v1/**` routes |

Successful authentication responses are removed from the authentication
counter. API and authentication counters use separate Redis key prefixes.

When the service runs behind a reverse proxy, set `TRUST_PROXY` to the trusted
hop count so Express identifies the client IP correctly. `TRUST_PROXY=true`
means one trusted proxy hop in this project.

## Redis ACL configuration

`rate-limit-redis` uses atomic Lua scripts through `SCRIPT LOAD` and `EVALSHA`.
The same Redis connection also stores OTP hashes and resend cooldowns.

From an administrator Redis session, inspect and incrementally update the
application user. Replace `<app-user>` with the username from `REDIS_USERNAME`
or `REDIS_URL`:

```redis
ACL GETUSER <app-user>
ACL SETUSER <app-user> on ~rate-limit:* ~otp:* +ping +quit +script|load +evalsha +pttl +set +incr +get +decr +del +exists +ttl +hset +expire +hgetall +hincrby +multi +exec
ACL GETUSER <app-user>
```

This command is additive: it does not reset the user's password or existing
application permissions. Do not add `reset`, `resetkeys`, or `+@all`.

For self-hosted Redis using an external ACL file, persist the verified change:

```redis
ACL SAVE
```

For managed Redis, grant the equivalent command permissions and key patterns
through the provider's ACL or data-access interface. Some providers do not
allow application connections to run `ACL SETUSER` or `ACL SAVE`.

At startup, the application checks the permissions required by
`rate-limit-redis` before opening the HTTP port. A missing permission therefore
causes a clear startup failure rather than an asynchronous runtime error.

## Health checks

```bash
curl "http://localhost:7000/health"
```

Healthy response:

```json
{
  "ok": true,
  "redis": "PONG",
  "mongo": "ok"
}
```

The server only opens its HTTP port after the initial MongoDB connection
succeeds. The current `mongo` health field reflects that startup state; it is
not a live MongoDB ping on every health request.

The process also handles `SIGINT` and `SIGTERM`, stops accepting requests,
closes Redis gracefully, and forces shutdown after 15 seconds if necessary.

## Task position migration

Databases created before the task `position` field was introduced should run
the backfill once before enabling drag-and-drop ordering:

```bash
npm run migrate:task-positions
```

The script requires `MONGO_URL`, groups tasks by client and status, and assigns
positions in increments of `1000`. It processes writes in batches and can be
run again safely; tasks already holding the expected positions are skipped.
Back up production data before running any migration.

## Production notes

- Set `NODE_ENV=production` and use strong, unique secrets.
- Serve the API over HTTPS. Request-field encryption does not replace TLS.
- Never expose MongoDB or Redis directly to the public internet.
- Restrict Redis to the command and key permissions the application needs.
- Configure TLS for externally hosted MongoDB, Redis, and SMTP services.
- Set `TRUST_PROXY` to the real proxy topology; an incorrect value can group
  users under one IP or trust spoofed forwarding headers.
- Keep `X_APP_TOKEN_SECRET` server-side and distribute it only to trusted API
  clients.
- Replace the current open CORS policy with an explicit production origin
  allowlist before exposing the API publicly.
- Use a process manager or service supervisor to restart the Node.js process.
- Run `npm audit` and review dependency updates before deployment.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Runs the API with Nodemon |
| `node index.js` | Runs the API directly |
| `npm run migrate:task-positions` | Backfills and normalizes task board positions |

An automated test script is not currently configured.

## License

ISC
