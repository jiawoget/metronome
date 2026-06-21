# Metronome Practice

Preflight initializes the v0 engineering foundation for the local-first guitar practice app.

## Local Setup

```bash
nvm use
npm install
npm run dev
```

The project is pinned to Node 24 and npm 11 through `.nvmrc`, `.npmrc`, and `package.json` engines.

## Verification Commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run playwright:install
npm run test:e2e
```

The initial app shell is intentionally a placeholder. Real metronome, recording, sheet, reference, and settings behavior belongs to later v0 modules after `00-preflight` is separately verified.
