# Planet1000 — Quick Start

**Educational game** that scales the world to 1,000 people to build quantitative intuition about global statistics.

## What Is This?

A Next.js app with 4 game mechanics, all powered by static JSON data (no backend):

| Mode | Route | Description |
|------|-------|-------------|
| The World of 1,000 | `/play/world-of-1000` | Estimate how many of 1,000 people share a trait |
| Estimate → Explain → Reveal | `/play/estimate-explain` | Guess + explain reasoning before reveal |
| The World in a Box | `/play/world-in-a-box` | Drag to visually subdivide a rectangle of 1,000 people |
| Daily World Question | `/play/daily` | One topic/day explored through a chain of questions |

## Start Dev Server

```bash
cd /home/ram/projects/Planet1000/planet1000
npm run dev
# → http://localhost:3000
```

## Build for Production

```bash
npm run build
npm start
```

## Key Files

| File | Purpose |
|------|---------|
| `data/stats.json` | 27 world statistics (the data backbone) |
| `data/questions.json` | 18 questions for Mechanics 1 & 2 |
| `data/chains.json` | 12 daily question chains (~3 weeks coverage) |
| `types/index.ts` | All TypeScript interfaces |
| `lib/scoring.ts` | Proximity-based scoring (within 5% = 100 pts) |
| `lib/daily.ts` | Day-index logic + localStorage persistence |

## Tech Stack

- **Next.js 16** (App Router, TypeScript, static export)
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **localStorage** — scores, streaks, daily progress (no auth needed)

## No Backend Required

All data is in `data/*.json`. Scores persist via `localStorage`. No `.env` file needed.

## Adding Content

- **New stats**: Add entries to `data/stats.json` following the `WorldStat` interface
- **New questions**: Add to `data/questions.json` referencing a `statId`
- **New daily chains**: Add to `data/chains.json` — they cycle automatically by day index

## Deploy

```bash
vercel --prod
```
