# Knowledge Artifact Script (`artifact`)

`scripts/artifact.ts` is a creator tool for managing Planet1000 Knowledge Artifacts — the rich, reusable summary experiences shown to players after the final guess.

It provides three commands: **status**, **new**, and **validate**. It does not write artifact content (sections are creative, bespoke work), but it handles the structural boilerplate and keeps the artifact/puzzle relationship visible.

---

## Quick reference

```bash
npx tsx scripts/artifact.ts status
npx tsx scripts/artifact.ts new artifact_global_doctors
npx tsx scripts/artifact.ts validate
npx tsx scripts/artifact.ts validate artifact_global_homelessness
```

---

## Commands

### `status`

Lists all artifacts and all puzzles in one view. Shows which puzzle references which artifact, flags broken links, and flags orphaned artifacts.

```
Planet1000 Knowledge Artifacts
──────────────────────────────────────────────────
Artifacts: 2   Puzzles: 2

Artifacts:
  ✓ artifact_global_homelessness    2024  1×bar_chart, 1×table, 1×bullet_list, 1×sources
  ✓ artifact_global_doctors         2025  1×bar_chart, 1×table, 1×sources

Puzzles:
  2026-W35   puzzle_2026_w35        → artifact_global_homelessness
  2026-W36   puzzle_2026_w36        → artifact_global_doctors
```

If a puzzle references a missing artifact:

```
  2026-W36   puzzle_2026_w36        → artifact_global_doctors  ✗ MISSING
```

If an artifact is not referenced by any puzzle:

```
Orphaned artifacts (not referenced by any puzzle):
  artifact_co2_emissions
```

---

### `new <id>`

Scaffolds a new artifact JSON file at `data/artifacts/<id>.json`.

```bash
npx tsx scripts/artifact.ts new artifact_global_doctors
```

The script asks for four basics (title, description, domain, data year), then writes a skeleton JSON file containing one section of each supported type as a starting point.

**Output path:** `data/artifacts/<id>.json`

After the script runs:

1. Open the file and fill in each section's content
2. Delete section types you don't need
3. Add more sections of any type if needed
4. Run `validate` to confirm the structure is correct
5. Reference the artifact from a puzzle via `artifact_id`

**ID format:** lowercase letters, digits, and underscores only — e.g. `artifact_global_doctors`, `artifact_co2_emissions`.

---

### `validate [id]`

Validates artifact JSON structure. If `id` is omitted, all artifacts are validated.

```bash
# Validate all
npx tsx scripts/artifact.ts validate

# Validate one
npx tsx scripts/artifact.ts validate artifact_global_homelessness
```

**Exits with code 1 if any errors are found.** Warnings are shown but do not cause a non-zero exit.

#### Errors (block the artifact from working correctly)

| Error | Cause |
|-------|-------|
| `missing: id` | Top-level `id` field is absent |
| `missing: title` | Top-level `title` field is absent or empty |
| `missing: domain` | Top-level `domain` field is absent or empty |
| `missing: data_year` | Top-level `data_year` field is absent |
| `id does not match filename` | The `id` field must equal the filename (without `.json`) |
| `sections must be an array` | `sections` is not an array |
| `unknown type "…"` | Section `type` is not one of the five valid values |
| Per-section field errors | See section types below |

#### Warnings (informational, do not cause exit 1)

| Warning | Cause |
|---------|-------|
| `empty: description` | Description is missing (shown in UI) |
| `empty: updated_at` | `updated_at` date is missing |
| `sections is empty` | Artifact has no content sections |
| Missing headings, labels | Visual fields that will render as blank |
| Row/column count mismatch | Table rows have wrong number of cells |
| Missing source descriptions | Source entries missing description text |

---

## Artifact JSON structure

```json
{
  "id": "artifact_global_doctors",
  "title": "Global Doctors",
  "description": "How physician density varies across the world.",
  "domain": "healthcare",
  "data_year": 2025,
  "updated_at": "2026-08-25",
  "sections": [ ... ],
  "related_artifact_ids": ["artifact_global_homelessness"]
}
```

### Section types

All five section types can appear any number of times and in any order.

#### `bar_chart`

```json
{
  "type": "bar_chart",
  "heading": "Doctors per 1,000 People by Region",
  "caption": "Calculated from WHO physician density data.",
  "x_label": "Physicians per 1,000 population",
  "bars": [
    { "label": "Europe",        "value": 3.8 },
    { "label": "North America", "value": 2.6 },
    { "label": "South America", "value": 1.1 },
    { "label": "Asia",          "value": 0.9 },
    { "label": "Africa",        "value": 0.2 }
  ]
}
```

Required: `bars` (non-empty array, each entry has `label` string and `value` number), `x_label`.

#### `table`

```json
{
  "type": "table",
  "heading": "Regional Breakdown",
  "columns": ["Region", "Physicians (M)", "Per 1,000", "Key shortage driver"],
  "rows": [
    { "cells": ["Africa", "0.26M", "0.2", "Training capacity and migration"] },
    { "cells": ["Asia",   "3.8M",  "0.9", "Uneven distribution within countries"] }
  ]
}
```

Required: `columns` (non-empty array), `rows` (array of objects with `cells` arrays). Each `cells` array must have the same length as `columns`.

#### `bullet_list`

```json
{
  "type": "bullet_list",
  "heading": "At a Glance: The Global Village of 1,000 People",
  "items": [
    { "icon": "🌍", "label": "Africa",        "value": "0.2 doctors", "note": "per 1,000 people — the lowest of any region." },
    { "icon": "🌏", "label": "Asia",           "value": "0.9 doctors", "note": "per 1,000 people, highly uneven across countries." }
  ]
}
```

Required: `heading`, `items` (non-empty array). Each item needs at least `label` and `value`. `icon` and `note` are optional.

#### `sources`

```json
{
  "type": "sources",
  "heading": "Key Data Sources",
  "sources": [
    {
      "title": "WHO Global Health Observatory",
      "description": "Primary source for physician density by country and region.",
      "url": "https://www.who.int/data/gho"
    }
  ]
}
```

Required: `heading`, `sources` (non-empty array). Each source needs `title`. `description` and `url` are strongly recommended.

#### `text`

```json
{
  "type": "text",
  "heading": "Why the gap is so large",
  "body": "Medical training takes 8–12 years and requires expensive facilities..."
}
```

Required: `body`. `heading` is optional.

---

## The `related_artifact_ids` field

Link to other artifacts that provide useful context:

```json
"related_artifact_ids": ["artifact_global_population", "artifact_healthcare_spending"]
```

These IDs appear as "Related" links in the post-game summary UI. Use `status` to verify referenced IDs actually exist.

---

## Workflow: adding a new weekly puzzle

1. **Create the artifact**
   ```bash
   npx tsx scripts/artifact.ts new artifact_global_doctors
   # Fill in data/artifacts/artifact_global_doctors.json
   npx tsx scripts/artifact.ts validate artifact_global_doctors
   ```

2. **Create the puzzle**
   ```bash
   npm run puzzle -- new 2026-W36
   # Fill in data/puzzles/puzzle_2026_w36.json and set artifact_id
   npm run puzzle -- show puzzle_2026_w36
   ```
   See `docs/13_Puzzle_Script.md` for the full puzzle authoring reference.

3. **Register both in `lib/puzzle-loader.ts`**
   ```ts
   import puzzle_2026_w36             from '@/data/puzzles/puzzle_2026_w36.json';
   import artifact_global_doctors     from '@/data/artifacts/artifact_global_doctors.json';
   ```

4. **Verify the link**
   ```bash
   npx tsx scripts/artifact.ts status
   ```

5. **Add facts to any observation this puzzle uses**
   ```bash
   npx tsx scripts/fact-hunt.ts status
   npx tsx scripts/fact-hunt.ts hunt <observation-id>
   ```

---

## Files

| Path | Purpose |
|------|---------|
| `data/artifacts/<id>.json` | Artifact content (created by `new`, edited manually) |
| `data/puzzles/<id>.json` | Weekly puzzles (created manually, reference `artifact_id`) |
| `lib/puzzle-loader.ts` | Static index — import new artifacts and puzzles here |
| `components/SummaryArtifact.tsx` | Renders artifacts in the post-game UI |
| `types/puzzle.ts` | TypeScript types for `KnowledgeArtifact` and `SummarySection` |
