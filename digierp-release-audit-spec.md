# DigiERP — Sprint 1 Release Audit Specification

**Purpose:** This document enumerates everything that was decided, designed, or
implicitly required for Sprint 1 of DigiERP (B2B printing ink distribution ERP).
It exists so an auditor — human or agent — can check the actual codebase
against a ground-truth list, instead of relying on memory of what "should" be there.

**How to use this:** Every checklist item below should be verified against the
real repository: does the Prisma model field exist? Does the API endpoint
exist and behave as specified? Does a frontend screen/component actually call
that endpoint and expose the feature to a user? A "yes" to the schema question
alone is NOT a pass — a field or table with no API and no UI is a release
blocker, not a completed feature (see: CustomerPrice, flagged below as a known
at-risk area).

Sprint 1 scope: Auth, Vendors, Categories, Products, Customers, Settings,
Purchases, Dispatch Entry, Invoice, Payments, Dashboard.
Out of scope (deferred to v2): Quotations.

---

## 0. Cross-Cutting Architecture & Conventions

Check this section FIRST — inconsistencies here quietly propagate into every
module below.

- [ ] All modules use ONE consistent layered architecture: controller → service
      → repository, with zod validation schemas. **Known risk:** Vendors,
      Categories, Products, and Customers were originally specified with a flat
      route-handler pattern (`app/api/.../route.ts` containing logic directly)
      before the repo's actual convention (layered, matching `dispatch-entry`)
      was discovered partway through the project. Verify these four early
      modules were refactored to match, or explicitly flag the inconsistency.
- [ ] All modules use ONE consistent response envelope (e.g. `successResponse()`
      wrapper + `asyncHandler`) and ONE consistent error shape
      (`{ error: { code, message } }` via `NotFoundError`/`BadRequestError`
      classes). Check early modules (Vendors/Products/Customers) against later
      ones (Dispatch Entry/Invoice/Payments) for drift.
- [ ] Every Decimal field returned by any API endpoint is serialized to a plain
      JS number before leaving the server (Prisma `Decimal` does not safely
      JSON-serialize as-is). This was explicitly called out for Dashboard —
      verify it's actually true everywhere (Products, Purchases, Invoice,
      Payments, Customers all return Decimal fields).
  * [ ] All date/period boundary logic that matters for business correctness
      (financial year rollover for invoice/purchase numbering, Dashboard month/FY
      windows) is computed in IST (Asia/Kolkata), not server/UTC time.
- [ ] `lib/gst.ts` (`determineGstType`) is a single shared implementation reused
      by every module that needs CGST/SGST vs IGST logic (Purchases, Invoice,
      Dashboard indirectly) — not reimplemented per module.
- [ ] Document numbering (`purchaseNo`, `invoiceNo`) resets on financial year
      boundary (April, per `Settings.financialYearStart`), NOT monthly. This was
      a self-corrected mistake during the build — verify the final
      implementation is annual, not monthly.
- [ ] All list-returning endpoints across every module return `[]` for no
      results — never `null`/`undefined`, never throw.
- [ ] Pagination: **no list endpoint in any module spec included pagination.**
      As data volume grows (invoices, dispatch entries, payments), unpaginated
      list endpoints will become a real performance problem. Check whether any
      pagination was added, and if not, flag this as a known gap to schedule.
- [ ] RBAC enforcement: `User.role` (ADMIN / STAFF / ACCOUNTANT) exists on the
      schema — verify whether any endpoint actually *checks* role and restricts
      access, or whether the field is currently decorative only.

---

## 1. Auth Module

- [ ] User model: username, password (hashed), role, isActive, createdAt, updatedAt
- [ ] Login endpoint issues a session/token
- [ ] Protected routes reject unauthenticated requests
- [ ] Password is never returned in any API response, ever (check all user-related
      endpoints, including any that nest a `recordedBy`/`performedBy` user object)
- [ ] Logout flow exists
- [ ] Frontend: login screen, session persistence, redirect-to-login on 401

---

## 2. Vendors Module

**Data model**
- [ ] Vendor: name, email, phone, address, state, gstin, paymentTerms, isActive
- [ ] VendorProduct join table: vendorId, productId, isPreferred

**API endpoints**
- [ ] `GET /api/vendors` (filters: isActive, search)
- [ ] `POST /api/vendors`
- [ ] `GET /api/vendors/:id` (includes linked products)
- [ ] `PUT /api/vendors/:id`
- [ ] `DELETE /api/vendors/:id` (soft delete)
- [ ] `POST /api/vendors/:id/products` (link products, handles isPreferred uniqueness)
- [ ] `DELETE /api/vendors/:id/products/:productId` (unlink)

**Business rules**
- [ ] Soft delete only (isActive: false), never hard delete
- [ ] Deactivation BLOCKED if vendor has any Purchase history
- [ ] Setting isPreferred: true on one VendorProduct unsets it on all others for
      that same product

**Frontend**
- [ ] Vendor list with filters/search
- [ ] Create/Edit vendor form
- [ ] Vendor detail view showing linked products
- [ ] Add/remove product linkage UI
- [ ] Deactivate confirmation flow

---

## 3. Categories Module

**Data model**
- [ ] Category: name, hsnCode, gstRate

**API endpoints**
- [ ] `GET /api/categories`
- [ ] `POST /api/categories`
- [ ] `PUT /api/categories/:id`

**Business rules**
- [ ] HSN code and GST rate live ONLY on Category, never duplicated onto Product
- [ ] One category update propagates GST/HSN to all products under it automatically
      (i.e. Product never stores its own copy of these values)

**Frontend**
- [ ] Category management screen (list, create, edit)
- [ ] Seed data present: at minimum the 7 categories discussed (Konica 512i
      Solvent Ink, Konica 1024i Solvent Ink, Eco Solvent Ink, UV Ink, Solvent
      Flush, UV Flush, UV Varnish) with correct HSN/GST

---

## 4. Products Module

**Data model**
- [ ] Product: name, categoryId, basePrice, unit, currentStock, lowerStockLimit,
      isActive
- [ ] `currentStock` is a cached value — verify NO code path outside
      StockTransaction logic ever writes to it directly

**API endpoints**
- [ ] `GET /api/products` (filters: categoryId, isActive, search — returns nested
      category + vendor list)
- [ ] `POST /api/products`
- [ ] `GET /api/products/:id` (includes stock transaction history)
- [ ] `PUT /api/products/:id` (categoryId NOT updatable after creation)
- [ ] `DELETE /api/products/:id` (soft delete)
- [ ] `GET /api/products/:id/stock`
- [ ] `POST /api/products/:id/stock/adjust` (reason must be "ADJUSTMENT" only —
      system-triggered reasons like PURCHASE/DISPATCH_ENTRY must not be
      settable via this endpoint)

**Business rules**
- [ ] Soft delete BLOCKED if currentStock > 0 or open (unbilled) Dispatch Entries
      reference this product
- [ ] Manual stock adjustment wrapped in a transaction (StockTransaction create +
      Product.currentStock update, atomic)
- [ ] Seed data present: full 16-SKU product list across all categories (C/M/Y/K
      +Flush for Solvent 1Ltr, C/M/Y/K for Solvent 5Ltr, C/M/Y/K for Eco Solvent,
      C/M/Y/K/W/Varnish for UV, plus Solvent Flush and UV Flush/Varnish as their
      own single-SKU categories)

**Frontend**
- [ ] Product list with category/vendor filters
- [ ] Create/Edit product form
- [ ] Product detail view with stock transaction history
- [ ] Manual stock adjustment UI
- [ ] Low-stock visual indicator somewhere in the list/detail view

---

## 5. Customers Module ⚠️ KNOWN AT-RISK AREA

**Data model**
- [ ] Customer: firmName, contactPerson, address, city, state, gstin, phone,
      email, creditLimit, outstandingBalance, creditBalance, isActive
  * **Verify `address` and `city` actually exist on the live schema** — these
      were confirmed missing at one point mid-project (a real drift between
      design and implementation occurred here) and were supposed to be patched
      in via migration. Confirm the migration happened and existing customer
      records were backfilled, not just new ones.
- [ ] CustomerPrice: customerId, productId, price, isManual, updatedAt
      (`@@unique([customerId, productId])`)
- [ ] PriceHistory: customerId, productId, price, source ("AUTO_INVOICE" |
      "MANUAL"), recordedAt

**API endpoints**
- [ ] `GET /api/customers` (filters: isActive, search, state — includes derived
      `gstType` and `isCreditBreached`)
- [ ] `POST /api/customers`
- [ ] `GET /api/customers/:id` (includes customerPrices array, recent invoices)
- [ ] `PUT /api/customers/:id`
- [ ] `DELETE /api/customers/:id` (soft delete)
- [ ] **`GET /api/customers/:id/prices`** ⚠️ — returns ALL active products with
      basePrice + customerPrice (null if unset) + isManual + updatedAt.
      **THIS IS THE FLAGGED GAP** — confirm this endpoint actually exists and
      is wired up, not just present in the Prisma schema as an unused table.
- [ ] **`PUT /api/customers/:id/prices/:productId`** ⚠️ — sets a manual
      customer-specific price, sets isManual: true, writes a PriceHistory row.
      **Confirm this exists.**
- [ ] Is there ANY way to view PriceHistory (audit trail of price changes over
      time) via API? If not, this may be an acceptable v1 gap, but it should be
      a deliberate decision, not an oversight.

**Business rules**
- [ ] `gstType` is derived at query/response time by comparing Customer.state to
      Settings.companyState — never stored as a static field
- [ ] `isCreditBreached` is derived (`outstandingBalance > creditLimit AND
      creditLimit > 0`) — a creditLimit of exactly 0 must NOT be treated as
      "zero credit allowed"
- [ ] `outstandingBalance` is NEVER accepted/updated directly via the Customers
      module's own PUT endpoint — it is system-managed exclusively by Invoice
      creation (increment) and Payment allocation (decrement)
- [ ] Soft delete BLOCKED if customer has any unpaid Invoice or any open
      (unbilled) Dispatch Entry
- [ ] Manual price update via `PUT /prices/:productId` always sets
      `isManual: true` and writes PriceHistory with source "MANUAL"

**Frontend** ⚠️ **CONFIRM THIS SECTION ESPECIALLY**
- [ ] Customer list with search/filters, credit-breach visual indicator
- [ ] Create/Edit customer form (must include address, city, phone fields)
- [ ] Customer detail view
- [ ] **Customer-specific pricing UI** — a screen/section where staff can view
      every active product's base price alongside this customer's negotiated
      price (if any), and edit/set a manual price per product. **This was
      explicitly flagged as missing — confirm it now exists, in both the
      Customer detail view and (if applicable) as a standalone pricing
      management screen.**
- [ ] Deactivate confirmation flow

**Cross-module dependency check:** Dispatch Entry creation is supposed to
default each line item's price to the customer's CustomerPrice if one exists,
falling back to Product.basePrice otherwise. **If the CustomerPrice backend
gap above is real, this pricing-default logic in Dispatch Entry may also be
silently broken or simplified to "always use basePrice."** Check Dispatch
Entry's actual price-defaulting code, not just its existence.

---

## 6. Settings Module

**Data model**
- [ ] Settings: companyName, companyAddress, companyState, companyGstin,
      companyPan, financialYearStart (singleton row, id always 1)

**API endpoints**
- [ ] `GET /api/settings`
- [ ] `PUT /api/settings` (upsert)

**Business rules**
- [ ] A real Settings row exists in production (not left null) — Invoice PDF
      generation and GST-type determination both hard-depend on this

**Frontend**
- [ ] Settings screen where company details can actually be edited (not just a
      seeded placeholder that's never exposed to staff)

---

## 7. Purchases Module

**Data model**
- [ ] Purchase: purchaseNo (unique, annual-reset series), vendorId,
      vendorInvoiceNo, date, entryDate, totalAmount, totalGst, paidAmount,
      paymentStatus, isCancelled
- [ ] PurchaseItem: purchaseId, productId, quantity, unitPrice, cgst, sgst, igst,
      lineTotal

**API endpoints**
- [ ] `GET /api/purchases` (filters: vendorId, paymentStatus, isCancelled,
      from/to, search)
- [ ] `POST /api/purchases` (multi-line items)
- [ ] `GET /api/purchases/:id`
- [ ] `DELETE /api/purchases/:id` (cancels, reverses stock — NOT a hard delete)
- [ ] `GET /api/purchases/:id/payments`
- [ ] `POST /api/purchases/:id/payments`

**Business rules**
- [ ] No PUT endpoint exists — purchases are immutable once created
- [ ] Stock increments atomically (StockTransaction + Product.currentStock
      update in one transaction) on creation
- [ ] Cancellation reverses stock via a new StockTransaction — BLOCKED if
      reversal would push currentStock below 0
- [ ] GST computed per line item using Category.gstRate + determineGstType
      (vendor state vs company state)
- [ ] Vendor payment total never exceeds Purchase.totalAmount
- [ ] paymentStatus recomputed correctly (UNPAID/PARTIAL/PAID) after each
      payment

**Frontend**
- [ ] Purchase list with filters
- [ ] New Purchase form with dynamic multi-line item table, live GST calculation
- [ ] Purchase detail view (line items, GST breakup, stock impact, payment
      history)
- [ ] Record Payment modal/drawer
- [ ] Cancel confirmation dialog showing exactly what stock will be reversed

---

## 8. Dispatch Entry Module

**Data model**
- [ ] DispatchEntry: challanNo (manual entry, unique — NOT auto-generated),
      customerId, place, transport, date, entryDate, status (PENDING_BILLING /
      BILLED), isCancelled, totalAmount
  * **Confirm NO GST/tax columns exist on this model** — this was a corrected
      mistake mid-project (dispatch entries are non-billed, carry no tax data)
- [ ] DispatchEntryItem: dispatchEntryId, productId, quantity, price, lineTotal
  * **Confirm NO cgst/sgst/igst columns exist here either**

**API endpoints**
- [ ] `GET /api/dispatch-entries` (filters: customerId, status, isCancelled,
      from/to, search by challanNo)
- [ ] `POST /api/dispatch-entries`
- [ ] `GET /api/dispatch-entries/:id`
- [ ] `DELETE /api/dispatch-entries/:id` (cancels, reverses stock)

**Business rules**
- [ ] No PUT endpoint — immutable once created (either cancelled or permanent)
- [ ] `challanNo` uniqueness enforced at DB level; duplicate entry attempt
      returns a clean error, not a raw Prisma constraint error
- [ ] Stock check happens for ALL line items BEFORE any writes — a multi-item
      entry either fully succeeds or fully fails, never partially commits
- [ ] Stock decrements atomically; blocked entirely if any line item would drive
      currentStock negative
- [ ] Price per line item defaults to CustomerPrice (if one exists for that
      customer-product pair) else Product.basePrice — **verify this actually
      reads from CustomerPrice; see the Customers module gap above**
- [ ] Credit limit check is a SOFT WARNING ONLY (never blocks creation) —
      returned as a non-blocking `warning` object in the response
- [ ] A DispatchEntry with status BILLED can NEVER be cancelled, regardless of
      isCancelled state — this check must hold even though status=BILLED is
      set by the Invoice module, not this one
- [ ] Cancellation reverses stock via a new StockTransaction (safe — reversal
      only adds stock back, no negative-stock risk)

**Frontend**
- [ ] Dispatch Entry list (status pills: Pending Billing / Billed, cancelled
      entries visually distinct or filterable)
- [ ] New Dispatch Entry form: manual challan number field with helper text,
      customer/product selection, live stock indicator per line item
      (blocking, not just a warning, when insufficient), live price
      default-vs-override indicator
- [ ] Credit limit warning banner (non-blocking, dismissible/"proceed anyway")
      shown on submission when applicable
- [ ] Dispatch Entry detail view: shows linked Invoice if billed, "Generate
      Invoice" and "Cancel Entry" actions if not yet billed, stock impact
      section
- [ ] Cancel confirmation dialog showing stock to be restored

---

## 9. Invoice Module

**Data model**
- [ ] Invoice: invoiceNo (unique, annual-reset series), dispatchEntryId
      (unique — enforces one-to-one), customerId, date, place, transport,
      totalAmount, totalCgst, totalSgst, totalIgst, paymentStatus, paidAmount,
      snapshot (Json)
- [ ] InvoiceItem: invoiceId, productId, quantity, price, cgst, sgst, igst,
      lineTotal

**API endpoints**
- [ ] `GET /api/invoices` (filters: customerId, paymentStatus, from/to, search)
- [ ] `POST /api/invoices` (body: dispatchEntryId, optional date)
- [ ] `GET /api/invoices/:id`
- [ ] `GET /api/invoices/:id/pdf`

**Business rules**
- [ ] No PUT, no DELETE — invoices are fully immutable once created
- [ ] Rejects creation if source DispatchEntry is already BILLED, is cancelled,
      or does not exist
- [ ] Quantity and price are INHERITED from DispatchEntryItem, never
      recomputed/re-priced at invoice time
- [ ] GST (CGST/SGST/IGST) is computed FRESH at invoice time using
      Category.gstRate + determineGstType — never copied from anywhere (source
      DispatchEntry has none)
- [ ] `invoiceNo` generation resets annually (financial year), uses proper
      locking to avoid race conditions on the "first invoice of a new FY" case
- [ ] Entire creation flow (validation, GST calc, invoiceNo generation, snapshot
      build, Invoice+Items creation, DispatchEntry status→BILLED,
      Customer.outstandingBalance increment, CustomerPrice/PriceHistory
      upsert) happens in ONE atomic transaction
- [ ] CustomerPrice upsert on invoice creation respects isManual: if an existing
      CustomerPrice has isManual: true, it is NOT overwritten — a PriceHistory
      row is still logged with source "AUTO_INVOICE" for audit purposes even
      when the price itself isn't changed. **This logic depends entirely on
      CustomerPrice actually being implemented — re-verify against the
      Customers module gap.**
- [ ] `snapshot` is captured once at creation and is the ONLY source ever used
      by the PDF renderer — confirm the PDF endpoint does not re-query live
      Customer/Product/Settings data
- [ ] PDF includes: company header, "TAX INVOICE" title, invoice number+date,
      customer billing details (name, address, GSTIN — legally required for a
      valid GST tax invoice), place of supply, line items with HSN code,
      GST breakup, grand total, reference to original challan number

**Frontend**
- [ ] Invoice list with filters
- [ ] "Generate Invoice" action from a Dispatch Entry's detail view (not a
      standalone "create invoice" flow with manual product entry)
- [ ] Invoice detail view (customer, items, GST breakup, payment status,
      linked dispatch entry/challan reference)
- [ ] PDF view/download action

---

## 10. Payments Module

**Data model**
- [ ] Payment: customerId, amount, unallocatedAmount, mode, reference, date,
      recordedById
- [ ] AllocationBatch: idempotencyKey (unique)
- [ ] PaymentAllocation: paymentId, invoiceId, batchId, amount

**API endpoints**
- [ ] `GET /api/payments` (filters: customerId, mode, from/to, search)
- [ ] `POST /api/payments`
- [ ] `GET /api/payments/:id` (includes allocations)
- [ ] `POST /api/payments/allocations` (batch, idempotency-key protected)
- [ ] `GET /api/customers/:id/payments`
- [ ] `GET /api/invoices/:id/payments`

**Business rules**
- [ ] Recording a payment and allocating it are separate actions — a payment
      can sit unallocated (as usable credit) indefinitely
- [ ] `recordedById` is derived from the authenticated session — never accepted
      as a client-supplied field in the request body
- [ ] Allocation batch is idempotent: resubmitting the same idempotencyKey
      returns the original result (200) instead of reprocessing
- [ ] Allocation uses conditional atomic updates (e.g.
      `updateMany({ where: { unallocatedAmount: { gte: amount } } })`) rather
      than read-then-write, to prevent race conditions under concurrent
      allocation requests
- [ ] Overpayment is allowed — excess remains in Payment.unallocatedAmount /
      Customer.creditBalance, available for future allocation
- [ ] Allocating decrements Customer.outstandingBalance AND Customer.
      creditBalance, increments Invoice.paidAmount, recomputes
      Invoice.paymentStatus
- [ ] No PUT, no DELETE — payments and allocations are immutable

**Frontend**
- [ ] Payment list with filters
- [ ] Record Payment form
- [ ] Allocation UI: staff can select from a customer's available (unallocated)
      payments and apply amounts against one or more open invoices — this UI
      must support many-to-many allocation, not just "pick one payment for one
      invoice"
- [ ] Payment detail view showing all its allocations
- [ ] Invoice detail view showing payment history against it (paidAmount vs
      totalAmount, list of contributing payments)
- [ ] Some visible indicator of a customer's available credit balance
      (unallocated payments) when creating a new allocation or viewing their
      profile

---

## 11. Dashboard Module

**API endpoints**
- [ ] `GET /api/dashboard?period=month|fy` (single combined endpoint, all 7
      widgets in one response; invalid period value → 400)

**Business rules**
- [ ] Sales/revenue figures are derived from Invoice, never DispatchEntry
- [ ] Credit health and vendor payables include ALL customers/vendors
      regardless of isActive (a deactivated customer who still owes money must
      still appear)
- [ ] Low stock alerts DO filter by Product.isActive = true
- [ ] Credit breach logic: creditLimit > 0 AND outstandingBalance > creditLimit
- [ ] Period boundaries computed in IST, using Settings.financialYearStart for
      the FY calculation (reusing, not reimplementing, the FY logic from
      invoice/purchase numbering)
- [ ] Sales chart is zero-filled across every bucket in the period (no gaps for
      days/months with no invoices)
- [ ] Top category chart is NOT zero-filled (a ranking, correctly omits
      zero-revenue categories)
- [ ] All Decimal aggregates converted to plain numbers before response

**Frontend**
- [ ] Period toggle (This Month / This Financial Year)
- [ ] 4 summary cards: Total Invoiced, Total Collected, Outstanding, Vendor
      Payable
- [ ] Sales trend chart
- [ ] Top categories chart
- [ ] Credit health widget: breach chart + breached-customer table
- [ ] Low stock alerts list
- [ ] Recent activity feed (merges Dispatch Entry, Invoice, and Payment events,
      sorted by date)
- [ ] Loading skeleton states (not a single full-page spinner)
- [ ] Empty states per widget (not blank cards)
- [ ] Error state with retry
- [ ] Responsive layout (desktop grid → tablet 2x2 → mobile single column)
- [ ] Only period-dependent widgets visually respond to the toggle; Credit
      Health / Low Stock / Recent Activity do not flash/reload on toggle change

---

## 12. Cross-Module Data Integrity Checks

These verify that the modules work correctly TOGETHER, not just individually.

- [ ] Full cycle test: create Vendor → create Product → record Purchase (stock
      increases) → create Customer → create Dispatch Entry (stock decreases,
      correct price default applied) → Generate Invoice (GST computed
      correctly, PDF renders, DispatchEntry locks to BILLED) → Record Payment →
      Allocate Payment to the Invoice (paidAmount/paymentStatus update,
      Customer.outstandingBalance decreases) → Dashboard reflects all of the
      above correctly under both "This Month" and "This Financial Year" views
- [ ] Cancelling a Purchase correctly reverses stock and is blocked if reversal
      would go negative
- [ ] Cancelling a Dispatch Entry correctly reverses stock and is blocked once
      status is BILLED
- [ ] A customer with a manually-set (isManual: true) CustomerPrice does NOT
      have that price silently overwritten when a new Invoice is generated for
      them
- [ ] Sum check: for any customer, `sum(Payment.amount)` should always equal
      `sum(PaymentAllocation.amount) + sum(Payment.unallocatedAmount)` across
      all their payments, at any point in time
- [ ] Deactivating a Vendor/Customer/Product is blocked exactly under the
      conditions specified in each module section above — test the actual
      blocking, not just that the flag exists

---

## 13. Non-Functional / Release Readiness Checklist

- [ ] Production `DATABASE_URL` and any secrets are configured for the actual
      deploy target, not just local dev
- [ ] A real Settings row exists in production with actual company details
      (not a seed placeholder)
- [ ] Any customers created before the address/city/phone migration have been
      backfilled with real data, not left null
- [ ] Basic error monitoring/logging exists for API failures
- [ ] No stray console.log/debug output left in production code paths
- [ ] HTTPS enforced in production
- [ ] Rate limiting or basic abuse protection on public-facing endpoints (if
      internet-exposed, not purely internal network)