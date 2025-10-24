# D&D Combat Tracker

A web-based initiative and encounter tracker for tabletop RPG sessions built with the Next.js Pages Router. The app keeps the whole table on the same page by combining manual party management, automatic initiative ordering, and quick monster imports.

## Features

- **Party roster management** – Add combatants manually or import full stat blocks from D&D Beyond characters and campaigns, including current hit points, class levels, and initiatives.【F:src/pages/index.js†L171-L318】【F:src/pages/api/import-dndbeyond-campaign.js†L1-L121】
- **Monster lookup** – Search the Open5e API and map the returned armor class, HP, ability scores, actions, and speed directly into the encounter builder form.【F:src/pages/index.js†L229-L303】【F:src/pages/api/monsters.js†L1-L61】
- **Turn tracking** – Sort party members and enemies into initiative order, highlight the active combatant, and update damage or healing as the fight progresses.【F:src/components/CombatOrder.js†L1-L196】【F:src/pages/index.js†L320-L639】
- **Flexible notes and actions** – Store freeform notes, multi-step monster actions, and ability scores with sensible defaults for quick iteration mid-session.【F:src/components/Enemies.js†L1-L325】

## Requirements

- Node.js 18.17 or newer (matches the minimum supported by Next.js 16).【F:package.json†L1-L18】
- npm 9+ (ships with recent Node releases).

## Installation

```bash
npm install
```

## Local development

```bash
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000). API routes under `src/pages/api` are proxied through the same origin, so you can search Open5e or import from D&D Beyond without extra configuration.【F:src/pages/api/monsters.js†L1-L61】【F:src/pages/api/import-dndbeyond.js†L1-L52】

### Seeding an encounter

1. Add party members manually with name, initiative, and current/max HP.
2. Paste a D&D Beyond character URL or numeric ID to import a hero sheet. Campaign imports pull every character in a linked game.
3. Search for monsters by name (minimum two characters) to autofill armor class, hit points, speed, actions, and ability scores from Open5e.
4. Add the enemy or ally to the battlefield and manage the turn order from the Combat Order panel.【F:src/pages/index.js†L229-L555】【F:src/components/CombatOrder.js†L1-L196】

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with Webpack (hot reloading).【F:package.json†L5-L13】 |
| `npm run build` | Create an optimized production build. |
| `npm run start` | Run the compiled production server. |
| `npm run lint` | Execute ESLint using the repo configuration. |

## Project layout

- `src/pages/index.js` – Main combat tracker UI logic, including monster search and D&D Beyond import workflows.
- `src/components/` – Presentational and form components for party members, enemies, and the combat order.
- `src/lib/dndbeyond.js` – Helper utilities for parsing D&D Beyond identifiers, computing initiative, and normalizing character data.【F:src/lib/dndbeyond.js†L1-L200】
- `public/` – Static assets served by Next.js.

## External services

- **Open5e** – Monster search results are fetched from `https://api.open5e.com/monsters/`. Respect their rate limits during play sessions.【F:src/pages/api/monsters.js†L1-L61】
- **D&D Beyond** – Character and campaign data are fetched directly from the public JSON endpoints. Imports require no authentication but remain subject to D&D Beyond availability and terms of use.【F:src/lib/dndbeyond.js†L1-L200】【F:src/pages/api/import-dndbeyond.js†L1-L52】

## Deployment

The repository ships with a `vercel.json` file configured for a Next.js Pages Router application. Deployments through the Vercel dashboard or CLI will automatically run `npm install`, `npm run build`, and host the production bundle.【F:vercel.json†L1-L14】

