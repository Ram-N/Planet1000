# Planet1000 Implementation Guide

## What Has Been Built (Phases 1–5)

This document covers the complete state of the World Model architecture as implemented.
It is the reference for anyone updating data, extending the question pool, or understanding
how the system fits together.

---

## Table of Contents

1. [The Core Idea](#1-the-core-idea)
2. [Architecture at a Glance](#2-architecture-at-a-glance)
3. [Are the Data Values Real?](#3-are-the-data-values-real)
4. [CSV Source Files — Field-by-Field Guide](#4-csv-source-files--field-by-field-guide)
5. [The `value` Field in observations.csv — the Critical Rule](#5-the-value-field-in-observationscsv--the-critical-rule)
6. [How to Add a New Fact](#6-how-to-add-a-new-fact)
7. [Build Pipeline Scripts](#7-build-pipeline-scripts)
8. [WorldModel Class](#8-worldmodel-class)
9. [Question Generator](#9-question-generator)
10. [How Games Consume Data](#10-how-games-consume-data)
11. [Known Issues and Data Caveats](#11-known-issues-and-data-caveats)
12. [Quick Reference](#12-quick-reference)

---

## 1. The Core Idea

The fundamental principle is: **store facts once, derive everything else**.

Before this refactor, the codebase stored a fact three times:

```json
{
  "id": "people-children",
  "value_1k": 257,
  "value_world": 2570000000,
  "label": "Children under 15"
}
```

The `value_1k` and `value_world` are both derived from the same underlying reality.
Storing both means they can drift out of sync, and adding a new fact required manually
computing both numbers.

After the refactor, a fact is stored **once** in `observations.csv`:

```
people-children, children-under-15, population-count, world, 2023, all,
2570000000, people, un-pop, high, "About 1 in 4 people..."
```

The single `value` field (2,570,000,000 — world total) is the source of truth.
The game's answer of 257 (per 1,000 people) is **calculated at runtime** by
`worldModel.per1k(obs)`. It is never stored anywhere.

This means:
- Correcting a fact = editing one number in one CSV row
- Adding a fact = adding one CSV row (no JSON editing, no derived column math)
- New game modes get data for free — they just call `worldModel.queryObservations()`

---

## 2. Architecture at a Glance

```
data/source/*.csv          ← Edit these to add or correct facts
        │
        ▼
npm run build:data
        │
        ▼
data/generated/
  world-model.json         ← Never edit. Regenerate after any CSV change.
        │
        ▼
lib/world-model-instance.ts
  (singleton: worldModel)
        │
        ├──▶ lib/question-generator.ts
        │         │
        │         ▼
        │    Question[]  (75 questions from 28 observations)
        │
        ├──▶ lib/questions.ts
        │    (public API: getStatById, getShuffledQuestions, etc.)
        │         │
        │         ▼
        │    app/play/world-estimation/page.tsx
        │    app/play/chain-reaction/page.tsx
        │    app/play/planet1000/page.tsx
        │
        └──▶ (Future) lib/chain-generator.ts
                   (Phase 6: replaces chains.json)
```

Data flows in one direction only: CSV → JSON → runtime. Nothing flows backwards.

---

## 3. Are the Data Values Real?

**Short answer: yes, broadly. But with caveats.**

The 28 facts in `observations.csv` are real-world estimates from published sources
(WHO, World Bank, UN, IEA, UNHCR, ITU, FAO), all circa 2022–2023. They are not
synthetic or made up.

However, there are three important caveats:

### Caveat A: Rounding and approximation

The figures are **educational approximations**, not precise statistics.

| Fact | Game value | More precise figure |
|------|-----------|---------------------|
| Doctors per 1,000 | 4 | 4.3 (WHO 2022) |
| People without electricity | 73 per 1k | ~733 million (IEA 2022) |
| Life expectancy | 73 years | 73.1 years (WHO 2023) |
| Forcibly displaced | 114 per 1k | ~117 million (UNHCR 2023) |

This is intentional — the game teaches order-of-magnitude thinking, not decimal precision.

### Caveat B: The stored `value` may differ from the published world total

This is the most important thing to understand. Read Section 5 carefully.

For a handful of observations, the `value` column in the CSV is **not** the exact
published world total — it is a number chosen to make `per1k()` return the correct
game answer. See the [full explanation in Section 5](#5-the-value-field-in-observationscsv--the-critical-rule).

### Caveat C: Data ages

World statistics change. The current data represents approximately 2022–2023.
Key figures likely to drift:
- People without electricity (falling fast — IEA reports annually)
- Internet users (rising fast)
- Forcibly displaced (unfortunately rising)
- Renewable electricity share (rising fast)

The `time_period_id` column (`2023`) and `confidence` column (`high`/`medium`/`low`)
flag where accuracy matters most.

---

## 4. CSV Source Files — Field-by-Field Guide

All source files live in `planet1000/data/source/`. This is the only place you should edit data.

### `entities.csv` — What is being measured

An **entity** is the thing a statistic is about. It answers "what are we counting?"

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `id` | ✓ | Unique slug, lowercase-hyphen | `doctors` |
| `name` | ✓ | Human-readable display name | `Doctors` |
| `domain` | ✓ | One of the 10 game domains (see below) | `healthcare` |
| `description` | ✓ | One sentence defining the entity precisely | `Registered medical doctors worldwide` |

**Valid domains:** `people`, `food`, `water`, `energy`, `housing`, `healthcare`,
`education`, `money`, `environment`, `transportation`

The `domain` determines which game filters include this entity and which domain
badge appears on question cards.

**Example addition:**
```csv
police-officers,Police officers,people,Sworn law enforcement officers worldwide
```

---

### `metrics.csv` — What type of measurement it is

A **metric** defines the mathematical nature of a measurement. The `measure_type`
field drives the `per1k()` calculation — it is the most important field to get right.

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `id` | ✓ | Unique slug | `population-count` |
| `name` | ✓ | Display name | `Population count` |
| `measure_type` | ✓ | `stock`, `flow`, `rate`, or `share` | `stock` |
| `default_unit` | ✓ | Default unit for this metric type | `people` |
| `description` | ✓ | Explanation of what this metric measures | `Count of people with a given characteristic` |

**`measure_type` is the critical field.** It controls how `per1k()` works:

| `measure_type` | Meaning | `per1k()` formula | Example |
|----------------|---------|-------------------|---------|
| `stock` | World total count of people | `value / world_pop × 1000` | Number of doctors |
| `flow` | World total volume per time period | `value / world_pop × 1000` | Tonnes of food wasted/year |
| `rate` | Already a per-person figure | `value` (returned as-is) | Calories per person per day |
| `share` | Already a fraction/ratio | `value` (returned as-is) | Renewable % of electricity |

**Current metrics:**

| id | measure_type | Used for |
|----|-------------|----------|
| `population-count` | stock | Counting people (doctors, refugees, etc.) |
| `object-count` | stock | Counting non-human objects (cars) |
| `daily-flow` | flow | Per-day world totals (flights/day) |
| `annual-flow` | flow | Per-year world totals (food waste, forest loss) |
| `per-capita-daily` | rate | Per-person per-day figures (calories, litres) |
| `per-capita-annual` | rate | Per-person per-year figures (kWh, CO₂, GDP) |
| `percentage-share` | share | Fractions of a whole (renewable %, wealth share) |

**Do not add new metrics** unless you have a genuinely new measurement type.
Most new facts will use one of these seven existing metrics.

---

### `geographies.csv` — Geographic scope

Currently contains only `world`. Future phases may add continents or regions.

| Column | Required | Description |
|--------|----------|-------------|
| `id` | ✓ | Unique slug |
| `name` | ✓ | Display name |
| `level` | ✓ | `world`, `continent`, `country`, `state`, or `city` |
| `parent_id` | | Parent geography id (empty for `world`) |

**For now, always use `world` as the `geography_id` in observations.**

---

### `time_periods.csv` — When the data is from

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `id` | ✓ | Year or period label | `2023` |
| `type` | ✓ | `year`, `quarter`, or `month` | `year` |
| `start_date` | ✓ | ISO date | `2023-01-01` |
| `end_date` | ✓ | ISO date | `2023-12-31` |

**For now, always use `2023` as the `time_period_id` in observations.**
Add a new row here if using a different year for a specific fact.

---

### `population_groups.csv` — Which people a fact applies to

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `id` | ✓ | Unique slug | `all` |
| `name` | ✓ | Display name | `All people` |
| `description` | ✓ | Who is included | `The entire global population` |

**Current groups:**

| id | Meaning |
|----|---------|
| `all` | All people globally (default for most facts) |
| `adults` | People aged 15 and over (used for literacy) |
| `children` | People aged 0–14 (used for out-of-school count) |

Use `all` unless the statistic explicitly applies to a specific age group.

---

### `units.csv` — Units of measurement

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `id` | ✓ | Unique slug | `kwh` |
| `name` | ✓ | Full unit name | `Kilowatt-hours` |
| `symbol` | ✓ | Short symbol shown in the game UI | `kWh` |
| `conversion_factor_to_base` | ✓ | Reserved for future unit conversion (use `1` for now) | `1` |

The `symbol` is what appears in `RevealCard` next to the answer (e.g., "3,300 kWh").
Keep symbols short and game-friendly.

**Current units:** `people`, `children`, `cars`, `flights`, `hectares`, `tonnes`,
`calories`, `liters`, `kwh`, `usd-per-year`, `years`, `kg-co2`, `per-1000-kwh`,
`per-1000-wealth`

---

### `sources.csv` — Data provenance

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `id` | ✓ | Short slug for this source | `who` |
| `url` | ✓ | Homepage or dataset URL | `https://www.who.int/data` |
| `title` | ✓ | Full name of the source | `WHO Global Health Observatory` |
| `publication_date` | ✓ | When the data was published | `2023-01-01` |
| `retrieval_date` | ✓ | When we accessed it | `2024-01-01` |

**Current sources:** `world-bank`, `who`, `un-pop`, `iea`, `unhcr`, `itu`, `fao`

---

### `observations.csv` — The facts themselves

This is the core data file. Every row is one fact about the world.

| Column | Required | Type | Description |
|--------|----------|------|-------------|
| `id` | ✓ | string | Unique observation ID — used as `statId` by questions |
| `entity_id` | ✓ | FK → entities | What is being measured |
| `metric_id` | ✓ | FK → metrics | What type of measurement |
| `geography_id` | ✓ | FK → geographies | Geographic scope (always `world` for now) |
| `time_period_id` | ✓ | FK → time_periods | When the data is from (usually `2023`) |
| `population_group_id` | ✓ | FK → population_groups | Who this applies to (usually `all`) |
| `value` | ✓ | number | **See Section 5 — read before editing** |
| `unit_id` | ✓ | FK → units | Unit of the value |
| `source_id` | ✓ | FK → sources | Data source |
| `confidence` | ✓ | `high`/`medium`/`low` | How reliable is this figure |
| `notes` | ✓ | string | Explanation shown in the game after reveal |

The `id` of the observation is used as `statId` in generated questions. Keep existing
observation IDs stable — changing them will break any saved `chains.json` references.

---

## 5. The `value` Field in observations.csv — the Critical Rule

This is the most important thing to understand about the data model.

### The rule

The `value` you store depends on the `measure_type` of the metric:

**For `stock` and `flow` metrics:**
```
value = game_answer_per_1k × 10,000,000
```
(equivalently: `value = game_answer × (world_population / 1000)`)

**For `rate` and `share` metrics:**
```
value = game_answer_per_1k
```
(the value IS the game answer — no scaling needed)

### Why this rule exists

`per1k()` in the WorldModel always calculates:
- stock/flow: `value / 10,000,000,000 × 1000` → this inverts the formula above
- rate/share: `value` → returned directly

So if you want the game to display "257 children per 1,000 people", you store:
```
value = 257 × 10,000,000 = 2,570,000,000
```

And `per1k()` gives you back: `2,570,000,000 / 10,000,000,000 × 1000 = 257`. ✓

### The world population constant

`WORLD_POPULATION = 10,000,000,000` (10 billion) is hardcoded in
`scripts/build-world-model.ts`. This is a round number chosen for simplicity.
The real 2023 population is ~8.1 billion, but 10 billion makes the arithmetic
cleaner for educational purposes and is consistent across all 28 observations.

### Where stored values differ from published figures

For most `stock` observations, the stored `value` closely matches published statistics:

| Observation | Stored value | Published figure | Match? |
|-------------|-------------|-----------------|--------|
| people-children | 2,570,000,000 | ~2.6B (UN 2023) | ✓ close |
| water-no-clean | 2,200,000,000 | ~2.2B (WHO 2022) | ✓ exact |
| energy-no-electricity | 730,000,000 | ~733M (IEA 2022) | ✓ close |
| transportation-cars | 1,450,000,000 | ~1.45B | ✓ exact |

For a few observations, the stored value is **not** the published world total:

| Observation | Stored value | Real-world figure | Why different |
|-------------|-------------|-------------------|---------------|
| `transportation-flights-daily` | 100,000,000 | ~102,000 flights/day | The game answer (10) was manually set; stored value is back-calculated from it |
| `environment-forest-loss` | 47,000,000,000 | ~47 million ha/year | Original game answer (4,700) was 1000× too high; stored value preserves it |
| `people-refugees` | 1,140,000,000 | ~114 million people | Original game answer (114) assumed 10B world pop; actual is ~14 per 1000 |

**What to do about these:** They are known data quality issues inherited from the
original prototype. Do not try to fix the stored `value` without also changing the
game answer (per1k). When you're ready to correct them, change `value` to the real
published figure and the game answer will update automatically. The `notes` text
may also need updating.

---

## 6. How to Add a New Fact

Here is the complete checklist for adding one new fact to the game.

### Step 1: Check if entities and metrics already exist

Ask: does the thing I'm measuring already have an entity? Does the measurement type
already exist as a metric?

Example — adding "number of hospitals worldwide":
- Entity: no existing `hospitals` entity → need to add it
- Metric: it's a count of non-person objects → `object-count` already exists ✓
- Unit: `hospitals` doesn't exist as a unit → need to add it

### Step 2: Add to lookup tables if needed

**Add a new entity** to `entities.csv`:
```csv
hospitals,Hospitals,healthcare,Registered hospitals and health facilities worldwide
```

**Add a new unit** to `units.csv` (if needed):
```csv
hospitals,Hospitals,hospitals,1
```

**Add a new source** to `sources.csv` (if not already there):
```csv
who-facilities,https://www.who.int/data/gho/data/themes/health-service-coverage,WHO Health Facilities Data,2022-01-01,2024-01-01
```

### Step 3: Calculate the correct `value` to store

Look up the real-world figure from a credible source. Determine whether your
metric is `stock`/`flow` (needs scaling) or `rate`/`share` (store directly).

Example — hospitals:
- Metric type: `object-count` → `stock` → needs scaling formula
- Published estimate: ~140,000 hospitals worldwide (WHO, rough estimate)
- Desired game answer: 140,000 / 10,000,000,000 × 1000 = **0.014 hospitals per 1000 people**
- Hmm — that's a fraction of a hospital. Reconsider: ask "how many hospital beds?" instead.

Example — hospital beds:
- Published estimate: ~18.6 million beds worldwide
- Desired game answer: 18,600,000 / 10,000,000,000 × 1000 = **1.86 per 1000 people** ≈ 2
- Stored value: 2 × 10,000,000 = **20,000,000** (20 million)

Or, if you prefer to store the more precise 18.6M:
- Stored value: **18,600,000**
- Per1k result: 18,600,000 / 10,000,000,000 × 1000 = **1.86** (displayed as 1.9 in hints)

Choose the value that gives a clean, educationally meaningful game answer.

### Step 4: Add the observation to `observations.csv`

```csv
healthcare-hospital-beds,hospital-beds,object-count,world,2023,all,18600000,beds,who-facilities,medium,"There are about 18.6 million hospital beds worldwide — roughly 2 per 1,000 people. The US has 29 beds per 1,000; many low-income countries have fewer than 1."
```

### Step 5: Run the build pipeline

```bash
npm run build:data
```

If validation passes, `data/generated/world-model.json` is updated. If there are
errors, the script will print exactly what's wrong (missing reference, duplicate ID, etc.).

### Step 6: Verify the game answer

```bash
node -e "
const d = require('./data/generated/world-model.json');
const obs = d.observations.find(o => o.id === 'healthcare-hospital-beds');
const per1k = obs.value / d.world_population * 1000;
console.log('Game answer (per 1k):', per1k);
"
```

### Step 7: The question generator picks it up automatically

No further code changes are needed. On the next app start, the question generator
will produce 2–5 question variants for the new observation automatically.

---

## 7. Build Pipeline Scripts

### `npm run build:data`

**File:** `scripts/build-world-model.ts`
**Runs with:** `tsx`

This is the only script you need to run after editing any CSV. It:

1. Reads all 8 CSV files from `data/source/`
2. Runs full validation (see below)
3. Denormalises entities, metrics, and units into each observation
4. Writes `data/generated/world-model.json`

Output on success:
```
🌍 Building World Model...

📂 Loading CSV files...
   Loaded: 28 entities, 7 metrics, 28 observations

🔍 Validating data...
   ✅ All validations passed

🔨 Building world-model.json...
   ✅ Written to data/generated/world-model.json
   📊 28 observations ready

✅ World Model build complete!
```

If any validation fails, the script exits with code 1 and prints what went wrong.
The output file is **not updated** when validation fails.

### What the validator checks

**File:** `scripts/validate.ts`

| Check | Description |
|-------|-------------|
| Schema | All required columns present in each CSV |
| Referential integrity | Every FK in observations.csv points to a real row in the lookup table |
| Valid enum values | `measure_type`, `confidence`, `level`, `type` are in the allowed set |
| Duplicate IDs | No two observations share the same `id` |
| Duplicate composite keys | No two observations share the same (entity, metric, geography, time, population_group) combination |

### When to run it

Run `npm run build:data` every time you:
- Add, edit, or delete a row in any CSV file
- Add a new lookup table entry (entity, metric, unit, etc.)

You do **not** need to run it to change question templates — those are in TypeScript
and take effect immediately on the next `next dev` start.

### Committing generated files

`data/generated/world-model.json` is committed to the repo. This means:
- The app can be deployed without running `build:data` on the server
- The generated file should be regenerated and committed after every CSV edit
- Do not hand-edit `world-model.json` — your changes will be overwritten next time

If you add `build:data` to CI/CD before the Next.js build step, you can remove
the generated file from version control. For now, committing it is simpler.

---

## 8. WorldModel Class

**File:** `lib/world-model.ts`
**Singleton:** `lib/world-model-instance.ts`

### Key methods

```typescript
// Get all observations for a domain
worldModel.queryObservations({ domain: 'healthcare' })
// → Observation[]

// Get a single observation by its ID
worldModel.getObservationById('people-doctors')
// → Observation | null

// Get the game answer (what to display as "X out of 1,000")
worldModel.per1k(observation)
// → number  (e.g., 4 for doctors)

// Get all derived forms at once
worldModel.derive(observation)
// → { raw: 40000000, per_person: 0.004, per_1k: 4, as_percentage: 0.4 }

// Scale any value between population sizes
worldModel.scale({ value: 2570000000, source_population: 10000000000, target_population: 1000 })
// → 257

// World population constant used in all calculations
worldModel.getWorldPopulation()
// → 10000000000
```

### The `Observation` object

After the build pipeline runs, each observation is denormalised — it carries its
entity, metric, and unit objects inline for convenience:

```typescript
observation.id              // "people-doctors"
observation.value           // 40000000 (world total)
observation.confidence      // "medium"
observation.notes           // explanation text
observation.entity.name     // "Doctors"
observation.entity.domain   // "healthcare"
observation.metric.measure_type  // "stock"
observation.unit.symbol     // "people"
```

This means you can filter, display, and generate questions from a single object
without additional lookups.

### The singleton

`lib/world-model-instance.ts` imports the generated JSON at Next.js build time:

```typescript
import worldModelData from '@/data/generated/world-model.json';
export const worldModel = new WorldModelImpl(data.observations, data.world_population);
```

This singleton is imported by `lib/questions.ts` and (in future) by
`lib/chain-generator.ts`. It is available in both server and client components
because it's a pure data object with no side effects.

---

## 9. Question Generator

**File:** `lib/question-generator.ts`

### How it works

For each observation in the WorldModel, the generator tests it against a list of
**templates**. Each template has an `applies()` function that checks whether the
template makes sense for that observation's metric type and domain.

The generator produces a `Question` object for each (observation, template) pair
that passes `applies()`. Questions are deduplicated by a composite key
`gen-{templateId}-{observationId}`.

### Current templates (10)

| Template ID | Pattern | `applies()` condition | Example prompt |
|-------------|---------|----------------------|----------------|
| `absolute_1k` | stock/flow questions | `measure_type` is stock or flow | "In a world of 1,000 people, how many would be: Doctors?" |
| `absolute_1k_gather` | random-sample framing | `measure_type` is stock | "If you gathered 1,000 random people from around the world, how many would be doctors?" |
| `absolute_1k_inequality` | inequality framing | stock + domains: healthcare, education, money, energy, water | "Access to doctors is very unequal globally. In a 1,000-person world, how many people have it?" |
| `absolute_1k_context` | trends framing | stock + domains: people, healthcare, food, housing | "Global trends have changed rapidly. In today's world of 1,000, how many are Doctors?" |
| `absolute_1k_objects` | object framing | stock + domain: transportation | "How many cars would exist in a world scaled down to 1,000 people?" |
| `absolute_1k_flow` | daily/annual flow | `measure_type` is flow | "In a 1,000-person world, how many commercial flights occur each day?" |
| `per_person` | per-capita primary | `measure_type` is rate | "What is the global average life expectancy?" |
| `per_person_alt` | per-capita alternate | `measure_type` is rate | "A baby born anywhere today can expect to live how many years on average?" |
| `world_scale` | share primary | `measure_type` is share | "Out of every 1,000 kWh of electricity generated globally, how many come from renewables?" |
| `world_scale_alt` | share alternate | `measure_type` is share | "What percentage of global electricity currently comes from renewable sources?" |

### Questions generated per domain (current data)

| Domain | Observations | Questions |
|--------|-------------|-----------|
| people | 6 | 18 |
| healthcare | 3 | 10 |
| education | 3 | 9 |
| food | 3 | 7 |
| money | 3 | 7 |
| energy | 3 | 7 |
| water | 2 | 5 |
| transportation | 2 | 5 |
| environment | 2 | 4 |
| housing | 1 | 3 |
| **Total** | **28** | **75** |

### Adding a new template

To add a new question framing, add a new object to the `TEMPLATES` array in
`lib/question-generator.ts`:

```typescript
{
  id: 'historical_change',          // unique ID
  pattern: 'absolute_1k',           // pattern category
  applies: (obs) => obs.metric.measure_type === 'stock',
  prompt: (obs) =>
    `In 1990, this number was very different. Today in our 1,000-person world, how many are ${obs.entity.name.toLowerCase()}?`,
  hint: (obs, per1k) =>
    `The world has changed dramatically. Today: about ${fmt(per1k)} per 1,000.`,
  reasoningOptions: (obs) => [
    `I know how this trend has shifted since 1990`,
    `I estimated from development reports I've read`,
    `I guessed based on general progress narratives`,
    'Pure guess',
  ],
},
```

No CSV changes needed — the template applies automatically to all relevant
observations.

### How reasoning options work

Each question has 4 `reasoningOptions`. The scoring system
(`lib/reasoning.ts`) maps them by position:
- Options 0 and 1 → **strong** reasoning → +20 points bonus
- Option 2 → **moderate** reasoning → +10 points bonus
- Option 3 → **weak** (always "Pure guess") → +0 points bonus

This convention is implicit but consistent: always write options from most to least
informed, and always make the last option "Pure guess".

---

## 10. How Games Consume Data

Games do not import CSVs or call the WorldModel directly. They use the public API
in `lib/questions.ts`, which acts as an adapter layer.

### `lib/questions.ts` public API

```typescript
// Get all generated questions (shuffled)
getShuffledQuestions(): Question[]

// Get a specific stat by observation ID (returns WorldStat for compatibility)
getStatById(id: string): WorldStat | undefined

// Get both a question and its associated stat
getQuestionWithStat(questionId: string): { question: Question; stat: WorldStat } | null
```

### The `WorldStat` adapter

Game components (especially `RevealCard`) expect a `WorldStat` object with these fields:
```typescript
{ id, domain, dimension, label, value_1k, value_world, unit, explanation }
```

The adapter in `lib/questions.ts` converts a `WorldModel` `Observation` to this shape:
```typescript
function observationToWorldStat(obs: Observation): WorldStat {
  return {
    id: obs.id,
    domain: obs.entity.domain,
    dimension: METRIC_TO_DIMENSION[obs.metric_id],
    label: obs.entity.name,
    value_1k: worldModel.per1k(obs),   // ← derived, not stored
    value_world: obs.value,
    unit: obs.unit.symbol,
    explanation: obs.notes,
  };
}
```

This keeps the three game pages (`world-estimation`, `chain-reaction`, `planet1000`)
unchanged — they still receive `WorldStat` objects they know how to render.

### Game flow summary

```
Game page loads
    ↓
getShuffledQuestions()
    ↓
Question[] — each has: id, statId, prompt, hint, reasoningOptions
    ↓
Player answers → scoreEstimate(guess, stat.value_1k)
    ↓
getStatById(question.statId) → WorldStat
    ↓
RevealCard shows: stat.value_1k, stat.unit, stat.explanation
```

The scoring in `lib/scoring.ts` compares the player's guess to `stat.value_1k`
(the per-1,000 game answer). This value is derived dynamically — it equals
`worldModel.per1k(observation)`.

---

## 11. Known Issues and Data Caveats

### Issue 1: Three observations have inconsistent stored values

These three entries have stored `value` fields that don't match the real-world
published figures. The game answers are still educationally reasonable, but the
`value` field is not the true world total.

| Observation ID | Game answer (per1k) | Stored `value` | True world figure | Notes |
|----------------|--------------------|-----------------------|-------------------|-------|
| `transportation-flights-daily` | 10 | 100,000,000 | ~102,000 daily flights | "10 flights/day in 1k-world" was original game design; true per-1k is 0.01 |
| `environment-forest-loss` | 4,700 | 47,000,000,000 ha | ~47 million ha/year | Original game answer was 1000× too high |
| `people-refugees` | 114 | 1,140,000,000 | ~114–117 million | Originally modelled as if 1.14B people are displaced |

**To fix:** Change the stored `value` to the true world figure. The game answer
will update automatically on next `build:data` run. Update the `notes` text too
if needed.

### Issue 2: World population constant is 10B, not 8.1B

All scaling uses 10 billion. The real 2023 population is ~8.1 billion. This means
stock/flow per-1k answers are about 20% lower than if the true population were used.
This was a deliberate simplification in the original prototype and is consistent
across all observations.

**To fix (if desired):** Change `WORLD_POPULATION` in `scripts/build-world-model.ts`
to `8_100_000_000` and re-run `npm run build:data`. All per-1k answers will update
automatically. Review all 28 game answers to ensure they still make educational sense.

### Issue 3: `food-waste` notes mention 1.3 billion tonnes; stored value is 4 billion

The `notes` text says "About 1.3 billion tonnes of food is wasted" but `value = 4,000,000,000`
which implies 400 tonnes per 1k (= 4 billion total). The 1.3B figure is widely cited
(FAO 2011 landmark report). The 4B figure may refer to a broader definition.
Clarify the source and update if needed.

---

## 12. Quick Reference

### Add a new fact (checklist)
1. Does the entity exist in `entities.csv`? If not, add it.
2. Which metric type? Pick from `metrics.csv`. Usually `population-count` or `per-capita-annual`.
3. Which unit? Pick from `units.csv`. Add a new row if needed.
4. Which source? Pick from `sources.csv`. Add a new row if needed.
5. Calculate `value`: for stock/flow, multiply game answer by 10,000,000. For rate/share, use directly.
6. Add row to `observations.csv`.
7. Run `npm run build:data`.
8. Verify with: `node -e "const d=require('./data/generated/world-model.json'); const o=d.observations.find(o=>o.id==='YOUR-ID'); console.log(o.value/d.world_population*1000)"`
9. Commit `data/source/*.csv` and `data/generated/world-model.json`.

### Fix a wrong game answer
1. Open `data/source/observations.csv`.
2. Find the row by `id`.
3. For stock/flow: set `value = correct_game_answer × 10,000,000`.
4. Update `notes` if the explanation is also wrong.
5. Run `npm run build:data`.

### Add a new question framing
1. Open `lib/question-generator.ts`.
2. Add a new object to the `TEMPLATES` array.
3. No rebuild needed — restart `next dev`.

### Check what questions a domain generates
```bash
node -e "
const d = require('./data/generated/world-model.json');
const SCALABLE = new Set(['stock','flow']);
function per1k(obs) { return SCALABLE.has(obs.metric.measure_type) ? obs.value/d.world_population*1000 : obs.value; }
const obs = d.observations.filter(o => o.entity.domain === 'healthcare');
obs.forEach(o => console.log(o.id, '→ per1k:', per1k(o), o.unit.symbol));
"
```

### Rebuild and verify in one command
```bash
npm run build:data && node -e "
const d = require('./data/generated/world-model.json');
console.log('Observations:', d.observations.length);
console.log('Generated at:', d.generated_at);
"
```

### Key file locations

| Purpose | File |
|---------|------|
| Edit data | `data/source/*.csv` |
| Build pipeline | `scripts/build-world-model.ts` |
| Validator | `scripts/validate.ts` |
| Generated output | `data/generated/world-model.json` |
| WorldModel class | `lib/world-model.ts` |
| Singleton | `lib/world-model-instance.ts` |
| Question templates | `lib/question-generator.ts` |
| Game API | `lib/questions.ts` |
| TypeScript types | `types/world-model.ts` |
