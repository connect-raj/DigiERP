#!/usr/bin/env bash
# Vercel invokes this via the "vercel-build" script in package.json.
# VERCEL_ENV ("production" | "preview" | "development") is injected by Vercel
# itself -- no env var needs to be set manually for it to appear. It is gated
# by Project Settings -> Environment Variables -> "Automatically expose System
# Environment Variables" (on by default); VERCEL=1, however, is set
# unconditionally on Vercel's build system regardless of that toggle.
#
# If we can tell we're building on Vercel (VERCEL=1) but VERCEL_ENV is missing,
# that means the toggle above got disabled -- fail loudly instead of silently
# skipping migrations on what might actually be a production deploy.
set -euo pipefail

if [ -n "${VERCEL:-}" ] && [ -z "${VERCEL_ENV:-}" ]; then
  echo "ERROR: Building on Vercel but VERCEL_ENV is not set." >&2
  echo "Check Project Settings -> Environment Variables -> 'Automatically expose System Environment Variables' is enabled." >&2
  echo "Refusing to build without knowing whether this is a production deploy that needs migrations applied." >&2
  exit 1
fi

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Production deploy detected (VERCEL_ENV=production) -- running prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "Not a production deploy (VERCEL_ENV=${VERCEL_ENV:-unset}) -- skipping prisma migrate deploy"
fi

npx prisma generate
npx next build
