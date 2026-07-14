---
name: audit
description: Whole-codebase (or scoped-module) audit for performance bottlenecks, architectural drift, and code quality issues, using the devil's-advocate binary critique framework. Read-only by default — produces a prioritized findings report; fixes are applied separately via /change.
argument-hint: [optional path or module to scope the audit to]
---

# /audit — Codebase Performance & Quality Audit

## Trigger
Invoked as: `/audit` (whole repo) or `/audit <path-or-module>` (scoped).

Examples:
```
/audit
/audit src/api/invoices
/audit apps/web
```

This command is **read-only** — it never modifies files. It produces a
findings report. If the user wants any finding fixed, that goes through
`/change` (Step 2 asks which branch, plan critique, approval gate, etc.),
either manually invoked or, if the runtime supports it, offered directly
from the report (see Step 5).

## Inputs
- `$SCOPE` (optional) — a path or module to limit the audit to. If omitted,
  audit the whole repository (excluding standard ignore paths: `node_modules`,
  `.git`, build output directories, vendored/generated code).

---

## Workflow

### Step 1 — Establish scope and baseline
- Resolve `$SCOPE` to a concrete file set. If no scope was given, enumerate
  the whole repo minus ignored paths.
- Record the current git SHA and branch — this audit's findings are
  correlated to this specific point in history.
- If the repo is large (a rough guideline: more than ~150 files or several
  distinct services/apps in scope), tell the user the audit will run in
  batches by module/service rather than attempting everything in one pass,
  and confirm the batching plan before proceeding.

### Step 2 — Load project standards
Same as the critique framework in `critique-criteria.md`:
- `CLAUDE.md` / `AGENTS.md` at the repo root.
- ADR files (`docs/adr/`, `docs/decisions/`, `adr/`, `decisions/`,
  `doc/architecture/decisions/`, `**/ADR-*.md`).
- Mine the codebase itself for dominant patterns: if five or more instances
  do something one consistent way, treat that as the established convention
  — even if undocumented — and flag deviations from it.

### Step 3 — Run the audit
Unlike `/feature` and `/change`, which critique a specific diff, `/audit`
sweeps the whole scoped codebase. Apply the **code critique criteria** from
`critique-criteria.md`, weighted toward the dimensions most relevant to a
standing-codebase audit rather than a fresh diff:

**Primary focus (this command's core purpose):**
- **Performance** — `no-n-plus-1`, `no-hot-path-on2`, plus general bottleneck
  hunting beyond the base criteria:
  - Queries or I/O calls issued inside loops, especially per-request paths.
  - Missing indexes implied by query patterns (e.g. filtering/sorting on
    unindexed columns in hot paths — flag for the user to verify against
    actual DB schema/indexes).
  - Unbounded result sets / missing pagination on endpoints that could return
    large collections.
  - Synchronous/blocking calls on paths that should be async, or vice versa
    (blocking the event loop in Node.js/TypeScript contexts).
  - Redundant recomputation — expensive work repeated per-request that could
    be cached, memoized, or computed once.
  - Bundle-size or cold-start concerns for serverless/App-Service-style
    deployments (relevant given constraints like CPU-only mode, no ML
    downloads at runtime).
- **Architecture** — `boundaries-respected`, `no-hacky-shortcuts`:
  - Code bypassing an established API/service/repository layer to hit a
    database or external API directly.
  - Special-case conditionals scattered across the codebase instead of a
    proper abstraction — a sign of organically-grown technical debt.
  - Band-aid fixes: comments like "temporary", "hack", "workaround", or
    logic that clearly papers over a root cause rather than addressing it.

**Secondary focus (still scored, lower priority in the report):**
- **Quality** — `no-dead-code`, `no-placeholders`, `errors-handled`,
  `no-code-smell`. Dead code and unused exports are especially worth
  surfacing in a whole-codebase sweep since they're easy to miss diff-by-diff.
- **Consistency** — `types-match`, `naming-conventions`, `patterns-followed`.
- **Security** — `no-secrets`, `input-validated`, `no-injection`,
  `auth-enforced`. Always score these even though they're not the primary
  focus — a performance audit should never suppress a discovered secret or
  missing auth check.

Skip `Correctness` (`tests-pass`, `logic-correct`) and `Integration`
(`imports-resolve`, `tests-exist`, `no-regressions`) as primary scoring
dimensions for `/audit` — those are diff-relative concepts that belong to
`/feature` and `/change`. If something in this category is glaringly broken,
still report it, just don't force a PASS/FAIL binary onto it.

Every finding needs `file:line` evidence and a concrete fix, per the
`critique-criteria.md` output rules. No vibes-based findings.

### Step 4 — Prioritize findings
Group findings into a report ordered by:

1. **Critical** — actively causes incorrect behavior, a security exposure,
   or a severe performance cliff (e.g. N+1 query on a high-traffic endpoint,
   unbounded query that can OOM under load, missing auth on a data mutation).
2. **High** — meaningful performance or maintainability cost, not yet on
   fire (e.g. O(n²) logic on a path that's currently low-volume but could
   scale, architectural drift that's spreading across multiple files).
3. **Medium** — worth fixing, low urgency (e.g. redundant recomputation on a
   rarely-hit path, inconsistent naming in a small area).
4. **Low** — cosmetic or very minor (e.g. dead code with no execution path,
   a stray unused import).

For each finding, include: severity, dimension/criterion, `file:line`,
what's wrong, why it matters (concretely — not "this could theoretically be
slow" but the actual mechanism), the fix, and a rough effort estimate
(trivial / small / medium / large).

### Step 5 — Present the report
Present the findings grouped by severity. End with:
- A one-line overall verdict (e.g. "3 critical, 5 high, 12 medium/low — the
  N+1 query in the invoice list endpoint is the one to fix first").
- An offer: "Want me to fix any of these? I can run `/change` for a specific
  finding — just point me at the number(s)."

If the user selects findings to fix, hand each one off as a `/change`
invocation: the change description is the specific finding, and `/change`'s
own workflow (branch selection, plan, plan critique, approval gate,
implementation, code critique, validation pipeline) runs from there. `/audit`
itself does not implement fixes directly — this keeps the audit's read-only
guarantee intact and reuses `/change`'s existing safety gates rather than
duplicating them.

### Step 6 — Log the audit
Log this run per the logging convention in `critique-criteria.md`: timestamp,
git SHA, scope, and the finding counts by severity. This lets successive
audits be compared over time (e.g. "last audit had 8 high-severity findings,
this one has 3" as a rough regression/improvement signal).

---

## Notes for the agent runtime
- `/audit` never modifies files. If asked to "just fix it while you're in
  there," decline and redirect to `/change` — the separation is intentional:
  audits should be safe to run anytime, including on branches you don't
  intend to touch right now.
- For very large repos, prefer several scoped `/audit <module>` runs over one
  whole-repo run — smaller batches produce more specific, actionable
  findings than a shallow pass over everything.
- This command references `critique-criteria.md` for the underlying criteria
  and reporting format — keep that file alongside this one.
- Findings that touch security (`no-secrets`, `auth-enforced`, etc.) should
  never be downgraded in priority just because this command's primary framing
  is performance. A missing auth check is always at least High, regardless
  of scope.