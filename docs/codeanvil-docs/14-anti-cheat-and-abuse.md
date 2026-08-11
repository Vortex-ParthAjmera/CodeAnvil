# Anti-Cheat And Abuse Prevention

## Goal

Protect challenge integrity without making the product annoying for normal students.

## MVP Rule

For local-only MVP, scores are motivational and not official.

Official leaderboards should not trust purely client-side scores.

## Common Abuse Cases

- user edits local storage to fake scores
- user submits impossible times
- user replays old successful requests
- user scripts automated attempts
- user creates multiple accounts
- user reports other users maliciously
- user posts abusive content in public sessions

## Anti-Cheat Layers

### Client Layer

Useful for UX but not trusted for official scoring.

- disable obvious double-submit
- show timer
- store local progress
- warn on suspicious reloads

### Server Layer Later

Required for official leaderboard.

- server receives attempt start event
- server records challenge version
- server validates attempt timing
- server calculates score
- server rate-limits submissions
- server rejects impossible scores
- server stores anti-cheat flags

### Data Layer

- keep challenge answer keys private
- never expose official scoring secrets to frontend
- store attempt metadata
- store challenge version
- keep audit trail for suspicious attempts

## Suspicious Signals

- impossible completion time
- too many attempts per minute
- repeated perfect scores instantly
- answer submitted without start event
- modified challenge payload
- many accounts from same device/browser fingerprint later, if privacy policy allows

## Moderation Actions

- flag attempt
- hide score from leaderboard
- require manual review
- warn user
- temporary cooldown
- suspend account for severe abuse

## Important Privacy Boundary

Do not add invasive tracking without a clear privacy reason. Anti-cheat should be proportional.

