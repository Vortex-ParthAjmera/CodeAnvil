# Incident Response

## Purpose

This document explains what to do when something goes wrong.

Examples:

- secret leak
- suspected exploit
- data exposure
- leaderboard abuse
- admin account compromise
- AI/sandbox abuse
- outage

## Severity Levels

### Critical

- service role key leaked
- admin bypass
- cross-user private data exposure
- sandbox escape
- production database compromise

### High

- stored XSS
- major leaderboard manipulation
- serious rate-limit bypass
- private code logged unexpectedly

### Medium

- spam attack
- broken moderation workflow
- wrong public visibility
- repeated failed jobs

### Low

- minor UI bug
- isolated broken example
- non-sensitive logging issue

## Response Steps

1. Confirm incident.
2. Preserve logs.
3. Stop ongoing damage.
4. Rotate exposed secrets if needed.
5. Disable vulnerable feature if needed.
6. Patch and test fix.
7. Deploy fix.
8. Notify affected users if personal data was involved.
9. Write incident note.
10. Add prevention task.

## Secret Leak Playbook

1. Revoke leaked key.
2. Create new key.
3. Update production env.
4. Redeploy.
5. Search repository and logs.
6. Review access during exposure window.

## Admin Compromise Playbook

1. Disable admin account.
2. Revoke sessions.
3. Review audit logs.
4. Revert malicious changes.
5. Rotate credentials if needed.
6. Require stronger admin authentication later.

## Sandbox Incident Playbook

1. Disable trace generation endpoint.
2. Destroy active sandboxes.
3. Review sandbox logs.
4. Confirm no secrets were mounted.
5. Patch sandbox restrictions.
6. Re-enable only after testing.

