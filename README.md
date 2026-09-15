# GlowGuide — Your Personal Beauty Planner

## Overview

GlowGuide is a personal beauty planning dashboard for organizing skincare, makeup, haircare, and beauty routines, events, products, and journaling. It's built as a **planning and organization tool** — not a medical, dermatology, or diagnostic app — focused on helping people track the beauty habits and preparation they already do.

Everything runs entirely in the browser. There's no backend, no accounts, and no external APIs: all data is stored in the browser's LocalStorage and never leaves the device.

## Problem Statement

Beauty routines involve a surprising amount of quiet planning — remembering skincare steps, prepping for events days in advance, keeping track of what's in a growing product collection, and noticing which habits actually stick. Most of that lives in scattered notes apps, photos, and memory. GlowGuide brings it into one lightweight, offline planner built specifically around how beauty routines are actually organized.

## Features

- **Beauty Profile** — a short onboarding flow that captures goals, routine length, and style preferences
- **Dashboard** — daily greeting, a Glow Consistency score, today's routine checklist, quick stats, and a 7-day progress chart
- **My Routine** — separate morning and evening routines with add / delete / complete / drag-to-reorder steps
- **Glam Planner** — create events (weddings, parties, shoots) and get an automatically generated, countdown-based preparation timeline (7 days → 3 days → 1 day → 3 hours → 30 minutes before)
- **Beauty Vault** — a searchable, filterable product collection across Skincare, Makeup, Haircare, Fragrance, Tools, and Other, with ratings and favorites
- **Beauty Journal** — timeline-style entries with mood, look of the day, products used, notes, and an optional locally-stored photo
- **Look Planner** — pick an occasion, style, and time budget to generate a structured, step-by-step look plan (Base, Eyes, Brows, Blush, Lips, Hair, Final Touch)
- **Insights** — weekly and monthly consistency, category distribution, event prep completion, and generated "Glow Habits" text insights
- **Settings** — edit profile, light/dark theme, notification preference (UI only), demo data loader, JSON export/import, and a full reset

Every add, edit, delete, and checkbox interaction persists to LocalStorage immediately and survives a page refresh.

## Tech Stack

- HTML5, CSS3, vanilla JavaScript (no framework)
- [Chart.js](https://www.chartjs.org/) (via CDN) for the weekly progress, insights, and category charts
- Browser LocalStorage for all persistence
- Google Fonts: Fraunces (display), Manrope (body), JetBrains Mono (data/utility)
- No backend, no paid APIs, no external authentication — works fully offline once assets are cached

## Screenshots

_Add screenshots here: Landing page, Dashboard, Glam Planner timeline, Beauty Vault, and Insights._

## Project Structure

```
GlowGuide/
│
├── index.html          Landing page
├── profile.html         Beauty profile onboarding
├── dashboard.html        Main dashboard
├── routine.html          Morning / evening routine builder
├── planner.html          Glam Planner (event timelines)
├── vault.html            Beauty Vault (product collection)
├── journal.html          Beauty Journal
├── looks.html            Look Planner
├── insights.html         Analytics dashboard
├── settings.html         Settings, export/import, reset
│
├── css/
│   ├── style.css         Design tokens + core component styles
│   └── responsive.css    Breakpoints (sidebar drawer, bottom nav, grid collapse)
│
├── js/
│   ├── storage.js        LocalStorage data layer + stats helpers (GG.store, GG.stats)
│   ├── app.js             Shared shell: theme, toasts, confirm dialogs, Glow Ring renderer
│   ├── demo.js             Fictional demo data loader
│   ├── dashboard.js
│   ├── routine.js
│   ├── planner.js
│   ├── vault.js
│   ├── journal.js
│   ├── looks.js
│   ├── insights.js
│   └── settings.js
│
├── assets/images/
└── README.md
```

## How to Run

No build step or install required.

1. Download or clone this folder.
2. Open `index.html` in any modern browser — or serve the folder with a simple static server, e.g.:
   ```
   npx serve .
   ```
3. Click **Start My Glow Journey** to set up a profile, or **Explore Demo** to preview the app pre-populated with fictional data.

All data is stored locally in your browser. Clearing your browser's site data will remove it.

## Future Improvements

- Push-style local reminders using the Notifications API (currently a UI preference only)
- Multi-profile support for shared devices
- Custom look-plan steps beyond the built-in suggestion set
- PWA support for installable, fully offline use
- Optional cloud sync as an opt-in, not a requirement

## Author

Built as a portfolio project exploring personal planning tools outside of the typical productivity-app mold — applied to beauty and self-care routines instead of tasks and calendars.
