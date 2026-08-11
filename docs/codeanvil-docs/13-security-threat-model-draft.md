# Security Threat Model Draft

This is a draft based on the planned CodeAnvil architecture. It must be revisited after real implementation begins.

## Scope

In scope:

- React PWA
- local playback sessions
- future FastAPI backend
- future Supabase Auth/Postgres
- user dashboard
- admin dashboard
- future code execution sandbox
- future AI tutor

Out of scope for this draft:

- payment systems
- enterprise SSO
- native mobile apps

## Key Assets

- user accounts
- saved code sessions
- challenge attempts and scores
- leaderboard integrity
- admin privileges
- admin audit logs
- Supabase keys and backend secrets
- sandbox infrastructure
- AI usage budget
- app reputation

## Trust Boundaries

1. Browser to frontend app assets
2. Browser to API
3. API to Supabase
4. API to sandbox runner
5. API to AI provider
6. Admin dashboard to privileged backend actions
7. Public user content to other users' browsers

## Main Threats

### T1: Cross-Site Scripting

Risk:

User-created names, code, comments, session titles, or public content could be rendered unsafely.

Mitigations:

- use React escaping
- avoid raw HTML rendering
- sanitize if rich text is ever needed
- add CSP where possible

### T2: Broken Object-Level Authorization

Risk:

A user accesses another user's saved sessions, attempts, or profile data by changing IDs.

Mitigations:

- RLS on Supabase tables
- object ownership checks in API
- UUID public IDs
- tests for cross-user access
- backend pre-deploy authorization gate must pass

### T3: Admin Privilege Abuse Or Bypass

Risk:

Normal user performs admin actions, or admin actions are not traceable.

Mitigations:

- backend role checks
- no frontend-only authorization
- admin audit logs
- least privilege roles
- confirmation for destructive actions

### T4: Untrusted Code Execution Escape

Risk:

User-submitted code accesses files, network, secrets, or compute resources.

Mitigations:

- no arbitrary code execution in MVP
- sandbox only later
- CPU/memory/time limits
- no production secrets in sandbox
- network disabled by default
- output size limits

### T5: Leaderboard Cheating

Risk:

Users forge scores, replay requests, automate submissions, or manipulate client state.

Mitigations:

- server-side scoring later
- signed challenge payloads later
- attempt rate limits
- anomaly flags
- audit suspicious attempts
- do not trust client-only scores for official leaderboards
- rate limits required even for free-tier APIs or models

### T6: Secret Exposure

Risk:

API keys or service role keys are committed or bundled into frontend code.

Mitigations:

- env review
- `.gitignore`
- secret scanning
- server-only secrets
- key rotation process
- built frontend bundle review when private providers are added

### T8: Missing Input Validation

Risk:

Malformed requests, oversized payloads, unexpected fields, or manipulated request bodies create privilege, cost, or crash paths.

Mitigations:

- Pydantic validation on every FastAPI route
- allowlisted request fields
- size limits for code, trace JSON, files, prompts, and exports
- reject unknown or dangerous fields on privileged routes
- tests for malformed and oversized inputs

### T9: Stolen Token Abuse

Risk:

A stolen JWT continues to access sensitive data or perform state-changing actions.

Mitigations:

- short access token lifetime
- documented logout and revocation flow
- fresh session checks for sensitive operations
- object-level authorization on every request
- no tokens in URLs

### T7: Denial Of Service

Risk:

Attackers spam AI, sandbox, export, or challenge endpoints.

Mitigations:

- rate limits
- quotas
- timeouts
- job queue limits
- payload size limits
- monitoring

## Important Assumptions

- MVP is frontend-only and does not execute arbitrary code on a server.
- Supabase will be added after MVP for auth and storage.
- Admin dashboard will be protected by backend/database authorization, not frontend checks only.
- AI features will be opt-in and rate-limited.

## Open Questions

- Will CodeAnvil support public sharing before login?
- Which provider will host backend APIs?
- Will official campus leaderboards require verified university email?
