---
name: change
description: Apply scoped changes (bug fixes, refactoring, UI tweaks, config/infra updates) to an existing branch — with image support, user-selected branch, a plan approval gate, and optional commit at the end.
argument-hint: <brief description of the change> [--image <path>]
---

# /change — Scoped Change Command

## Trigger
Invoked as: `/change <description of the change>`

Optionally, one or more images (screenshots, mockups, annotated diffs, error
screenshots) may be attached alongside the invocation. The agent must read
and incorporate any attached images into its understanding of the change
before producing the plan.

The text after `/change` is the **change description**. Treat the entire
remaining input as a single free-text argument.

Examples:
```
/change fix the invoice total rounding bug on the checkout page
/change refactor the auth middleware to remove duplicate token validation logic
/change update the sidebar nav to match the new brand colours  [+ screenshot attached]
/change bump the Docling CPU timeout in the Azure App Service config from 30s to 90s
```

## Inputs
- `$ARGUMENTS` — full change description text supplied by the user.
- `$IMAGES` (optional) — one or more attached images. Accepted contexts:
  - Bug fix: error screenshot, browser console output, failing test output.
  - UI tweak: design mockup, annotated screenshot, before/after comparison.
  - Refactor: diagram of target structure or architecture note.
  - Config/infra: annotated config snippet or environment diagram.

---

## Workflow

### Step 1 — Verify working tree
Run `git status` and confirm:
- The working tree is clean. If there are uncommitted changes, stop and ask
  the user whether to stash them, commit them, or abort before continuing.
- If the tree is clean, confirm and proceed.

### Step 2 — Ask user which branch to work on
Do **not** create a branch. Instead, ask:

> "Which branch should I work on? (e.g. `develop`, `main`, a feature branch
> you're already on, etc.)"

Wait for the user's reply. Then:
```bash
git fetch origin
git checkout <user-specified-branch>
git pull origin <user-specified-branch>
```
Confirm to the user: now on `<branch>`, up to date with remote.

If the branch does not exist locally or remotely, tell the user and ask them
to confirm the name before trying again.

### Step 3 — Analyse the change
Before producing a plan, actively explore the codebase:
- Locate the files, modules, components, or config entries relevant to the
  described change.
- If images were attached, extract all context from them first:
  - Bug screenshot → identify the UI element, error message, stack trace, or
    network response shown.
  - Mockup / UI screenshot → note exact colours, layout shifts, spacing,
    typography, component names visible.
  - Annotated screenshot → treat annotations as hard requirements.
  - Config snippet → map the shown keys/values to their location in the repo.
- Cross-reference image context with the codebase before writing the plan.

### Step 4 — Produce the change plan
Present a concise plan covering:

1. **Change summary** — one-paragraph restatement of what will be changed and
   why, incorporating any image context.
2. **Change type** — one or more of: Bug Fix · Refactor · UI Tweak ·
   Config/Infra. Note it explicitly so the scope is unambiguous.
3. **Affected files** — list every file expected to change with a one-line
   reason per file. Do not list files that will be read but not modified.
4. **Approach** — step-by-step description of what changes will be made.
   For each change type, also cover:
   - *Bug fix*: root cause identified, fix strategy, regression risk.
   - *Refactor*: what is being simplified/removed/restructured and why the
     external behaviour is preserved.
   - *UI tweak*: exact visual deltas (colour values, spacing units, component
     props) derived from attached images or description.
   - *Config/infra*: which config files/env vars/deployment manifests are
     touched and the impact on running environments.
5. **Test impact** — will existing tests need updating? Will new tests be
   added? If no test changes are needed, explain why.
6. **Open questions** — anything ambiguous in the description or images that
   needs clarification before work starts.

Do not present this plan to the user yet — first run the critique in Step 5.

### Step 5 — Plan critique (devil's advocate)
Before the plan reaches the user, run a **plan critique** against the
criteria in `critique-criteria.md` (plan mode: 10 dimensions, ~22 criteria —
Completeness, Correctness, Testability, Security, Consistency, Simplicity,
Dependencies, Resilience, Integration, Architecture).

- Load project standards first (`CLAUDE.md`/`AGENTS.md`, ADR files, existing
  patterns) as described in `critique-criteria.md`.
- Dispatch to an **independent subagent** per the independence gate — it
  receives only the plan document and codebase, not the planning agent's
  reasoning for its choices. This matters especially for `no-overengineering`
  and `no-reinventing-solved-problems`, which are easy to rationalize as the
  original author but easier to catch from the outside.
- Every FAIL needs a specific reference (file/section) and a concrete fix.
- Resolve every FAIL per the resolution rule (fixed or rebutted, never
  silent), then re-check only the previously-failing criteria.
- Attach the critique verdict and any resolved/rebutted flags to the plan
  when presenting it to the user.

### Step 6 — Present plan and wait for approval (hard gate)
Present the plan together with the plan critique's verdict. Do not proceed
to Step 7 until the user explicitly approves the plan (e.g. "approved", "go
ahead", "lgtm") or provides revisions.

- If revisions are given → update the plan, re-run the critique on the
  changed sections, and re-present for approval.
- If the user asks a question → answer it, then re-present the updated plan.
- Do not interpret silence or an unrelated message as approval.
- Never skip or soft-skip this gate regardless of how simple the change seems.

### Step 7 — Implement the change
Once approved, apply the changes per the approved plan:
- Modify only the files listed in the plan. If an unplanned file needs
  changing, pause and flag it to the user rather than silently changing it.
- Follow existing code style, naming conventions, and patterns in the repo.
- For UI tweaks: use exact values from images (colours, spacing, etc.) rather
  than approximations.
- For config/infra changes: do not change environment-specific values
  (production secrets, connection strings) inline — comment with a `TODO: set
  in environment` note instead.

### Step 8 — Update or add tests (if applicable)
Per the test impact noted in the plan:
- Update any existing tests broken by the change.
- Add new tests if the plan called for them.
- If no test changes were planned, skip this step and note it in the summary.

### Step 9 — Code critique (devil's advocate)
Before running any tooling, run a **code critique** against the criteria in
`critique-criteria.md` (code mode: 8 dimensions, ~20 criteria — Correctness,
Security, Quality, Performance, Consistency, Integration, Architecture)
covering every file touched in Steps 7–8.

- Dispatch to an **independent subagent** per the independence gate — it
  reviews the diff and codebase only, never the implementer's own reasoning
  or justification for its choices. This matters most for `no-code-smell`
  and `boundaries-respected` / `no-hacky-shortcuts`, which are easy to
  wave away as the original author but obvious from the outside.
- Every FAIL needs `file:line` evidence and a concrete `Fix:` suggestion —
  no hand-waving.
- Pay particular attention, given this command's change types, to:
  - *Bug fix* → `edge-cases`, `no-regressions` (did the fix introduce a new
    bug while closing the old one?).
  - *Refactor* → `no-hacky-shortcuts`, `boundaries-respected` (did the
    refactor preserve behavior and respect existing architecture, or did it
    quietly change something while "just cleaning up"?).
  - *UI tweak* → `no-code-smell`, `patterns-followed` (are new styles
    hardcoded values instead of using existing design tokens/theme?).
  - *Config/infra* → `no-secrets`, `input-validated` (no credentials or
    environment-specific values committed inline).
- Resolve every FAIL per the resolution rule in `critique-criteria.md`
  (fixed or rebutted, never silent). Re-check only the previously-failing
  criteria after fixes are applied.
- The critique agent cannot change behavior itself — a fix that would alter
  observable behavior beyond the approved plan gets escalated to the user
  rather than applied silently.
- Log the run (timestamp, git SHA, pass/fail counts) per the logging
  convention in `critique-criteria.md`, if the repo has a place for it.
- Only proceed to Step 10 once the verdict is `READY TO SHIP`.

### Step 10 — Validation pipeline (via subagents)
Run the following four checks **in order**, each delegated to its own
subagent. Each subagent owns a fix-and-retry loop: it runs its command,
diagnoses any failure, applies a fix, and re-runs until the command passes
cleanly — before handing off to the next subagent.

| Order | Subagent           | Command                     | Responsibility |
|-------|--------------------|-----------------------------|----------------|
| 1     | lint-agent         | `lint` (e.g. `npm run lint`) | Fix lint errors/warnings; re-run until clean |
| 2     | test-agent         | `test` (e.g. `npm test`)     | Fix failing tests; re-run until all pass |
| 3     | typecheck-agent    | `typecheck` (e.g. `tsc --noEmit`) | Fix type errors; re-run until clean |
| 4     | format-agent       | `format` (e.g. `npm run format`) | Apply formatting; verify until clean |

Rules for each subagent:
- Detect the actual command from `package.json` scripts, `Makefile`,
  `pyproject.toml`, or equivalent — do not hardcode a stack.
- On failure: read error output → locate root cause → apply targeted fix →
  re-run. Repeat until clean or until the failure requires a product/design
  decision, in which case surface it to the user rather than guessing.
- Do not advance to the next subagent until the current command passes.
- If a command does not exist in this repo (e.g. no typecheck script because
  the project is untyped), skip that row and note it in the final summary.
- Each subagent reports back: command run, exit code, what was fixed (if
  anything).

### Step 11 — Completion & commit prompt
Once all applicable validation steps pass:

1. Print a summary:
   - Branch worked on.
   - Change type(s) applied.
   - Files modified (with a one-liner per file on what changed).
   - Plan critique verdict (Step 5) and code critique verdict (Step 9), with
     any resolved/rebutted flags from either.
   - Validation results (pass / skipped, and any fixes applied by subagents).

2. Ask the user:
   > "All checks passed. Would you like me to commit these changes? If yes,
   > I'll generate a commit message — or provide your own."

   - If yes with a user-provided message → `git add -A && git commit -m "<their message>"`.
   - If yes with a generated message → derive a conventional-commit-style
     message from the change type and description, show it to the user for
     confirmation, then commit.
   - If no → leave the changes unstaged/staged as-is and end.

---

## Notes for the agent runtime
- Steps 5 and 9 (plan critique, code critique) reference `critique-criteria.md`
  for the actual criteria, scoring rules, and reporting format — keep that
  file alongside this one.
- The critique passes in Steps 5 and 9 are self-critique, not user-facing
  gates — they run entirely within the agent loop. The user sees the verdict
  and any resolved/rebutted flags in the plan presentation (Step 6) and the
  final summary (Step 11); they are not asked to separately approve the
  critique itself.
- Neither critique pass may change behavior — only flag quality/risk issues.
  Any suggestion that would alter observable output must be escalated to the
  user rather than applied silently.
- This command assumes access to a shell/git tool and the ability to spawn or
  simulate independent subagents for Steps 5, 9, and 10. If the runtime has
  no subagent concept, run the critique in the main agent context but
  explicitly re-read the artifact fresh, without relying on prior reasoning
  in context, to approximate the independence gate; execute Step 10's table
  sequentially in the main agent context, preserving the same fix-and-retry
  behavior per command.
- Never create a branch. Branch selection is always delegated to the user in
  Step 2.
- Images attached at invocation must be processed in Step 3 before the plan
  is written. If the runtime does not support image input, tell the user at
  invocation time and ask them to describe the image content in text instead.
- The hard gate in Step 6 applies to all change types — including single-line
  config changes. The plan review is not optional.