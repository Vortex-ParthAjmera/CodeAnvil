# Observability

## Purpose

Observability helps us detect bugs, abuse, outages, and confusing user flows.

## MVP Observability

Frontend-only:

- console errors during development
- local debug panel only in dev
- manual browser testing
- user feedback form later

Do not ship noisy debug logs in production.

## Backend Observability Later

Track:

- request count
- error rate
- latency
- auth failures
- rate-limit hits
- challenge submissions
- AI usage
- sandbox failures
- export failures

## Security Logs

Log:

- admin actions
- failed admin authorization
- suspicious challenge attempts
- rate-limit triggers
- report actions
- sandbox timeouts

Do not log:

- passwords
- tokens
- cookies
- private keys
- raw authorization headers
- sensitive pasted code unless explicitly disclosed and necessary

## Alerts Later

Alert on:

- spike in 500 errors
- spike in failed auth
- admin role changes
- service role key misuse indicators
- sandbox failures
- AI cost spikes
- database errors

## Request IDs

Future API should attach request IDs to errors so bugs can be traced without exposing internals to users.

