# `/new-planet1000-puzzle` Slash Command

A Claude Code slash command that walks through new puzzle creation end-to-end, stopping for user input at every decision point. It is the interactive counterpart to the manual workflow described in `14_New_Puzzle_Creation_Workflow.md`.

---

## How to invoke

```
/project:new-planet1000-puzzle
```

Run this from any directory — the skill works from `/home/ram/projects/Planet1000/planet1000` internally.

---

## Why use it instead of the manual workflow?

The manual workflow (doc 14) is a reference. This command *drives* the workflow interactively:

- It reads the existing puzzle list and picks the next week automatically.
- It checks `data/schedule.json` for a planned observation before surfacing alternatives.
- It drafts the question, explanation, and manifest fields and shows them for approval before writing.
- It detects missing fact types and prompts for each one individually.
- It runs build and validation steps and shows the output before moving on.
- Nothing is written or committed without explicit confirmation.

---

## Phases

### Phase 1 — Determine target week

Runs `npm run puzzle -- status` and finds the highest existing week number. Increments by 1 to get the target week (e.g. `2026-W37`) and calculates the corresponding Monday publish date.

**Stops here.** User must confirm the week ID or supply a different one.

---

### Phase 2 — Pick observation

Reads two sources:

- `data/schedule.json` — checks if a planned observation exists for the target week.
- `data/generated/world-model.json` — builds a list of observations not yet referenced by any manifest in `data/puzzles/`.

Calculates `answer_value_1k` for each candidate using the 8.7B denominator:

```
answer_value_1k = Math.round(value / 8_700_000_000 * 1000)
```

**Stops here.** Presents the scheduled recommendation (if any) and up to 5 alternatives. User confirms or names a different `observation_id`. The `domain` is derived from the observation_id prefix (everything before the first `-`).

---

### Phase 3 — Draft the manifest

Proposes a question in the standard format: *"Out of every 1,000 people on Earth, how many…?"*

**Stops here.** User approves or rewrites the question.

Proposes a 2–3 sentence `answer_explanation` written as if the player just saw the answer for the first time.

**Stops here.** User approves or rewrites the explanation.

Proposes a `summary_id` slug (`summary_global_<topic>`).

**Stops here.** Shows the complete manifest JSON and asks for confirmation before writing to `data/puzzles/puzzle_<YYYY_wNN>.json`. Writes the file directly — does not run the interactive `puzzle new` script.

---

### Phase 4 — Canonical facts

Runs `npm run fact-hunt -- hunt <observation_id>` to count existing facts by type (relationship / temporal / scale).

For each type where count = 0, **stops** and explains what that type means:

| Type | What it means |
|------|---------------|
| **relationship** | Compares the figure to something familiar — narrows the estimate without revealing it. |
| **temporal** | Shows a trend over time — gives the player a sense of direction. |
| **scale** | A concrete country-level reference at a similar scale — helps calibrate the guess. |

Prompts for the fact text, source label, and year. **Stops after each response** to confirm the exact wording before appending to `data/canonical-facts/<domain>.csv`.

After all types are satisfied, runs `npm run fact-hunt -- status` and **stops** for confirmation.

---

### Phase 5 — Build and preview

Runs:

```bash
npm run build:puzzles
npm run puzzle -- show puzzle_<YYYY_wNN>
```

**Stops here.** Shows the full output. User checks that:
- The answer value looks right.
- No hint gives away the answer (Hint 2 is the most common culprit).

If edits are needed, the user specifies which fact type to change and provides new text. The skill updates the CSV, rebuilds, and re-shows. Repeats until approved.

---

### Phase 6 — Summary source material

Explains what the summary is: a post-game knowledge article shown after the player guesses. It can contain bar charts, tables, bullet lists, and sources.

**Stops here.** Asks the user to gather source material (screenshots, exported charts, `.txt` data, URLs) and place it in:

```
data/source/summary-input/<topic>/
```

Does not proceed until the user confirms the material is ready.

---

### Phase 7 — Generate and review summary

Runs:

```bash
npm run summary -- build <summary_id>
npm run summary -- validate <summary_id>
```

**Stops here.** Asks the user to open `data/summaries/<summary_id>.json` and review all sections. If edits are needed, guides the user to edit the JSON directly or re-run with different source material. Repeats until approved.

---

### Phase 8 — Rebuild and final checks

Confirms `summary_id` is set in the manifest, then runs all checks:

```bash
npm run build:puzzles
npm run summary -- status
npx tsc --noEmit
npm run puzzle -- status
```

**Stops here.** Shows all results. User must explicitly say they are ready to commit before the skill proceeds.

---

### Phase 9 — Commit and push

Stages the relevant files:

```
data/puzzles/puzzle_<YYYY_wNN>.json
data/generated/puzzles/puzzle_<YYYY_wNN>.json
data/summaries/<summary_id>.json
data/canonical-facts/<domain>.csv
lib/puzzle-loader.ts
```

Commits with `feat(puzzle): add <week_id> <observation_id>` and pushes.

**Stops here.** Confirms the push succeeded. Vercel picks up the push and deploys automatically.

---

## Files touched per puzzle

| File | Who writes it |
|------|---------------|
| `data/puzzles/puzzle_<YYYY_wNN>.json` | Skill writes directly (Phase 3) |
| `data/canonical-facts/<domain>.csv` | Skill appends rows (Phase 4) |
| `data/summaries/<summary_id>.json` | `summary build` command (Phase 7) |
| `data/generated/puzzles/<id>.json` | `build:puzzles` command (Phases 5, 8) |
| `lib/puzzle-loader.ts` | `build:puzzles` command (Phases 5, 8) |

---

## Key data sources the skill reads

| File | Purpose |
|------|---------|
| `data/schedule.json` | Planned observation per week — first suggestion in Phase 2 |
| `data/generated/world-model.json` | All observations with raw values; provides `answer_value_1k` |
| `data/puzzles/` | Existing manifests — used to detect which observations are already used |
| `data/canonical-facts/<domain>.csv` | Existing hints — determines which types still need to be written |

---

## World population denominator

As of August 2026 the build system uses **8.7 billion** as the world denominator:

```
answer_value_1k = Math.round(value / 8_700_000_000 * 1000)
```

This is set in `scripts/build-world-model.ts` and stored in `data/generated/world-model.json` as `world_population`. The skill uses this value from the world-model file — no hardcoding needed in the skill itself.

---

## Skill file location

```
.claude/commands/new-planet1000-puzzle.md
```

To modify behaviour (e.g. change stop points, add a phase), edit that file directly.
