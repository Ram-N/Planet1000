# Creator Preview Pages

A browser-based tool for reviewing upcoming puzzles without leaving the browser. Unlinked from the public site — navigate to it directly.

```
/creator          — dashboard: all upcoming weeks at a glance
/creator/<id>     — full puzzle preview: question, all 3 hints, answer, summary status
```

---

## Why it exists

Puzzles are authored weeks in advance. The previous workflow was:

```bash
npm run puzzle -- show puzzle_2026_w35   # CLI only, mental evaluation
```

The creator pages let you scan all upcoming puzzles in a table, spot broken hints (e.g. Hint 2 reveals the answer), and click into any puzzle to see everything at once — without running CLI commands.

---

## Dashboard (`/creator`)

Shows the current ISO week through the next 20 weeks. Past puzzles are excluded.

**Status labels:**

| Manifest exists | Generated exists | Label | Colour |
|-----------------|-----------------|-------|--------|
| ✓ | ✓ | Ready | green |
| ✓ | ✗ | Needs build | amber |
| ✗ | ✗ | Not created | slate |

**Each row shows:**
- Week ID (linked to the puzzle preview if any file exists)
- Publish date
- Domain badge
- Question (truncated to 80 chars) + first 8 words of each hint below it (H1 / H2 / H3)
- Answer (`160 / 1,000`)
- Status badge

The current week row is highlighted in emerald.

---

## Per-puzzle preview (`/creator/<id>`)

All content is visible at once — this is a review tool, not a game.

```
← Back to creator dashboard

puzzle_2026_w35 · 2026-W35 · 2026-08-25 · HOUSING

QUESTION
  Out of every 1,000 people on Earth...

ANSWER
  160 people out of 1,000
  [answer_explanation]

HINT 1 — Relationship  (shown after Guess 1)
  [relationship_fact.text]
  Source: ...

HINT 2 — Temporal  (shown after Guess 2)
  [temporal_fact.text]
  Source: ...

HINT 3 — Scale  (shown after Guess 3)
  [anchor_fact.text]
  Source: ...

SUMMARY
  summary_global_homelessness  ✓

OBSERVATION
  housing-homeless
```

Hints are labeled by slot name and when they appear in the game, so you can evaluate whether each hint is appropriate for its position — comparative for Hint 1, trend for Hint 2, concrete scale for Hint 3.

If the generated file hasn't been built yet, an amber notice is shown and hint/answer fields are omitted. The manifest fields (question, explanation) are still shown.

Returns 404 for IDs with no manifest and no generated file.

---

## Implementation

Both pages are Next.js App Router **server components** — they read the filesystem directly at render time with no API routes and no changes to `lib/puzzle-loader.ts`.

```typescript
const PUZZLES_DIR   = path.join(process.cwd(), 'data', 'puzzles');
const GENERATED_DIR = path.join(process.cwd(), 'data', 'generated', 'puzzles');
const SUMMARIES_DIR = path.join(process.cwd(), 'data', 'summaries');
```

The dashboard inlines the same ISO week arithmetic used in `scripts/puzzle.ts` (`getMondayOfISOWeek`, `getISOWeekId`) — no shared utility was created to keep the surface area small.

---

## Files

| File | Purpose |
|------|---------|
| `app/creator/page.tsx` | Dashboard server component |
| `app/creator/[id]/page.tsx` | Per-puzzle preview server component |

---

## Usage

```bash
npm run dev
# navigate to http://localhost:3000/creator
```

No authentication. This route is intentionally unlinked from the public site (security by obscurity). Refresh the page after running `npm run build:puzzles` to see updated content.
