# Metronome Practice

Preflight initializes the v0 engineering foundation for the local-first guitar practice app.

## Local Setup

```bash
nvm use
npm install
npm run dev
```

The project is pinned to Node 24 and npm 11 through `.nvmrc`, `.npmrc`, and `package.json` engines.

## Windows Setup In This Workspace

This workspace now includes a local Node.js runtime under `.tools/`, so you can run project commands from PowerShell without touching your system install:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 install
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run dev
```

Common verification commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run lint
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run typecheck
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:unit
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run build
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run playwright:install
powershell -ExecutionPolicy Bypass -File .\scripts\npm-local.ps1 run test:e2e
```

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
