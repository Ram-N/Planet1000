# Terminology: Domains, Entities, Observations, Facts

This document clarifies the core data model terminology and explains where
`observation_id`s come from and how to add new observations.

---

## The three layers

### Domain

A simple string category on an entity. Current values in `entities.csv`:

`people` · `healthcare` · `education` · `food` · `water` · `energy` ·
`housing` · `transportation` · `money` · `environment`

It is purely organisational — used for grouping in `fact-hunt status` output.
There is no separate domains table; the domain lives on each entity row.

---

### Entity

Defined in `data/source/entities.csv`. The **thing being counted** — independent
of any specific number.

```
id                    name                        domain
children-under-15     Children under 15           people
doctors               Doctors                     healthcare
food-waste            Annual food wasted          food
```

An entity has no value; it is just a named, categorised thing. Entities are
reusable in principle, though each currently maps to exactly one observation.

---

### Observation

Defined in `data/source/observations.csv`. An observation is an
**entity + metric + geography + time period + a specific value** — the actual
data point the game question is built around.

```
id                    entity_id           metric_id           value       unit_id
people-children       children-under-15   population-count    2570000000  people
food-calories-daily   food-calories       per-capita-daily    2850        calories
energy-renewables     renewable-elec...   percentage-share    300         per-1000-kwh
```

The `id` column is the **observation_id**. It is a hand-written slug — nothing
auto-generates it. Convention is `domain-entity` or `domain-qualifier`:

```
people-children          water-freshwater-daily
food-waste               money-top10-wealth
energy-renewables        healthcare-life-expectancy
```

---

### Fact

Attached to an observation. A fact is a **sentence** that helps a player reason
toward the answer without revealing it. Two types:

| Type | Purpose | Rules |
|---|---|---|
| `relationship` | Comparisons, ratios, trends across regions or time | No world totals that back-calculate the answer |
| `anchor` | One specific number for one country or region | Must not let a player derive the world total |

Facts are the only layer that is **author-maintained** after the build pipeline
runs. They live in:

- `data/canonical-facts.csv` — durable source of truth
- `data/generated/world-model.json` — runtime copy, regenerated via `rebuild`

---

## Where observation_ids come from

Entirely hand-authored in `data/source/observations.csv`. The build pipeline
(`build-world-model.ts`) reads that file and carries the `id` through unchanged
into `world-model.json`. Nothing generates or validates uniqueness automatically
— that is the author's responsibility.

---

## How to add a new observation

### Step 1 — Add the entity (if new)

Append a row to `data/source/entities.csv`:

```
new-entity-id,Human readable name,domain,Description text
```

### Step 2 — Add the observation

Append a row to `data/source/observations.csv`. Required columns:

| Column | Example | Notes |
|---|---|---|
| `id` | `people-refugees` | Unique slug, lowercase hyphenated |
| `entity_id` | `forcibly-displaced` | Must exist in entities.csv |
| `metric_id` | `population-count` | Must exist in metrics.csv |
| `geography_id` | `world` | Almost always `world` |
| `time_period_id` | `2023` | Must exist in time_periods.csv |
| `population_group_id` | `all` | `all`, `adults`, or `children` |
| `value` | `1140000000` | Raw number (not per-1k) |
| `unit_id` | `people` | Must exist in units.csv |
| `source_id` | `unhcr` | Must exist in sources.csv |
| `confidence` | `medium` | `high`, `medium`, or `low` |
| `notes` | `"Over 114 million..."` | Shown as the observation note |

### Step 3 — Rebuild world-model.json

```bash
cd planet1000
npm run build:data
```

This runs `build-world-model.ts`, validates all references, and writes
`data/generated/world-model.json`. The new observation will appear with an
empty `facts: []` array.

### Step 4 — Add facts

```bash
npx tsx scripts/fact-hunt.ts add your-new-observation-id
```

Facts are appended to both `world-model.json` and `canonical-facts.csv`.
See [08_Canonical_Facts_CSV.md](./08_Canonical_Facts_CSV.md) for bulk-add and
rebuild workflows.

---

## Summary

| Term | Where defined | What it is |
|---|---|---|
| Domain | `entities.csv` `domain` column | Category string; no separate table |
| Entity | `entities.csv` | The thing being counted |
| Metric | `metrics.csv` | How the thing is measured (count, rate, share, flow) |
| Observation | `observations.csv` | Entity + metric + value + context; one game question |
| Observation ID | `observations.csv` `id` column | Hand-written slug, e.g. `people-children` |
| Fact | `canonical-facts.csv` + `world-model.json` | Hint sentence attached to an observation |
