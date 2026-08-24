# Facts Authoring Guide

This guide explains how to write and maintain `data/source/facts.csv` — the curated fact pool used by the Planet1000 adaptive hint engine.

---

## What facts are for

When a player submits a guess in the Planet1000 daily challenge, the hint engine selects facts from this pool to help them refine their answer. Facts are **educational anchors**, not corrections. They give the player a new way to think about the answer without revealing it.

There are two hint phases:

| Phase | Hint shown | Fact types preferred |
|-------|-----------|----------------------|
| **THINK** (after guess 1) | No directional guidance — facts only | `scale_anchor`, `geographic` |
| **REFINE** (after guess 2) | Directional preamble (e.g. "You're about 3× too high") + one fact | `inequality`, `comparison` |

The engine avoids repeating facts across phases.

---

## Fact type taxonomy

| Type | Purpose | When used |
|------|---------|-----------|
| `scale_anchor` | Concrete reference the player probably knows (a country, a city, a recognisable comparison) | Large error — helps reset mental model |
| `geographic` | Where this phenomenon is concentrated globally | Large error — sets geographic context |
| `inequality` | Rich vs. poor country gap, or top vs. bottom share | Medium error — narrows the range |
| `comparison` | Relative to another entity in the dataset | Medium error — gives a relative anchor |
| `trend` | How this is changing over time | Small error — teaches precision |
| `general` | Context that fits any error size | Fallback when other types aren't available |

**Aim for 3–6 facts per observation**, covering at least `scale_anchor`, `inequality`/`comparison`, and `general`.

---

## CSV format

File: `planet1000/data/source/facts.csv`

```
id,observation_id,type,text
```

| Column | Description |
|--------|-------------|
| `id` | Unique slug. Convention: `fact-{entity}-{type}`, e.g. `fact-doctors-geo` |
| `observation_id` | Must match an `id` in `observations.csv` |
| `type` | One of: `scale_anchor`, `geographic`, `inequality`, `comparison`, `trend`, `general` |
| `text` | The fact text (one sentence, quoted if it contains commas) |

---

## What makes a good fact

**Do:**
- Name a recognisable country, city, or organisation: "Norway has 40 doctors per 1,000 people; Niger has fewer than 0.1"
- Give a concrete ratio or comparison: "The US alone has more registered doctors than all of sub-Saharan Africa combined"
- Describe a trend with direction and scale: "Global physician numbers have grown 60% since 2000"
- One sentence maximum

**Do not:**
- Reveal or strongly imply the 1,000-person answer
- Use vague language ("many", "some") without a reference point
- Include two different ideas in one sentence
- Add source citations — keep it conversational

---

## Template rows by observation

Use these stubs to add facts for observations that currently only have a `general` placeholder.

| Observation ID | Entity | Domain | Answer (1,000-person world) |
|---------------|--------|--------|----------------------------|
| `people-children` | Children under 15 | people | 257 people |
| `people-elderly` | Elderly over 65 | people | 102 people |
| `people-urban` | Urban residents | people | 570 people |
| `people-doctors` | Doctors | healthcare | 4 people |
| `people-nurses` | Nurses & midwives | healthcare | 10 people |
| `people-teachers` | Primary teachers | education | 7 people |
| `people-farmers` | Agricultural workers | people | 280 people |
| `people-poverty` | Extreme poor | money | 87 people |
| `people-internet` | Internet users | people | 670 people |
| `people-smartphones` | Smartphone owners | people | 545 people |
| `people-literate` | Literate adults | education | 865 people |
| `food-calories-daily` | Food calories | food | 2,850 kcal/day |
| `food-waste` | Food wasted | food | 400,000 tonnes/year |
| `water-freshwater-daily` | Freshwater use | water | 185 L/day |
| `water-no-clean` | Without safe water | water | 220 people |
| `energy-electricity` | Electricity use | energy | 3,300 kWh/year |
| `energy-renewables` | Renewable electricity | energy | 300 out of 1,000 kWh |
| `energy-no-electricity` | Without electricity | energy | 73 people |
| `housing-homeless` | Inadequate housing | housing | 160 people |
| `transportation-cars` | Cars | transportation | 145 cars |
| `transportation-flights-annual` | Commercial flights | transportation | 150 people |
| `money-gdp-per-capita` | GDP per capita | money | $13,500/year |
| `money-top10-wealth` | Top 10% wealth share | money | 760 out of 1,000 units |
| `environment-forest-loss` | Forest loss | environment | 47M hectares/year |
| `environment-co2` | CO₂ per capita | environment | 4,600 kg/year |
| `healthcare-life-expectancy` | Life expectancy | healthcare | 73 years |
| `education-school-age` | Out-of-school children | education | 26 children |
| `people-refugees` | Forcibly displaced | people | 114 people |

---

## How the engine selects facts

Facts are sorted by type before being stored in `world-model.json`:
1. `scale_anchor` and `geographic` (indices 0, 1) → used in THINK phase
2. `inequality` and `comparison` (indices 2, 3) → used in REFINE phase
3. `trend` and `general` → fallbacks

This means **the order of types matters more than the order of rows in the CSV**. Within the same type, the first row written wins.

---

## After editing

Run the build pipeline to regenerate `world-model.json`:

```bash
cd planet1000
npm run build:data
```

Check the output for any "Missing reference" errors (invalid `observation_id`). Then restart the dev server:

```bash
npm run dev
```
