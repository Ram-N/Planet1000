# Facts Authoring Guide

This guide explains how to write and maintain `data/canonical-facts.csv` — the curated fact pool used by the Planet1000 adaptive hint engine.

---

## What facts are for

When a player submits a guess in the Planet1000 weekly challenge, the hint engine reveals one fact after each of the first three guesses to help them refine their estimate. Facts are **educational anchors**, not corrections. They give the player a new lens on the topic without revealing the answer.

There are three hint slots, revealed in this order:

| Hint | Shown after | Fact type | Purpose |
|------|-------------|-----------|---------|
| **1** | Guess 1 | `relationship` | Broad comparative context — where this is higher or lower globally |
| **2** | Guess 2 | `temporal` | Direction and trajectory — how this has changed over time |
| **3** | Guess 3 | `anchor` | Concrete numerical reference — best calibration tool before the final guess |

The engine selects one fact of each type per puzzle question. Facts are not repeated within a session.

---

## Fact type taxonomy

| Type | Purpose | Example |
|------|---------|---------|
| `relationship` | Geographic or comparative context: where this phenomenon is concentrated, which regions have more or less | "Africa accounts for more than half of all global cases of X, despite having only 17% of world population" |
| `temporal` | Direction, rate, and scale of change over time | "The number has risen by 40% since 2000, driven largely by urbanisation in South Asia" |
| `anchor` | Concrete, recognisable numerical reference that resets the player's mental model | "Norway has 5.2 per 1,000; Niger has 0.04 — a 130× gap" |

**Aim for at least one fact of each type per observation** — ideally 2–3 so the engine has fallbacks. An observation with no `temporal` fact will show no Hint 2.

---

## CSV format

File: `data/canonical-facts.csv`

```
observation_id,type,text,source,year
```

| Column | Required | Description |
|--------|----------|-------------|
| `observation_id` | yes | Must match an `id` in `world-model.json` |
| `type` | yes | One of: `relationship`, `temporal`, `anchor` |
| `text` | yes | The fact sentence (one sentence; quote if it contains commas) |
| `source` | no | URL of the primary source |
| `year` | no | Publication or data year |

Example rows:

```csv
observation_id,type,text,source,year
people-doctors,relationship,"Africa has fewer than 0.2 doctors per 1,000 people — about 20 times fewer than Europe",https://www.who.int/data/gho,2023
people-doctors,temporal,"Global physician numbers have grown by roughly 60% since 2000, but growth has been slowest in the regions that need it most",,
people-doctors,anchor,"Norway has 5.2 doctors per 1,000 people; Niger has fewer than 0.04 — the widest national gap in the world",https://www.who.int/data/gho,2022
```

---

## What makes a good fact

**Do:**
- Name a recognisable country, region, or organisation: "Norway has 40 doctors per 1,000 people; Niger has fewer than 0.1"
- Give a concrete ratio or comparison: "The US alone has more registered doctors than all of sub-Saharan Africa combined"
- Describe a trend with direction, scale, and a cause: "Global physician numbers have grown 60% since 2000, but least in the regions that need it most"
- One sentence maximum

**Do not:**
- Reveal or strongly imply the exact 1,000-person answer
- Use vague language ("many", "some") without a reference point
- Pack two different ideas into one sentence
- Add inline source citations — the `source` column handles provenance

---

## Using `fact-hunt` to add facts

The `fact-hunt` script manages the authoring workflow interactively. Prefer it over editing the CSV by hand.

```bash
# Check which observations need more facts (flags R/T/A counts)
npm run fact-hunt -- status

# Start an interactive hunt for a specific observation
npm run fact-hunt -- hunt people-doctors

# Add a fact interactively (prompts for type, text, source, year)
npm run fact-hunt -- add people-doctors

# Add a fact in one shot
npm run fact-hunt -- add people-doctors --type r --fact "..." --source "https://..." --year 2023
# type shorthands: r = relationship, t = temporal, a = anchor

# Add many facts at once from a prepared CSV
npm run fact-hunt -- add --csv scripts/input/batch.csv
```

See `docs/08_Canonical_Facts_CSV.md` for the bulk-add CSV format and the `rebuild` recovery command.

---

## How the engine selects facts

When a player reaches Hint 1, the engine picks the first `relationship` fact for that observation. For Hint 2, it picks the first `temporal` fact. For Hint 3, it picks the first `anchor` fact.

**Ordering within a type matters**: the first row of each type in `canonical-facts.csv` is selected. Place your strongest, most universally useful fact first within each type.

---

## After editing

Run the rebuild command to propagate changes from `canonical-facts.csv` to `world-model.json`:

```bash
cd planet1000
npm run fact-hunt -- rebuild
```

Then restart the dev server to pick up the updated world model:

```bash
npm run dev
```

> **Note:** `npm run build:data` regenerates `world-model.json` from the legacy `data/source/` pipeline and will overwrite hand-authored facts. Always run `npm run fact-hunt -- rebuild` after running `build:data`.
