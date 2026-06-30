---
name: feature
description: Branch, plan, implement, test, and validate a new feature end-to-end with user approval gated before implementation.
argument-hint: <feature description>
command: /feature
---

# /feature — End-to-End Feature Development Command

## Trigger

Invoked as: `/feature <explanation of the feature>`

The text after `/feature` is the **feature description**. Treat the entire
remaining input as a single free-text argument, e.g.:

```
/feature add CSV export to the invoices dashboard with date-range filtering
```

## Inputs

- `$ARGUMENTS` — full feature description text supplied by the user.

## Required repo conventions (verify, don't assume)

Before doing anything, confirm with a quick `git status` / `git branch` check:

- The base branch is named `develop`. If it does not exist, ask the user
  which base branch to branch from instead of guessing.
- The working tree is clean. If there are uncommitted changes, stop and ask
  the user whether to stash, commit, or abort before branching.

---

## Workflow

### Step 1 — Derive branch name

Generate a slug from the feature description:

- lowercase
- spaces/punctuation → hyphens
- strip stopwords/filler if it makes the slug unwieldy
- cap at ~50 characters, trimmed at a word boundary

Branch name format: `feature/<slug>`

Example: `add CSV export to the invoices dashboard with date-range filtering`
→ `feature/csv-export-invoices-date-range-filter`

If a branch with that name already exists locally or remotely, append `-2`,
`-3`, etc., and tell the user you did so.

### Step 2 — Create and checkout branch

```bash
git fetch origin develop
git checkout develop
git pull origin develop
git checkout -b feature/<slug>
```

Confirm to the user: branch created and checked out, base commit it was cut from.

### Step 3 — Plan the implementation

Before writing any code, produce a concise implementation plan covering:

1. **Scope summary** — restated understanding of the feature in 1–3 sentences.
2. **Affected areas** — files/modules/services likely to change (explore the
   codebase first; don't guess blind).
3. **Approach** — key design decisions, data model or API changes, edge cases,
   and any assumptions made due to ambiguity in the request.
4. **Test plan** — what kinds of tests will be added (unit/integration/e2e)
   and what they'll cover.
5. **Open questions** — anything that needs the user's input before proceeding.

Present this plan to the user and **stop**. Do not write implementation code yet.

### Step 4 — Wait for approval

This is a hard gate. Do not proceed to Step 5 until the user explicitly
approves the plan (e.g. "looks good", "approved", "go ahead") or provides
revisions. If revisions are given, update the plan and re-present it for
approval before continuing. Do not interpret silence or an unrelated message
as approval.

### Step 5 — Implement

Once approved:

- Implement the feature according to the approved plan.
- Keep commits scoped and descriptive (one logical change per commit is
  preferred over one giant commit, but don't over-fragment).
- Follow existing code style/conventions found in the repo rather than
  introducing new patterns.

### Step 6 — Write tests

- Add tests per the test plan from Step 3 (unit tests at minimum; integration
  tests if the feature crosses module/service boundaries).
- Tests must cover the happy path, at least one edge case, and any error
  handling introduced.

### Step 7 — Validation pipeline (via subagents)

Run the following four checks **in order**, each delegated to its own
subagent. A subagent is responsible not just for running its command but for
diagnosing and fixing any failures it finds, then re-running until its check
passes, before control returns to the orchestrator for the next step.

| Order | Subagent        | Command (adapt to repo's actual script) | Responsibility                                                              |
| ----- | --------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| 1     | lint-agent      | `lint` (e.g. `npm run lint`)            | Fix lint errors/warnings; re-run until clean                                |
| 2     | test-agent      | `test` (e.g. `npm test`)                | Fix failing tests or faulty implementation/test code; re-run until all pass |
| 3     | typecheck-agent | `typecheck` (e.g. `tsc --noEmit`)       | Fix type errors; re-run until clean                                         |
| 4     | format-agent    | `format` (e.g. `npm run format`)        | Apply formatting; re-run/verify until clean                                 |

Rules for each subagent:

- Detect the actual command from the repo's `package.json` scripts,
  `Makefile`, `pyproject.toml`, or equivalent — don't hardcode a stack.
- On failure, read the error output, locate the root cause, apply a fix,
  and re-run the same command. Repeat until it passes or until it becomes
  clear the failure requires a product/design decision — in that case, stop
  and surface the issue to the user rather than guessing.
- Do not move to the next subagent in the table until the current one's
  command passes cleanly.
- Each subagent reports back a short summary: what it ran, what it found,
  what it fixed (if anything).

### Step 8 — Completion

Once lint, test, typecheck, and format all pass cleanly:

- Summarize what was implemented, the branch name, files touched, and the
  validation results.
- Stop here. Do not auto-commit final formatting changes, push, or open a
  PR unless the user has asked for that as part of this workflow.

---

## Notes for the agent runtime

- This command assumes access to a shell/git tool and the ability to spawn
  or simulate subagents (sequential delegated steps with their own
  read/fix/re-run loop). If the runtime has no subagent concept, execute
  Step 7's table sequentially in the main agent context instead, preserving
  the same fix-and-retry behavior per command.
- If at any point the repo lacks one of the four commands (e.g. no
  typecheck script exists because the project isn't typed), skip that row
  and note it in the final summary rather than failing the whole flow.
- Never skip Step 4's approval gate, even if the feature description seems
  simple or unambiguous.
