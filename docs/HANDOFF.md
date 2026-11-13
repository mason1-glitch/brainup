# Übergabe

## Stand

Das Fundament (Fable, Runde 1) liegt in `main` (PR #3). Fable arbeitet in **Runde 2** auf dem Branch **`fable-2`** die Teile ab, die am meisten Sorgfalt brauchen (Liste unten); den Rest übernimmt danach Opus.

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
- **Abnahme zuletzt:** `npm test` (72 Tests), `npm run build`, `npm run e2e` (5 Läufe im iPhone-Viewport, ≈ 3 min) grün.

**Nächster Schritt:** Fable, Runde 2, Schritt 2 (PWA und Deploy).

**Ansehen:** `npm run dev` → http://localhost:5173/brainup/ · iPhone im selben WLAN: `npm run dev:phone`, „Network“-Adresse + `/brainup/`.

## Aufgaben

Reihenfolge einhalten. Abnahmekriterien stehen in `docs/PLAN.md`. Regeln und Definition of Done stehen in `CLAUDE.md`.

### Fable – Runde 1, erledigt (in `main`)

Übergabe-Gerüst · Gerüst und Architektur (D3–D7) · Kernmodule · Designsystem, App-Shell, Styleguide (D8) · Referenzspiele Rotation, UFOV, Kopfrechnen-Kern + Sprint · Vorlage für neue Spiele · Übergabe (D9–D12).

### Fable – Runde 2 (Branch `fable-2`)

Bricht Fable ab, macht Opus hier beim ersten offenen Punkt weiter.

- [x] **1. Offene Prüfpunkte der drei Spiele** (Ergebnis siehe „Runde 2, Schritt 1“ unten).
- [ ] **2. PWA und Deploy:** `vite-plugin-pwa` (Manifest `start_url` und `scope` = `/brainup/`, Icons; nach dem ersten Besuch zu 100 % offline), GitHub-Actions-Workflow (Tests, Build, E2E bei jedem Push und Pull Request; Deploy auf Pages bei Push auf `main`), Playwright-Lauf im Offline-Zustand.
- [ ] **3. Phase 0** aus PLAN.md: 4–5 Aufwärm-Spiele auswählen, `docs/GAMES.md` anlegen (auch Einträge für die drei vorhandenen Spiele, Papierfalten und Schnittansichten), `title`/`tagline`/`description` in `src/games/*/index.ts` damit abgleichen. Quellen nur, wenn geprüft. **Danach Pull Request nach `main`, anhalten, dem Nutzer die Auswahl zeigen.** Nach dem Merge auf neuem Branch von `main` weiter.
- [ ] **4. Papierfalten** (`training`) per `/neues-spiel`: prozedurale Faltungen und Lochungen; richtige Antwort im Test auf anderem Rechenweg nachgerechnet; Distraktoren garantiert falsch und verschieden.
- [ ] **5. Schnittansichten** (`training`) per `/neues-spiel`: prozedurale Körper und Schnittebenen; Querschnitt exakt berechnet und unabhängig geprüft; Distraktoren garantiert falsch und verschieden; leichtgewichtige Darstellung wie bei der Rotation.
- [ ] **6. Tagesprogramm durchspielbar** (D6): `planDaily` (`src/program/daily.ts`), die Typen `ProgramRun`/`ProgramStep` und `repo.putProgramRun`/`programRunsOfDay` stehen. Es fehlen: Start auf „Heute“, Anlegen/Fortsetzen des `ProgramRun` am selben Tag, im Host der Sprung zum nächsten Schritt (`Play.svelte` bekommt `programRunId` schon und beschriftet den Button mit „Weiter“, navigiert aber noch zu `/spiele`), `recent` aus den letzten Sitzungen ableiten, Playwright-Lauf durch das ganze Programm.
- [ ] **7. Übergabe vervollständigen**, Pull Request nach `main` (nicht selbst mergen).

### Opus – offen

- [ ] **Aufwärm-Spiele** aus `docs/GAMES.md` einzeln per `/neues-spiel <id>` (Bereich `warmup`).
- [ ] **Kopfrechnen ausbauen:**
  - Modi „Präzision“ (ohne Zeitdruck, feste Aufgabenzahl) und „Fehlertraining“ in `arithmetic/index.ts` (`modes`) ergänzen; `arithmetic/Run.svelte` nach `mode.id` verzweigen. Fürs Fehlertraining liegen `dueTasks()` (`reviews.ts`) und `pickDue()` (`core/srs.ts`) bereit; die Liste wird vom Sprint schon gefüllt.
  - Auswahl einzelner Rechentypen (bisher mischt der Sprint alle; `pickKind` nimmt schon eine Typliste).
  - Rechentrick nach Fehlern (optional, je Typ).
- [ ] **Phase 3 – Fortschritt:** Verlauf je Spiel und je Rechentyp (`repo.sessionsOfGame`, `Session.summary`, `Trial.kind`), Bestwerte, Kalender (`Session.day`), Wochenziel (`ProgressRing`). Einstufungslauf beim ersten Start: Startwerte der Staircases setzen. Für neue Abfragen `repo` erweitern, nicht umgehen.
- [ ] **Phase 4 – Rest:** Einstellungen (Ton, Haptik, reduzierte Bewegung → `data-motion="reduced"` am `<html>`, Sitzungslänge), JSON-Export/-Import (`repo.exportAll/importAll` neu, `SCHEMA_VERSION` mitschreiben; Test „verlustfrei“ ist Abnahmekriterium), `navigator.storage.persist()`, Erinnerung als `.ics`.
- [ ] **Tests ausbauen:** Pixel-Profil in `playwright.config.ts`, Lighthouse CI, axe-core, Timing-Log über 200 Durchgänge. (Tagesprogramm- und Offline-Lauf übernimmt Fable in Runde 2.)
- [ ] **Phase 5 – Red Team.**

## Runde 2, Schritt 1 – was geprüft und geändert wurde

- **Dunkles Design:** alle drei Spiele in Playwright-WebKit (iPhone 15) hell und dunkel angesehen. Ein Mangel: Die Würfelfiguren waren dunkel invertiert schattiert (Oberseiten am dunkelsten – das kann die Tiefenwirkung kippen). Behoben über die Tokens `--solid-lit`/`--solid-shade`; neue Körper-Darstellungen (Schnittansichten) nehmen dieselben Tokens.
- **Blickfeld Stufe 3:** gespielt und angesehen. Der gefüllte Zielpunkt hebt sich von den 15 Dreiecks-Umrissen klar ab (gefüllt gegen Umriss, wie im Original: Zielfigur zwischen Dreiecken); die Stufe ist fair, geantwortet wird nur die Richtung. Der E2E-Lauf `e2e/ufov.spec.ts` spielt drei fehlerfreie Läufe, erreicht Stufe 3 und zählt in jeder Darbietung Zielpunkt und Ablenker.
- **Maleralgorithmus der Rotation:** Die Sortierung nach Flächenmittelpunkt ist für Einheitswürfel auf einem Gitter in Parallelprojektion beweisbar exakt (Begründung am `renderFaces`-Kommentar). Abgesichert durch einen Test, der die oberste Fläche an über 90 000 Bildpunkten per Raycasting nachrechnet – auch in Kantenansichten. Es gab keinen Fehler zu beheben. **Achtung:** Das gilt nicht für andere Körper (Schnittansichten!) – dort neu prüfen.
- **Spieldesign, je Spiel der schwächste Punkt:**
  - Rotation: Auf hohen Leveln kam die Schwierigkeit aus unlesbaren Ansichten (Figur verdeckt sich selbst, winzig dargestellt), nicht aus der Drehung. Jetzt verwirft `makeTrial` Ansichten, die `isLegible` nicht bestehen (kein Würfel ganz verdeckt, ≥ 85 % der Messpunkte sichtbar), und `Board` schneidet jede Figur passend zu (`frameOf`, alle drei im selben Maßstab).
  - Blickfeld: Man sah nicht, worum man spielt. Die aktuelle Darbietungszeit steht jetzt neben dem Fortschritt („12 / 30 · 83 ms“).
  - Kopfrechnen: Punkte liefen unsichtbar mit. Sie stehen jetzt neben der Restzeit („140 P · 42 s“).

## Was Fable nicht geprüft hat

- Kein Test auf einem echten iPhone; alle Läufe in Playwright-WebKit mit iPhone-15-Profil auf dem Mac.
- Barrierefreiheit wurde nicht mit axe geprüft.
- Die Tippflächen im Blickfeld (Antwortphase) haben einen schwachen Rand (`--line`); sie sind in beiden Designs erkennbar, erfüllen aber vermutlich nicht 3 : 1 Kontrast – beim axe-Lauf ansehen.

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
- `.claude/launch.json` enthält die Dev-Server-Einträge für die Vorschau in der Claude-App. In dieser Vorschau laufen CSS-Übergänge teils nicht ab (Rückmeldefarben bleiben unsichtbar) – zum Ansehen Playwright-WebKit-Screenshots nehmen, nicht die Vorschau.
- Blickfeld-E2E bis Stufe 3 dauert ≈ 2,5 min (90 echte Durchgänge) und bestimmt die Gesamtdauer von `npm run e2e`.
