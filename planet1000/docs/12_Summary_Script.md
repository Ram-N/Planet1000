# Knowledge Summary Script (`summary`)

`scripts/summary.ts` is a creator tool for managing Planet1000 Knowledge Summaries — the rich, reusable summary experiences shown to players after the final guess.

It provides four commands: **status**, **build**, **new**, and **validate**.

---

## Quick reference

```bash
npm run summary -- status
npm run summary -- build summary_global_doctors
npm run summary -- new summary_global_doctors
npm run summary -- validate
npm run summary -- validate summary_global_homelessness
```

---

## Commands

### `status`

Lists all summaries and all puzzles in one view. Shows which puzzle references which summary, flags broken links, and flags orphaned summaries.

```
Planet1000 Knowledge Summaries
──────────────────────────────────────────────────
Summaries: 2   Puzzles: 2

Summaries:
  ✓ summary_global_homelessness    2024  1×bar_chart, 1×table, 1×bullet_list, 1×sources
  ✓ summary_global_doctors         2025  1×bar_chart, 1×table, 1×sources

Puzzles:
  2026-W35   puzzle_2026_w35        → summary_global_homelessness
  2026-W36   puzzle_2026_w36        → summary_global_doctors
```

If a puzzle references a missing summary:

```
  2026-W36   puzzle_2026_w36        → summary_global_doctors  ✗ MISSING
```

If a summary is not referenced by any puzzle:

```
Orphaned summaries (not referenced by any puzzle):
  summary_co2_emissions
```

---

### `build <id> [--force]`

Reads source images and text files from `data/source/summary-input/<topic>/`, sends them to the Claude API, and writes a fully structured summary JSON to `data/summaries/<id>.json`.

```bash
npm run summary -- build summary_internet_access
```

The topic folder name is derived from the summary id by stripping the `summary_` prefix and replacing underscores with hyphens. The script also tries the underscored and full-id variants if the hyphenated folder is not found.

**Input folder:** `data/source/summary-input/<topic>/`
Supported files: PNG, JPG, WEBP, GIF images and `.txt` text files.

**Output:** `data/summaries/<id>.json`

Requires the `ANTHROPIC_API_KEY` environment variable.

Use `--force` to overwrite an existing summary file.

After the script runs, validate the output:
```bash
npm run summary -- validate summary_internet_access
```

---

### `new <id>`

Scaffolds a new summary JSON skeleton at `data/summaries/<id>.json`. Useful when you want to author the content manually rather than using `build`.

```bash
npm run summary -- new summary_global_doctors
```

The script asks for four basics (title, description, domain, data year), then writes a skeleton JSON file containing one section of each supported type as a starting point.

**Output path:** `data/summaries/<id>.json`

After the script runs:

1. Open the file and fill in each section's content
2. Delete section types you don't need
3. Add more sections of any type if needed
4. Run `validate` to confirm the structure is correct
5. Reference the summary from a puzzle via `summary_id`

**ID format:** lowercase letters, digits, and underscores only — e.g. `summary_global_doctors`, `summary_co2_emissions`.

---

### `validate [id]`

Validates summary JSON structure. If `id` is omitted, all summaries are validated.

```bash
# Validate all
npm run summary -- validate

# Validate one
npm run summary -- validate summary_global_homelessness
```

**Exits with code 1 if any errors are found.** Warnings are shown but do not cause a non-zero exit.

#### Errors (block the summary from working correctly)

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
| `sections is empty` | Summary has no content sections |
| Missing headings, labels | Visual fields that will render as blank |
| Row/column count mismatch | Table rows have wrong number of cells |
| Missing source descriptions | Source entries missing description text |

---

## Summary JSON structure

```json
{
  "id": "summary_global_doctors",
  "title": "Global Doctors",
  "description": "How physician density varies across the world.",
  "domain": "healthcare",
  "data_year": 2025,
  "updated_at": "2026-08-25",
  "sections": [ ... ],
  "related_summary_ids": ["summary_global_homelessness"]
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

## The `related_summary_ids` field

Link to other summaries that provide useful context:

```json
"related_summary_ids": ["summary_global_population", "summary_healthcare_spending"]
```

These IDs appear as "Related" links in the post-game summary UI. Use `status` to verify referenced IDs actually exist.

---

## Workflow: adding a knowledge summary

### Option A — AI-assisted (recommended)

1. Create a folder `data/source/summary-input/<topic>/`
2. Drop in PNG/JPG screenshots of charts, tables, infographics, or paste `.txt` files with data
3. Run the build command:
   ```bash
   npm run summary -- build summary_<topic>
   ```
4. Validate and tweak:
   ```bash
   npm run summary -- validate summary_<topic>
   ```

### Option B — Manual skeleton

```bash
npm run summary -- new summary_<topic>
# Fill in data/summaries/summary_<topic>.json
npm run summary -- validate summary_<topic>
```

---

## Files

| Path | Purpose |
|------|---------|
| `data/summaries/<id>.json` | Summary content (created by `build` or `new`) |
| `data/source/summary-input/<topic>/` | Source images/text for `build` command |
| `data/puzzles/<id>.json` | Weekly puzzles (reference summary via `summary_id`) |
| `lib/puzzle-loader.ts` | Static index — regenerated automatically by `build:puzzles` |
| `components/SummaryArtifact.tsx` | Renders summaries in the post-game UI |
| `types/puzzle.ts` | TypeScript types for `KnowledgeSummary` and `SummarySection` |
