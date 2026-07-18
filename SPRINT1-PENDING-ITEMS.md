# DigiERP — Sprint 1 Pending Items

_Generated from the release-readiness audit. Grouped by how they affect the release._

Legend for references: `file:line` points at the exact code location.

---

## 🔴 Compulsory for Smooth Function (must fix before release)

These break a core money / stock / tax / security flow, or leave a required
feature with no working path. Ship without these and the system misbehaves
silently.

| # | Item | Where | Why it's compulsory |
|---|------|-------|---------------------|
| 1 | **Vendor deactivation blocking is stubbed out** — `hasPurchases()` always returns `false` ("No Purchase model yet"), though Purchase exists. | `repositories/vendor.repository.ts:61-65` | Any vendor with purchase history can be deactivated; spec requires this to be blocked. Silent data-integrity hole. |
| 2 | **Product deletion open-challan blocking is stubbed out** — `hasOpenChallans()` always returns `false` ("No Challan model yet"), though DispatchEntry exists. | `repositories/product.repository.ts:73-77` | A product referenced by an unbilled (PENDING_BILLING) dispatch can be deactivated out from under it. Only the `currentStock > 0` half works. |
| 3 | **Purchase GST uses a hardcoded company state (`'Gujarat'`)** instead of `Settings.companyState`. | `app/api/purchases/route.ts:11,138` | Every purchase splits CGST/SGST vs IGST against the wrong state if the real company state ≠ Gujarat → wrong tax on all purchases. |
| 4 | **Settings module has no API and no UI** — no `GET/PUT /api/settings`, no settings screen. | (no `app/api/settings`, no `app/(dashboard)/settings`) | Invoice GST + PDF hard-depend on the Settings row; staff cannot view or edit company name/address/GSTIN/FY start. A wrong Settings row silently corrupts every tax invoice. |
| 5 | **Customer soft-delete entirely absent** — no `isActive` field, no `DELETE` route, no service method. | `prisma/schema.prisma:145-166`, `app/api/customers/[id]/route.ts` | Spec requires soft-delete blocked on unpaid invoices / open dispatch. A customer cannot be deactivated at all. Needs a migration. |
| 6 | **Manual customer pricing write-path never built** — `PUT /api/customers/:id/prices/:productId` and its edit UI do not exist. Read + auto-populate work; the manual half doesn't. | route/controller/UI absent; detail page is read-only `app/(dashboard)/customers/[id]/page.tsx:209-245` | `isManual: true` can never be set by anyone, so staff cannot negotiate a price, and the "don't overwrite a manual price" protection can never trigger. This was the explicitly flagged at-risk area. |
| 7 | **Authentication not enforced on business endpoints** — no `middleware.ts`; `authenticate()` only runs in payments POST + users. | `grep authenticate` → only `payment.controller.ts`, `user.controller.ts` | Unauthenticated read/write of customer financials (vendors, customers, invoices, payments GET, dashboard). Security blocker **if internet-exposed**. Downgrade only if deployment is strictly internal-network. |

---

## 🟡 Pending — Should Fix Before Release (non-blocking but real)

Correctness/consistency defects that won't stop a demo but will bite in
production.

| # | Item | Where | Impact |
|---|------|-------|--------|
| 8 | **Document numbering not IST + ignores `Settings.financialYearStart` + purchaseNo race** — invoice/purchase FY uses server-local time and hardcodes April; `generatePurchaseNo` runs outside the transaction with no advisory lock (invoiceNo has the lock, purchaseNo doesn't). | `lib/invoice-no.ts`, `lib/purchase-no.ts`, `app/api/purchases/route.ts:178` | Wrong FY series near the Apr-1 IST boundary on a UTC host; possible duplicate `purchaseNo` under concurrency. |
| 9 | **Dashboard sales chart not zero-filled** — only buckets with invoices are emitted. | `services/dashboard.service.ts:96-109` | Days/months with no sales silently vanish, distorting the trend line. (Top-category chart correctly is *not* zero-filled.) |
| 10 | **Decimal→number serialization inconsistent** — summaries convert, but raw list/detail endpoints (customers, products, purchases, invoice getById, payments) leak Prisma `Decimal` as JSON strings. | `customer.repository.ts`, `product.repository.ts`, `purchases` GET, etc. | Frontend papers over it with `string \| number`; violates the spec's "plain number everywhere" rule and risks arithmetic bugs. |
| 11 | **Customers list/detail missing derived fields** — no `gstType`, no `isCreditBreached`, no state/isActive filter; detail lacks `customerPrices` array + recent invoices. | `repositories/customer.repository.ts` | Credit-breach indicator has no server field to bind to; detail view is thinner than spec. |
| 12 | **Vendor `isPreferred` uniqueness on wrong axis** — clears preferred per-vendor, but spec wants one preferred vendor *per product*. | `repositories/vendor.repository.ts:75-80` | Preferred-vendor semantics inverted. |
| 13 | **Backends built but not wired to UI** — manual stock adjustment (`POST /products/:id/stock/adjust`), vendor–product linkage (`POST/DELETE /vendors/:id/products`); no vendor/product detail views. | no frontend callers (`grep` clean) | Correct endpoints exist but no user can reach the feature. |
| 14 | **Architecture drift: Purchases is a flat route handler** — no controller/service/repository, unlike every other module. | `app/api/purchases/**` | Maintainability; also where the hardcoded-state bug (#3) hides. |
| 15 | **Credit-limit warning fires at `creditLimit = 0`** — no `creditLimit > 0` guard, unlike the Dashboard breach logic. | `services/dispatch-entry.service.ts:90-91` | Spurious breach warning for every customer without a configured limit. |

---

## 🟢 Deliberately Left / Out of Scope (confirmed decisions, no action needed)

Listed for visibility only.

- **Quotations module** — deferred to v2 (per spec §0). Correctly absent.
- **PriceHistory read API/UI** — no way to view the price-change audit trail. Spec allows this as a v1 gap; treat as a conscious decision, not an oversight.
- **RBAC beyond user management** — role enum is `admin | user` (not ADMIN/STAFF/ACCOUNTANT); role is enforced only on user-management endpoints, decorative elsewhere. Acceptable for internal v1 if intended.
- **Extra procurement fields** — Purchases adds `expectedDeliveryDate`/`receivedDate` and a `/purchases/:id/receive` route beyond spec. Harmless addition.
- **User model naming** — `passwordHash`/`status` instead of `password`/`isActive`; password is never returned (verified). Cosmetic.

---

## ✨ Good to Have (nice, not required for release)

- **Raise `DEFAULT_PAGE_LIMIT`** from 5 — unusually low for real data volume. `lib/pagination.ts:1`.
- **PriceHistory viewer** — a read endpoint + small UI to show negotiated-price history per customer/product.
- **Server-driven credit warning** — dispatch form recomputes the warning client-side instead of using the server's returned `warning` object; wiring to the server response would keep logic in one place.
- **Vendor/Product detail pages** — dedicated `[id]` views with linked products / stock-transaction history (once #13 endpoints are wired).
- **Basic rate limiting / abuse protection** on public-facing endpoints if internet-exposed (spec §13).

---

## ❓ Cannot Verify From Code (needs live DB / deploy access)

- Production `DATABASE_URL` and secrets configured for the real deploy target.
- A real (non-placeholder) **Settings row** exists in production.
- Pre-migration customers **backfilled** with `address`/`city`/`phone` (columns exist, nullable; data state unknown).
- HTTPS enforced in production.

---

## ✅ Verified Solid (for reassurance — no action)

- **Invoice module** — atomic creation, GST computed fresh from `Category.gstRate` + `determineGstType`, qty/price inherited from dispatch, snapshot-only PDF (no live query), `isManual`-respecting CustomerPrice upsert + AUTO_INVOICE PriceHistory, fully immutable (no PUT/DELETE).
- **Payments** — record vs allocate separated, idempotent batch (replay→200), race-safe conditional `updateMany`, `recordedById` from session not body, correct balance movements, immutable.
- **Stock atomicity** — Dispatch (full pre-check, all-or-nothing) and Purchase (increment + cancel-with-negative-block) are correctly transactional.
- **Dashboard** — revenue from Invoice, IST period boundaries via `Settings.financialYearStart`, credit-breach `creditLimit > 0` guard, decimals→numbers, low-stock filters `isActive`.
- **Seed data** — all 7 categories with correct HSN/GST; 29 product SKUs.
- No stray `console.log` in production code paths.
