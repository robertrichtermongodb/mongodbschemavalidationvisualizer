# MongoDB Schema Validator Simulator

A browser-only, single-file interactive playground for understanding how MongoDB's built-in schema validation works — visually and without needing a running database.

**Live demo:** deploy `index.html` via GitHub Pages (no build step required).

---

## What it does

MongoDB lets you attach a `$jsonSchema` validator to any collection. Two settings control its behaviour:

| Setting | Values | Effect |
|---|---|---|
| `validationLevel` | `strict` / `moderate` | Who gets validated |
| `validationAction` | `error` / `warn` | What happens on a violation |

This simulator lets you explore every combination of those settings against three scenarios:

- **Insert** — a brand-new document being written for the first time
- **Update: valid existing doc** — modifying a document that already conforms to the schema
- **Update: invalid existing doc** — modifying a document that was written before the validator was enforced (or under looser rules)

For each combination the tool shows:

- An animated flow diagram (write attempt → validator → collection or rejection)
- A plain-English explanation of the outcome
- The application-layer consequence (what your code actually receives)
- A `⚡` callout for powerful or non-obvious behaviour
- The equivalent `db.runCommand` / `db.createCollection` MongoDB command
- Hover tooltips on every diagram node for contextual detail

### Key insight the tool highlights

Under `moderate` + an already-invalid existing document, MongoDB **intentionally bypasses validation** for updates. This is the most powerful — and most misunderstood — behaviour: it gives you unconditional write availability for legacy invalid data, enabling zero-downtime schema migrations without blocking your application.

---

## How to run

Just open `index.html` in any modern browser. No server, no build tool, no dependencies.

### GitHub Pages

1. Push the repository to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder
4. The simulator will be live at `https://<your-username>.github.io/<repo-name>/`

---

## Technical notes

- Pure HTML + CSS + vanilla JavaScript — zero external dependencies, zero CDN calls
- All validation outcomes are pre-computed in a lookup table (no real MongoDB connection needed)
- SVG flow diagram with CSS state classes for animated transitions
- Fully self-contained in `index.html` (~1000 lines)

---

## Author

**Robert Richter** · [LinkedIn](https://www.linkedin.com/in/robert-richter-27b46812b/)

*Implemented by AI. Designed, reviewed and iterated by human.*
