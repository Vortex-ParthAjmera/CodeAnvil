# Contributing Guide

## Purpose

This document defines how CodeAnvil should be built as a clean student project that can become serious.

## Development Rules

- Keep changes small and focused.
- Update docs when behavior changes.
- Prefer readable code over clever code.
- Do not commit secrets.
- Do not add dependencies casually.
- Keep UI responsive.
- Keep security rules in mind while coding.

## Branch Naming

Examples:

- `feature/playback-controller`
- `feature/recursion-tree`
- `fix/timeline-step-bug`
- `docs/api-spec`
- `security/rls-policies`

## Commit Style

Examples:

- `feat: add playback timeline`
- `fix: handle empty trace safely`
- `docs: add trace format spec`
- `test: add playback reducer tests`

## Pull Request Checklist

- feature works locally
- tests added or updated
- no secrets committed
- no debug code left
- docs updated
- mobile layout checked
- security impact considered

## Code Style

Frontend:

- TypeScript
- small components
- clear props
- reusable UI primitives
- no giant single-file app

Backend later:

- Python
- FastAPI
- Pydantic models
- Pytest tests
- strict validation

## Review Priorities

1. correctness
2. security
3. user experience
4. maintainability
5. performance

