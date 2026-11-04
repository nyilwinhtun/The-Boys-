# The Boys Mobile — React Foundation (Phase 1)

This is a separate React + Vite + TypeScript + Tailwind foundation intended to be copied into `My-Mobile-Shop/frontend/`.

## Important safety boundary

- The legacy root files (`index.html`, `manifest.json`, `sw.js`) are intentionally not included or changed by this starter.
- No Firebase SDK, Firebase Authentication, Firestore, Realtime Database, API key, or production data is connected in this phase.
- The login screen is a visual preview only; it does not collect or submit credentials.
- Dashboard figures are intentionally blank rather than fabricated.
- Inventory, POS, purchase, accounting, and other modules are placeholders until their approved workflows are implemented.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Install and run

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

## Validate a production build

```bash
npm run typecheck
npm run build
npm run preview
```

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4 via `@tailwindcss/vite`
- Lucide React icons
- Dexie dependency included for the upcoming IndexedDB implementation (not yet wired)
- `vite-plugin-pwa` for the app shell and PWA manifest

## Next implementation steps

1. Confirm the UI shell on desktop, Android-sized mobile, and tablet.
2. Implement Firebase Auth only after reviewing the intended Firebase project and existing auth configuration.
3. Add the approved Firestore schema and server-side authorization.
4. Implement Dexie schema/migrations and the outbox sync engine.
5. Implement modules in the approved business workflow order.

## Note about the existing repository

This package is designed to live inside `My-Mobile-Shop/frontend/`. Do not replace the root `index.html`, `manifest.json`, or `sw.js` during this foundation stage. When ready to deploy, configure hosting rewrites or a dedicated path/domain so the legacy app and new app do not conflict.
