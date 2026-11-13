# Übergabe

## Stand

- Gearbeitet wird auf dem Branch `fundament` (noch nicht in `main`).
- Schritt 2 fertig: Vite 8 + Svelte 5 + TypeScript 6 strict + Vitest laufen (`npm run dev`, `npm test`, `npm run build`). Datenmodell und Repository (`src/data/`), Spiel-Schnittstelle (`src/games/types.ts`), Tagesprogramm-Planung (`src/program/daily.ts`) stehen; Architektur in `docs/DECISIONS.md` D3–D7.
- Schritt 3 fertig: Kernmodule in `src/core/` mit Tests – `timing` (rAF-Reizbeginn, Frame-Rundung, Soll/Ist-Protokoll), `staircase` (n-down-1-up, Schätzer trifft simulierte Schwelle über 100 Seeds auf ±10 %), `fraction` (exakte Brüche auf bigint), `srs` (Warteschlange für Rechenfehler), `rng` (seedbarer Zufall).
- Schritt 4 fertig: Designsystem (`src/design/tokens.css`, `base.css`), Basiskomponenten in `src/ui/`, App-Shell mit Hash-Router und Tab-Leiste (`src/app/`), Seiten Heute/Spiele/Fortschritt/Einstellungen (`src/routes/`, die letzten beiden sind Platzhalter), Spiel-Host `src/routes/Play.svelte`, Styleguide unter `#/dev/styleguide`.
- Schritt 5a fertig: Mentale Rotation (`src/games/rotation/`) mit Tutorial, Staircase über 12 Level, Tests (3000 Figuren auf Chiralität geprüft) und Playwright-Lauf im iPhone-Viewport (`npm run e2e`, WebKit, gegen den Produktions-Build).
- Schritt 5b fertig: „Blickfeld“ (UFOV, `src/games/ufov/`) – Darbietung über die Timing-Engine, Staircase auf der Darbietungszeit, drei Stufen (Mitte · + Rand · + Ablenker), Tutorial, Tests; der Playwright-Lauf prüft zusätzlich die gespeicherten Soll/Ist-Zeiten auf ±1 Frame.

**Nächster Schritt:** Fable, Schritt 5c (Kopfrechnen-Kern + Sprint-UI).

**Ansehen:** `npm run dev` → http://localhost:5173/brainup/ · Styleguide unter `#/dev/styleguide` · auf dem iPhone im selben WLAN: `npm run dev:phone` und die angezeigte „Network“-Adresse + `/brainup/` öffnen.

## Aufgaben

Reihenfolge einhalten. Abnahmekriterien stehen in `docs/PLAN.md`, sofern hier nichts anderes steht.

### Fable – Fundament und schwierigste Teile

- [x] 1. Übergabe-Gerüst (CLAUDE.md-Projektteil, HANDOFF.md, DECISIONS.md)
- [x] 2. Gerüst und Architektur: Vite + TypeScript (strict) + Svelte + Vitest; Datenmodell (Dexie), Spiel-Schnittstelle, Ablauf des Tagesprogramms, Ordnerstruktur → in DECISIONS.md
- [x] 3. Kernmodule mit Tests: Timing-Engine, Staircase, exakte Arithmetik, Spaced-Repetition-Warteschlange
- [x] 4. Designsystem und App-Shell, Styleguide unter /dev/styleguide (danach anhalten, Nutzer schaut es sich an)
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
- Staircase-Schwelle: `threshold()` mittelt die Werte der Durchgänge (nicht die Umkehrpunkte – die streuen doppelt so stark). ±10 % brauchen einige hundert Durchgänge; eine einzelne Sitzung liegt eher bei ±20 %. Verläufe deshalb über mehrere Sitzungen glätten.
- Vitest zeigt `console.log` bestandener Tests nicht an (Reporter `dot`); zum Debuggen `npx vitest run <datei> --reporter=verbose`.
- Die Dev-URL braucht den Pfad `/brainup/` (wegen `base`); `http://localhost:5173/` allein zeigt nur einen Hinweis von Vite.
- `<meta name="theme-color">` folgt dem System-Schema, nicht der App-Einstellung „Hell/Dunkel“ – beim Bau der Einstellungen (Phase 4) per Skript nachziehen.
- E2E: Der Bot erkennt die richtige Antwort an `data-correct`; das Attribut gibt es nur, wenn `window.__brainupE2E` gesetzt ist (`e2e/helpers.ts`, `src/games/e2e.ts`). Einmalig `npx playwright install webkit` nötig.
- Spieldesign-Durchsicht („Spiel oder Test?“, PLAN.md Phase 2) steht für die Referenzspiele noch aus: z. B. sichtbare Serie/Punkte während des Laufs.
