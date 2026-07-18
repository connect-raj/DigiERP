This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (Prisma)

Schema changes go through migrations — **do not use `prisma db push`**. `prisma/migrations/` is committed to git and is the source of truth for schema history.

- Change `prisma/schema.prisma`, then run `npm run db:migrate` to generate and apply a new migration in dev (this also regenerates the Prisma client).
- Check migration state at any time with `npm run db:migrate:status`.
- In CI/production, apply already-committed migrations with `npm run db:migrate:deploy` (never `migrate dev`, which can prompt for destructive resets).
- If a migration's SQL file is ever hand-edited after being applied, its checksum will no longer match and `migrate dev`/`migrate deploy` will refuse to run and offer to reset the database — don't accept that reset; fix the underlying migration file/state deliberately instead.

`DATABASE_URL` points at Neon's pooled (`-pooler`) endpoint, used for normal app queries. Migration commands instead use `DIRECT_URL` (set in both `prisma/schema.prisma`'s `directUrl` and `prisma.config.ts`'s `datasource.directUrl` — both are needed, since `prisma.config.ts` overrides the schema's datasource for CLI commands), pointed at the same database's non-pooled connection. Copy `.env.example` and fill in both variables for local dev.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Vercel setup for the migration-based Prisma workflow

The project used to sync its schema with `prisma db push`, which needed no deploy-time step. Now that schema changes go through committed migrations (see [Database (Prisma)](#database-prisma) above), Vercel needs to actually apply those migrations on deploy. The code side of this is already done (`vercel-build` script in `package.json`, `directUrl` in `prisma/schema.prisma` and `prisma.config.ts`) — only the dashboard steps below are still needed per Vercel project:

1. **In the Vercel dashboard → Project Settings → Environment Variables, add `DIRECT_URL`.** Use Neon's non-pooled connection string (the same host as `DATABASE_URL` but without the `-pooler` suffix). Scope it to at least the Production environment.

2. **Confirm `DATABASE_URL` in Vercel is the pooled endpoint**, matching local `.env`. This variable should already exist from before the migration switch — just double-check it's the `-pooler` host, not the direct one.

3. **Redeploy** and check the build logs for the `prisma migrate deploy` step on the next Production deploy — it should report either "No pending migrations to apply" or list the migration(s) it applied. Preview deploys skip this step entirely (gated on `VERCEL_ENV=production` in the `vercel-build` script), so opening a PR won't touch the shared database's schema.

Locally, this was verified end-to-end: `migrate status`/`migrate deploy` connect via the direct endpoint (confirmed by the reported host), while the running app's Prisma Client connects via the pooler (confirmed via `application_name = pgbouncer` on the live connection) — the intended split between migration and runtime traffic.
