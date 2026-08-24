# Phase 6: Entity Relationships + Advanced Chain Generator

## Status: Planned (not yet implemented)

**Prerequisites:** Phases 1–5 must be solid and tested before starting this phase.

---

## Goal

Replace the manually authored `chains.json` (12 hardcoded daily chains) with a data-driven `ChainGenerator` that builds Fermi-style estimation chains by traversing entity relationships defined in a CSV.

This extends the World Model principle to chains: store relationships once, derive all chains from them.

---

## The Problem with chains.json

The current `data/chains.json` has these limitations:

- **Manually authored**: Each chain and its narrative thread is hand-written
- **Fixed count**: Exactly 12 chains; adding one requires editing JSON by hand
- **No provenance**: No connection to the World Model entities
- **Narrative coupling**: The `followUpIntro` text is written per-question, making bulk changes painful
- **No extensibility**: Can't generate chains for new domains without writing them from scratch

---

## Proposed Solution

### 1. Add `relationships.csv`

A new source file that connects entities through causal or thematic links:

```
data/source/relationships.csv
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Unique relationship ID |
| `from_entity_id` | string | Source entity (FK → entities.csv) |
| `to_entity_id` | string | Target entity (FK → entities.csv) |
| `relationship_type` | string | `causes`, `enables`, `requires`, `correlates_with` |
| `direction` | string | `positive` / `negative` / `neutral` |
| `transition_text` | string | Narrative bridge shown between questions |
| `domain` | string | Primary domain for this link |

**Example rows:**

```csv
id,from_entity_id,to_entity_id,relationship_type,direction,transition_text,domain
rel-cars-co2,cars,co2-per-capita,causes,positive,"Those cars burn fuel. Let's look at what that means for emissions...",environment
rel-farmers-food,agricultural-workers,food-calories,enables,positive,"All those farmers produce our food supply. How much do they grow?",food
rel-no-electricity-poverty,people-without-electricity,extreme-poor,correlates_with,positive,"Lack of electricity and poverty are closely linked. Let's look at extreme poverty...",energy
rel-urban-homeless,urban-residents,people-inadequate-housing,correlates_with,positive,"Rapid urbanisation brings a housing challenge. How many lack adequate shelter?",housing
rel-doctors-life-expectancy,doctors,life-expectancy,enables,positive,"Medical care shapes how long we live. What's the global life expectancy?",healthcare
```

---

### 2. Build `ChainGenerator` class

**File:** `planet1000/lib/chain-generator.ts`

```typescript
interface EntityRelationship {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: 'causes' | 'enables' | 'requires' | 'correlates_with';
  direction: 'positive' | 'negative' | 'neutral';
  transition_text: string;
  domain: string;
}

class ChainGenerator {
  constructor(
    private worldModel: WorldModel,
    private relationships: EntityRelationship[]
  ) {}

  /**
   * Find all entities reachable from a starting entity
   * up to `maxDepth` steps along relationship edges.
   */
  traverse(startEntityId: string, maxDepth = 3): EntityRelationship[][]

  /**
   * Build QuestionChain objects by:
   * 1. Picking a seed entity per domain
   * 2. Traversing relationships to find connected entities
   * 3. Looking up observations for each entity
   * 4. Generating ChainQuestion objects from those observations
   */
  generateChain(seedEntityId: string, maxLength?: number): QuestionChain | null

  /**
   * Generate one chain per domain, suitable for daily rotation.
   */
  generateAllChains(): QuestionChain[]
}
```

---

### 3. Update `daily.ts`

Replace the static JSON import:

```typescript
// Before
import chainsData from '@/data/chains.json';
const chains = chainsData as QuestionChain[];

// After
import { chainGenerator } from '@/lib/chain-generator-instance';
const chains = chainGenerator.generateAllChains();
```

---

### 4. Add to build pipeline

**Update `scripts/build-world-model.ts`** to also parse `relationships.csv` and include the relationship graph in `world-model.json`:

```typescript
// In WorldModelData interface (types/world-model.ts)
relationships: EntityRelationship[];
```

**Update `scripts/validate.ts`** to validate:
- `from_entity_id` and `to_entity_id` exist in `entities.csv`
- No circular chains of length < 3 (would make trivial chains)
- `relationship_type` is one of the valid enum values

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `data/source/relationships.csv` |
| Create | `lib/chain-generator.ts` |
| Create | `lib/chain-generator-instance.ts` |
| Update | `lib/daily.ts` (use generator instead of static JSON) |
| Update | `types/world-model.ts` (add `EntityRelationship` type) |
| Update | `scripts/build-world-model.ts` (parse relationships.csv) |
| Update | `scripts/validate.ts` (validate relationship refs) |
| Delete | `data/chains.json` (replaced by generator) |

---

## Design Decisions to Resolve Before Starting

### A. How many questions per chain?

Current chains have exactly 3 questions each. Generated chains could vary. Options:
- Fixed length (always 3, pad with filler if graph is shallow)
- Variable length (2–5, based on available relationships)
- **Recommended**: Target 3, accept 2–4 as valid

### B. How to handle chains that cross domains?

The current chains often bridge domains (e.g., flights → fuel → CO₂). The relationship graph must support cross-domain edges. The `domain` column on relationships captures the primary theme.

### C. Daily rotation strategy

The current approach: `chains[dayIndex % chains.length]` — deterministic for all users.

With generated chains, the pool may change as data grows. Options:
- Regenerate pool at build time, keep same cycling logic
- Seed-based random selection (same seed → same chain per day for all users)
- **Recommended**: Generate pool at build time, persist in `world-model.json`

### D. `followUpIntro` quality

The `transition_text` in `relationships.csv` drives the narrative thread shown between questions. Good transition text requires care — it's the most "human" part of the chain experience. The generator can fall back to a generic template if `transition_text` is empty.

---

## Acceptance Criteria

1. `npm run build:data` parses `relationships.csv` with zero validation errors
2. `ChainGenerator.generateAllChains()` returns ≥ 12 chains (matching current pool size)
3. Each generated chain has 2–4 questions derived from WorldModel observations
4. The `followUpIntro` text between questions is meaningful (either from `transition_text` or a sensible template fallback)
5. The Chain Reaction game loads and plays correctly using generated chains
6. Daily rotation is deterministic: same day = same chain for all users
7. `chains.json` is deleted; no static chain data remains

---

## Relationship Graph Seed Data

Initial `relationships.csv` should cover the main cross-domain story threads currently in `chains.json`:

| Theme | Entities in chain |
|-------|-------------------|
| Food | agricultural-workers → food-calories → food-waste |
| Water | freshwater-use → people-without-safe-water |
| Energy | electricity-use → people-without-electricity → renewable-electricity |
| Climate | cars → co2-per-capita → annual-forest-loss |
| Health | doctors → nurses-midwives → life-expectancy |
| Poverty | extreme-poor → people-inadequate-housing → out-of-school-children |
| Connectivity | internet-users → smartphone-owners |
| Aviation | commercial-flights → co2-per-capita |
| Demographics | children-under-15 → out-of-school-children → literate-adults |
| Displacement | forcibly-displaced → people-inadequate-housing → extreme-poor |
