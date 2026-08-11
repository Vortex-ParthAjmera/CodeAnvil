# Backup And Recovery

## Purpose

Backups protect user sessions, challenge data, admin records, and learning progress.

MVP is local-only, so browser data is the user's responsibility. Cloud backups matter after Supabase is added.

## MVP Local Data

Rules:

- let users export saved sessions later
- warn that clearing browser data deletes local sessions
- keep local data schema versioned

## Supabase Backup Strategy Later

Back up:

- profiles
- examples
- playback sessions
- practice attempts
- challenges
- challenge attempts
- reports
- audit logs

## Recovery Priorities

1. auth/account data
2. admin audit logs
3. user saved sessions
4. official examples and challenges
5. leaderboard data
6. analytics data

## Restore Testing

At least before serious public launch:

- test database restore in staging
- verify RLS still works after restore
- verify indexes exist
- verify admin access
- verify user sessions are intact

## Data Export

Users should eventually export:

- saved sessions
- code snippets
- trace JSON
- progress summary

Admins should export:

- challenge data
- public examples
- moderation reports

