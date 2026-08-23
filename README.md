# Planet1000

An educational game that scales the entire world down to **1,000 people**, building intuitive understanding of global statistics.

> *"Let's shrink the world until you can understand it."*

## What is Planet1000?

The world has ~8 billion people. 8,000,000,000 is too large to reason about. But if the world had exactly 1,000 people — every number becomes tangible.

- **257** children under 15
- **4** doctors
- **570** city-dwellers
- **87** people in extreme poverty
- **670** with internet access

These are real numbers, scaled from actual world data.

## Game Modes

### 1. The World of 1,000
Classic estimation: guess how many of 1,000 people share a given trait. Scored by proximity — being within 5% earns 100 points.

### 2. Estimate → Explain → Reveal
Extends Mode 1 with a reasoning step. After entering your estimate, you explain *why* before the reveal. Good reasoning earns bonus points even if your number is off.

### 3. The World in a Box
Visual rectangle = 1,000 people. Drag sliders to divide it progressively — children/adults, urban/rural, employed/not. Reveals how the real world subdivides.

### 4. Daily World Question
One topic per day, explored through a chain of 3–5 connected questions (e.g., aviation → fuel → CO₂ → climate). Progress saved in localStorage; returns to your spot on reload.

## Local Development

```bash
cd planet1000
npm install
npm run dev
# → http://localhost:3000
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** — utility styling
- **Framer Motion** — animations
- **Static JSON** — all world data in `data/` — no backend, no database

## Data Sources

All statistics in `data/stats.json` are sourced from World Bank, UN Population Division, WHO, IEA, UNHCR, and ITU. Scale factor: `value_1k = value_world / (world_pop / 1000)` using ~10B world population.

## Project Structure

```
planet1000/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Home page
│   ├── layout.tsx          # Root layout + nav
│   ├── play/
│   │   ├── world-of-1000/  # Mechanic 1
│   │   ├── estimate-explain/ # Mechanic 2
│   │   ├── world-in-a-box/ # Mechanic 3
│   │   └── daily/          # Mechanic 4
│   └── stats/              # Score/streak summary
├── components/             # Shared UI components
│   └── ui/                 # Primitives (Button, Card, etc.)
├── data/                   # Static JSON (stats, questions, chains)
├── lib/                    # Utilities (scoring, questions, daily logic)
└── types/                  # TypeScript interfaces
```

## Deployment

```bash
vercel --prod
```
