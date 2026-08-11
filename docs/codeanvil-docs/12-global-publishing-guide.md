# Global Publishing Guide

## Goal

Publish CodeAnvil so anyone can access it globally with a stable URL, safe defaults, and a professional product feel.

## Stage 1: Free Preview

Use one of:

- Vercel preview deployment
- Cloudflare Pages preview deployment
- GitHub Pages only if the app is fully static and routing is handled carefully

Recommended first URL:

- `codeanvil.vercel.app`
- or `codeanvil.pages.dev`

## Stage 2: Production Domain

Preferred custom domain:

- `codeanvil.app`

Why `.app` is good:

- fits a webapp product
- modern developer/product feel
- HTTPS is expected for `.app`

## Production Checklist

Before public launch:

- production build passes
- no test secrets in repo
- no `service_role` key in frontend
- no debug UI visible
- privacy page exists
- contact/report link exists
- mobile layout tested
- desktop layout tested
- basic accessibility checked
- social preview image added
- README updated
- deployment environment variables reviewed
- security headers configured where possible

Before any backend launch:

- [Backend Pre-Deploy Security Gate](35-backend-predeploy-security-gate.md) passes
- authorization checks are tested
- rate limits are configured, including free API/model endpoints
- secrets are stored only server-side
- input validation exists for every endpoint
- JWT expiry/revocation behavior is documented
- resilience tests cover bad payloads and expensive requests

## Environment Variables

Rules:

- client env variables are public
- only put public/publishable values in frontend env vars
- keep secret values server-side only
- never commit `.env` files with real secrets

## SEO And Sharing

Add:

- title: CodeAnvil - Forge Your Logic
- description: Visual code execution and DSA practice for students
- favicon
- social preview image
- Open Graph tags
- Twitter/X card tags

## Monitoring

Minimum:

- deployment logs
- frontend error reporting later
- API error logs later
- database query monitoring later
- admin report queue

## Rollback Plan

Every release should have:

- previous stable deployment
- changelog
- known issue list
- quick rollback instructions

## Global Readiness

For worldwide users:

- use CDN-backed hosting
- optimize images
- keep bundle small
- avoid region-specific assumptions
- support low-end student laptops
- support mobile widths
- keep text readable
