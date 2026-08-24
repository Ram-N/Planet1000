# Planet 1000 — World Model & Question Engine

## Architectural Requirements Document

**Version:** 1.0
**Purpose:** Foundation for the Planet 1000 game engine
**Audience:** AI coding agent / software engineering team

---

## 1. Overview

Planet 1000 is an educational game engine designed to help students develop **quantitative intuition about the real world**.

The central idea is simple:

> Take the enormous, abstract scale of human civilization and make it understandable by shrinking it to a world of 1,000 people.

For example:

* The world contains billions of people.
* Planet 1000 represents those people as exactly 1,000 citizens.
* The number of doctors, teachers, children, cars, homes, travelers, etc. is scaled accordingly.
* Students estimate quantities, make comparisons, reason from relationships, and discover the actual numbers.

However, Planet 1000 is **not just a game containing hard-coded questions**.

It should be designed as a reusable **game engine backed by a structured World Model**.

The fundamental architecture is:

```text
                    PLANET 1000
                         |
                  GAME ENGINE
                         |
              QUESTION GENERATOR
                         |
              DERIVED METRICS ENGINE
                         |
                   WORLD MODEL
                         |
                FACT / OBSERVATION DATA
                         |
                    SOURCES
```

The most important architectural principle is:

> **Store facts once. Derive everything else.**

If the system knows the population of the world and the number of physicians, it should calculate physicians per person, physicians per 1,000 people, and physicians in Planet 1000 dynamically rather than storing those values separately.

---

# 2. Goals

The system should allow us to:

1. Store authoritative facts about the real world.
2. Organize those facts across multiple dimensions.
3. Represent geography hierarchically.
4. Represent time explicitly.
5. Represent different kinds of measurements.
6. Preserve source and provenance information.
7. Derive ratios, rates, percentages, per-person values, and scaled values.
8. Generate game questions dynamically from the underlying facts.
9. Support multiple games using the same underlying World Model.
10. Add new domains and facts without changing the core architecture.
11. Support multiple levels of geographic scale.
12. Eventually support relationships between entities.
13. Keep raw facts separate from derived values.
14. Make every factual claim traceable to its source.

---

# 3. Non-Goals

The first version should **not** attempt to:

* model every fact about the world;
* build a full scientific simulation of civilization;
* automatically scrape arbitrary websites;
* infer facts without a source;
* hard-code thousands of questions;
* create separate schemas for every domain;
* duplicate derived statistics in the raw dataset;
* build a complex graph database unless future requirements justify it.

The initial architecture should be **simple, extensible, and data-driven**.

---

# 4. Core Concept: The World Model

The World Model is the canonical representation of factual knowledge used by Planet 1000.

It should answer questions such as:

* How many people are there?
* How many physicians?
* How many cars?
* How much food is produced?
* How much electricity is consumed?
* How many homes exist?
* How many people travel internationally?
* How much money is earned?
* How much farmland exists?

But the World Model must also describe:

* where;
* when;
* what exactly is being measured;
* in what unit;
* according to which source;
* using which definition.

---

# 5. The Fundamental Data Object: Observation

The primary factual object should be an **Observation**.

Conceptually:

```text
Observation
-----------
id
entity
metric
value
unit
geography
time_period
population_group
source
confidence
definition
notes
```

Example:

```text
entity: physician
metric: population_count
value: 11,200,000
unit: persons
geography: World
time_period: 2025
population_group: all
source: WHO
confidence: high
```

Another observation might be:

```text
entity: automobile
metric: vehicles_in_operation
value: 1,500,000,000
unit: vehicles
geography: World
time_period: 2025
source: ...
```

The exact values above are illustrative. The system must never treat illustrative values as authoritative data.

---

# 6. Facts vs Derived Values

This is one of the most important requirements.

## Raw facts

Store:

```text
World population = X
Number of physicians = Y
```

Do not separately store:

```text
physicians per person
physicians per 1,000
physicians per million
physicians in Planet 1000
```

unless one of those is itself an independently sourced fact.

These should normally be calculated.

For example:

```text
physicians_per_person =
    physicians / population
```

```text
physicians_per_1000 =
    physicians / population * 1000
```

```text
planet_1000_physicians =
    physicians / population * 1000
```

This prevents data duplication and inconsistencies.

---

# 7. Dimensions of the World Model

The World Model should behave conceptually like a multidimensional data cube.

The major dimensions are:

## 7.1 What

* Domain
* Entity
* Metric
* Category

## 7.2 Where

* World
* Continent
* Region
* Country
* State/province
* County/district
* City
* Urban/rural
* Other geographic classifications

## 7.3 When

* Year
* Month
* Quarter
* Day
* Date range
* Point-in-time observation

## 7.4 Who

Optional population segments:

* Total population
* Children
* Adults
* Men
* Women
* Workers
* Students
* Retirees
* Households
* Other demographic groups

## 7.5 Measurement

* Count
* Mass
* Volume
* Area
* Distance
* Energy
* Currency
* Percentage
* Rate
* Capacity
* Time

## 7.6 Context

Facts may describe:

* stock
* flow
* production
* consumption
* activity
* capacity
* ownership
* access
* waste
* loss
* distribution

These dimensions should be modeled explicitly where appropriate rather than embedded in arbitrary strings.

---

# 8. Stock vs Flow

The data model must distinguish between **stocks** and **flows**.

Examples:

### Transportation

Stock:

> Number of cars currently in operation.

Flow:

> Number of cars manufactured per year.

Activity:

> Vehicle-kilometers traveled per year.

### Food

Stock:

> Food stored.

Flow:

> Food produced per year.

Flow:

> Food consumed per year.

Flow:

> Food wasted per year.

### Energy

Stock/capacity:

> Electricity-generating capacity.

Flow:

> Electricity generated per year.

Flow:

> Electricity consumed per year.

This distinction should be represented by a controlled field such as:

```text
measure_type
```

Possible values:

```text
stock
flow
activity
rate
capacity
share
count
```

The exact vocabulary can evolve.

---

# 9. Domains

Domains classify the subject area of an observation.

Initial domains should include:

1. People & Society
2. Food
3. Agriculture
4. Money & Economics
5. Energy & Electricity
6. Transportation
7. Travel
8. Housing & Buildings
9. Healthcare
10. Education
11. Water
12. Natural Resources
13. Environment
14. Communication & Technology

The architecture must allow new domains to be added without code changes.

Domains are **classification**, not separate database schemas.

---

# 10. Entities

Each domain contains entities.

Example:

### People & Society

```text
population
children
adults
workers
parents
students
retirees
immigrants
```

### Healthcare

```text
physicians
nurses
dentists
hospitals
hospital_beds
clinics
```

### Transportation

```text
cars
trucks
buses
motorcycles
bicycles
aircraft
ships
```

### Food

```text
wheat
rice
corn
vegetables
fruit
meat
milk
eggs
total_food
```

### Energy

```text
electricity
oil
natural_gas
coal
solar
wind
hydro
nuclear
```

Entities should have stable IDs.

Names and descriptions should be metadata rather than identifiers.

---

# 11. Metrics

An entity is not necessarily sufficient to describe a fact.

For example:

```text
entity = automobile
```

could correspond to:

* number produced;
* number sold;
* number registered;
* number operational;
* number scrapped;
* distance traveled;
* fuel consumed.

Therefore, the system should have a separate **Metric** concept.

Example:

```text
entity: automobile
metric: vehicles_in_operation
```

versus:

```text
entity: automobile
metric: annual_production
```

versus:

```text
entity: automobile
metric: vehicle_kilometers_traveled
```

Metrics should have:

```text
id
name
description
measure_type
default_unit
```

---

# 12. Units

Units should be standardized and machine-readable.

Examples:

```text
person
vehicle
house
building
tonne
kilogram
liter
cubic_meter
hectare
square_meter
kilometer
mile
kWh
MWh
GWh
TWh
USD
percent
per_1000_people
```

The system should have a unit conversion layer.

For example:

```text
1 tonne = 1000 kilograms
```

and:

```text
1 hectare = 10,000 square meters
```

Conversions should happen in the calculation layer rather than duplicating observations in multiple units.

---

# 13. Geography Model

Geography must be hierarchical.

Conceptually:

```text
World
├── Africa
├── Asia
│   ├── India
│   ├── China
│   └── ...
├── Europe
├── North America
├── South America
├── Oceania
└── Antarctica
```

And:

```text
United States
├── Florida
├── Texas
├── California
└── ...
```

Each geography should contain:

```text
id
name
type
parent_id
standard_code
```

Possible types:

```text
world
continent
region
country
state
province
county
city
urban
rural
```

The hierarchy allows queries such as:

* World population
* Population of Asia
* Population of India
* Population of Florida

without treating them as unrelated strings.

---

# 14. Time Model

Time should also be explicit.

A time period should include:

```text
id
start_date
end_date
period_type
label
```

Possible period types:

```text
day
month
quarter
year
multi_year
point_in_time
```

The system must distinguish between:

* data year;
* publication year;
* retrieval date.

For example:

```text
data_year: 2024
publication_date: 2026-03-15
retrieved_date: 2026-08-24
```

This is essential because current sources frequently report older data.

---

# 15. Population Groups

Many observations apply only to a subset of people.

The model should therefore support population groups.

Examples:

```text
all_people
children
adults
men
women
working_age
employed
students
households
```

The system should eventually support relationships between groups.

For example:

```text
children ⊂ population
adults ⊂ population
```

This will help validate observations and generate questions.

---

# 16. Source and Provenance

Every raw observation must have provenance.

A source record should contain:

```text
id
organization
title
url
publication_date
retrieved_date
methodology
notes
```

An observation references its source.

Example:

```text
observation.source_id → source.id
```

The system should be able to answer:

> Where did this number come from?

and:

> What definition does this number use?

This is a core requirement, not an optional feature.

---

# 17. Definitions

The same word can represent different measurements.

For example, "doctor" could mean:

* licensed physician;
* practicing physician;
* physician including specialists;
* full-time equivalent physician.

Therefore every important metric/entity combination should support a definition.

Example:

```text
definition:
"Practicing physicians as reported by the source,
including specialists and excluding retired physicians."
```

Definitions should be displayed to the student when necessary.

---

# 18. Confidence

Not all facts will be equally reliable.

An observation should optionally include:

```text
confidence
```

For example:

```text
high
medium
low
```

Or eventually a richer quality model.

This can later support gameplay.

For example:

> "This is an estimate rather than a precise census."

The game can distinguish between exact-ish facts and inherently uncertain estimates.

---

# 19. Relationships Between Entities

The system should eventually support relationships such as:

```text
car → requires → road
car → consumes → fuel
car → produces → emissions

food → requires → farmland
food → requires → water
food → requires → energy
food → produces → waste

air_travel → requires → aircraft
air_travel → consumes → fuel
air_travel → produces → emissions
```

This should not be over-engineered in Version 1.

However, the architecture should leave room for a relationship model such as:

```text
EntityRelationship
------------------
id
source_entity
relationship_type
target_entity
quantity
unit
source
```

This can eventually power more sophisticated estimation chains.

---

# 20. Recommended Storage Model

A relational database is likely preferable to a giant JSON file.

Conceptually, the initial schema should include:

```text
domains
-------
id
name
description
```

```text
entities
--------
id
domain_id
name
description
parent_entity_id
```

```text
metrics
-------
id
name
description
measure_type
default_unit
```

```text
observations
------------
id
entity_id
metric_id
geography_id
time_period_id
population_group_id
value
unit
source_id
confidence
definition
notes
```

```text
geographies
-----------
id
name
type
parent_id
standard_code
```

```text
time_periods
------------
id
start_date
end_date
type
label
```

```text
population_groups
------------------
id
name
description
parent_id
```

```text
sources
-------
id
organization
title
url
publication_date
retrieved_date
methodology
notes
```

This is the minimum conceptual model.

---

# 21. Derived Metrics Engine

A separate component should calculate derived values.

Examples:

## Per person

```text
value / population
```

## Per 1,000 people

```text
value / population × 1,000
```

## Per million people

```text
value / population × 1,000,000
```

## Planet 1000

```text
value / population × 1,000
```

## Percentage

```text
subset / total × 100
```

## Annual per-person consumption

```text
annual_consumption / population
```

## Comparison

```text
country_value / world_value
```

The engine should represent formulas explicitly where possible rather than embedding them in application code.

---

# 22. Planet 1000 Scaling

Planet 1000 should be treated as a **special scaling transformation**, not as a separate dataset.

If:

```text
world_population = 10,000,000,000
```

and:

```text
world_doctors = 20,000,000
```

then:

```text
planet1000_doctors =
    20,000,000 / 10,000,000,000 × 1,000
```

The resulting value can be fractional.

For gameplay, presentation may round appropriately:

> About 2 doctors.

But the underlying calculation should retain precision.

---

# 23. Multiple Scales

The same mechanism should support arbitrary scales.

Examples:

```text
1 person
100 people
1,000 people
10,000 people
1 million people
1 billion people
world population
```

A scale should therefore be represented as a parameter:

```text
target_population = 1000
```

rather than hard-coded as a special case.

Planet 1000 is simply the default signature scale.

---

# 24. Question Templates

Questions should be generated from templates rather than individually hard-coded.

Example template:

```text
How many {entity_name} are there in {geography}?
```

Inputs:

```text
entity = physician
geography = World
metric = population_count
```

Another:

```text
In a world of 1,000 people, approximately how many
{entity_name} would there be?
```

Another:

```text
How many {entity_name} are there per 1,000 people?
```

Another:

```text
What percentage of {population_group} are {entity_name}?
```

---

# 25. Question Template Schema

Conceptually:

```text
question_templates
------------------
id
name
game_type
domain_id
template_text
answer_type
required_entity
required_metric
required_geography
required_time
required_population_group
calculation_type
difficulty
explanation_template
```

The template should declare its dependencies.

Example:

```text
name:
physicians_per_1000

calculation:
entity_count / population × 1000
```

---

# 26. Question Generation Pipeline

The question engine should work approximately like this:

```text
1. Select domain
        ↓
2. Select entity
        ↓
3. Select valid observation
        ↓
4. Select question template
        ↓
5. Resolve required dimensions
        ↓
6. Calculate derived value
        ↓
7. Generate question
        ↓
8. Generate answer
        ↓
9. Generate explanation
        ↓
10. Generate scoring metadata
```

The question itself should not contain duplicated factual data.

---

# 27. Question Types

The architecture should support several question types.

### Direct estimation

> How many doctors are there?

### Ratio estimation

> How many doctors per 1,000 people?

### Scaling

> In a world of 1,000 people, how many would be doctors?

### Percentage

> What percentage of people are doctors?

### Comparison

> Which country has more doctors per 1,000 people?

### Order of magnitude

> Is the answer closer to 1 million, 10 million, or 100 million?

### Production

> How many cars are manufactured each year?

### Consumption

> How much electricity is consumed per person?

### Waste

> How much food is wasted each year?

### Allocation

> What share of the population belongs to each category?

### Estimation chain

> Population → students → teachers → schools.

The question engine should be extensible enough to support future types.

---

# 28. Game Engine Separation

Planet 1000 should support multiple games using the same data.

For example:

```text
World Model
    |
    +-- Estimation Game
    |
    +-- World of 1000
    |
    +-- Scaling Game
    |
    +-- Estimation Chains
```

The games should not contain their own copies of factual data.

Instead:

```text
Game
 ↓
Question Template
 ↓
Derived Metric
 ↓
Observation
 ↓
Source
```

This is critical for maintainability.

---

# 29. Example End-to-End Flow

Suppose the database contains:

```text
Population
World
2025
X billion people
```

and:

```text
Physicians
World
2025
Y million people
```

The system can automatically generate:

### Question 1

> How many physicians are there in the world?

### Question 2

> How many physicians are there per 1,000 people?

### Question 3

> In our world of 1,000 people, how many would be physicians?

### Question 4

> Roughly how many people are there for every physician?

### Question 5

> Which is closer: 1 physician per 100 people, 1 per 500, or 1 per 1,000?

All five use the same underlying facts.

---

# 30. Estimation Chains

The system should eventually support dependencies between observations.

Example:

```text
World population
      ↓
working-age population
      ↓
employed population
      ↓
teachers
      ↓
students per teacher
      ↓
number of schools
      ↓
education expenditure
```

A chain can be represented as:

```text
CalculationNode
---------------
id
input
operation
parameter
output
```

This will allow the engine to explain reasoning.

For example:

> There are 10 billion people.

> Approximately 25% are children.

> That gives us 2.5 billion children.

> Suppose 80% attend school.

> That gives us 2 billion students.

> At 20 students per teacher...

> Approximately 100 million teachers.

The system can expose this chain to students.

---

# 31. Data Quality and Validation

The ingestion process should validate:

### Unit consistency

Do not combine:

```text
tons
```

with:

```text
kilograms
```

without conversion.

### Geography consistency

Do not compare:

```text
World 2025
```

with:

```text
India 2015
```

without explicitly acknowledging the time difference.

### Population denominator

A ratio must use the correct denominator.

For example:

```text
physicians / total population
```

is different from:

```text
physicians / working-age population
```

### Double counting

Parent and child geographic observations should not accidentally be summed when the parent already includes the child.

---

# 32. Source Hierarchy

The data ingestion system should eventually prioritize authoritative sources.

Potential source categories include:

* United Nations
* World Bank
* WHO
* FAO
* International Energy Agency
* International Labour Organization
* national statistical agencies
* government agencies
* reputable research organizations
* academic publications

The source itself should be stored separately from the observation.

---

# 33. Data Ingestion

Data ingestion should be treated as a separate subsystem.

Conceptually:

```text
External Source
      ↓
Data Import
      ↓
Normalization
      ↓
Validation
      ↓
Observation
      ↓
World Model
```

The ingestion system should never silently overwrite an existing observation.

If a new source provides a different estimate, both observations may need to be retained.

---

# 34. Versioning

Facts change.

For example:

```text
Population 2024
Population 2025
Population 2026
```

The system should retain historical observations.

Similarly, if a source revises a historical estimate, the system should ideally preserve:

* original observation;
* revised observation;
* revision date.

This will become important for reproducibility.

---

# 35. Uncertainty

Some Planet 1000 questions should not pretend that the real world has a single exact answer.

The model should eventually support:

```text
value
lower_bound
upper_bound
```

or:

```text
value
uncertainty
```

For example:

```text
estimated_value: 40 million
range: 35–45 million
```

This opens up a particularly interesting future game mechanic:

> **Can you estimate within the plausible range?**

---

# 36. Question Difficulty

Difficulty should be generated partly from the underlying data.

Potential factors:

* familiarity of the entity;
* magnitude of the number;
* number of reasoning steps;
* number of required transformations;
* uncertainty of the source;
* similarity to common misconceptions.

For example:

> How many people are there in the world?

Easy.

> How many physicians per 1,000 people?

Medium.

> Estimate the annual electricity required to support our 1,000-person world.

Difficult.

Difficulty should be metadata, not baked into the factual data.

---

# 37. Question Explanations

Every generated question should have an explanation.

Not just:

> Correct answer: 7.

Instead:

> The world has approximately X people and Y physicians. Dividing physicians by population and scaling to 1,000 gives approximately 7 physicians per 1,000 people.

The explanation itself should be generated from the same calculation graph used to obtain the answer.

This prevents the explanation from drifting away from the actual data.

---

# 38. The Data Cube View

Although the underlying storage should be relational/normalized, the application should be able to expose a conceptual cube:

```text
                  TIME
                   |
                   |
                   |
                   +--------- GEOGRAPHY
                  /
                 /
                /
             ENTITY
                |
                |
              METRIC
```

An observation is effectively a point in this multidimensional space.

This will make analytical queries straightforward:

> Give me all healthcare observations for India in 2025.

or:

> Give me all transportation stocks for the world.

or:

> Give me all annual flows related to food.

---

# 39. Recommended API Boundaries

The implementation should eventually expose services roughly like:

```text
GET /domains
GET /entities
GET /metrics
GET /geographies
GET /observations
GET /sources
```

Derived data:

```text
GET /derive/per-person
GET /derive/per-1000
GET /derive/percentage
GET /derive/scale
```

Questions:

```text
GET /questions
POST /questions/generate
GET /questions/{id}
```

The exact API technology is implementation-dependent.

---

# 40. Seed Dataset

Do not attempt to populate the entire World Model initially.

Build a small but structurally rich seed dataset.

The first dataset should cover several domains:

```text
People
Healthcare
Education
Food
Transportation
Energy
Housing
Money
Travel
```

For each domain, include enough observations to exercise:

* counts;
* rates;
* stocks;
* flows;
* per-person calculations;
* geography;
* time;
* scaling;
* comparisons.

The goal of the seed dataset is to validate the **architecture**, not to achieve comprehensive world coverage.

---

# 41. Example Seed Facts

Illustrative structure only:

```text
World
Population
2025
X billion people

World
Physicians
2025
X million people

World
Cars in operation
2025
X billion vehicles

World
Electricity consumption
2025
X TWh

World
Food production
2025
X billion tonnes

World
Cropland
2025
X billion hectares
```

The actual values must be populated from verified sources during data ingestion.

---

# 42. Critical Architectural Principle: Do Not Hard-Code Questions

Avoid:

```text
questions.json

[
  {
    "question": "How many doctors...",
    "answer": 11.2 million
  }
]
```

Instead:

```text
observations
+
question_templates
+
derived_metrics
=
generated_questions
```

This is the core architecture of Planet 1000.

---

# 43. Critical Architectural Principle: Do Not Duplicate Facts

Avoid:

```text
doctors = 11.2 million
doctors_per_1000 = 1.3
planet1000_doctors = 1.3
```

Store the first fact and calculate the others.

This will dramatically reduce data maintenance.

---

# 44. Critical Architectural Principle: Preserve Provenance

Every factual answer must ultimately be traceable to:

```text
Observation
    ↓
Source
    ↓
Definition
    ↓
Calculation
    ↓
Answer
```

The system should be able to explain this chain.

---

# 45. Future Possibilities

The architecture should leave room for:

### Geographic games

Compare:

> India vs USA vs Nigeria vs Japan.

### Time games

> Has this number increased or decreased?

### Prediction games

> What will the number be in 2035?

### Allocation games

> Distribute resources among 1,000 people.

### Civilization simulation

> Build a viable 1,000-person world.

### Resource games

> Keep 1,000 people alive for one year.

### Estimation chains

> Derive one quantity from several others.

### Inequality games

> How is money/resources distributed among the 1,000?

### Systems games

> Change one variable and observe its implications elsewhere.

These should be considered future consumers of the World Model rather than requirements for the initial implementation.

---

# 46. Suggested Development Phases

## Phase 1 — World Model

Implement:

* domains;
* entities;
* metrics;
* observations;
* units;
* geographies;
* time periods;
* sources;
* population groups.

Focus on data integrity.

## Phase 2 — Derived Metrics

Implement:

* per person;
* per 1,000;
* percentages;
* scaling;
* unit conversions;
* basic comparisons.

## Phase 3 — Question Templates

Implement:

* template definitions;
* parameter resolution;
* answer generation;
* explanation generation;
* difficulty metadata.

## Phase 4 — First Game

Implement the basic:

> **Estimate the number.**

game.

## Phase 5 — Planet 1000

Implement:

> **What would the world look like if there were only 1,000 people?**

## Phase 6 — Estimation Chains

Implement multi-step reasoning.

## Phase 7 — Relationships

Introduce:

```text
requires
produces
consumes
supports
depends_on
```

and other entity relationships.

---

# 47. Acceptance Criteria

The architecture should be considered successful when the coding agent can demonstrate the following without hard-coded questions.

### Example

Given observations for:

```text
World population
World physicians
```

the system can automatically produce:

```text
How many physicians are there in the world?

How many physicians are there per 1,000 people?

In Planet 1000, how many people would be physicians?

What percentage of people are physicians?
```

Given:

```text
World population
World electricity consumption
```

it can produce:

```text
How much electricity does the average person consume?

How much electricity would our 1,000-person world consume?

How much electricity does the world consume?
```

Given:

```text
World population
World car stock
```

it can produce:

```text
How many cars are there per 1,000 people?

How many cars would Planet 1000 have?

What percentage of people does that represent?
```

And every answer must be traceable back to the underlying observations and their sources.

---

# 48. Final Design Principle

Planet 1000 should be built around a simple hierarchy:

```text
                   REAL WORLD
                       |
                   RAW FACTS
                       |
                 WORLD MODEL
                       |
            -----------------------
            |          |          |
         Metrics    Geography    Time
            |
       DERIVED VALUES
            |
       QUESTION ENGINE
            |
        GAME MODES
            |
         STUDENT
```

The **World Model is the asset**.

The individual games are applications of that asset.

The questions are generated rather than manually authored.

And the 1,000-person world is not a separate dataset. It is a **lens** through which the underlying world data is transformed into something humans — especially students — can intuitively understand.

The long-term objective should be:

> **Build a reliable, extensible quantitative model of the world from which many educational games can be generated.**

That is the architectural foundation on which Planet 1000 should be built.
