# Puzzle Script (`puzzle`)

`scripts/puzzle.ts` is a creator tool for managing Planet1000 weekly puzzles.

It provides three commands: **status**, **show**, and **new**. Puzzles now follow a two-file model:

- **Slim manifest** — `data/puzzles/<id>.json` — the source of truth you edit: observation_id, question, answer_explanation, artifact_id.
- **Generated puzzle** — `data/generated/puzzles/<id>.json` — the full `WeeklyPuzzle` JSON built by `npm run build:puzzles`, imported by `lib/puzzle-loader.ts`.

---

## Quick reference

```bash
npm run puzzle -- status
npm run puzzle -- show puzzle_2026_w35
npm run puzzle -- show next 3
npm run puzzle -- new 2026-W36

npm run build:puzzles                    # generate full puzzle JSONs from manifests
npm run build:puzzles -- --allow-missing # warn instead of error on missing facts
```

---

## Commands

### `status`

Lists every puzzle manifest found in `data/puzzles/`, with its publish date, domain, observation_id, and resolved answer (from the generated file if available).

```
Planet1000 Weekly Puzzles
──────────────────────────────────────────────────────────────────────
1 puzzle on file

  2026-W35  2026-08-25  [housing]  obs: housing-homeless
    Q: Out of every 1,000 people on Earth, how many are homeless…
    A: 160 people  → artifact_global_homelessness
```

If a generated file doesn't exist yet, the answer column shows:

```
    A: (not built — run: npm run build:puzzles)
```

---

### `show <puzzle-id>`

Pretty-prints the resolved full puzzle (from `data/generated/puzzles/`). Requires `build:puzzles` to have been run first.

```bash
npm run puzzle -- show puzzle_2026_w35
```

Output:

```
── puzzle_2026_w35 ─────────────────────────────────────────
Week:       2026-W35   (publishes 2026-08-25)
Domain:     housing
Observation: housing-homeless

QUESTION
  Out of every 1,000 people on Earth, how many are homeless or living without adequate shelter?

ANSWER
  160 people out of 1,000
  Roughly 160 out of every 1,000 people worldwide live in inadequate housing...

HINT 1 — Relationship
  In some sub-Saharan African cities, more than 60% of urban residents live in informal settlements...

HINT 2 — Temporal
  Global homelessness has worsened since 2000...
  Source: IDMC / UN-Habitat

HINT 3 — Anchor
  In Nigeria alone, an estimated 40–50 million people live in substandard housing...

ARTIFACT
  artifact_global_homelessness  ✓
```

If the generated file doesn't exist, the facts section shows a prompt to run `build:puzzles`.

---

### `show next <n>`

Shows the next `n` puzzles counting from the current ISO week. Useful for verifying upcoming content without remembering puzzle IDs.

```bash
npm run puzzle -- show next 3
```

---

### `new <week-id>`

Scaffolds a new slim puzzle manifest for the given ISO week.

```bash
npm run puzzle -- new 2026-W36
```

The script:
1. Parses and validates the week ID
2. Computes the Monday publish date
3. Lists available observations from `world-model.json`
4. Prompts for domain, `observation_id`, and question
5. Writes a slim manifest to `data/puzzles/puzzle_2026_w36.json`
6. Prints next steps

**Week ID format:** `YYYY-WNN` — e.g. `2026-W36`, `2027-W01`.

After the script runs:
1. Fill in `answer_explanation` in the manifest
2. Author `relationship`, `temporal`, and `anchor` facts in `canonical-facts.csv` for the observation
3. Run `npm run build:puzzles` to generate the full puzzle JSON
4. Preview with `npm run puzzle -- show <id>`

---

## Slim manifest format

```json
{
  "id": "puzzle_2026_w35",
  "week_id": "2026-W35",
  "publish_date": "2026-08-25",
  "domain": "housing",
  "question": "Out of every 1,000 people on Earth, how many are homeless or living without adequate shelter?",
  "observation_id": "housing-homeless",
  "answer_explanation": "Roughly 160 out of every 1,000 people worldwide live in inadequate housing...",
  "artifact_id": "artifact_global_homelessness"
}
```

| Field | Description |
|-------|-------------|
| `observation_id` | References an observation in `world-model.json`; the build script looks up its `value` and `unit` |
| `answer_explanation` | Prose explanation shown after the game; should match the computed answer |
| `artifact_id` | References a `KnowledgeArtifact` in `data/artifacts/` |

The build script computes `answer_value_1k = Math.round(obs.value / world_population * 1000)` and selects facts from `canonical-facts.csv` (first `relationship`, `temporal`, and `anchor` row for the observation_id).

---

## `build:puzzles`

```bash
npm run build:puzzles
```

Reads slim manifests from `data/puzzles/` and writes full `WeeklyPuzzle` JSONs to `data/generated/puzzles/`. Errors if any of the three fact types is missing for the observation.

```bash
npm run build:puzzles -- --allow-missing
```

Warns instead of erroring for missing facts; writes a placeholder for any missing fact. Useful for previewing work-in-progress puzzles.

The generated files are committed to git (same pattern as `data/generated/world-model.json`) so Vercel can build without re-running the script.

**Update workflow:**

```
Edit canonical-facts.csv or observation value
  → npm run build:data        (if observation value changed)
  → npm run build:puzzles
  → commit both slim manifest and generated file
  → push → Vercel deploys
```

---

## Workflow: creating a new weekly puzzle

1. **Scaffold the manifest**
   ```bash
   npm run puzzle -- new 2026-W36
   # Fill answer_explanation in data/puzzles/puzzle_2026_w36.json
   ```

2. **Author facts in canonical-facts.csv**
   Add at minimum one `relationship`, one `temporal`, and one `anchor` row for the observation_id.
   ```bash
   npm run fact-hunt -- status   # verify no missing fact types
   ```

3. **Build and preview**
   ```bash
   npm run build:puzzles
   npm run puzzle -- show puzzle_2026_w36
   ```

4. **Create the knowledge artifact**
   ```bash
   npm run artifact -- new artifact_<topic>
   # Fill in data/artifacts/artifact_<topic>.json
   npm run artifact -- validate artifact_<topic>
   ```

5. **Set artifact_id** in the manifest to match the artifact you created.

6. **Rebuild and verify** (`build:puzzles` also rewrites `lib/puzzle-loader.ts` automatically)
   ```bash
   npm run build:puzzles
   npm run puzzle -- status
   npm run artifact -- status
   ```

---

## Files

| Path | Purpose |
|------|---------|
| `data/puzzles/<id>.json` | Slim manifest — source of truth, edit this |
| `data/generated/puzzles/<id>.json` | Full puzzle JSON — generated by `build:puzzles`, imported by app |
| `data/canonical-facts.csv` | Source of facts (text + source attribution) |
| `data/generated/world-model.json` | Source of observation values and units |
| `lib/puzzle-loader.ts` | Static index — regenerated automatically by `build:puzzles` |
| `scripts/build-puzzles.ts` | Build script |
| `scripts/artifact.ts` | Companion tool for knowledge artifact management |
| `docs/12_Artifact_Script.md` | Reference for the `artifact` script |
