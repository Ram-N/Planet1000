Yes. I think we can make this quite concrete now. And I would make one important refinement to the earlier architecture:

> **CSV is the human-maintained source format; JSON is the application/runtime format.**

The coding agent should never have to decide whether a particular fact belongs in CSV or JSON. There should be a deterministic pipeline that turns the source data into a validated World Model package.

# Planet 1000 — World Model Data Architecture

## 1. Overall Architecture

```text
planet1000/
│
├── data/
│   │
│   ├── source/                 # Human-maintained canonical data
│   │   ├── domains.csv
│   │   ├── entities.csv
│   │   ├── metrics.csv
│   │   ├── observations.csv
│   │   ├── geographies.csv
│   │   ├── time_periods.csv
│   │   ├── population_groups.csv
│   │   ├── units.csv
│   │   ├── sources.csv
│   │   ├── definitions.csv
│   │   └── relationships.csv
│   │
│   ├── generated/              # Build-generated; never manually edit
│   │   ├── world-model.json
│   │   ├── observations.json
│   │   ├── entities.json
│   │   ├── geographies.json
│   │   └── indexes.json
│   │
│   └── schemas/                # Validation schemas
│       ├── domain.schema.json
│       ├── entity.schema.json
│       ├── metric.schema.json
│       ├── observation.schema.json
│       ├── geography.schema.json
│       ├── time-period.schema.json
│       ├── source.schema.json
│       └── ...
│
├── src/
│   ├── world-model/
│   │   ├── WorldModel.ts
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   ├── query.ts
│   │   └── validation.ts
│   │
│   ├── calculations/
│   │   ├── scaling.ts
│   │   ├── ratios.ts
│   │   ├── percentages.ts
│   │   ├── conversions.ts
│   │   └── calculations.ts
│   │
│   ├── questions/
│   │   ├── QuestionEngine.ts
│   │   ├── templates/
│   │   └── generators/
│   │
│   └── games/
│       ├── planet1000/
│       ├── estimation/
│       └── ...
│
├── scripts/
│   ├── build-data.ts
│   ├── validate-data.ts
│   └── generate-indexes.ts
│
└── ...
```

There is a very deliberate distinction between:

**`data/source/`**

and

**`data/generated/`**

The former is the data you own and edit. The latter is a compiled representation for the application.

---

# 2. The Core Principle

Every factual observation should ultimately look conceptually like this:

```text
OBSERVATION
    |
    +-- WHAT? --> Entity + Metric
    |
    +-- WHERE? --> Geography
    |
    +-- WHEN? --> Time Period
    |
    +-- WHO? --> Population Group
    |
    +-- VALUE? --> Number + Unit
    |
    +-- SOURCE? --> Source
    |
    +-- DEFINITION? --> Definition
```

This is the heart of the World Model.

---

# 3. `domains.csv`

Domains are broad conceptual areas.

```csv
id,name,description,sort_order,active
people,People & Society,Population demographics and social structure,1,true
food,Food,Food production consumption and waste,2,true
agriculture,Agriculture,Farming land crops and livestock,3,true
money,Money & Economics,Income wealth poverty and economic activity,4,true
energy,Energy & Electricity,Energy production consumption and capacity,5,true
transportation,Transportation,Vehicles transport infrastructure and mobility,6,true
travel,Travel,Domestic and international travel,7,true
housing,Housing & Buildings,Homes buildings offices and accommodation,8,true
healthcare,Healthcare,Doctors hospitals medicine and health infrastructure,9,true
education,Education,Students teachers schools and education,10,true
water,Water,Water availability production consumption and use,11,true
resources,Natural Resources,Natural resources and materials,12,true
environment,Environment,Environmental impacts emissions and ecological measures,13,true
technology,Technology & Communication,Computing communications and digital infrastructure,14,true
```

### Why an ID?

Never use:

```text
"Healthcare"
```

as the internal key.

Use:

```text
healthcare
```

Names can change without breaking references.

---

# 4. `entities.csv`

Entities are the things being measured.

```csv
id,domain_id,name,description,parent_entity_id,active
population,people,population,People in the specified population,,true
children,people,children,People below the defined adult age,population,true
adults,people,adults,Adult population,population,true
physicians,healthcare,physicians,Medical doctors,,true
nurses,healthcare,nurses,Nurses and midwives,,true
cars,transportation,cars,Passenger automobiles,,true
aircraft,transportation,aircraft,Aircraft used for transportation,,true
cropland,agriculture,cropland,Land used for growing crops,,true
electricity,energy,electricity,Electrical energy,,true
homes,housing,residential_units,Residential housing units,,true
students,education,students,Students enrolled in education,,true
teachers,education,teachers,Teachers employed in education,,true
```

The `parent_entity_id` is useful for things like:

```text
population
├── children
└── adults
```

or:

```text
aircraft
├── passenger_aircraft
├── cargo_aircraft
└── military_aircraft
```

But it should **not** be interpreted automatically as a mathematical relationship. It's primarily classification.

---

# 5. `metrics.csv`

This is one of the most important tables.

An entity answers:

> What thing?

A metric answers:

> What are we saying about that thing?

For example, cars can have:

* cars in operation;
* cars manufactured;
* cars sold;
* car miles traveled.

```csv
id,name,description,measure_type,default_unit_id,aggregation,active
population_count,Population count,Number of people,count,person,sum,true
vehicles_in_operation,Vehicles in operation,Number of vehicles currently operational,stock,vehicle,sum,true
annual_production,Annual production,Number produced during a year,flow,vehicle,sum,true
annual_consumption,Annual consumption,Amount consumed during a period,flow,tonne,sum,true
land_area,Land area,Physical area occupied by the entity,stock,hectare,sum,true
annual_generation,Annual generation,Energy generated during a period,flow,TWh,sum,true
annual_use,Annual use,Energy consumed during a period,flow,TWh,sum,true
annual_income,Annual income,Income received during a period,flow,USD,sum,true
population_share,Population share,Share of population belonging to a category,share,percent,average,true
```

The `measure_type` field is important.

Possible initial values:

```text
count
stock
flow
rate
share
capacity
activity
area
mass
volume
energy
currency
```

We can expand this vocabulary later.

---

# 6. `units.csv`

Units should be explicit.

```csv
id,name,symbol,dimension,base_unit,conversion_factor
person,person,person,count,person,1
vehicle,vehicle,vehicle,count,vehicle,1
house,house,house,count,house,1
kilogram,kilogram,kg,mass,kilogram,1
tonne,tonne,t,mass,kilogram,1000
square_meter,square meter,m²,area,square_meter,1
hectare,hectare,ha,area,square_meter,10000
liter,liter,L,volume,liter,1
cubic_meter,cubic meter,m³,volume,liter,1000
kWh,kilowatt-hour,kWh,energy,kWh,1
MWh,megawatt-hour,MWh,energy,kWh,1000
GWh,gigawatt-hour,GWh,energy,kWh,1000000
TWh,terawatt-hour,TWh,energy,kWh,1000000000
USD,US dollar,$,currency,USD,1
percent,percent,%,ratio,percent,1
```

I would **not** try to build a universal unit-conversion system on day one. But establishing the structure now prevents problems later.

---

# 7. `geographies.csv`

```csv
id,name,type,parent_id,standard_code,active
world,World,world,,WORLD,true
africa,Africa,continent,world,AF,true
asia,Asia,continent,world,AS,true
europe,Europe,continent,world,EU,true
north_america,North America,continent,world,NA,true
south_america,South America,continent,world,SA,true
oceania,Oceania,continent,world,OC,true
india,India,country,asia,IN,true
united_states,United States,country,north_america,US,true
florida,Florida,state,united_states,US-FL,true
```

This hierarchy becomes extremely useful.

For example:

```text
world
  └── asia
        └── india
```

The World Model can therefore navigate geographical relationships.

---

# 8. `time_periods.csv`

```csv
id,label,start_date,end_date,type
2025,2025,2025-01-01,2025-12-31,year
2024,2024,2024-01-01,2024-12-31,year
2025_q1,Q1 2025,2025-01-01,2025-03-31,quarter
2025_q2,Q2 2025,2025-04-01,2025-06-30,quarter
2025_q3,Q3 2025,2025-07-01,2025-09-30,quarter
2025_q4,Q4 2025,2025-10-01,2025-12-31,quarter
```

This may look like overkill initially.

It isn't.

It prevents us from eventually stuffing values such as:

```text
2025
2024 estimate
2023-24
2024/25
```

into one ambiguous column.

---

# 9. `population_groups.csv`

```csv
id,name,description,parent_id
all,All people,Entire population,
children,Children,Children according to the source definition,all
adults,Adults,Adult population,all
men,Men,People classified as male,all
women,Women,People classified as female,all
working_age,Working age,Population within the defined working-age range,adults
employed,Employed people,People currently employed,working_age
students,Students,People enrolled in education,children
```

Important:

**Do not assume that these categories are universally defined.**

For example, "working age" varies by source.

The observation's source/definition must win.

---

# 10. `sources.csv`

This is where provenance lives.

```csv
id,organization,title,url,publication_date,retrieved_date,source_type,notes
who_physicians_2025,WHO,Global Health Workforce Statistics,https://...,2026-01-15,2026-08-24,database,
un_population_2025,United Nations,World Population Prospects,https://...,2024-07-11,2026-08-24,dataset,
world_bank_population,World Bank,World Development Indicators,https://...,2026-01-01,2026-08-24,database,
```

The exact URLs should of course be populated by the data curator.

I would also allow:

```text
source_type:
dataset
report
database
academic_paper
government
organization
estimate
```

---

# 11. `definitions.csv`

Definitions deserve their own table because this is where a lot of quantitative datasets become dangerous.

```csv
id,entity_id,metric_id,text
physician_definition,physicians,population_count,"Medical doctors according to the source's definition of practicing physicians."
cropland_definition,cropland,land_area,"Land classified as cropland according to the source methodology."
car_definition,cars,vehicles_in_operation,"Registered passenger vehicles in operation according to the source."
```

This allows the game to say:

> "In this question, 'doctor' means practicing medical physicians as defined by WHO."

That's important educationally.

---

# 12. The Most Important File: `observations.csv`

This is the actual World Model.

I'd make it relatively wide and explicit:

```csv
id,entity_id,metric_id,geography_id,time_period_id,population_group_id,value,unit_id,source_id,definition_id,confidence,notes
obs_world_population_2025,population,population_count,world,2025,all,8600000000,person,un_population_2025,population_definition,high,
obs_world_physicians_2025,physicians,population_count,world,2025,all,11200000,person,who_physicians_2025,physician_definition,medium,
obs_world_cars_2025,cars,vehicles_in_operation,world,2025,all,1500000000,vehicle,example_source,car_definition,medium,
```

The numbers above are **illustrative only** and must not be copied into the real dataset without verification.

The important thing is the structure.

---

# 13. Why `observation_id` matters

Every observation gets a stable ID:

```text
obs_world_population_2025
```

That allows other parts of the system to refer to it.

For example, an explanation could ultimately say:

```text
This calculation used:

obs_world_population_2025
obs_world_physicians_2025
```

It also makes debugging vastly easier.

---

# 14. Don't Store "Per 1,000" Observations

This is a crucial rule.

Don't put:

```csv
physicians_per_1000,...
```

into `observations.csv` if it is calculated from physician count and population.

Instead:

```text
physicians
        ↓
population
        ↓
ratio calculation
        ↓
physicians per 1,000
```

Same for:

* percentage;
* per capita;
* Planet 1000;
* per household;
* per square kilometer;
* per worker.

These belong in the calculation engine.

---

# 15. `relationships.csv`

I would include this from the beginning, but keep it extremely simple.

```csv
id,source_entity_id,relationship_type,target_entity_id,value,unit_id,source_id,notes
rel_food_land,food,costs,cropland,,,example_source,
rel_cars_fuel,cars,consumes,oil,,,example_source,
rel_electricity_fuel,electricity,generated_from,natural_gas,,,example_source,
```

However, don't rush to populate this.

The relationship infrastructure is there for future estimation chains.

---

# 16. What Does the Generated JSON Look Like?

The application should consume something like:

```javascript
{
  "version": "1.0.0",

  "domains": [...],

  "entities": [...],

  "metrics": [...],

  "units": [...],

  "geographies": [...],

  "timePeriods": [...],

  "populationGroups": [...],

  "sources": [...],

  "definitions": [...],

  "observations": [...]
}
```

This becomes the canonical **runtime World Model package**.

---

# 17. Example Generated Observation

The runtime version might look like:

```javascript
{
  "id": "obs_world_physicians_2025",

  "entityId": "physicians",

  "metricId": "population_count",

  "geographyId": "world",

  "timePeriodId": "2025",

  "populationGroupId": "all",

  "value": 11200000,

  "unitId": "person",

  "sourceId": "who_physicians_2025",

  "definitionId": "physician_definition",

  "confidence": "medium"
}
```

This is deliberately boring.

That's good.

---

# 18. But We Should Optimize the Runtime Representation

There is no reason the browser needs to repeatedly search a giant array.

The build process can generate indexes.

For example:

```javascript
{
  "observationsByEntity": {
    "physicians": [
      "obs_world_physicians_2025"
    ]
  },

  "observationsByGeography": {
    "world": [
      "obs_world_population_2025",
      "obs_world_physicians_2025"
    ]
  },

  "observationsByMetric": {
    "population_count": [
      "obs_world_population_2025",
      "obs_world_physicians_2025"
    ]
  }
}
```

This is where the build pipeline earns its keep.

---

# 19. The WorldModel Class

I would absolutely keep the internal API idea from the previous document.

Something conceptually like:

```typescript
interface WorldModel {
  getDomain(id: string): Domain | undefined;

  getEntity(id: string): Entity | undefined;

  getMetric(id: string): Metric | undefined;

  getGeography(id: string): Geography | undefined;

  getTimePeriod(id: string): TimePeriod | undefined;

  getObservation(id: string): Observation | undefined;

  findObservations(
    query: ObservationQuery
  ): Observation[];

  getValue(
    query: ObservationQuery
  ): number | undefined;
}
```

Then:

```typescript
interface ObservationQuery {
  entityId?: string;
  metricId?: string;
  geographyId?: string;
  timePeriodId?: string;
  populationGroupId?: string;
}
```

This is **not an external API**.

It's simply the internal contract between the World Model and the rest of the application.

---

# 20. Calculation API

Then I'd put a separate calculation layer above it.

For example:

```typescript
scaleValue(
  value: number,
  sourcePopulation: number,
  targetPopulation: number
): number;
```

So:

```typescript
scaleValue(
  11200000,
  8600000000,
  1000
);
```

returns approximately:

```text
1.30
```

The calculation layer should never know where the 11.2 million or 8.6 billion came from.

That's the World Model's job.

---

# 21. Higher-Level World Model Functions

The coding agent can eventually implement convenient functions such as:

```typescript
world.getPopulation('world', '2025');

world.getObservation({
  entityId: 'physicians',
  metricId: 'population_count',
  geographyId: 'world',
  timePeriodId: '2025'
});

world.perCapita(...);

world.per1000(...);

world.scaleToPopulation(...);

world.percentage(...);
```

Then question templates become remarkably clean.

---

# 22. Example: Planet 1000

The question generator could conceptually do:

```typescript
const population =
  world.getPopulation('world', '2025');

const physicians =
  world.getValue({
    entityId: 'physicians',
    metricId: 'population_count',
    geographyId: 'world',
    timePeriodId: '2025',
    populationGroupId: 'all'
  });

const answer =
  scaleToPopulation(
    physicians,
    population,
    1000
  );
```

The game doesn't know anything about CSV.

It doesn't know anything about JSON.

It doesn't know anything about WHO.

It simply asks the World Model.

That's exactly the abstraction we want.

---

# 23. JSON Schema Validation

I strongly recommend using actual **JSON Schema** files.

For example:

```text
data/schemas/observation.schema.json
```

Conceptually:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Observation",
  "type": "object",
  "required": [
    "id",
    "entityId",
    "metricId",
    "geographyId",
    "timePeriodId",
    "value",
    "unitId",
    "sourceId"
  ],
  "properties": {
    "id": {
      "type": "string"
    },
    "entityId": {
      "type": "string"
    },
    "metricId": {
      "type": "string"
    },
    "geographyId": {
      "type": "string"
    },
    "timePeriodId": {
      "type": "string"
    },
    "value": {
      "type": "number"
    },
    "unitId": {
      "type": "string"
    },
    "sourceId": {
      "type": "string"
    },
    "confidence": {
      "enum": ["high", "medium", "low"]
    }
  }
}
```

The actual schema should be more comprehensive, but that's the basic idea.

---

# 24. CSV Validation

CSV has no native schema.

So the build script needs to validate:

```text
observations.csv
```

against the rules.

For every observation:

* entity must exist;
* metric must exist;
* geography must exist;
* time period must exist;
* population group must exist;
* unit must exist;
* source must exist;
* definition must exist where required;
* value must be numeric;
* metric/unit combination must be valid.

For example, this should fail:

```text
metric = population_count
unit = TWh
```

because that's nonsense.

---

# 25. Referential Integrity Without a Database

This is another reason I like the build pipeline.

A relational database normally gives you:

```text
foreign keys
```

We can reproduce the important part ourselves.

If:

```text
observations.entity_id = physicians
```

but `physicians` isn't in `entities.csv`:

```text
BUILD ERROR

Unknown entity:
physicians

Referenced by:
obs_world_physicians_2025
```

The application should **not build**.

That gives us many of the benefits of a database without actually running one.

---

# 26. Data Build Pipeline

I'd make:

```bash
npm run data:validate
```

do:

```text
CSV
 ↓
parse
 ↓
schema validation
 ↓
referential integrity
 ↓
unit validation
 ↓
duplicate detection
 ↓
temporal validation
 ↓
generate JSON
```

And:

```bash
npm run data:build
```

produce:

```text
data/generated/
```

And:

```bash
npm run build
```

should automatically run the data build first.

---

# 27. Duplicate Detection

This is important.

The system should detect two observations that appear to represent exactly the same fact:

```text
entity
metric
geography
time
population group
```

For example:

```text
physicians
population_count
world
2025
all
```

appearing twice.

The build should complain:

```text
Duplicate observation key:
physicians | population_count | world | 2025 | all
```

unless there is a deliberate mechanism for multiple sources.

---

# 28. Multiple Sources for the Same Fact

This is where I would make one subtle design choice.

Don't make the combination:

```text
entity + metric + geography + time
```

globally unique.

Two sources might legitimately say:

```text
WHO: 11.2 million
World Bank: 10.9 million
```

Both are valuable.

So observations remain independent.

Then we can later introduce a concept of:

```text
preferred observation
```

or:

```text
canonical observation
```

for gameplay.

---

# 29. Canonical Values

Eventually an entity/metric/geography/time combination might have:

```text
Observation A
Observation B
Observation C
```

The World Model can designate one as:

```text
canonical: true
```

or maintain a separate:

```text
canonical_observations.csv
```

I would **not implement this until we encounter the problem**, though.

Initially, source selection can be explicit in the question configuration.

---

# 30. One Additional File I Recommend: `data-manifest.json`

This describes the dataset itself.

```json
{
  "name": "Planet 1000 World Model",
  "version": "0.1.0",
  "dataAsOf": "2026-08-24",
  "generatedAt": "2026-08-24T12:00:00Z",
  "observationCount": 1247,
  "sourceCount": 47,
  "domainCount": 14
}
```

This becomes useful for:

* debugging;
* displaying "World Model updated...";
* reproducibility;
* future releases.

---

# 31. One More Important Concept: Dataset Versions

I'd distinguish:

```text
application version
```

from:

```text
world model version
```

For example:

```text
Planet 1000 App: 2.3.0

World Model: 1.8.2
```

The game code could change without the data changing.

And vice versa.

This becomes particularly valuable as Planet 1000 becomes a platform for multiple games.

---

# 32. Directory I Would Actually Give the Coding Agent

If I were handing this to your coding agent today, I'd specify this:

```text
planet1000/
│
├── data/
│   │
│   ├── source/
│   │   ├── domains.csv
│   │   ├── entities.csv
│   │   ├── metrics.csv
│   │   ├── units.csv
│   │   ├── geographies.csv
│   │   ├── time_periods.csv
│   │   ├── population_groups.csv
│   │   ├── sources.csv
│   │   ├── definitions.csv
│   │   ├── observations.csv
│   │   └── relationships.csv
│   │
│   ├── generated/
│   │   ├── world-model.json
│   │   ├── indexes.json
│   │   └── manifest.json
│   │
│   └── schemas/
│       ├── domain.schema.json
│       ├── entity.schema.json
│       ├── metric.schema.json
│       ├── unit.schema.json
│       ├── geography.schema.json
│       ├── time-period.schema.json
│       ├── population-group.schema.json
│       ├── source.schema.json
│       ├── definition.schema.json
│       ├── observation.schema.json
│       └── relationship.schema.json
│
├── src/
│   ├── world-model/
│   │   ├── WorldModel.ts
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   ├── query.ts
│   │   └── validation.ts
│   │
│   ├── calculations/
│   │   ├── scale.ts
│   │   ├── ratio.ts
│   │   ├── percentage.ts
│   │   ├── conversion.ts
│   │   └── index.ts
│   │
│   ├── questions/
│   │   ├── QuestionEngine.ts
│   │   ├── Question.ts
│   │   ├── templates/
│   │   └── generators/
│   │
│   └── games/
│       └── ...
│
├── scripts/
│   ├── validate-data.ts
│   ├── build-data.ts
│   └── generate-indexes.ts
│
└── package.json
```

---

# 33. The One Architectural Boundary I Would Insist On

This is perhaps the most important thing for your coding agent:

```text
                 DATA LAYER
                     |
                     v
              WorldModel API
                     |
          ----------------------
          |         |          |
     Calculations Questions   Games
```

**Nothing above the WorldModel layer should directly import CSV files.**

Nothing should do:

```javascript
fetch('/data/observations.csv')
```

inside a game component.

Instead:

```javascript
world.getObservation(...)
```

The WorldModel owns the data.

That gives us the freedom later to replace:

```text
JSONWorldModel
```

with:

```text
SQLiteWorldModel
```

or:

```text
SupabaseWorldModel
```

without rewriting Planet 1000.

---

# 34. My Final Recommendation

I think we have now landed on a particularly strong architecture:

**Human layer**

```text
CSV
```

Easy for you to inspect, edit, bulk-load and maintain.

**Validation layer**

```text
TypeScript + JSON Schema
```

Ensures the dataset is internally coherent.

**Runtime layer**

```text
JSON
```

Fast, portable, static and browser-friendly.

**Domain layer**

```text
WorldModel
```

Provides a clean internal API.

**Calculation layer**

```text
Scale
Ratio
Percentage
Conversion
Comparison
```

Derives information from facts.

**Question layer**

```text
Question Templates
```

Turns facts and calculations into questions.

**Game layer**

```text
Planet 1000
Estimation
Chains
Future games...
```

Consumes the World Model without knowing anything about storage.

And crucially:

> **There is no database in this architecture.**

Not because we are avoiding a database for philosophical reasons, but because **the World Model itself is the database, and Git + structured data files are sufficient for the scale and nature of the information we're currently planning to store.**

If Planet 1000 eventually becomes a much larger platform, we have deliberately created a clean seam where a real database can be inserted later without throwing away the game engine.
