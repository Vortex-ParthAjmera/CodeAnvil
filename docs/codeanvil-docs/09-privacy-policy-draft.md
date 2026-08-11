# Privacy Policy Draft

This is a working draft, not legal advice.

## What CodeAnvil May Collect

For MVP without login:

- code typed into the local browser app
- local saved sessions
- local progress data
- browser-only preferences

This data should stay on the user's device unless the user exports or shares it.

For future logged-in version:

- email or login identity
- display name
- avatar
- campus or class information if user provides it
- saved playback sessions
- challenge attempts
- scores and leaderboard entries
- reports and moderation records
- basic security logs

## What CodeAnvil Should Not Collect By Default

- passwords directly, if using Supabase Auth
- payment information
- unnecessary personal documents
- precise location
- contacts
- private repository data unless explicitly connected later

## User Code Privacy

Pasted code can contain secrets by mistake.

Rules:

- Warn users not to paste API keys, passwords, private tokens, or private project code.
- Do not log pasted code unless necessary and clearly disclosed.
- For MVP, keep pasted code local by default.
- For cloud saves, make sessions private by default.

## AI Privacy Later

If AI tutor features are added:

- disclose when code is sent to an AI provider
- avoid sending private code unless the user requests it
- redact obvious secrets where possible
- keep AI logs minimal
- allow users to delete stored sessions

## Data Retention

Recommended defaults:

- local sessions stay until user deletes browser data
- cloud saved sessions stay until user deletes them
- challenge attempts can be retained for leaderboards
- security logs retained for a limited operational window
- deleted account should delete or anonymize personal data

## User Rights

Users should be able to:

- view their profile data
- delete saved sessions
- export useful work where possible
- request account deletion
- report abusive content

## Public Content

Public or unlisted sessions should be clearly marked.

Default visibility should be private.

## Privacy By Design

- Collect minimum data.
- Keep secrets out of logs.
- Use private-by-default settings.
- Separate admin access from student access.
- Use RLS to protect user rows.

