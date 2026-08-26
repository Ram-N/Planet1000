# Planet 1000 — Gameplay & Knowledge Ecosystem Redesign

## 1. Overview

Planet 1000 should be redesigned from a **daily estimation game** into a **weekly estimation-and-learning experience**.

The fundamental idea remains:

> **Estimate how many out of 1,000 something there are.**

But the experience becomes richer and more deliberate.

Each week, players receive **one carefully researched puzzle**. They get **four guesses**, with progressively more useful information revealed between guesses. After the final guess, the game transitions into a substantial **learning summary** containing visualizations, tables, explanations, historical context, and links to reliable sources.

The long-term goal is not merely to create a collection of 52 puzzles per year.

It is to build a growing **ecosystem of quantitative knowledge artifacts** that can be reused across multiple puzzles.

---

# 2. Product Philosophy

Planet 1000 should optimize for:

* Interesting questions rather than quantity of questions
* Estimation skill rather than trivia recall
* Progressive discovery rather than immediately revealing the answer
* Learning rather than simply scoring
* High-quality visual explanations
* Reliable sourcing
* Reusable research
* A growing interconnected knowledge base

The target experience is:

> **Guess → Learn → Explore**

The player initially knows very little.

Through four guesses and three progressively revealed fact types, they develop an increasingly informed estimate.

After the game, they can explore the topic in much greater depth.

---

# 3. Weekly Rather Than Daily

## Current direction

The game should **not be a daily challenge**.

There should be:

> **One new Planet 1000 puzzle per week.**

This gives the creator enough time to properly research and construct each question.

A weekly cadence also makes each puzzle feel more substantial and gives the post-game educational material room to become an important part of the experience.

### Target volume

Approximately:

* 1 puzzle/week
* ~52 puzzles/year

Quality is more important than volume.

A single excellent Planet 1000 puzzle should be capable of providing several minutes of interesting exploration.

---

# 4. Core Gameplay

Each puzzle asks a quantitative question whose answer can naturally be expressed as a number **out of 1,000**.

Examples:

> How many people out of every 1,000 are doctors?

> How many people out of every 1,000 own a car?

> How many people out of every 1,000 live in cities?

> How many people out of every 1,000 have access to electricity?

The exact domains can vary widely.

Possible domains include:

* People
* Health
* Education
* Wealth
* Food
* Energy
* Transportation
* Housing
* Technology
* Environment
* Agriculture
* Geography
* Resources
* Economics
* Demographics

---

# 5. Four Guesses

The player gets **four total guesses**.

This is an intentional change from the previous three-guess system.

The four-guess structure is important because it gives the game enough room to introduce progressively useful information.

The basic flow is:

```text
Question
   ↓
Guess 1
   ↓
Scale Fact revealed
   ↓
Guess 2
   ↓
Relationship Fact revealed
   ↓
Guess 3
   ↓
Temporal Fact revealed
   ↓
Guess 4
   ↓
Final Answer
   ↓
Summary / Exploration
```

The player should never feel that the hints simply give away the answer.

Instead, each hint should allow the player to **narrow their estimate**.

---

# 6. Three Types of Facts

Planet 1000 should now support three distinct categories of supporting facts.

## 6.1 Scale Facts

An scale fact provides a concrete numerical reference point.

Its purpose is to help the player understand **scale**.

Example:

> There are approximately 3 million doctors in the world.

Or:

> About 8 billion people live on Earth.

The scale should help the player establish an order of magnitude or general scale.

---

## 6.2 Relationship Facts

A relationship fact explains how the target quantity relates to another quantity.

It answers questions such as:

* How many per X?
* How much more?
* How much less?
* What percentage?
* What ratio?
* How does this compare with another group?

Example:

> There is approximately one doctor for every 500 people in some high-income countries.

Or:

> The number is roughly twice as high in Country A as in Country B.

The purpose is to give the player **context and relative position**.

---

## 6.3 Temporal Facts

Temporal facts are the new third category.

They introduce **change over time**.

Examples:

> In 2000, the figure was approximately 1.2 per 1,000. Today it is approximately 1.7.

Or:

> The figure has increased by about 40% over the past 20 years.

Or:

> The number has remained relatively stable since 2010.

Temporal facts can communicate:

* Historical values
* Growth
* Decline
* Rate of change
* Acceleration
* Stability
* Long-term trends

The purpose is to help the player understand **direction and trajectory**, not just magnitude.

---

# 7. Progressive Information Design

The three facts should be revealed progressively.

A suggested structure is:

### Before Guess 1

The player sees only the question.

This is the purest estimation opportunity.

---

### After Guess 1

Reveal the **Scale Fact**.

The player now has a better sense of scale.

---

### After Guess 2

Reveal the **Relationship Fact**.

The player can now place the target relative to something else.

---

### After Guess 3

Reveal the **Temporal Fact**.

The player now understands how the number has changed over time.

---

### Guess 4

The player makes the final estimate using all available information.

---

# 8. Important Design Principle: Hints Should Inform, Not Reveal

The hints should not be constructed so that the player can trivially calculate the answer.

The objective is to create a progressive reasoning experience.

For example:

```text
Question
    ↓
"I have no idea."
    ↓
Scale
    ↓
"Okay, I know roughly how big this is."
    ↓
Relationship
    ↓
"I can narrow it down."
    ↓
Temporal
    ↓
"Now I have a pretty good idea."
    ↓
Final guess
```

The player should feel their understanding improving.

---

# 9. Scoring

The four guesses should have different strategic value.

Earlier guesses should be worth more.

A possible scoring structure:

| Guess   | Maximum multiplier |
| ------- | -----------------: |
| Guess 1 |               100% |
| Guess 2 |                75% |
| Guess 3 |                50% |
| Guess 4 |                25% |

The exact scoring formula can remain based on **distance from the true answer**.

For example, if the true answer is 40 and the player guesses 42, that should score substantially better than a guess of 100.

The game therefore rewards both:

1. **Accuracy**
2. **Confidence under uncertainty**

A player who makes a very good estimate early should outperform a player who waits for every hint.

---

# 10. Summary Is a Major Part of the Game

The final answer should **not be the end of the experience**.

It should be the beginning of the learning phase.

Every Planet 1000 question should eventually lead to a carefully constructed **Summary Artifact**.

The creator should have considerable freedom to build this artifact.

It may contain:

* A large infographic
* Summary tables
* Charts
* Maps
* Historical graphs
* Comparisons
* Key observations
* Explanations
* Definitions
* Interesting related statistics
* External links
* Primary sources
* Further reading

The goal is:

> **The game teaches the player the estimate. The summary helps them understand the world behind the estimate.**

---

# 11. The Summary Artifact

Each puzzle should have a structured summary associated with it.

Conceptually:

```text
Puzzle
 ├── Question
 ├── Answer
 ├── Scale Fact
 ├── Relationship Fact
 ├── Temporal Fact
 ├── Scoring
 │
 └── Summary Artifact
      ├── Overview
      ├── Key Number
      ├── Explanation
      ├── Infographic
      ├── Tables
      ├── Charts
      ├── Historical Context
      ├── Comparisons
      ├── Key Takeaways
      ├── Sources
      └── Related Artifacts
```

The Summary Artifact should be treated as a first-class piece of content, not merely a block of text appended to the puzzle.

---

# 12. Creator-Produced Visual Material

The creator should be able to spend substantially more time on these summaries.

For example, a summary could contain a custom infographic showing:

> 1,000 dots representing the population, with 7 highlighted.

Or a chart showing:

```text
2000 ──────── 2010 ──────── 2020 ──────── 2026
  1.2             1.4             1.6             1.7
```

Or a comparison table:

| Country   | Per 1,000 |
| --------- | --------: |
| Country A |       2.1 |
| Country B |       1.8 |
| Country C |       1.2 |
| World     |       1.7 |

The game should not constrain the creator to a particular presentation format.

The summary system should support rich, custom content.

---

# 13. External Sources and Links

Sources are an important part of the Summary Artifact.

Each summary should be able to link to external sources.

These might include:

* Government agencies
* International organizations
* Research institutions
* Academic publications
* Statistical databases
* High-quality reference sources
* Original datasets

The player should be able to click through and investigate further.

This creates a natural transition:

> Planet 1000 → summary → source → deeper exploration

The game therefore acts as a gateway into reliable quantitative information rather than pretending to be the final authority.

---

# 14. The Knowledge Ecosystem

The most important architectural idea is that the summaries should become **reusable knowledge assets**.

Do not treat each puzzle as an isolated piece of content.

Instead:

```text
                  ┌───────────────┐
                  │ Knowledge     │
                  │ Artifacts     │
                  └───────┬───────┘
                          │
            ┌─────────────┼─────────────┐
            ↓             ↓             ↓
         Puzzle A      Puzzle B      Puzzle C
            │             │             │
            └─────────────┼─────────────┘
                          ↓
                     New Puzzle
```

A piece of research created for one question should be available for reuse in future questions.

---

# 15. Example of Reuse

Suppose the creator builds a detailed artifact:

## Global Population

It contains:

* Population in 2000
* Population today
* Regional population
* Growth rates
* Urbanization
* Population projections
* Historical graphs
* Data sources

A future puzzle about doctors might use the population data.

A future puzzle about cars might use it.

A future puzzle about electricity might use it.

A future puzzle about food consumption might use it.

The creator should not have to reconstruct this information every time.

---

# 16. Related Artifacts

Artifacts should be able to link to one another.

For example:

```text
Doctors
   ↓
Population
   ↓
Healthcare
   ↓
Life Expectancy
   ↓
Education
```

Or:

```text
Cars
   ↓
Transportation
   ↓
Oil Consumption
   ↓
Energy
   ↓
CO₂ Emissions
```

This gradually creates a network of quantitative knowledge.

---

# 17. The Long-Term Vision

Over time, Planet 1000 should become something more than a collection of weekly games.

It should become:

> **A visual, interactive encyclopedia of quantities that happen to be explored through estimation games.**

The weekly game provides the entry point.

The Summary Artifact provides the learning experience.

The underlying knowledge ecosystem provides the long-term value.

---

# 18. Content Model

The architecture should therefore separate at least three concepts:

## Puzzle

The playable weekly experience.

Contains:

* ID
* Question
* Domain
* Unit / scale
* Correct answer
* Answer explanation
* Four-guess configuration
* Scale fact
* Relationship fact
* Temporal fact
* Scoring information
* Summary artifact reference

---

## Knowledge Artifact

A reusable body of researched information.

Contains:

* ID
* Title
* Description
* Topic/domain
* Key statistics
* Tables
* Charts
* Historical data
* Geographic data
* Explanations
* Sources
* Related artifacts

A knowledge artifact should be reusable by multiple puzzles.

---

## Source

A source supporting information in an artifact.

Contains things such as:

* Title
* Publisher
* URL
* Publication date, where relevant
* Data date
* Description
* What information it supports

Sources should be attached to the relevant claims or sections whenever practical.

---

# 19. Reusability Is a Core Requirement

When building new content, the creator should be encouraged to ask:

> "Does this belong only to this puzzle, or is this a reusable piece of knowledge?"

If reusable, it should be stored as an artifact.

For example:

**Bad architecture:**

```text
Puzzle 17
 └── population data copied into puzzle JSON
```

**Better architecture:**

```text
Puzzle 17
 └── references Population Artifact

Puzzle 31
 └── references Population Artifact

Puzzle 44
 └── references Population Artifact
```

This avoids duplication and makes future content creation significantly easier.

---

# 20. Summary Pages Should Be Richer Than the Game UI

The actual game should remain simple.

The player should not be overwhelmed with information while guessing.

During gameplay:

```text
QUESTION

Your guess:
[       ]

Guess 1 of 4
```

Then progressively:

```text
ANCHOR FACT
...

Your guess:
[       ]
```

Then:

```text
RELATIONSHIP FACT
...

Your guess:
[       ]
```

Then:

```text
TEMPORAL FACT
...

Final guess:
[       ]
```

Only after the final guess should the full complexity become available.

---

# 21. Post-Game Experience

After the final guess:

### First: Reveal the answer

Show:

> **The answer is 17 out of 1,000.**

Then show:

* Player's guesses
* Accuracy
* Score
* Which guess was closest
* How their estimate changed

Then transition into:

## Explore the Answer

This opens the Summary Artifact.

---

# 22. Summary Artifact UX

The summary should be visually engaging.

A possible structure:

```text
THE ANSWER

17 / 1,000

[Hero visualization]


WHAT DOES THAT MEAN?

Short explanation.


THE BIG PICTURE

[Infographic]


HOW IT HAS CHANGED

[Historical graph]


HOW IT COMPARES

[Comparison table]


INTERESTING FACTS

• ...
• ...
• ...


EXPLORE FURTHER

[Related artifact]
[Related artifact]
[External source]
[External source]
```

The exact structure can vary by topic.

---

# 23. Do Not Over-Template the Summary

The system should provide reusable building blocks, but the creator should not be forced into the same format every week.

Some questions might need:

* A map
* A timeline
* A scatterplot
* A table

Others might need:

* A large infographic
* A simple chart
* A historical comparison

Others might be best explained through:

* Three visualizations
* A short narrative
* A collection of links

The content system should therefore be flexible.

---

# 24. Weekly Content Creation Workflow

A recommended workflow for creating a new puzzle:

### Step 1 — Find an interesting quantity

Identify something surprising that can be expressed per 1,000.

### Step 2 — Research the answer

Establish a reliable target number and appropriate date/year.

### Step 3 — Build the three facts

Create:

* Scale
* Relationship
* Temporal

### Step 4 — Test the guessing experience

Ask:

* Is the initial question genuinely difficult?
* Does the scale help?
* Does the relationship help?
* Does the temporal fact help?
* Does each stage feel meaningfully easier?
* Can the player still make a mistake after seeing the hints?

### Step 5 — Build the Summary Artifact

Create:

* Explanation
* Visualizations
* Tables
* Graphs
* Comparisons
* Key observations
* Sources

### Step 6 — Identify reusable knowledge

Ask:

> What research from this puzzle should become a reusable artifact?

### Step 7 — Link related artifacts

Connect the new artifact to existing knowledge.

### Step 8 — Publish the weekly puzzle

The result should feel like a complete mini learning experience.

---

# 25. Data Architecture Implications

The existing Planet 1000 data architecture should be modified to support:

```text
puzzles/
    weekly-puzzles.json

facts/
    scale-facts.json
    relationship-facts.json
    temporal-facts.json

artifacts/
    knowledge-artifacts.json

sources/
    sources.json

visuals/
    ...
```

The exact directory structure can be refined during implementation, but the important architectural principle is **separation of playable content from reusable knowledge**.

A puzzle should reference knowledge artifacts rather than duplicate their contents unnecessarily.

---

# 26. Content IDs

Everything reusable should have a stable ID.

For example:

```text
puzzle_2026_w35
artifact_global_population
artifact_global_healthcare
artifact_doctors
source_who_2025_population
```

This makes it possible for:

* Multiple puzzles to reference one artifact
* Artifacts to reference other artifacts
* Sources to be reused
* Content to be updated independently
* The coding agent to validate references

---

# 27. Versioning and Data Updates

Some Planet 1000 statistics will change over time.

The content model should therefore distinguish between:

* The date the statistic refers to
* The date the source was published
* The date Planet 1000 last updated the artifact

For example:

```text
value: 1.7
unit: "per 1,000"
data_year: 2025
source_date: 2026
updated_at: 2026-08-20
```

This is especially important for temporal facts.

---

# 28. Accuracy and Source Quality

Because the Summary Artifacts are educational resources, source quality matters.

The creator should prefer primary or authoritative sources where possible.

Every major quantitative claim should have a traceable source.

The game itself can remain lightweight, but the underlying research should be rigorous.

The goal is not merely:

> "Here's a number."

It is:

> "Here's a number, here's why it is approximately correct, here's how it compares, here's how it has changed, and here's where you can investigate it yourself."

---

# 29. What the Coding Agent Should Build

The implementation should support the following fundamental capabilities.

### Gameplay

* Weekly puzzle model
* Four guesses
* Progressive hint reveal
* Scale facts
* Relationship facts
* Temporal facts
* Scoring
* Final answer reveal

### Summary

* Rich post-game summary
* Text sections
* Tables
* Images/infographics
* Charts
* Links
* Sources
* Related content

### Knowledge ecosystem

* Reusable knowledge artifacts
* Stable artifact IDs
* Puzzle → artifact relationships
* Artifact → artifact relationships
* Artifact → source relationships
* Source metadata
* Content reuse

### Content management

The architecture should make it easy for the creator/coding agent to:

* Add a new weekly puzzle
* Add or modify facts
* Create a new artifact
* Reuse an existing artifact
* Add sources
* Link related artifacts
* Update historical data
* Validate broken references

---

# 30. The Core Experience in One Diagram

```text
                    PLANET 1000
                         |
                  ONE PUZZLE / WEEK
                         |
                     QUESTION
                         |
                      GUESS 1
                         |
                  ANCHOR FACT
                         |
                      GUESS 2
                         |
               RELATIONSHIP FACT
                         |
                      GUESS 3
                         |
                  TEMPORAL FACT
                         |
                      GUESS 4
                         |
                   FINAL ANSWER
                         |
                   SCORE / RESULT
                         |
                  EXPLORE THE ANSWER
                         |
              ┌──────────┴──────────┐
              |                     |
         SUMMARY ARTIFACT       SOURCES
              |
       ┌──────┼─────────┐
       |      |         |
    Graphs  Tables  Infographics
       |
       ↓
  RELATED ARTIFACTS
       |
       ↓
  PLANET 1000 KNOWLEDGE
       |
       └──────────────→ Future Puzzles
```

---

# 31. The Product in One Sentence

> **Planet 1000 is a weekly estimation game where four progressively informed guesses lead into a rich, visual exploration of the quantitative world behind the answer.**

The long-term ambition is:

> **Build 52 excellent puzzles a year, but build an ever-growing knowledge ecosystem that makes each new puzzle easier to create, richer to explore, and more connected to everything that came before it.**

This should be the guiding principle for the Planet 1000 redesign.
