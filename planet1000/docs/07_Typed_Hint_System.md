# Typed Hint System

**Implemented:** 2026-08-24

This document describes the typed fact system that replaced the old index-ordered `string[]` approach, and the `fact-hunt` CLI for ongoing fact maintenance.

---

## The problem it solved

The old `facts: string[]` array had no type distinction. The hint engine used array index order to decide which facts appeared in which hint phase (`[0,1]` for THINK, `[2,3]` for REFINE). This had no enforcement, so answer-revealing facts slipped in. For example, the housing observation had:

```
"An estimated 1.6 billion people live in inadequate housing..."
```

1.6B ÷ world population × 1,000 = 160 — the exact answer. Hint 2 told players the answer.

---

## What changed

### Fact type system

`Observation.facts` is now `Fact[]` instead of `string[]`.

```ts
type FactType = 'relationship' | 'anchor';

interface Fact {
  text: string;
  type: FactType;
}
```

**`relationship`** — Hint 1 (THINK phase)
- Comparisons between regions, income groups, genders
- Ratios: "X times more common in Y than Z"
- Historical trends: "has doubled since 2000"
- Structural inequalities
- **Rule:** must NOT contain a world total that divides directly to the per-1k answer

**`anchor`** — Hint 2 (REFINE phase)
- One specific number for one country or region
- Strictly less than the global total
- Requires the player to extrapolate ("that's just Nigeria — what about the rest?")
- **Rule:** must NOT be the global total

### Hint engine selection

`selectHint()` now filters by type instead of picking by index:

| Phase | Preferred type | Fallback |
|-------|---------------|---------|
| THINK (guess 1) | `relationship` (up to 2) | any unused fact |
| REFINE (guess 2) | `anchor` (1 fact) | any unused fact |

`HintResponse.facts` is still `string[]` (text extracted from the typed facts), so the UI layer (`page.tsx`, `HintBox`) needed no changes.

### Files changed

| File | What changed |
|------|-------------|
| `types/world-model.ts` | Added `FactType`, `Fact`; changed `Observation.facts: string[]` → `Fact[]` |
| `types/index.ts` | Exported `FactType`, `Fact`; updated `Question.facts` to `Fact[]` |
| `lib/hint-engine.ts` | Type-based selection replaces index-based selection |
| `data/generated/world-model.json` | All 28 observations converted to typed `Fact[]` |
| `scripts/fact-hunt.ts` | New: creator CLI (see below) |

---

## fact-hunt CLI

A creator-only tool for maintaining and growing the fact pool. Run from the `planet1000/` directory.

### Commands

```bash
# Overview — run this periodically
npx tsx scripts/fact-hunt.ts status
```
Shows total relationship/anchor counts, and flags any observations with zero anchors or zero relationship facts.

```bash
# Research prompts for a specific observation
npx tsx scripts/fact-hunt.ts hunt [observation-id]
```
Generates 5 research prompts biased toward gaps (if an observation is short on anchors, the prompts push anchors). Displays the per-1k answer as a reminder of what NOT to put in a fact.

```bash
# Add a fact interactively
npx tsx scripts/fact-hunt.ts add [observation-id]
```
Prompts for type, fact text, and optional source URL + year. Shows a preview before writing to `world-model.json`.

### Example workflow

```bash
npx tsx scripts/fact-hunt.ts status
# → see which observations need more anchor facts

npx tsx scripts/fact-hunt.ts hunt water-no-clean
# → read the research prompts, do the research

npx tsx scripts/fact-hunt.ts add water-no-clean
# → paste the new fact, confirm
```

---

## Current fact counts (as of implementation)

```
Questions:      28
Relationship:   52 facts
Anchor:         28 facts
Total:          80 facts
```

Each observation has at least 1 relationship + 1 anchor. Most have 2–3 relationship + 1 anchor. Running `status` will show where the gaps are.

---

## Writing good facts

### Relationship facts

| Do | Don't |
|----|-------|
| "In Ethiopia over 70% work the land, while in the UK it's under 2%" | "28% of the global workforce is in agriculture" (28% × 1000 = 280 = the answer) |
| "The richest 10% account for about half of all global carbon emissions" | "The global average is 4.6 tonnes per person per year" (= the answer) |
| "Access has roughly doubled since 2000, but gaps remain large" | Any sentence with the world total |

### Anchor facts

| Do | Don't |
|----|-------|
| "In Nigeria alone, an estimated 40–50 million people live in substandard housing" | "1.6 billion people live in inadequate housing" (= world total → answer) |
| "Sub-Saharan Africa generates about 1% of global electricity despite holding 15% of the population" | Any percentage or number that lets the player calculate the world total |
| "Chad has fewer than 10% of its population with electricity access" | Round numbers that happen to equal the per-1k answer |

### Anchor size check

Before adding an anchor, mentally verify: can a player divide this number by world population to get close to the answer? If yes, it's not an anchor — it's an answer. Replace it with a partial regional figure.

---

## Periodic maintenance checklist

Run these checks whenever adding new observations or editing existing ones:

```bash
cd planet1000

# 1. Check fact balance
npx tsx scripts/fact-hunt.ts status

# 2. Confirm JSON is still valid
node -e "JSON.parse(require('fs').readFileSync('data/generated/world-model.json','utf8')); console.log('OK')"

# 3. Confirm TypeScript is still happy
npx tsc --noEmit

# 4. Start dev server and play a round
npm run dev
# → open http://localhost:3000/play/planet1000
# → play a housing, water, or energy question
# → verify Hint 1 has no world total, Hint 2 has a regional anchor
```

---

## Relationship to the old facts guide

`docs/06_Facts_Authoring_Guide.md` describes the previous CSV-based pipeline and the old six-type taxonomy (`scale_anchor`, `geographic`, `inequality`, `comparison`, `trend`, `general`). That pipeline no longer drives hint selection. Facts now live directly in `world-model.json` as typed objects and are maintained via `fact-hunt`. The CSV source files and build pipeline still exist but the hint engine no longer reads from them.
