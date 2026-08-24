Yes. And given the scale you just described, I would make a fairly strong recommendation:

> **Do not start with Supabase or any external database.**
>
> Build Planet 1000 as a **static, data-driven web application**, with the canonical World Model stored as version-controlled JSON/CSV files and loaded into the application at build/runtime.

I think this is one of those cases where a conventional database would be solving a problem you don't actually have.

## The key question: how much data are we really talking about?

Your intuition is important here.

Suppose you eventually have:

* 15 domains
* 30–100 entities per domain
* 10–20 observations per entity
* several years
* multiple geographies

Even if you get to **100,000 observations**, that's still tiny by database standards.

And you may initially have only a few thousand.

For something like this, the browser can comfortably handle the data. If you eventually need richer client-side persistence or querying, IndexedDB is a native browser database designed for structured data and indexed queries. ([MDN Web Docs][1])

But I wouldn't even start there.

---

# 1. Option A: JSON/CSV files + static web app

This is what I would choose initially.

Your project could look something like:

```text
planet1000/
│
├── data/
│   ├── domains.json
│   ├── entities.json
│   ├── metrics.json
│   ├── observations.json
│   ├── geographies.json
│   ├── time-periods.json
│   ├── population-groups.json
│   ├── sources.json
│   └── relationships.json
│
├── src/
│   ├── data/
│   ├── world-model/
│   ├── calculations/
│   ├── questions/
│   └── games/
│
└── ...
```

The browser downloads the data along with the application.

No database server.

No API.

No authentication.

No credentials.

No Supabase project.

No backend.

No network call after the initial page load.

That is a very attractive architecture for Planet 1000.

---

# 2. I would actually prefer JSON over CSV for the application

You mentioned CSV, JSON, and web-compatible formats.

I'd use **both**, but for different purposes.

### CSV = authoring/data interchange

CSV is excellent for you maintaining facts in a spreadsheet.

For example:

```text
entity,metric,geography,year,value,unit,source
physician,population_count,world,2025,11200000,person,WHO
automobile,vehicles_in_operation,world,2025,1500000000,vehicle,...
```

You can open this in Excel, Google Sheets, Python, etc.

That's very convenient.

### JSON = application format

The application can consume normalized JSON:

```javascript
{
  "entityId": "physician",
  "metricId": "population_count",
  "geographyId": "world",
  "year": 2025,
  "value": 11200000,
  "unit": "person",
  "sourceId": "who"
}
```

So I'd make your **source-of-truth authoring format CSV or JSON**, and have a small build script validate and transform it into optimized application JSON.

That gives you the best of both worlds.

---

# 3. The really nice thing: Git becomes your database history

This is a big advantage that is easy to overlook.

Suppose your data is:

```text
data/observations.csv
```

You change:

```text
World population, 2025
8.59 billion
```

to:

```text
World population, 2025
8.61 billion
```

Git knows:

* what changed;
* when;
* who changed it;
* what the old value was;
* what the new value is.

You can tag releases:

```text
data-v1.0
data-v1.1
data-v2.0
```

You can review changes in pull requests.

You can have your coding agent validate the data before committing it.

For a relatively small **curated reference dataset**, this is extremely powerful.

---

# 4. What you DON'T get with this approach

The main disadvantage is obvious:

**There is no live central database.**

If you change the data, you need to:

1. modify the data files;
2. rebuild/deploy the app.

That's actually not much of a problem for your use case.

You're not building:

> "A million users continuously entering world statistics."

You're building:

> "A curated educational reference dataset that gets updated periodically."

Those are completely different requirements.

---

# 5. What Supabase would give you

Supabase gives you a real PostgreSQL database plus APIs and other infrastructure. Each Supabase project includes a full Postgres database. ([Supabase][2])

That's excellent if you need:

* multiple users writing data;
* authentication;
* user accounts;
* permissions;
* real-time updates;
* server-side querying;
* centralized administration;
* a web-based data editor;
* data changing without redeploying the application.

But ask yourself:

**Do we need any of those?**

For Planet 1000's World Model, probably not.

---

# 6. The biggest advantage of Supabase

It's not really "database performance."

You don't need database performance.

It's **centralized data management**.

Imagine you eventually have:

```text
25,000 observations
```

and you want to edit them from a browser.

Supabase becomes attractive.

You can query:

```sql
SELECT *
FROM observations
WHERE domain = 'healthcare'
AND geography = 'world'
AND year = 2025;
```

You can create relationships and constraints.

You get transactions.

You get a database UI.

And Postgres is extraordinarily capable. Supabase exposes the underlying Postgres database rather than giving you a proprietary abstraction. ([Supabase][3])

But again, **you may not need any of that**.

---

# 7. SQLite is the interesting middle ground

There's a third option I wouldn't dismiss.

SQLite is an actual relational database, but it is:

* open source/public domain;
* serverless;
* zero configuration;
* single-file;
* extremely portable;
* capable of full SQL;
* capable of handling vastly more data than Planet 1000 will ever need. ([SQLite][4])

A SQLite database is literally a single file. ([SQLite][5])

So you could have:

```text
planet1000.db
```

instead of:

```text
observations.json
```

And query it with SQL.

That's attractive **on the development/data-authoring side**.

But there is a catch.

### Browsers don't natively open SQLite files as databases.

You need a JavaScript/WebAssembly SQLite implementation or a server-side process.

So if your ultimate requirement is:

> **Drop the files onto a static web server and have the browser run the entire application with zero backend**

then plain JSON is simpler.

---

# 8. There is actually a fourth option: IndexedDB

This is the native browser database.

IndexedDB is designed specifically for storing significant amounts of structured data in the browser, with indexes and transactions. ([MDN Web Docs][1])

So technically you could have:

```text
JSON data
    ↓
first application load
    ↓
IndexedDB
    ↓
World Model
```

But I **wouldn't do that initially**.

Why?

Because your World Model is fundamentally **application data**, not user-generated persistent data.

IndexedDB becomes more useful if you eventually have:

* student progress;
* game history;
* scores;
* locally generated questions;
* offline play;
* custom datasets;
* teacher-created question sets.

In other words:

> **IndexedDB is potentially excellent for user state, but unnecessary for your canonical World Model.**

And browser storage has its own persistence/eviction considerations; it isn't equivalent to a centrally managed authoritative database. ([MDN Web Docs][6])

---

# 9. I would therefore separate two kinds of data

This is an architectural distinction I'd make now.

## A. Planet 1000 Reference Data

Immutable-ish, curated, version controlled:

```text
domains
entities
metrics
observations
geographies
sources
relationships
```

Store as:

**CSV/JSON + Git**

## B. Player Data

Dynamic, personal:

```text
player
game_progress
scores
answers
achievements
preferences
history
```

Initially:

**browser/local storage**

Eventually:

**IndexedDB**

And only later, if you need accounts/classes/leaderboards:

**backend database**

This gives you a very clean architecture.

---

# 10. And this leads to an important idea: the app can be completely static

Imagine I give you:

```text
planet1000.com
```

The entire application consists of:

```text
HTML
CSS
JavaScript
JSON
images
```

The user opens it.

The browser downloads the application.

Then:

> **Everything runs locally.**

No API calls.

No database calls.

No authentication.

No server-side calculation.

The World Model is already sitting inside the application.

That's entirely feasible for the size of dataset you're describing.

And it has a beautiful property for a classroom:

> **The game keeps working even if the internet connection disappears after the page loads.**

---

# 11. One thing I'd change from our previous architecture

Previously I proposed something that looked like:

```text
domains
entities
metrics
observations
geographies
time_periods
sources
```

I would keep that conceptual model.

But I would **not necessarily implement all of those as database tables**.

Instead, they can simply be JSON collections:

```text
domains.json
entities.json
metrics.json
observations.json
geographies.json
timePeriods.json
sources.json
```

Then your World Model library loads them:

```javascript
const world = await loadWorldModel();
```

and exposes:

```javascript
world.getObservation(...)
world.getEntity(...)
world.getMetric(...)
world.getPopulation(...)
world.calculate(...)
world.scaleTo(...)
```

The rest of the application doesn't care whether the underlying storage is JSON, SQLite, or Supabase.

**That abstraction is extremely valuable.**

---

# 12. This gives you database independence

I would actually make this an explicit architectural requirement:

> **The game engine must not know or care where the World Model is stored.**

Define an interface such as:

```text
WorldModelProvider
```

with operations conceptually like:

```text
getDomain()
getEntity()
getMetric()
getObservation()
getGeography()
getSource()
queryObservations()
```

Then implement:

```text
JsonWorldModelProvider
```

first.

Later you could implement:

```text
SQLiteWorldModelProvider
```

or:

```text
SupabaseWorldModelProvider
```

without rewriting the question engine.

This is probably the **single most important architectural precaution** I'd take.

---

# 13. So what would I actually build?

I'd choose:

### Frontend

**React + TypeScript**

or whatever frontend framework you've already standardized on for this project.

### Data

**JSON + CSV**

with:

* CSV convenient for data entry;
* JSON convenient for application consumption.

### Source control

**Git/GitHub**

The World Model becomes version-controlled content.

### Build-time validation

A small Node/TypeScript script:

```text
data/*.csv
       ↓
validate
       ↓
normalize
       ↓
calculate indexes
       ↓
generate JSON
       ↓
build application
```

### Runtime

Pure client-side JavaScript/TypeScript.

### User state

Initially:

**localStorage** for tiny things.

Later:

**IndexedDB** if player history becomes substantial.

### Backend

**None initially.**

---

# 14. The one thing I would NOT do

I wouldn't put one enormous file into the project:

```text
world.json
```

with 20,000 nested objects.

Instead, maintain logical datasets:

```text
data/
    domains.json
    entities.json
    metrics.json
    observations.json
    geographies.json
    timePeriods.json
    populationGroups.json
    sources.json
    relationships.json
```

The build process can combine/index them for runtime.

That keeps the repository human-manageable.

---

# 15. CSV vs JSON: my preferred workflow

I might actually go one step further.

Have:

```text
data/source/
```

containing human-maintained CSVs:

```text
observations.csv
sources.csv
entities.csv
```

Then:

```text
npm run build:data
```

produces:

```text
data/generated/
    observations.json
    indexes.json
    ...
```

The generated files aren't manually edited.

This gives you a miniature **data engineering pipeline**.

And given your background, I suspect you'll appreciate this approach.

---

# 16. What happens when the data grows?

Suppose Planet 1000 eventually becomes:

**5,000 facts**

Nothing changes.

**50,000 facts**

Still nothing changes.

**500,000 facts**

Still potentially fine as a dataset, though you'd start caring about payload size and indexing.

**5 million facts**

Now I'd start reconsidering whether all of the data should ship to every browser.

At that point you might move toward:

```text
Static app
     ↓
API
     ↓
SQLite/Postgres
```

But I would **not architect for 5 million facts today**.

Build for the world you actually have.

---

# 17. One important subtlety: the source data can remain separate from the game

This is another reason I like the static approach.

Your Git repository could contain:

```text
world-model/
    data/
    schemas/
    sources/
    validation/
```

and your game could consume a generated artifact:

```text
planet1000-data.json
```

Eventually you could have:

```text
World Model Repository
        ↓
        build
        ↓
Planet 1000 Data Package
        ↓
Game 1
Game 2
Game 3
Game 4
```

That is very close to what you originally envisioned:

> **Planet 1000 isn't one game. It's a game engine powered by a reusable World Model.**

---

# 18. My recommendation, in one diagram

I'd build this:

```text
                 GITHUB
                    |
             WORLD MODEL DATA
                    |
        -------------------------
        |           |           |
       CSV         JSON       Sources
        |
    validation
        |
   build pipeline
        |
   generated JSON
        |
        v
   PLANET 1000 APP
        |
   WorldModel API
        |
   --------------------------
   |      |       |         |
 Scale  Derive  Compare  Explain
   |      |       |         |
   --------------------------
              |
       QUESTION ENGINE
              |
       ----------------
       |      |       |
      Game   Game    Game
```

No database server.

No API.

No Supabase.

No backend.

Just a static web application.

---

# 19. When should you introduce a real database?

I'd use this decision rule:

| Requirement                 |  JSON/CSV |           SQLite |            Supabase/Postgres |
| --------------------------- | --------: | ---------------: | ---------------------------: |
| Thousands of facts          | Excellent |        Excellent |                     Overkill |
| 100K facts                  | Excellent |        Excellent |                         Fine |
| Version control             | Excellent |             Good |             More complicated |
| Human editing               | Excellent |         Moderate |                    Excellent |
| SQL queries                 |        No |        Excellent |                    Excellent |
| Static website              | Excellent | More complicated |                           No |
| No external dependency      | Excellent |        Excellent |                           No |
| Multiple users editing data |      Poor |             Poor |                    Excellent |
| Live updates                |      Poor |             Poor |                    Excellent |
| User accounts               |      Poor |             Poor |                    Excellent |
| Leaderboards                |      Poor |             Poor |                    Excellent |
| Classroom synchronization   |      Poor |             Poor |                    Excellent |
| Offline operation           | Excellent |         Possible |                       Poorer |
| Data provenance/Git history | Excellent |             Good | Requires additional workflow |

For **your current requirements**, JSON/CSV wins decisively.

---

# 20. My strongest recommendation

I'd actually go one step further than saying "use JSON."

I'd say:

> **Design Planet 1000 as a database-independent data application whose first storage implementation is static JSON generated from human-friendly CSV/JSON source files.**

That gives you:

**Simple now**

* **zero infrastructure**

* **free hosting**

* **offline capability**

* **Git versioning**

* **easy data editing**

* **easy inspection**

* **easy portability**

* **no vendor lock-in**

* **future ability to migrate to SQLite/Postgres/Supabase without changing the game engine.**

SQLite remains a fantastic fallback if the World Model becomes complex enough that you genuinely want relational queries; it's specifically designed to be serverless, zero-configuration, single-file, and transactional. ([SQLite][7])

But I would **not introduce it yet**.

And I definitely wouldn't introduce Supabase merely because "this is what apps normally use." Supabase becomes valuable when you need centralized, multi-user, server-side data; it doesn't solve a problem that Planet 1000 currently has. ([Supabase][2])

