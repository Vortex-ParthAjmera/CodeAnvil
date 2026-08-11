# Environment And Secrets

## Principle

Anything shipped to the browser is public.

Never put real secrets in frontend environment variables.

Exposed secrets are a deployment blocker.

Before backend deploy, run the [Backend Pre-Deploy Security Gate](35-backend-predeploy-security-gate.md).

## Frontend Public Values

Allowed:

- Supabase project URL
- Supabase publishable/anon key
- public analytics ID if used
- app environment name

Not allowed:

- Supabase service role key
- database password
- AI provider API key
- JWT signing secret
- OAuth client secret
- admin tokens

## Backend Secret Values Later

Backend-only:

- database connection URL
- Supabase service role key
- AI provider API key
- email provider key
- signing secrets
- encryption keys

## File Rules

- `.env.local` should not be committed.
- `.env.example` should contain names only, never real values.
- rotate secrets if accidentally exposed.
- use hosting provider secret manager for production.
- run secret scanning before public deploy.
- review built frontend bundles for accidentally exposed private values when backend/API keys are added.

## Suggested `.env.example`

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ENV=development

API_DATABASE_URL=
API_SUPABASE_SERVICE_ROLE_KEY=
API_AI_PROVIDER_KEY=
API_ALLOWED_ORIGINS=
```

## Logging Rules

Never log:

- tokens
- cookies
- API keys
- raw authorization headers
- passwords
- private pasted code unless explicitly configured and disclosed

Also avoid logging full request bodies for endpoints that may contain code, prompts, tokens, or personal data.

## Rotation Plan

If a secret leaks:

1. revoke leaked key
2. generate new key
3. update production environment
4. redeploy
5. search repo history
6. document incident

## Public vs Private API Key Rule

Public or publishable keys can exist in frontend only when the provider documents them as browser-safe and they are scoped by backend rules, RLS, rate limits, or provider restrictions.

Private keys must never be shipped to the browser.
