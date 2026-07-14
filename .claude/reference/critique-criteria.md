# Devil's Advocate Critique Criteria (Shared Reference)

This file is a shared reference used by `/feature`, `/change`, and `/audit`.
It is not a command itself — commands invoke a "critique pass" and point back
here for the criteria, scoring rules, and reporting format.

Inspired by the binary-evaluation approach used in tools like
[devils-advocate](https://github.com/brandonsimpson/devils-advocate): every
criterion is a hard PASS or FAIL — no percentage scores, no "mostly fine",
no wiggle room. Every FAIL requires `file:line` evidence and a concrete `Fix:`
suggestion. Vibes-based review is not acceptable output.

---

## Core principles

1. **Binary only.** Each criterion passes or fails. There is no partial
   credit and no numeric score per criterion.
2. **Evidence required.** A FAIL without a specific `file:line` reference and
   a concrete fix is not a valid FAIL — go back and find the exact location.
3. **Honesty in both directions.** If the work genuinely has no issues on a
   given criterion, mark it PASS and move on. Do not manufacture problems to
   look thorough. "Nothing to fix here" is a legitimate, complete result.
4. **Independence gate.** When critiquing work produced earlier in the *same*
   conversation, the critique must be run by an independent subagent that is
   given only the artifact (code diff or plan document) and the codebase —
   never the original author's reasoning, plan rationale, or chat history.
   This avoids the reviewer being anchored by the implementer's own
   justification for its choices.
5. **Standards discovery first.** Before scoring anything, the critique agent
   must look for and load the project's documented standards:
   - `CLAUDE.md` / `AGENTS.md` at the repo root — conventions, required
     patterns, constraints. A violation of anything stated here causes the
     relevant criterion to FAIL automatically, regardless of how reasonable
     the code otherwise looks.
   - ADR (architecture decision record) files, searched in: `docs/adr/`,
     `docs/decisions/`, `adr/`, `decisions/`, `doc/architecture/decisions/`,
     and any `**/ADR-*.md`.
   - Existing utilities/helpers/patterns in the codebase that the new code
     might be duplicating instead of reusing.
   - Architectural boundaries already established in the codebase — barrel
     exports, API client modules, repository patterns, service layers. If
     five or more existing instances in the codebase do something one
     consistent way, treat that as the established pattern even if it is
     undocumented — deviating from it without justification is a FAIL.

---

## Code critique — 8 dimensions, ~20 criteria

Use this set when critiquing implemented code (a diff, a set of changed
files, or a full module).

| Dimension | Criteria |
|---|---|
| **Correctness** | `tests-pass`, `logic-correct`, `edge-cases` |
| **Security** | `no-secrets`, `input-validated`, `no-injection`, `auth-enforced` |
| **Quality** | `no-dead-code`, `no-placeholders`, `errors-handled`, `no-code-smell` |
| **Performance** | `no-n-plus-1`, `no-hot-path-on2` |
| **Consistency** | `types-match`, `naming-conventions`, `patterns-followed` |
| **Integration** | `imports-resolve`, `tests-exist`, `no-regressions` |
| **Architecture** | `boundaries-respected`, `no-hacky-shortcuts` |

Notes on the trickier criteria:
- `no-code-smell` includes unnecessary complexity, over-abstraction (a helper
  or wrapper that exists to wrap a single line), and code that could be
  replaced by an existing stdlib function or already-imported utility. This
  is where "why does this need to exist / can it be simpler" questions live.
- `no-n-plus-1` / `no-hot-path-on2` — flag queries executed inside loops,
  and quadratic-or-worse logic in any path that runs per-request or per-item
  at scale.
- `boundaries-respected` / `no-hacky-shortcuts` — catches architectural
  drift: bypassing an established API/service layer to hit a database
  directly, special-case conditionals instead of proper abstraction, or a
  band-aid fix that papers over a root cause instead of addressing it.
- `auth-enforced` — any endpoint, mutation, or data access path that should
  require authorization but doesn't is an automatic FAIL, not a judgment call.

## Plan critique — 10 dimensions, ~22 criteria

Use this set when critiquing a plan document (Step 3/4 output in `/feature`,
Step 4 output in `/change`) **before** it is presented to the user for
approval.

| Dimension | Criteria |
|---|---|
| **Completeness** | `requirements-covered`, `no-placeholders`, `edge-cases-addressed` |
| **Correctness** | `apis-verified`, `patterns-match-library-usage` |
| **Testability** | `specific-tests-per-step`, `e2e-verification-strategy` |
| **Security** | `secrets-managed`, `input-validated`, `auth-designed` |
| **Consistency** | `types-consistent`, `naming-follows-conventions` |
| **Simplicity** | `no-overengineering`, `no-reinventing-solved-problems` |
| **Dependencies** | `correct-task-ordering`, `all-deps-available` |
| **Resilience** | `rollback-plan-exists`, `performance-considered` |
| **Integration** | `import-paths-valid`, `follows-project-patterns` |
| **Architecture** | `boundaries-respected`, `no-hacky-shortcuts` |

Notes:
- `correct-task-ordering` — catches plans where a later step is a
  prerequisite for an earlier one (e.g. step 4 depends on something step 7
  produces).
- `no-reinventing-solved-problems` — flags hand-rolling something a
  battle-tested library already does well (e.g. writing custom password
  hashing instead of using an established library).
- `rollback-plan-exists` — for anything touching production data, config, or
  infra, the plan must say how to undo it if it goes wrong.

---

## Output format

```
DEVIL'S ADVOCATE CRITIQUE (Binary Eval)
═══════════════════════════════════════
Target: <short description of what's being critiqued>
Mode: code | plan

  <Dimension>:
    <criterion-slug> ...... PASS
    <criterion-slug> ...... FAIL — <what's wrong>, <file>:<line>.
                           Fix: <concrete, specific fix>

  ...

Result: <X>/<Y> PASS — <N> criteria need fixing

Failing criteria with fixes:
1. <criterion>: <fix summary> at <file>:<line>
2. ...

Verdict: READY TO SHIP | NOT READY   (code mode)
Verdict: APPROVED | NEEDS REVISION   (plan mode)
```

If every criterion passes, the verdict is stated plainly (`READY TO SHIP` /
`APPROVED`) with no invented caveats.

## Resolution rule

Every FAIL must be either:
- **Fixed** — the implementer applies the suggested fix (or an equivalent),
  then the critique agent re-checks only that criterion, or
- **Rebutted** — the implementer writes a one-line reason the current
  approach is correct as-is, which is included in the final summary for the
  user to see.

Silence is not a valid resolution. A FAIL cannot be left unaddressed.

The critique agent has no authority to change behavior itself — it only
flags. If a fix would alter observable behavior beyond what the approved
plan covers, it must be escalated to the user rather than applied silently.

## Logging

Each critique run should be logged (e.g. to `.devils-advocate/session.md` or
an equivalent project log) with: timestamp, git SHA at time of critique,
mode (code/plan), pass count, and fail count. This gives a lightweight audit
trail correlating critique results to specific commits over time. Full
critique output can be saved to individual log files for later reference
(e.g. `.devils-advocate/logs/<timestamp>.md`). Add the log directory to
`.gitignore` if it shouldn't be version-controlled.