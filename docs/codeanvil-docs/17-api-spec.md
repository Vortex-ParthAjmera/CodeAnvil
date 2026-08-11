# API Spec

## Purpose

This document describes the future Python/FastAPI API for CodeAnvil.

The MVP can be frontend-only. API work starts when we add accounts, cloud saves, dashboards, leaderboards, AI, exports, or sandboxed tracing.

## API Principles

- Python/FastAPI for backend logic.
- Supabase Auth for identity.
- Supabase Postgres for data.
- RLS for database-level isolation.
- Backend authorization for privileged operations.
- No arbitrary code execution in normal API workers.
- JSON request and response schemas validated with Pydantic.
- Every endpoint must have explicit validation, authorization, rate-limit, and resilience behavior before deploy.
- Free API/model usage still requires rate limiting and quotas.

## Mandatory Pre-Deploy Gate

Before deploying any backend endpoint, run the [Backend Pre-Deploy Security Gate](35-backend-predeploy-security-gate.md).

Do not deploy if any answer is weak or unknown:

- Authorization
- Rate Limiting
- Secrets Management
- Access Control
- Token Security
- Resilience

## Auth

Preferred model:

- frontend authenticates with Supabase Auth
- frontend sends bearer token to FastAPI
- FastAPI validates token
- FastAPI performs extra authorization checks for admin operations

Header:

```http
Authorization: Bearer <access_token>
```

Never pass access tokens in query params.

Token security requirements:

- access tokens should be short-lived enough for the app risk level
- logout/session revocation behavior must be documented
- sensitive operations should be able to verify fresh user/session state
- stolen token impact must be limited by expiry, revocation, and authorization checks

## Public Endpoints

### `GET /health`

Returns service health.

Response:

```json
{
  "ok": true,
  "service": "codeanvil-api"
}
```

### `GET /examples`

Returns published examples.

Query:

- `topic`
- `language`
- `difficulty`

### `GET /examples/{slug}`

Returns one published example with code and trace.

## Authenticated User Endpoints

### `GET /me`

Returns current user profile.

### `PATCH /me`

Updates safe profile fields.

Cannot update:

- `role`
- `user_id`
- `email`

### `GET /sessions`

Returns current user's saved playback sessions.

### `POST /sessions`

Creates a saved playback session.

Validation:

- code size limit
- trace size limit
- title length limit
- visibility enum
- authenticated owner must be taken from token, not request body

### `GET /sessions/{id}`

Returns a session if owned by the user or public/unlisted according to rules.

### `PATCH /sessions/{id}`

Updates a session owned by current user.

### `DELETE /sessions/{id}`

Deletes a session owned by current user.

### `POST /practice-attempts`

Stores dry-run practice result.

Server should validate:

- example exists
- counts are non-negative
- score range is sane
- duration is sane

### `POST /challenge-attempts`

Stores a challenge attempt.

For official leaderboards, scoring should be server-side.

Validation:

- challenge ID exists
- attempt payload shape is valid
- duration is within sane bounds
- score is calculated or verified server-side for official rankings
- repeated submissions are rate-limited

## Admin Endpoints

All admin endpoints require backend admin authorization.

### `GET /admin/overview`

Returns platform metrics.

### `POST /admin/examples`

Creates an example.

### `PATCH /admin/examples/{id}`

Updates an example.

### `POST /admin/examples/{id}/publish`

Publishes an example.

### `POST /admin/challenges`

Creates a challenge.

### `PATCH /admin/challenges/{id}`

Updates a challenge.

### `POST /admin/challenges/{id}/publish`

Publishes a challenge.

### `GET /admin/reports`

Returns report queue.

### `POST /admin/reports/{id}/resolve`

Resolves report and writes audit log.

### `GET /admin/audit-logs`

Returns audit logs.

## AI Endpoints Later

### `POST /ai/explain-step`

Explains current trace step.

Rules:

- rate-limited
- no secrets in logs
- user must opt in if code leaves the browser

### `POST /ai/generate-practice`

Generates practice questions from an example or trace.

## Sandbox Endpoints Later

### `POST /trace/generate`

Generates trace from code.

Request:

```json
{
  "code": "function search(arr, target) { return arr.indexOf(target); }",
  "language": "javascript",
  "mode": "best_effort"
}
```

Response:

```json
{
  "trace": {},
  "detectedLanguage": "javascript",
  "matchedPattern": "linear_search",
  "confidence": 0.82,
  "diagnostics": []
}
```

Rules:

- not available until sandbox is ready
- static parser/AST analysis should be preferred before real execution
- local LLMs may assist with explanation and pattern detection
- generated output must be structured trace JSON, not raw Three.js code
- generated traces must pass schema validation before playback
- timeout required
- memory limit required
- network disabled by default
- output size limited

## Error Shape

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request.",
    "requestId": "req_123"
  }
}
```

Do not expose stack traces to users in production.

## Rate Limits

High priority limits:

- login-related backend calls
- challenge submissions
- AI requests
- trace generation
- exports
- report creation
- admin mutations

Rate limits are required even when using a free API or free model. Free quotas can still be exhausted by abuse.

## Input Validation Baseline

Every endpoint must validate:

- body shape
- field types
- string lengths
- enum values
- numeric ranges
- array lengths
- JSON size
- file size and type
- authenticated owner
- role permission

Frontend validation is not enough. Server-side validation is mandatory.
- report creation
- admin mutations
