You are guiding the user through creating a new Planet1000 weekly puzzle. This is a highly interactive workflow — you MUST stop and wait for user input at every **STOP** marker before proceeding.

**Default-first rule**: At every STOP, always show a clear default in brackets, e.g. `[↵ yes]`. If the user sends an empty message, a single return, "y", "yes", "ok", "looks good", "lgtm", or any other short affirmative, treat it as accepting the default and move on immediately. Only pause for real input when there is no sensible default (e.g. fact text the user must supply from a source).

Work from the `/home/ram/projects/Planet1000/planet1000` directory for all commands.

---

## Phase 1 — Determine target week

1. Run `npm run puzzle -- status` to list existing puzzles.
2. Identify the highest existing week number, increment by 1 → `target_week`.
3. Calculate the publish date = Monday of that ISO week.

**STOP**: Display:

> Creating puzzle for **`<target_week>`**, publish date **`<date>`**.
> `[↵ yes]` — or type a different week ID to override.

---

## Phase 2 — Pick observation

1. Read `data/schedule.json` — check for a planned observation for the target week.
2. Read `data/generated/world-model.json` — list unused observations (not in any `data/puzzles/` manifest).
3. Compute `answer_value_1k = Math.round(value / 8_100_000_000 * 1000)` for each.

**STOP**: Show a numbered table of up to 6 candidates (scheduled recommendation first, if any):

| # | observation_id | Entity | answer_value_1k |
|---|----------------|--------|----------------|
| 1 | `...` ← **default** | ... | .../1000 |
| 2 | `...` | ... | .../1000 |
| ...

> `[↵ 1]` — or type a number or a different observation_id.

Accept the default or the user's choice. Derive `domain` from the observation_id prefix (everything before the first `-`).

---

## Phase 3 — Draft the manifest

1. Compute `answer_value_1k` from the selected observation.
2. Propose a question: "Out of every 1,000 people on Earth, how many [...]?"

**STOP**:
> **Proposed question:** "[question text]"
> `[↵ approve]` — or type a replacement.

3. Propose a 2–3 sentence `answer_explanation` (contextualises the answer without revealing the number upfront).

**STOP**:
> **Proposed explanation:** "[explanation text]"
> `[↵ approve]` — or type a replacement.

4. Propose a `summary_id` slug: `summary_global_<topic>`.

**STOP**: Show the complete manifest JSON:

```json
{
  "id": "<observation_id>",
  "domain": "<domain>",
  "observation_id": "<observation_id>",
  "question": "<question>",
  "answer_explanation": "<explanation>",
  "summary_id": "<summary_id>"
}
```

> `[↵ write file]` — or describe a change.

Write directly to `data/puzzles/<observation_id>.json` — do NOT run the interactive `puzzle new` script.

Also add the week→puzzle mapping to `data/puzzle-schedule.json`:
```json
{
  ...(existing entries),
  "<target_week>": "<observation_id>"
}
```

Write the updated `data/puzzle-schedule.json`.

---

## Phase 4 — Canonical facts

1. Run `npm run fact-hunt -- hunt <observation_id>`.
2. Show counts: relationship / temporal / scale.

**If all three types already have at least one fact**, skip to the fact-hunt status check below.

For each type where count = 0, there is no default — the user must supply the text. Explain what the type means, show the entity and answer_value_1k as context, then ask:

> Please provide the **[type]** fact:
> - **Text** (do not state the world per-1k figure directly)
> - **Source** (e.g. "World Bank 2023")
> - **Year**

After the user responds, echo back what you will write and ask:

**STOP**:
> Writing: "[text]" — source: [source], year: [year]
> `[↵ yes]` — or correct any field.

Append accepted rows to `data/canonical-facts/<domain>.csv`, then run `npm run build:data` to fold them into world-model.json.

After all types are covered, run `npm run fact-hunt -- hunt <observation_id>` and show the updated counts.

**STOP**:
> All three fact types satisfied. `[↵ continue to Phase 5]`

---

## Phase 5 — Build and preview

1. Run `npm run build:puzzles`.
2. Run `npm run puzzle -- show <observation_id>`.

**STOP**: Show the full output, then:
> Does the puzzle look correct? Check answer value and that no hint gives away the answer.
> `[↵ looks good]` — or say which hint type to fix and provide new text.

If edits are requested: update the CSV, rebuild, re-show. Repeat until approved.

---

## Phase 6 — Summary source material

Explain: "The summary is a post-game knowledge article shown after the player guesses. It can include bar charts, tables, bullet lists, and sources."

**STOP** (no default — user must act):
> Place source material for `<summary_id>` in:
> `data/source/summary-input/<summary_id>/`
> (screenshots `.png/.jpg`, data `.txt/.md`, or URLs in a text file)
> Reply when ready.

---

## Phase 7 — Generate and review summary

Do NOT run `npm run summary -- build`. Instead:

1. List all files in `data/source/summary-input/<summary_id>/`.
2. Read every file in that directory directly — images, text files, whatever is there.
3. **Before writing anything**, check for denominator mismatches: source charts often show figures "per 1,000 workers" or "per 1,000 employed" — a workforce denominator (~3–4B). The puzzle answer uses total world population (8.1B) as the denominator. These will produce different numbers for the same observation and will confuse the player. Specifically:
   - If a source shows a "global average" or "world total" figure that differs from `answer_value_1k`, do NOT include that figure as a standalone bar or table row — it will look like a contradiction.
   - Regional breakdowns (Africa, Asia, individual countries) are fine to include even when they use a workforce denominator, as long as the chart heading or caption makes the denominator explicit (e.g. "per 1,000 employed").
   - The historical trend charts are also fine — label them clearly as workforce-relative if that's what they show.
4. Based on what you read, write `data/summaries/<summary_id>.json` yourself, following the existing summary format (see `data/summaries/summary_global_homelessness.json` as the canonical example). Include:
   - A `bullet_list` section for key takeaways
   - One or more `bar_chart` sections for any chart data visible in the sources
   - A `table` section if tabular data is present
   - A `sources` section with attribution
5. Run `npm run summary -- validate <summary_id>` to check the schema.

**STOP**:
> Summary written to `data/summaries/<summary_id>.json`.
> `[↵ looks good]` — or describe sections to fix.

If edits are needed, make them directly to the JSON file and re-validate.

---

## Phase 8 — Rebuild and final checks

1. Confirm `summary_id` is set in the manifest. Update if not.
2. Run `npm run build:puzzles`.
3. Run `npm run summary -- status`.
4. Run `npx tsc --noEmit`.
5. Run `npm run puzzle -- status`.

**STOP**: Show all results, then:
> All checks passed. `[↵ commit and push]` — or flag any issue.

---

## Phase 9 — Commit and push

Stage and commit:
```
data/puzzle-schedule.json
data/puzzles/<observation_id>.json
data/generated/puzzles/<observation_id>.json
data/summaries/<summary_id>.json
data/canonical-facts/<domain>.csv
lib/puzzle-loader.ts
```

Commit message: `feat(puzzle): add <week_id> <observation_id>`

Push to remote, then:

> Pushed. Vercel will deploy automatically. Puzzle `<week_id>` is live.
