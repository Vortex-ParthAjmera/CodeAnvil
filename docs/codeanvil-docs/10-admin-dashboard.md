# Admin Dashboard

## Purpose

The admin dashboard helps trusted maintainers manage content, challenges, reports, users, and platform health.

It must be powerful but safe.

## Admin Roles

Suggested roles:

- student
- moderator
- admin

Moderator:

- review reports
- hide public content
- manage basic challenge issues

Admin:

- manage roles
- publish examples
- publish challenges
- view audit logs
- handle system settings

## Main Sections

### Overview

Metrics:

- active users
- sessions created
- challenges attempted
- top topics
- report count
- suspicious attempt count

### Example Manager

Actions:

- create example
- edit code
- attach trace
- preview playback
- publish/unpublish
- archive example

### Challenge Manager

Actions:

- create challenge
- set category and difficulty
- add prompt and payload
- configure answer key
- preview as student
- publish/unpublish
- review attempt stats

### User Management

Actions:

- search users
- view profile summary
- view moderation status
- warn user
- suspend user
- change role, admin only

Security:

- role changes require audit log
- role changes require confirmation
- normal users cannot update their own role

### Reports

Report types:

- cheating
- abusive content
- broken challenge
- wrong answer key
- privacy issue
- bug

Actions:

- dismiss
- hide content
- request fix
- warn user
- suspend user

### Audit Logs

Must show:

- admin actor
- action
- target
- timestamp
- metadata

Audit logs should not be editable from the dashboard.

## Admin Dashboard Security

- Admin routes require backend authorization.
- Do not rely only on hidden frontend buttons.
- Use RLS and backend checks.
- Log every privileged mutation.
- Avoid showing unnecessary private user data.
- Rate-limit dangerous actions.

