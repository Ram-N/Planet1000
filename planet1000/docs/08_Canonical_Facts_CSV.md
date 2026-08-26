# Canonical Facts CSV — Source of Truth

**Implemented:** 2026-08-24

This document describes `data/canonical-facts.csv` — the durable source of truth for all Planet1000 facts — and the new `add --csv` and `rebuild` commands added to `fact-hunt`.

---

## The problem it solved

Before this change, `fact-hunt add` wrote facts only to `data/generated/world-model.json`. If that file was regenerated (e.g. by `npm run build:data`) or accidentally overwritten, all hand-authored facts were silently lost. There was no recovery path.

---

## canonical-facts.csv

**Location:** `data/canonical-facts.csv`

**Columns:** `observation_id,type,text,source,year`

| Column | Required | Notes |
|---|---|---|
| `observation_id` | yes | Must match an ID in world-model.json |
| `type` | yes | `relationship`, `temporal`, or `scale` |
| `text` | yes | The fact sentence |
| `source` | no | URL of primary source |
| `year` | no | Publication or data year |

Example:

```csv
observation_id,type,text,source,year
people-children,relationship,"Children under 15 make up a much larger share in Africa than Europe",,
people-children,temporal,"The global share of under-15s has fallen from 33% in 1990 to 26% today as birth rates decline",,
people-children,scale,"In Niger, more than half the population is under 15",https://worldbank.org/,2022
```

`source` and `year` are stored here even though `world-model.json`'s `Fact` interface only has `text` and `type`. They are preserved for provenance and future use.

---

## Workflow

### Normal authoring (unchanged)

```bash
# Interactive
npx tsx scripts/fact-hunt.ts add people-children

# One-shot
npx tsx scripts/fact-hunt.ts add people-children -t r -f "..." -s "https://..." -y 2023
```

Both modes now append to `canonical-facts.csv` in addition to writing `world-model.json`.

### Bulk add

```bash
npx tsx scripts/fact-hunt.ts add --csv scripts/input/my-batch.csv
# alias: -c
```

The bulk CSV uses the same columns as `canonical-facts.csv`. The command:

1. Parses the CSV and validates each row
2. Warns on and skips rows with unknown `observation_id`, invalid `type`, or empty `text`
3. Prints a grouped preview and the count of valid/skipped rows
4. Prompts `Add all? [Y/n]:` (default Y)
5. Writes all valid facts to `world-model.json` and appends to `canonical-facts.csv`
6. Prints a per-observation summary: `people-children: +3 (now 2R 1T 5A)`

### Recovery via rebuild

If `world-model.json` is ever overwritten or corrupted:

```bash
npx tsx scripts/fact-hunt.ts rebuild
```

This:

1. Reads `canonical-facts.csv`
2. Clears all facts from every observation in `world-model.json`
3. Repopulates from the CSV
4. Prints: `Rebuilt facts for 28 observations. 84 facts restored.`

---

## Bootstrap

`canonical-facts.csv` was bootstrapped on 2026-08-24 from the then-current `world-model.json` (84 facts across 28 observations). Source and year columns are blank for bootstrapped rows — they were not previously recorded.

---

## What is NOT changed

- `data/source/` and `build-world-model.ts` are untouched (legacy pipeline, separate decision)
- The `Fact` interface in `world-model.json` still only stores `{ text, type }`
- `npm run build:data` still regenerates `world-model.json` from `data/source/` CSVs and does **not** merge `canonical-facts.csv`. After running `build:data`, run `rebuild` to restore facts.
