# Security Rules

## Reality Check

No application is unhackable. CodeAnvil should be hardened by default and designed so one bug does not compromise everything.

## Golden Rules

1. Never store secrets in frontend code.
2. Never expose Supabase `service_role` keys to the browser.
3. Never run untrusted user code in the main app or API process.
4. Never trust local storage, URL params, uploaded files, API responses, or user text.
5. Enable RLS on every exposed Supabase table.
6. Use object-level authorization for every user-owned resource.
7. Log admin actions.
8. Rate-limit sensitive actions.
9. Keep admin permissions separate from normal user permissions.
10. Treat code execution as the highest-risk feature.

## Backend Pre-Deploy Gate

Before any backend, worker, API route, AI route, sandbox route, admin route, or database-exposed feature is deployed, the [Backend Pre-Deploy Security Gate](35-backend-predeploy-security-gate.md) must pass.

The six blocker questions:

1. Authorization: Can users access data that does not belong to them?
2. Rate Limiting: Can someone spam APIs, burn free quotas, or take down the server?
3. Secrets Management: Are API keys, tokens, or database credentials exposed anywhere?
4. Access Control: Can a user modify requests and gain extra permissions?
5. Token Security: If a JWT gets stolen, can it be revoked or made useless quickly?
6. Resilience: Can one bad request, expensive query, or unexpected error crash the system?

If any answer is unknown or weak, deployment is blocked.

## Frontend Security Rules

- Use React rendering for user text instead of raw HTML.
- Avoid `dangerouslySetInnerHTML`.
- Avoid `innerHTML`, `outerHTML`, and `insertAdjacentHTML`.
- Avoid `eval`, `new Function`, and string-based timers.
- Validate route params and query params.
- Do not trust browser storage.
- Do not store long-lived secrets in `localStorage`.
- Use a production build.
- Do not publish source maps publicly unless intended.
- Add security headers through hosting config when possible.

Recommended headers:

- Content-Security-Policy
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy
- frame-ancestors through CSP

## FastAPI Backend Security Rules

- Disable debug mode in production.
- Disable or protect `/docs`, `/redoc`, and `/openapi.json` in production.
- Use strict CORS; never use wildcard origins with credentials.
- Use Pydantic models for request and response validation.
- Enforce input validation on every route: body shape, field types, string lengths, enum values, numeric ranges, JSON size, file size, and ownership.
- Do not return internal fields accidentally.
- Use auth dependencies at router level.
- Use object-level authorization for user-owned resources.
- Do not accept tokens in URLs.
- Validate file uploads by size, type, and content.
- Avoid shell commands with user input.
- Avoid unsafe deserialization.
- Add rate limits on auth, challenge submit, exports, and AI endpoints.
- Add rate limits even when using free APIs or free AI models, because free quotas can still be abused or exhausted.
- Return generic error messages to users and detailed logs only internally.

## Supabase Security Rules

- Enable RLS on every table in exposed schemas.
- Use `TO authenticated` plus ownership checks.
- Do not rely on `TO authenticated` alone.
- Use `USING` and `WITH CHECK` for updates.
- Index RLS columns such as `user_id`.
- Do not use user-editable metadata for authorization.
- Do not store authorization roles in user-editable metadata.
- Keep JWT expiry short enough for the app risk level.
- Document logout and session revocation behavior before launch.
- Avoid `SECURITY DEFINER` unless truly needed.
- Keep privileged functions in private schemas.
- Revoke unnecessary privileges.
- Test RLS with real `anon` and `authenticated` roles.

## Admin Security Rules

- Admin actions require explicit admin authorization.
- Admin role must not be editable by normal users.
- Admin dashboard must never call privileged actions from frontend-only checks.
- Every admin mutation writes an audit log.
- Destructive actions should require confirmation.
- Sensitive actions should be reversible where possible.
- Admin views should show minimum needed user data.

## Code Execution Rules

- MVP should use prebuilt traces, not arbitrary backend execution.
- Pasted code visualization should prefer static parsing and validated trace generation before real execution.
- AI must not inject raw Three.js, HTML, or executable renderer code into the app.
- If code execution is added later, it must run in a sandbox.
- Sandbox must restrict network access by default.
- Sandbox must restrict filesystem access.
- Sandbox must enforce CPU and memory limits.
- Sandbox must enforce execution timeout.
- Sandbox output must be size-limited.
- Sandbox should be destroyed after temporary sessions.
- Never mount production secrets into code execution sandboxes.

## Dependency And Supply Chain Rules

- Commit lockfiles.
- Pin important package versions.
- Review new dependencies before adding.
- Use dependency audit tools.
- Avoid abandoned packages.
- Keep build scripts simple and inspectable.

## Incident Rules

- Keep a security contact in the app/repo.
- Log suspicious activity.
- Revoke exposed keys immediately.
- Rotate secrets after suspected compromise.
- Keep backups for important data.
- Document incidents and fixes.
