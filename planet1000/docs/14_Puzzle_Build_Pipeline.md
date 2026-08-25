# Puzzle Build Pipeline

How the puzzle-to-observation integration works, and how to use it going forward.

---

## What was built

Puzzles used to be fully hand-authored JSON files. Every fact, the answer value, and source attribution were typed by hand into `data/puzzles/*.json`. This meant edits to `canonical-facts.csv` or `world-model.json` had no effect on the game — the puzzle files were isolated.

The build pipeline connects them:

```
data/puzzles/*.json          ← slim manifest (you edit this)
    +
canonical-facts.csv          ← facts with source attribution
    +
data/generated/world-model.json  ← observation values and units
        │
        ▼  npm run build:puzzles
data/generated/puzzles/*.json    ← full puzzle (imported by the app)
        │
        ▼
lib/puzzle-loader.ts  →  game page
```

---

## Two-file model

Every puzzle now has two files:

| File | Who writes it | What it contains |
|------|--------------|------------------|
| `data/puzzles/<id>.json` | You | `observation_id`, `question`, `answer_explanation`, `artifact_id` |
| `data/generated/puzzles/<id>.json` | `build:puzzles` | Full `WeeklyPuzzle`: computed answer, resolved facts with source info |

Only edit the slim manifest. The generated file is produced by the build script and committed to git so Vercel can deploy without re-running the script.

---

## Answer computation

```
answer_value_1k = Math.round(obs.value / world_population * 1000)
answer_unit     = obs.unit.symbol
```

Both values come from `world-model.json`. If the source observation value changes, run `npm run build:data` then `npm run build:puzzles` and commit both generated files.

---

## Fact selection

The build script reads `canonical-facts.csv` and picks the **first row of each type** for the puzzle's `observation_id`:

| Fact slot | CSV type | Hint shown after |
|-----------|----------|-----------------|
| `relationship_fact` | `relationship` | Guess 1 |
| `temporal_fact` | `temporal` | Guess 2 |
| `anchor_fact` | `anchor` | Guess 3 |

To change which fact appears for a puzzle, reorder the rows in `canonical-facts.csv` or add a better fact above the existing one.

Source attribution (`source_label`, `source_url`) is parsed from the CSV's `source` column. A URL in the source field is extracted automatically.

---

## New files and changes

| Path | Change |
|------|--------|
| `scripts/build-puzzles.ts` | New build script |
| `data/puzzles/*.json` | Now slim manifests (no facts, no answer fields) |
| `data/generated/puzzles/*.json` | New output directory — commit these |
| `types/puzzle.ts` | Added `PuzzleSource` interface for slim manifests |
| `lib/puzzle-loader.ts` | Imports from `data/generated/puzzles/` |
| `package.json` | Added `build:puzzles` script |
| `scripts/puzzle.ts` | `new` prompts for `observation_id`; `show`/`status` read generated files |
| `docs/13_Puzzle_Script.md` | Updated to reflect new workflow |

---

## Day-to-day workflows

### Fix a fact or source

1. Edit `canonical-facts.csv`
2. `npm run build:puzzles`
3. Commit `canonical-facts.csv` + `data/generated/puzzles/<id>.json`

### Fix an observation value

1. Edit `data/source/observations.csv`
2. `npm run build:data`
3. `npm run build:puzzles`
4. Commit `data/source/observations.csv` + both generated files

### Create a new puzzle

```bash
npm run puzzle -- new 2026-W36
```

Then:

1. Fill `answer_explanation` in `data/puzzles/puzzle_2026_w36.json`
2. Add `relationship`, `temporal`, and `anchor` facts to `canonical-facts.csv` for the observation
3. `npm run fact-hunt -- status` — verify no missing fact types
4. `npm run build:puzzles`
5. `npm run puzzle -- show puzzle_2026_w36` — preview resolved puzzle
6. Create the artifact: `npm run artifact -- new artifact_<topic>`
7. Set `artifact_id` in the manifest
8. Register both in `lib/puzzle-loader.ts`:
   ```ts
   import puzzle_2026_w36  from '@/data/generated/puzzles/puzzle_2026_w36.json';
   import artifact_<topic> from '@/data/artifacts/artifact_<topic>.json';
   ```
9. `npm run build:puzzles` — rebuild after artifact_id is finalised
10. Commit everything and push

### Preview a work-in-progress puzzle (missing facts)

```bash
npm run build:puzzles -- --allow-missing
npm run puzzle -- show <id>
```

---

## Key commands

```bash
npm run build:data              # rebuild world-model.json from CSV sources
npm run build:puzzles           # rebuild generated puzzle JSONs from manifests
npm run build:puzzles -- --allow-missing  # warn on missing facts instead of erroring

npm run puzzle -- status        # list all manifests + build status
npm run puzzle -- show <id>     # show resolved puzzle (requires build:puzzles)
npm run puzzle -- new <week-id> # scaffold a new manifest

npm run fact-hunt -- status     # check which observations are missing fact types
```
