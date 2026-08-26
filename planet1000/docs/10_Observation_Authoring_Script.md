# Observation Authoring Script (`obs-add`)

`scripts/obs-add.ts` is an interactive command-line tool for adding a new observation to the Planet1000 dataset. It replaces manual CSV editing and enforces all data constraints before writing.

---

## When to use it

Use `obs-add` whenever you want to add a new question to the game — i.e. a new row in `data/source/observations.csv`. It can also create the entity and/or source record inline if they don't already exist.

---

## Two modes

### Interactive (default)

Run with no flags. The script walks you through each field with numbered menus and validation feedback. Press Enter to accept defaults where offered.

```bash
npx tsx scripts/obs-add.ts
```

### One-shot

Supply all required flags on the command line. A single preview + confirmation prompt is shown before writing.

```bash
# Existing entity
npx tsx scripts/obs-add.ts \
  --id healthcare-dentists \
  --entity doctors \
  --metric population-count \
  --value 2000000 \
  --unit people \
  --source who \
  --confidence low \
  --notes "About 2 million dentists work globally."

# New entity (requires --entity-name, --entity-domain, --entity-desc)
npx tsx scripts/obs-add.ts \
  --id people-midwives \
  --entity midwives \
  --entity-name "Midwives" \
  --entity-domain healthcare \
  --entity-desc "Qualified midwives worldwide" \
  --metric population-count \
  --value 900000 \
  --unit people \
  --source who \
  --confidence medium \
  --notes "About 900,000 qualified midwives work globally."
```

If any required flag is missing, the script reports what's missing and exits. It does **not** fall back to interactive mode when partial flags are given — this prevents accidental half-interactive sessions.

---

## All flags

| Flag | Required | Description |
|------|----------|-------------|
| `--id` | yes | Observation ID (e.g. `people-midwives`). Must be unique, lowercase, hyphens only. |
| `--entity` | yes | Entity ID. If it exists in `entities.csv`, it is used as-is. If not, `--entity-name` must be provided. |
| `--entity-name` | if new entity | Human-readable entity name |
| `--entity-domain` | if new entity | One of: `people`, `healthcare`, `education`, `food`, `water`, `energy`, `housing`, `transportation`, `money`, `environment` |
| `--entity-desc` | if new entity | Short description of the entity |
| `--metric` | yes | Metric ID (must exist in `metrics.csv`) |
| `--value` | yes | Raw numeric value (commas allowed, e.g. `1,200,000`) |
| `--unit` | yes | Unit ID (must exist in `units.csv`) |
| `--source` | yes | Source ID. If it exists in `sources.csv`, it is used. If not, `--source-url` and `--source-title` must be provided. |
| `--source-url` | if new source | URL for new source |
| `--source-title` | if new source | Title for new source (dates auto-filled to today) |
| `--confidence` | yes | `high`, `medium`, or `low` |
| `--notes` | yes | Text shown to players in the game UI |
| `--pop` | no | Population group: `all` / `adults` / `children` (default: `all`) |
| `--year` | no | Time period: `2023` / `2022` (default: `2023`) |

---

## Validations

All validations run before any file is written:

1. `id` matches `/^[a-z0-9-]+$/`
2. `id` is unique in `observations.csv`
3. `entity_id` exists in `entities.csv`, or a new entity is being created inline
4. New entity ID is unique and valid
5. Composite key `(entity_id, metric_id, geography_id, time_period_id, population_group_id)` is unique
6. `metric_id` exists in `metrics.csv`
7. `unit_id` exists in `units.csv`
8. `source_id` exists in `sources.csv`, or a new source is being created inline
9. New source ID is unique
10. `confidence` is `high`, `medium`, or `low`
11. `value` is a finite positive number
12. `notes` is non-empty

---

## Write order

When confirmed, the script writes in this order to avoid foreign-key violations:

1. If a new source was created → appended to `data/source/sources.csv`
2. If a new entity was created → appended to `data/source/entities.csv`
3. New observation → appended to `data/source/observations.csv`

Nothing is written until you confirm at the preview step. Aborting at that point leaves all files unchanged.

---

## After writing

The script prompts whether to run `npm run build:data`, which regenerates `data/generated/world-model.json` from the source CSVs. Answer Y (the default) to apply the new observation immediately.

You can also run the build manually at any time:

```bash
cd planet1000
npm run build:data
```

---

## Verifying the result

```bash
# Check the new row in observations.csv
tail -1 data/source/observations.csv

# Confirm the observation appears in the fact-hunt status view
npx tsx scripts/fact-hunt.ts status
```

The new observation will appear with `R:0 A:0` — no facts yet. Use `fact-hunt` to add relationship and scale facts to it.

---

## Geography

All observations are currently scoped to `world` (the only value in `geographies.csv`). The script sets this automatically.
