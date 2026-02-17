# Scholar Board

Scholar Board is an IB student productivity workspace for planning, focus sessions, subject tracking, and progress analytics.

It supports:
- Web app (Next.js + Supabase)
- Desktop app (Electron + SQLite offline-first sync)

## Core Features

- Subject management with confidence tracking, weaknesses, and notes
- Task + objective planning across homework and independent study
- Focus sessions with timer, ambient mode, and optional Spotify embed
- Calendar scheduling for study sessions and school events
- Proactive score logic based on study behavior
- Offline-first desktop mode with local persistence and sync when online
- Multiple visual themes with token-based UI styling

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + remote sync backend)
- Electron + better-sqlite3 for desktop offline data

## Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Run web app:
```bash
pnpm dev
```

3. Run Electron dev app:
```bash
pnpm dev:electron
```

## Build Artifacts

Artifacts are generated in `release/`.

### macOS (Apple Silicon)
```bash
pnpm electron:build:mac
```

### macOS (Intel)
```bash
pnpm electron:build:mac:x64
```

### Windows (x64)
```bash
pnpm electron:build:win
```

## Install Instructions

See `INSTALL.md` for full install instructions and offline/sync behavior notes.

Quick install:
- macOS: open DMG, drag Scholar Board to Applications, launch from Applications
- Windows: run `Scholar Board Setup ... .exe`

## Notes for Test Builds

- Unsigned macOS builds may show Gatekeeper warnings (right-click app -> Open).
- For production distribution, use Apple code signing + notarization.
