# Prisma Migration & Query Optimization Plan

Two phases. Phase 1 must be complete and verified working before Phase 2 begins — schema changes in Phase 2 (adding indexes) should go through the migration system established in Phase 1, not `db push`.

## Phase 1 — Move from `db push` to a proper migration-based workflow (DONE 2026-07-18)

Baseline migration `prisma/migrations/20260718170142_init` created and marked applied against the existing Neon DB (no data touched — only Prisma's internal `_prisma_migrations` tracking table was written). `migrate dev`/`migrate status` verified working end-to-end via a shadow-database dry run. `package.json` now has `db:migrate` / `db:migrate:deploy` / `db:migrate:status` / `db:generate` scripts; README documents the new workflow. Dev DB stays on the current remote Neon endpoint per user decision — pooling/connection-limit tuning is deferred to Phase 2.


**Current state**: No `prisma/migrations` folder exists. Schema is applied via `prisma db push`, which has no history, no review checkpoint, and can silently drop/reset data on divergence. `prisma.config.ts` uses `engine: 'classic'`.

**Steps**:
1. Baseline the current database schema into an initial migration (`prisma migrate diff` / `prisma migrate resolve --applied` against the existing Neon DB) so history starts from the real current state, not a fresh empty DB — avoids Prisma trying to recreate tables that already exist.
2. Switch dev workflow from `prisma db push` to `prisma migrate dev` (generates + applies migrations, keeps `prisma/migrations/` in git).
3. Update any `package.json` scripts, README/setup docs, and CI/deploy steps that currently call `db push` to use `prisma migrate deploy` (prod/CI) and `prisma migrate dev` (local).
4. Verify: fresh clone + `migrate deploy` against an empty DB reproduces the current schema exactly (diff against Neon prod schema should be empty). Also verify `migrate dev` works cleanly for a trivial no-op schema change.
5. Document the new workflow (how to add a migration, how it flows to prod) briefly in AGENTS.md or README so it's not accidentally reverted to `db push` later.

**Also decide**: dev database source. Current `.env` points at a remote Neon endpoint (non-pooled, in `ap-southeast-1`) rather than local Postgres per `.env.example`. Worth resolving alongside the migration switch since it affects how "safe" `migrate dev` resets feel in practice (shared remote dev DB vs. disposable local one).

## Phase 2 — Query & index optimization (via migrations from Phase 1)

1. **Add missing indexes** as a proper migration — `@@index` on FK + filter columns: `Invoice.customerId/date/paymentStatus`, `Payment.customerId/date/mode`, `Purchase.vendorId/date/paymentStatus/isCancelled`, `DispatchEntry.customerId/date/status/isCancelled`, `StockTransaction.productId/purchaseId/dispatchEntryId/performedById`, plus item-table FKs (`PurchaseItem`, `InvoiceItem`, `DispatchEntryItem`, `VendorPayment`, `PaymentAllocation`, `PriceHistory`).
2. **Fix connection pooling** for dev/prod — use Neon's pooled (`-pooler`) endpoint with `connection_limit`/`pool_timeout` set on `DATABASE_URL`.
3. **Fix N+1 / sequential-loop queries inside transactions**:
   - `repositories/payment.repository.ts` `allocateBatch` (~line 252-333) — 7 sequential queries per allocation.
   - `repositories/dispatch-entry.repository.ts` `createWithStockDecrement` (~172-191) and `cancelWithStockRestore` (~207-234).
   - `app/api/purchases/route.ts` POST (~205-225) and `app/api/purchases/[id]/route.ts` DELETE (~97-125).
   - `repositories/vendor.repository.ts` `linkProducts` (~81-96).
4. **Move dashboard aggregation into Postgres** — replace unbounded `findMany` + JS `.reduce`/loops in `repositories/dashboard.repository.ts` and `services/dashboard.service.ts` with `prisma.aggregate`/`groupBy`.
5. **Tighten broad `include` → `select`** in `repositories/product.repository.ts:findAll`, `repositories/vendor.repository.ts:findById`, `app/api/purchases/[id]/route.ts`, `repositories/dispatch-entry.repository.ts:findById`.
6. Re-measure with `log: ['query']` temporarily enabled to confirm actual improvement before/after.

## Reference

Full research findings (file:line detail) from the initial repo scan are preserved in this session's Explore-agent report; re-derive via a fresh scan if this doc goes stale, since code may shift.
