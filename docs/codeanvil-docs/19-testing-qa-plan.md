# Testing And QA Plan

## Goals

- prevent broken playback behavior
- protect security rules
- keep UI polished on desktop and mobile
- avoid regressions in trace rendering
- verify admin and user permissions later

## MVP Test Types

### Unit Tests

Test:

- trace parser
- language detection
- trace action schema validation
- known DSA pattern matching
- generic storyboard fallback
- playback reducer/controller
- step navigation
- variable diffing
- timeline state
- practice scoring
- local storage adapter

Recommended tool:

- Vitest

### Component Tests

Test:

- editor renders selected example
- line highlight updates
- variable panel updates
- stack panel updates
- output panel updates
- practice prompt feedback works

### Browser Tests

Test:

- load app
- choose example
- press play
- step forward/backward
- switch practice mode
- save session
- mobile layout

Recommended:

- Playwright

### Visual QA

Check:

- no overlapping text
- no clipped buttons
- current line visible
- panels readable
- dark mode contrast
- mobile collapse
- animation does not hide important state
- paste-code results show confidence/unsupported states clearly

### Security QA

Check:

- no secrets in frontend env
- no unsafe HTML rendering
- no raw user code execution on server
- no admin route without backend check later
- RLS tests when Supabase is added
- backend pre-deploy security gate passes before any API deployment
- every backend route has input validation tests
- every expensive route has rate-limit tests
- cross-user authorization tests exist for private resources
- role escalation attempts fail
- stolen or expired token behavior is tested where possible
- AI-generated trace hints cannot inject executable UI or Three.js code

## Future Backend Tests

Python/FastAPI:

- Pytest
- Pydantic validation tests
- auth dependency tests
- object authorization tests
- rate-limit tests
- error response tests
- resilience tests for malformed payloads, oversized payloads, and expensive requests

Supabase:

- migration tests
- RLS policy tests
- cross-user access tests
- admin role tests
- token and session revocation behavior reviewed before production launch

## Release QA Checklist

- build passes
- type check passes
- tests pass
- browser smoke test passes
- mobile smoke test passes
- README updated
- docs updated
- privacy link works
- no debug UI
- no console errors in main flow
