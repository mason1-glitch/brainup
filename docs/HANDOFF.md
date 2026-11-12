# Übergabe

## Stand

- Gearbeitet wird auf dem Branch `fundament` (noch nicht in `main`).
- Schritt 2 fertig: Vite 8 + Svelte 5 + TypeScript 6 strict + Vitest laufen (`npm run dev`, `npm test`, `npm run build`). Datenmodell und Repository (`src/data/`), Spiel-Schnittstelle (`src/games/types.ts`), Tagesprogramm-Planung (`src/program/daily.ts`) stehen; Architektur in `docs/DECISIONS.md` D3–D7.
- Noch keine Oberfläche (`src/app/App.svelte` ist ein Platzhalter), noch keine Spiele.

**Nächster Schritt:** Fable, Schritt 3 (Kernmodule mit Tests in `src/core/`).

## Aufgaben

Reihenfolge einhalten. Abnahmekriterien stehen in `docs/PLAN.md`, sofern hier nichts anderes steht.

### Fable – Fundament und schwierigste Teile

- [x] 1. Übergabe-Gerüst (CLAUDE.md-Projektteil, HANDOFF.md, DECISIONS.md)
- [x] 2. Gerüst und Architektur: Vite + TypeScript (strict) + Svelte + Vitest; Datenmodell (Dexie), Spiel-Schnittstelle, Ablauf des Tagesprogramms, Ordnerstruktur → in DECISIONS.md
- [ ] 3. Kernmodule mit Tests: Timing-Engine, Staircase, exakte Arithmetik, Spaced-Repetition-Warteschlange
- [ ] 4. Designsystem und App-Shell, Styleguide unter /dev/styleguide (danach anhalten, Nutzer schaut es sich an)
- [ ] 5. Referenzspiele: a) Mentale Rotation, b) UFOV, c) Kopfrechnen-Kern + Sprint-UI
- [ ] 6. Vorlage für neue Spiele: `docs/ADDING_A_GAME.md` und `.claude/commands/neues-spiel.md`
- [ ] 7. Übergabe vervollständigen (CLAUDE.md-Abschnitt „Architektur, Befehle, verbindliche Regeln“, diese Datei)

### Opus – Rest

- [ ] Phase 0 aus PLAN.md: Aufwärm-Spiele auswählen, `docs/GAMES.md` (danach anhalten)
- [ ] Aufwärm-Spiele per `/neues-spiel`
- [ ] Kopfrechnen: Modi Präzision und Fehlertraining, Rechentricks
- [ ] Tagesprogramm
- [ ] Phase 3: Fortschritt und Einstufungslauf
- [ ] Phase 4: Einstellungen, Export/Import, Persistenz, .ics-Erinnerungen
- [ ] PWA/offline und Deploy per GitHub Actions auf Pages
- [ ] Playwright-E2E, Lighthouse CI, axe-core
- [ ] Phase 5: Red Team

## Bekannte Fallstricke

- TypeScript bleibt auf Version 6: svelte-check unterstützt TS 7 nur mit Parallelinstallation (D3).
- `npm install` warnt wegen des Install-Skripts von `fsevents` – harmlos, nichts freigeben nötig.
- GitHub Pages liegt unter `/brainup/`: Vite `base`, Manifest `start_url` und `scope` müssen passen, sonst bleibt die Seite weiß oder die App lässt sich nicht installieren.
- Pages-Workflow braucht `permissions: pages: write, id-token: write` und das Environment `github-pages`. Pages-Source ist auf „GitHub Actions“ gestellt.
- Playwright in CI: `npx playwright install --with-deps`.
- iOS: Daten bleiben nur in der installierten Home-Bildschirm-App zuverlässig erhalten; Vibration im Browser kaum verfügbar.
