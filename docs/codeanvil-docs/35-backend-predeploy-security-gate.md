# Backend Pre-Deploy Security Gate

## Purpose

This document is mandatory before deploying any CodeAnvil backend, serverless function, worker, API route, AI endpoint, sandbox endpoint, admin endpoint, or database-exposed feature.

If any answer below is weak, unknown, or "we will fix later", deployment is blocked.

## The Six Required Questions

Before backend deploy, ask these six questions:

1. Authorization: Can users access data that does not belong to them?
2. Rate Limiting: Can someone spam APIs, burn free quotas, or take down the server?
3. Secrets Management: Are API keys, tokens, or database credentials exposed anywhere?
4. Access Control: Can a user modify requests and gain extra permissions?
5. Token Security: If a JWT gets stolen, can it be revoked or made useless quickly?
6. Resilience: Can one bad request, expensive query, or unexpected error crash the system?

The difference between a side project and a production-ready application is not only features. It is thinking like an engineer before attackers do.

## Non-Negotiable Blockers

Do not deploy backend code if any of these exist:

- exposed API keys or secrets
- Supabase `service_role` key in frontend code
- AI provider key in frontend code
- database URL in frontend code
- missing rate limits on expensive endpoints
- missing input validation
- missing object-level authorization
- admin authorization checked only in the frontend
- raw stack traces returned in production
- untrusted code executed outside a sandbox
- public tables without RLS
- JWT/session strategy with no revocation or short-expiry plan
- unbounded file uploads, JSON payloads, loops, exports, AI calls, or sandbox jobs

## Required Gate Evidence

Before deploy, record proof for each question.

### 1. Authorization

Evidence required:

- protected routes use auth dependencies
- user-owned resources check owner ID
- Supabase tables have RLS policies
- cross-user access tests exist

Pass condition:

- a user cannot read, update, or delete another user's private data by changing IDs.

### 2. Rate Limiting

Evidence required:

- rate limits exist for API, AI, export, auth-adjacent, challenge, and sandbox routes
- free API quota protection exists
- payload size limits exist
- per-user and per-IP limits are considered

Pass condition:

- one user cannot burn free quotas, spam requests, or exhaust backend resources easily.

### 3. Secrets Management

Evidence required:

- no secrets in frontend environment variables
- `.env.example` contains placeholders only
- real secrets live only in hosting secret manager or local ignored files
- logs do not print tokens, cookies, API keys, or database URLs
- secret scanning has been run before release

Pass condition:

- all exposed frontend values are intentionally public and scoped.

### 4. Access Control

Evidence required:

- roles are assigned server-side or through trusted app metadata
- users cannot update their own role
- admin actions require backend/database authorization
- every admin mutation writes an audit log
- request body fields are allowlisted

Pass condition:

- editing JSON requests cannot turn a student into an admin or modify protected fields.

### 5. Token Security

Evidence required:

- access tokens have short lifetime appropriate for risk
- logout/session revocation path is documented
- stolen JWT impact is limited
- sensitive operations can check fresh user/session state
- tokens are never accepted in URLs

Pass condition:

- a stolen token has limited lifetime and there is a practical response path.

### 6. Resilience

Evidence required:

- Pydantic/request validation rejects bad input
- expensive endpoints have timeouts
- database queries are indexed and paginated
- sandbox jobs have CPU, memory, network, filesystem, output, and time limits
- errors return safe messages and request IDs
- unexpected errors do not crash the process

Pass condition:

- one malformed or expensive request cannot crash the app or create runaway cost.

## Endpoint Risk Matrix

| Endpoint Type | Auth Required | Rate Limit | Validation | Extra Control |
|---|---:|---:|---:|---|
| `GET /health` | No | Yes | Low | no sensitive data |
| `GET /examples` | Optional | Yes | query validation | pagination |
| `POST /sessions` | Yes | Yes | strict body limits | owner check |
| `POST /practice-attempts` | Yes | Yes | score sanity | no trusted client score for official rank |
| `POST /challenge-attempts` | Yes | Strict | server-side scoring later | anti-cheat flags |
| `POST /ai/*` | Yes | Strict | prompt/code limits | quota cap |
| `POST /trace/generate` | Yes | Very strict | code limits | sandbox only |
| `POST /admin/*` | Admin | Strict | allowlisted fields | audit log |

## Free API Model Rule

Even if CodeAnvil uses a free API, model, database tier, or hosting tier during early development, rate limits are still mandatory.

Free does not mean safe.

Free quotas can be exhausted, abused, or used to create downtime. AI and sandbox endpoints must have quotas before public release.

## Input Validation Rule

Every backend route must validate:

- body shape
- field types
- string lengths
- enum values
- numeric ranges
- array lengths
- JSON size
- file size and type
- ownership and permissions

Validation must happen server-side. Frontend validation is for user experience only.

## Pre-Deploy Sign-Off Template

```md
## Backend Security Gate Result

Feature:
Date:
Reviewer:

- Authorization: Pass/Fail - evidence:
- Rate Limiting: Pass/Fail - evidence:
- Secrets Management: Pass/Fail - evidence:
- Access Control: Pass/Fail - evidence:
- Token Security: Pass/Fail - evidence:
- Resilience: Pass/Fail - evidence:

Decision:
- Deploy allowed: Yes/No
- Blockers:
- Follow-up tasks:
```

