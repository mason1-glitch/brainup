# Übergabe

## Stand

Fable hat die Schritte 1–7 abgeschlossen (Fundament und schwierigste Teile). Alles liegt auf dem Branch **`fundament`** und ist gepusht; in `main` ist davon noch nichts.

- **Gerüst:** Vite 8, Svelte 5 (Runes), TypeScript 6 strict, Vitest, Dexie, Playwright.
- **Kernmodule** (`src/core/`, alle getestet): `timing`, `staircase`, `fraction`, `srs`, `rng`.
- **Daten** (`src/data/`): Datenmodell, Dexie-Schema Version 1, Repository als einziger Zugang.
- **Design** (`src/design/`, `src/ui/`): Tokens, Basiskomponenten, Styleguide unter `#/dev/styleguide`.
- **App-Shell** (`src/app/`, `src/routes/`): Hash-Router, Tab-Leiste, Seiten Heute/Spiele (echt), Fortschritt/Einstellungen (Platzhalter; Einstellungen kann nur Hell/Dunkel), Spiel-Host `Play.svelte`.
- **Drei Referenzspiele** (`src/games/`), jeweils mit Tutorial, Adaptivität, Tests und E2E-Lauf:
  - `rotation` – Mentale Rotation (chirale Würfelfiguren, SVG)
  - `ufov` – „Blickfeld“ (Verarbeitungsgeschwindigkeit, frame-genaue Darbietung, drei Stufen)
  - `arithmetic` – Kopfrechnen (zehn Typen × zehn Level, Sprint-Modus)
- **Vorlage:** `docs/ADDING_A_GAME.md`, Befehl `/neues-spiel <id>`.
- **Abnahme Fable:** `npm test` (69 Tests), `npm run build`, `npm run e2e` (4 Läufe im iPhone-Viewport) grün.

**Nächster Schritt:** Opus, Phase 0 (siehe unten). Vorher mit dem Nutzer klären, ob `fundament` per Pull Request nach `main` soll.

**Ansehen:** `npm run dev` → http://localhost:5173/brainup/ · iPhone im selben WLAN: `npm run dev:phone`, „Network“-Adresse + `/brainup/`.

## Aufgaben

Reihenfolge einhalten. Abnahmekriterien stehen in `docs/PLAN.md`. Regeln und Definition of Done stehen in `CLAUDE.md`.

### Fable – erledigt

- [x] 1. Übergabe-Gerüst
- [x] 2. Gerüst und Architektur (DECISIONS D3–D7)
- [x] 3. Kernmodule mit Tests
- [x] 4. Designsystem, App-Shell, Styleguide (D8) – vom Nutzer angesehen und freigegeben
- [x] 5. Referenzspiele a) Rotation, b) UFOV, c) Kopfrechnen-Kern + Sprint
- [x] 6. Vorlage für neue Spiele
- [x] 7. Übergabe (CLAUDE.md, diese Datei, DECISIONS D9–D12)

### Opus – offen

- [ ] **Phase 0** aus PLAN.md: 4–5 Aufwärm-Spiele auswählen, `docs/GAMES.md` anlegen (auch Einträge für die drei vorhandenen Spiele), **danach anhalten und dem Nutzer zeigen**. Die Texte `title`/`tagline`/`description` in `src/games/*/index.ts` sind vorläufig und danach gegen GAMES.md abzugleichen.
- [ ] **Aufwärm-Spiele** einzeln per `/neues-spiel <id>` (Bereich `warmup`).
- [ ] **Übrige Trainingsspiele** aus PLAN.md: Papierfalten, Schnittansichten (Bereich `training`), ebenfalls per `/neues-spiel`.
- [ ] **Kopfrechnen ausbauen:**
  - Modi „Präzision“ (ohne Zeitdruck, feste Aufgabenzahl) und „Fehlertraining“ in `arithmetic/index.ts` (`modes`) ergänzen; `arithmetic/Run.svelte` nach `mode.id` verzweigen. Fürs Fehlertraining liegen `dueTasks()` (`reviews.ts`) und `pickDue()` (`core/srs.ts`) bereit; die Liste wird vom Sprint schon gefüllt.
  - Auswahl einzelner Rechentypen (bisher mischt der Sprint alle; `pickKind` nimmt schon eine Typliste).
  - Rechentrick nach Fehlern (optional, je Typ).
- [ ] **Tagesprogramm:** `planDaily` (`src/program/daily.ts`) und die Typen `ProgramRun`/`ProgramStep` stehen, `repo.putProgramRun`/`programRunsOfDay` auch. Es fehlen: Start-Button auf „Heute“, Anlegen/Fortsetzen des `ProgramRun`, und im Host der Sprung zum nächsten Schritt – `Play.svelte` bekommt `programRunId` schon als Prop und beschriftet den Button mit „Weiter“, navigiert aber noch zu `/spiele` (`leave()`). `recent` für `planDaily` aus den letzten Sitzungen ableiten (bisher leer). Konfiguration über `settings`.
- [ ] **Phase 3 – Fortschritt:** Verlauf je Spiel und je Rechentyp (`repo.sessionsOfGame`, `Session.summary`, `Trial.kind`), Bestwerte, Kalender (`Session.day`), Wochenziel (`ProgressRing`). Einstufungslauf beim ersten Start: Startwerte der Staircases setzen. Für neue Abfragen `repo` erweitern, nicht umgehen.
- [ ] **Phase 4 – Rest:** Einstellungen (Ton, Haptik, reduzierte Bewegung → `data-motion="reduced"` am `<html>`, Sitzungslänge), JSON-Export/-Import (`repo.exportAll/importAll` neu, `SCHEMA_VERSION` mitschreiben; Test „verlustfrei“ ist Abnahmekriterium), `navigator.storage.persist()`, Erinnerung als `.ics`.
- [ ] **PWA und Deploy:** `vite-plugin-pwa` (Manifest `start_url` und `scope` = `/brainup/`, Icons), GitHub Actions auf Pages.
- [ ] **Tests ausbauen:** Pixel-Profil in `playwright.config.ts`, Tagesprogramm-Lauf, Offline-Lauf, Lighthouse CI, axe-core, Timing-Log über 200 Durchgänge.
- [ ] **Spieldesign-Durchsicht** der drei Referenzspiele (PLAN.md Phase 2: „Spiel oder Test?“) – z. B. sichtbare Serie oder Punkte während des Laufs.
- [ ] **Phase 5 – Red Team.**

## Was Fable nicht geprüft hat

- Kein Test auf einem echten iPhone; alle Läufe in Playwright-WebKit mit iPhone-15-Profil auf dem Mac.
- Die Spiele wurden nur im hellen Design angesehen (der Styleguide in beiden).
- UFOV-Stufe 3 (Ablenker) ist nur durch Unit-Tests abgedeckt, nicht gespielt oder angesehen; Stufe 2 nur im Tutorial. Prüfen, ob Zielpunkt und Ablenker-Dreiecke gut unterscheidbar und die Stufe fair ist.
- Rotation: Die Flächen werden per Maleralgorithmus (Sortierung nach Tiefe des Flächenmittelpunkts) gezeichnet. In den geprüften Ansichten sauber; bei ungünstigen Winkeln sind Überdeckungsfehler denkbar – beim Red Team gezielt ansehen.
- Barrierefreiheit wurde nicht mit axe geprüft.

## Bekannte Fallstricke

- GitHub Pages liegt unter `/brainup/`: Vite `base` ist gesetzt; Manifest `start_url` und `scope` müssen später dazu passen. Die Dev-URL braucht den Pfad ebenfalls – `http://localhost:5173/` allein zeigt nur einen Hinweis.
- Pages-Workflow braucht `permissions: pages: write, id-token: write` und das Environment `github-pages`. Pages-Source ist auf „GitHub Actions“ gestellt.
- Playwright: lokal einmalig `npx playwright install webkit`, in CI `npx playwright install --with-deps webkit`. `npm run e2e` startet selbst Build + Preview auf Port 4173 und dauert gut eine Minute (der Kopfrechen-Sprint läuft echte 60 s).
- E2E-Bot: `data-correct`/`data-answer` gibt es nur mit `window.__brainupE2E` (D12). Nach einer Antwort auf den Aufgabenwechsel warten, nicht auf feste Zeiten (siehe `e2e/arithmetic.spec.ts`).
- TypeScript bleibt auf Version 6: svelte-check unterstützt TS 7 nur mit Parallelinstallation (D3).
- `npm install` warnt wegen des Install-Skripts von `fsevents` – harmlos.
- Vitest zeigt `console.log` bestandener Tests mit dem Reporter `dot` nicht; zum Debuggen `--reporter=verbose`.
- Staircase-Schwelle streut: ±10 % erst nach einigen hundert Durchgängen, eine Sitzung liegt bei etwa ±20 % (D10). Verläufe glätten, Bestwerte nicht auf einer einzelnen Schwellenschätzung aufbauen.
- `<meta name="theme-color">` folgt dem System-Schema, nicht der App-Einstellung Hell/Dunkel.
- iOS: Daten bleiben nur in der installierten Home-Bildschirm-App zuverlässig erhalten; Vibration ist im Browser kaum verfügbar.
- Spiel-IDs (`rotation`, `ufov`, `arithmetic`) und Modus-IDs stehen in gespeicherten Daten – nicht umbenennen. Der Anzeigename darf sich ändern.
- Ändert sich die Form eines Schwierigkeitszustands: `stateVersion` erhöhen und `migrateState` schreiben, sonst startet das Spiel für alle wieder bei Level 1.
- `.claude/launch.json` enthält die Dev-Server-Einträge für die Vorschau in der Claude-App.
