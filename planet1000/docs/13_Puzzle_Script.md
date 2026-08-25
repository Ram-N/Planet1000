# Puzzle Script (`puzzle`)

`scripts/puzzle.ts` is a creator tool for managing Planet1000 weekly puzzles.

It provides three commands: **status**, **show**, and **new**. It reads puzzle files from `data/puzzles/` and artifact files from `data/artifacts/` but never writes to artifacts or the app itself — it only creates puzzle skeletons and displays existing content.

---

## Quick reference

```bash
npm run puzzle -- status
npm run puzzle -- show puzzle_2026_w35
npm run puzzle -- show next 3
npm run puzzle -- new 2026-W36
```

---

## Commands

### `status`

Lists every puzzle file found in `data/puzzles/`, with its publish date, domain, question preview, answer, and artifact link.

```
Planet1000 Weekly Puzzles
──────────────────────────────────────────────────────────────────────
2 puzzles on file

  2026-W35  2026-08-25  [housing]
    Q: Out of every 1,000 people on Earth, how many are homeless…
    A: 14 people  → artifact_global_homelessness

  2026-W36  2026-09-01  [healthcare]
    Q: Out of every 1,000 people on Earth, how many are doctors?
    A: 4 people  → artifact_global_doctors  ✗ MISSING
```

The `✗ MISSING` flag means the puzzle's `artifact_id` does not have a corresponding file in `data/artifacts/`. Fix by running `npm run artifact -- new <artifact_id>` and filling in the content.

---

### `show <puzzle-id>`

Pretty-prints the full content of one puzzle: question, all three facts with sources, answer with explanation, and artifact status.

```bash
npm run puzzle -- show puzzle_2026_w35
```

Output:

```
── puzzle_2026_w35 ─────────────────────────────────────────
Week:       2026-W35   (publishes 2026-08-25)
Domain:     housing

QUESTION
  Out of every 1,000 people on Earth, how many are homeless or living without adequate shelter?

ANSWER
  14 people out of 1,000
  Roughly 14 out of every 1,000 people worldwide lack adequate shelter...

HINT 1 — Relationship
  Africa accounts for the largest share...
  Source: UN-Habitat  <https://unhabitat.org>

HINT 2 — Temporal
  Global homelessness has worsened since 2000...
  Source: IDMC / UN-Habitat

HINT 3 — Anchor
  There are approximately 8 billion people on Earth...
  Source: UN World Population  <https://www.un.org/en/global-issues/population>

ARTIFACT
  artifact_global_homelessness  ✓
```

---

### `show next <n>`

Shows the next `n` puzzles counting from the current ISO week. Useful for verifying upcoming content without remembering puzzle IDs.

```bash
npm run puzzle -- show next 3
```

For weeks that have not been created yet, the script prints the scaffold command instead of puzzle content:

```
Next 3 puzzles from current week (2026-W35):

── 2026-W36  2026-09-01  [puzzle_2026_w36]
   ✗ Not created yet — run: npm run puzzle -- new 2026-W36

── 2026-W37  2026-09-08  [puzzle_2026_w37]
   ✗ Not created yet — run: npm run puzzle -- new 2026-W37

── 2026-W38  2026-09-15  [puzzle_2026_w38]
   ✗ Not created yet — run: npm run puzzle -- new 2026-W38
```

---

### `new <week-id>`

Scaffolds a new puzzle JSON file for the given ISO week.

```bash
npm run puzzle -- new 2026-W36
```

The script:
1. Parses and validates the week ID
2. Computes the Monday publish date
3. Prompts for domain and question
4. Writes a skeleton JSON to `data/puzzles/puzzle_2026_w36.json`
5. Prints next steps including the suggested artifact ID

**Week ID format:** `YYYY-WNN` — e.g. `2026-W36`, `2027-W01`.

**Output path:** `data/puzzles/<puzzle_id>.json`

After the script runs, open the file and fill in:
- `answer_value_1k` and `answer_unit`
- `answer_explanation`
- All three facts (`relationship_fact`, `temporal_fact`, `anchor_fact`) with text and source details
- `artifact_id` — replace the suggested placeholder with the real artifact ID once created

---

## Puzzle JSON structure

```json
{
  "id": "puzzle_2026_w35",
  "week_id": "2026-W35",
  "publish_date": "2026-08-25",
  "domain": "housing",
  "question": "Out of every 1,000 people on Earth, how many are homeless or living without adequate shelter?",
  "answer_value_1k": 14,
  "answer_unit": "people",
  "answer_explanation": "Roughly 14 out of every 1,000 people worldwide lack adequate shelter...",
  "relationship_fact": {
    "text": "Africa accounts for the largest share...",
    "source_label": "UN-Habitat",
    "source_url": "https://unhabitat.org"
  },
  "temporal_fact": {
    "text": "Global homelessness has worsened since 2000...",
    "source_label": "IDMC / UN-Habitat"
  },
  "anchor_fact": {
    "text": "There are approximately 8 billion people on Earth...",
    "source_label": "UN World Population",
    "source_url": "https://www.un.org/en/global-issues/population"
  },
  "artifact_id": "artifact_global_homelessness"
}
```

### Fact fields

Each of the three fact fields (`relationship_fact`, `temporal_fact`, `anchor_fact`) has the same shape:

| Field | Required | Description |
|-------|----------|-------------|
| `text` | yes | One sentence. The hint text shown to the player. |
| `source_label` | no | Short display name of the source (e.g. "UN-Habitat") |
| `source_url` | no | Full URL to the primary source |

### Hint order

The three facts correspond to the three hint slots in the 4-guess game:

| Hint | Shown after | Fact field | Purpose |
|------|-------------|------------|---------|
| 1 | Guess 1 | `relationship_fact` | Comparative/geographic context |
| 2 | Guess 2 | `temporal_fact` | Trend and direction over time |
| 3 | Guess 3 | `anchor_fact` | Concrete number — best calibration before the final guess |

Write each fact with its slot in mind. The anchor fact should contain the most specific numerical reference — it is the last hint the player sees before their final guess.

---

## Workflow: creating a new weekly puzzle

1. **Scaffold the puzzle file**
   ```bash
   npm run puzzle -- new 2026-W36
   # Fill in data/puzzles/puzzle_2026_w36.json
   npm run puzzle -- show puzzle_2026_w36
   ```

2. **Create and fill the knowledge artifact**
   ```bash
   npm run artifact -- new artifact_global_doctors
   # Fill in data/artifacts/artifact_global_doctors.json
   npm run artifact -- validate artifact_global_doctors
   ```

3. **Set `artifact_id` in the puzzle to match**
   Edit `data/puzzles/puzzle_2026_w36.json` and replace the `artifact_id` placeholder with `artifact_global_doctors`.

4. **Register both in `lib/puzzle-loader.ts`**
   ```ts
   import puzzle_2026_w36         from '@/data/puzzles/puzzle_2026_w36.json';
   import artifact_global_doctors from '@/data/artifacts/artifact_global_doctors.json';
   ```
   Add the puzzle to `ALL_PUZZLES` and the artifact to `ALL_ARTIFACTS`.

5. **Verify everything links**
   ```bash
   npm run puzzle -- status
   npm run artifact -- status
   ```

---

## Files

| Path | Purpose |
|------|---------|
| `data/puzzles/<id>.json` | Weekly puzzle content (created by `new`, edited manually) |
| `data/artifacts/<id>.json` | Knowledge artifacts (created by `artifact new`, edited manually) |
| `lib/puzzle-loader.ts` | Static index — import new puzzles and artifacts here |
| `scripts/artifact.ts` | Companion tool for knowledge artifact management |
| `docs/12_Artifact_Script.md` | Reference for the `artifact` script |
