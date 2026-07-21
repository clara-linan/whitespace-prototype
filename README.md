# Horizon — Pipeline Qualification Tool

> **Portfolio Demonstration Environment**
> All data displayed is synthetic, fictional, and generated for demonstration purposes only. No customer, employee, company, or proprietary information is included. This project is not affiliated with or endorsed by any employer.

---

## What Is This?

Horizon is a **client-side enterprise pipeline qualification tool** built as a portfolio project to demonstrate product thinking, engineering capability, and UX design in the context of an internal sales operations tool.

It is inspired by the category of internal tooling used by enterprise sales teams to triage pipeline whitespace — identifying open opportunities, qualifying them in or out, and exporting prioritized lists for downstream CRM entry.

**All company names, account names, opportunity IDs, dollar figures, and people in this application are entirely fictional.** The fictional company "Nexus Systems" and all associated data were created solely to make the demo realistic enough to illustrate the product's functionality.

---

## Live Demo

→ [View on GitHub Pages](#) *(add your URL here after deploying)*

---

## Features

### Whitespace Dashboard
- **Stat tiles** — Potential pipeline value, whitespace count, % remaining, qualified in/out totals
- **Collapsible opportunity cards** — Grouped by Account + Solution Area, expandable to show individual opportunities with forecast status and type badges
- **Qualify In / Qualify Out** — Card-level actions that move opportunities across tabs; Qualify Out requires a mandatory reason
- **Undo** — Revert any qualification decision back to whitespace
- **Tier selector** — Per-card toggle (Standard / Enhanced) that recalculates the opportunity value in real time (20% vs 30% of eligible ACV)
- **Typeahead filters** — Multi-select chip filters for AE, Account, Solution Area, and Segment; ACV range chip filters
- **Excel export** — Styled .xlsx download for new unexported qualifications, or all qualified-in records

### Adoption Services Dashboard
- Parallel qualification workflow for a second business line
- Same qualify in/out pattern with independent state

### General
- **Disclaimer modal** — Appears on first load; user must acknowledge before accessing the tool
- **Persistent disclaimer banner** — Always visible in the header
- **Qualification state persistence** — Decisions survive page refresh via `localStorage`
- **Data Quality Log** — Collapsible log of any warnings from the data generation step
- **No server, no auth, no uploads** — Fully static, runs in-browser from seed data

---

## Architecture

```
horizon-portfolio/
├── index.html              ← Single HTML file, no framework
├── data/
│   └── seed.js             ← Synthetic data generation (100% fictional)
└── assets/
    ├── css/
    │   └── style.css       ← Design tokens, layout, components
    ├── js/
    │   ├── state.js        ← Immutable qualification state manager (AppState)
    │   ├── pipeline.js     ← Converts flat rows → grouped SolAreaGroup objects
    │   ├── display.js      ← All DOM rendering, filter state, typeahead UI
    │   ├── export.js       ← Styled Excel export via xlsx-js-style
    │   ├── cas-state.js    ← CAS dashboard qualification state
    │   ├── cas-display.js  ← CAS dashboard rendering
    │   └── main.js         ← Init, event wiring, tab switching, modal handling
    └── lib/
        └── xlsx-js-style.min.js  ← SheetJS CE + styling (MIT license)
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Vanilla JS, no framework | Demonstrates core engineering fundamentals; zero build tooling needed for static deployment |
| Client-side only | No backend means no auth complexity, instant GitHub Pages deploy, zero infrastructure cost |
| Pre-loaded seed data | Removes onboarding friction for demo viewers; data is always present and consistent |
| `localStorage` for state | Qualification decisions survive refresh — demonstrates thinking about user workflow continuity |
| Modular JS files | Each file has a single responsibility; easy to read and explain in an interview context |
| CSS custom properties | All colors and spacing are tokenized — easy to retheme, demonstrates design systems thinking |

---

## Synthetic Data

All data is generated in [`data/seed.js`](data/seed.js) using hardcoded arrays of fictional:

- **15 fictional accounts** (e.g. "Meridian Global Holdings", "Cobalt Pharmaceuticals")
- **11 solution areas** across 4 product lines
- **7 fictional account executives** with generically diverse names
- **~120–180 opportunity rows** generated deterministically on each page load

Opportunity IDs follow the pattern `NX-OPP-XXXX`. Dollar values are random within realistic enterprise ACV ranges ($125K–$2.4M).

---

## Technology

- **Vanilla JavaScript** (ES2020) — no framework, no build step
- **CSS Custom Properties** — design token system
- **[xlsx-js-style](https://github.com/gitbrent/xlsx-js-style)** (MIT) — styled Excel exports
- **Google Fonts: Inter** — neutral enterprise typography
- **GitHub Pages** — static hosting

---

## Deployment (GitHub Pages)

1. Fork or clone this repository
2. Push to `main` (or your default branch)
3. In repository settings → Pages → set source to `main` branch, `/ (root)`
4. Your demo will be live at `https://<username>.github.io/<repo-name>/`

No build step required.

---

## Privacy & Compliance

- Zero real data of any kind
- No telemetry, analytics, or external data calls (beyond Google Fonts)
- `<meta name="robots" content="noindex">` to discourage search indexing
- Disclaimer modal + persistent header banner make the demo nature immediately clear
- No company logos, trademarks, or brand assets from any employer

---

## About This Project

Built to demonstrate:
- **Product thinking** — scoping a useful internal tool, designing the right UX for a sales operations workflow
- **Engineering execution** — clean modular architecture, state management, real Excel export, filter UI
- **Design sensibility** — professional enterprise aesthetic, consistent token system, responsive layout
- **Deployment readiness** — static, zero-dependency, instantly hostable

*Not affiliated with or endorsed by any current or past employer.*
