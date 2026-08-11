# Database Schema

This is the planned Supabase Postgres schema for the future backend.

MVP can start with browser storage. Database comes later when we add accounts, saved cloud sessions, leaderboards, duels, and admin tools.

## Schema Rules

- Use `timestamptz` for timestamps.
- Use `text` instead of unnecessary `varchar(n)`.
- Use UUID public IDs for exposed resources.
- Enable RLS on every table in exposed schemas.
- Index foreign keys and RLS columns.
- Never expose `service_role` keys in frontend code.
- Never use user-editable metadata for authorization.
- Prefer `app_metadata` or database roles for authorization.

## Tables

### profiles

Stores public user profile data linked to Supabase Auth.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `avatar_url text`
- `campus_id uuid references campuses(id)`
- `role text not null default 'student'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Checks:

- `role in ('student', 'moderator', 'admin')`

Indexes:

- `profiles_campus_id_idx`

RLS:

- users can read public profile fields
- users can update only their own non-role fields
- only admins can change roles

### campuses

Stores university/campus groups.

Columns:

- `id uuid primary key`
- `name text not null`
- `slug text unique not null`
- `country text`
- `created_at timestamptz not null default now()`

RLS:

- readable by authenticated users
- writable only by admins

### examples

Stores official code examples.

Columns:

- `id uuid primary key`
- `slug text unique not null`
- `title text not null`
- `language text not null`
- `topic text not null`
- `difficulty text not null`
- `code text not null`
- `trace jsonb not null`
- `is_published boolean not null default false`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Checks:

- `difficulty in ('beginner', 'intermediate', 'advanced')`

Indexes:

- `examples_topic_idx`
- `examples_language_idx`
- `examples_is_published_idx`

RLS:

- everyone can read published examples
- admins can manage all examples

### playback_sessions

Stores user-saved playback sessions.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `language text not null`
- `code text not null`
- `trace jsonb not null`
- `visibility text not null default 'private'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Checks:

- `visibility in ('private', 'unlisted', 'public')`

Indexes:

- `playback_sessions_user_id_idx`
- `playback_sessions_visibility_idx`

RLS:

- users can manage their own sessions
- public sessions can be read by authenticated users
- admins can moderate public sessions

### practice_attempts

Stores dry-run practice results.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `example_id uuid references examples(id)`
- `session_id uuid references playback_sessions(id)`
- `mode text not null`
- `score integer not null default 0`
- `correct_count integer not null default 0`
- `total_count integer not null default 0`
- `duration_ms integer not null default 0`
- `created_at timestamptz not null default now()`

Indexes:

- `practice_attempts_user_id_idx`
- `practice_attempts_example_id_idx`
- `practice_attempts_created_at_idx`

RLS:

- users can read their own attempts
- users can insert their own attempts
- admins can read aggregate metrics

### challenges

Stores duel and practice challenges.

Columns:

- `id uuid primary key`
- `title text not null`
- `category text not null`
- `difficulty text not null`
- `prompt text not null`
- `payload jsonb not null`
- `answer_key jsonb`
- `is_published boolean not null default false`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`

Indexes:

- `challenges_category_idx`
- `challenges_is_published_idx`

RLS:

- users can read published challenges
- admins can manage challenges

### challenge_attempts

Stores challenge results.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `challenge_id uuid not null references challenges(id) on delete cascade`
- `score integer not null default 0`
- `duration_ms integer not null default 0`
- `is_valid boolean not null default true`
- `anti_cheat_flags jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Indexes:

- `challenge_attempts_user_id_idx`
- `challenge_attempts_challenge_id_idx`
- `challenge_attempts_score_idx`
- `challenge_attempts_created_at_idx`

RLS:

- users can insert their own attempts
- users can read their own attempts
- public leaderboard queries should expose limited fields only

### reports

Stores user reports for abuse, cheating, bad content, or bugs.

Columns:

- `id uuid primary key`
- `reporter_id uuid references auth.users(id) on delete set null`
- `target_type text not null`
- `target_id uuid`
- `reason text not null`
- `status text not null default 'open'`
- `notes text`
- `created_at timestamptz not null default now()`
- `resolved_at timestamptz`

Indexes:

- `reports_status_idx`
- `reports_target_idx`

RLS:

- users can create reports
- users can read only reports they created
- admins can manage all reports

### admin_audit_logs

Stores privileged admin actions.

Columns:

- `id uuid primary key`
- `admin_id uuid references auth.users(id)`
- `action text not null`
- `target_type text`
- `target_id uuid`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Indexes:

- `admin_audit_logs_admin_id_idx`
- `admin_audit_logs_created_at_idx`

RLS:

- only admins can read audit logs
- no normal client can update or delete audit logs

## Example RLS Pattern

```sql
alter table public.playback_sessions enable row level security;

create policy "users can read own playback sessions"
on public.playback_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own playback sessions"
on public.playback_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own playback sessions"
on public.playback_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

## Notes

This schema is a draft. Before implementation, generate migrations, run Supabase advisors, and test RLS with real user roles.

