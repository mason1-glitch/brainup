# Übergabe

## Stand

Fundament, fünf Spiele, PWA/Deploy und Tagesprogramm sind fertig, in `main` (PR #3–#5) und live unter https://mason1-glitch.github.io/brainup/. Deploy am 16.11. geprüft: Live-Bundle = Stand von `main`, Service Worker aktiv, alle Spiele starten ohne Netz. Der Nutzer nutzt die App täglich als Home-Bildschirm-App auf seinem iPhone.

**Wer arbeitet:** Fable, solange Kontingent da ist – an der ganzen Liste „Offen“, auch an den Spielen. Opus springt nur ein, wenn Fable nicht verfügbar ist, und macht beim ersten offenen Punkt weiter (CLAUDE.md, Übergaberegeln).

- **Gerüst:** Vite 8, Svelte 5 (Runes), TypeScript 6 strict, Vitest, Dexie, Playwright.
- **Kernmodule** (`src/core/`, alle getestet): `timing`, `staircase`, `fraction`, `srs`, `rng`.
- **Daten** (`src/data/`): Datenmodell, Dexie-Schema Version 1, Repository als einziger Zugang, Sicherung als JSON-Datei (D15).
- **Design** (`src/design/`, `src/ui/`): Tokens, Basiskomponenten, Styleguide unter `#/dev/styleguide`.
- **App-Shell** (`src/app/`, `src/routes/`): Hash-Router, Tab-Leiste, Seiten Heute (Tagesprogramm) und Spiele; Fortschritt ist ein Platzhalter; Einstellungen können Hell/Dunkel und die Datensicherung; Spiel-Host `Play.svelte`.
- **Fünf Spiele** (`src/games/`), jeweils mit Tutorial, Adaptivität, Tests und E2E-Lauf:
  - `rotation` – Mentale Rotation (chirale Würfelfiguren, SVG)
  - `ufov` – „Blickfeld“ (Verarbeitungsgeschwindigkeit, frame-genaue Darbietung, drei Stufen)
  - `paperfold` – Papierfalten (Faltfolge, Lochung, vier Lochmuster)
  - `sections` – Schnittansichten (Körper mit Schnittebene, vier Formen)
  - `arithmetic` – Kopfrechnen (zehn Typen × zehn Level, Sprint-Modus)
- **Tagesprogramm** (D6, D14): auf „Heute“ starten, im Host Schritt für Schritt spielen, am selben Tag fortsetzen.
- **PWA und Deploy** (D13): Service Worker mit vollständigem Precache, Manifest, Icons; GitHub Actions prüft jeden Push/PR und veröffentlicht `main` auf Pages.
- **Spiele-Liste:** `docs/GAMES.md` – was jedes Spiel fordert, Quellen, verbindliche App-Texte, Auswahl der Aufwärm-Spiele (vom Nutzer bestätigt: „Passt so“).
- **Vorlage:** `docs/ADDING_A_GAME.md`, Befehl `/neues-spiel <id>`. Für Aufgaben mit vier Antwortbildern sind `paperfold` und `sections` die Muster (`Board.svelte` mit 2×2-Auswahl, die sich der Höhe anpasst).
- **Abnahme zuletzt:** `npm test` (115 Tests), `npm run build`, `npm run e2e` (14 Läufe im iPhone-Viewport, ≈ 5 min) grün.

**Branches:** Alles bis PR #6 ist in `main`. Runde 3 läuft auf dem Branch `fable-4` (Pull Request nach `main` offen); dort weiterpushen, bis der Nutzer ihn mergt.

**Nächster Schritt:** der erste offene Unterpunkt unter „Offen“ (Punkt 2, `schulte`).

**Ansehen:** `npm run dev` → http://localhost:5173/brainup/ · iPhone im selben WLAN: `npm run dev:phone`, „Network“-Adresse + `/brainup/`. Screenshots im iPhone-Profil macht man am zuverlässigsten mit Playwright-WebKit (siehe Fallstricke).

## Aufgaben

Von oben nach unten abarbeiten; jeder Unterpunkt ist ein eigener Schritt mit Commit (Definition of Done in `CLAUDE.md`, Abnahmekriterien in `docs/PLAN.md`). Bricht eine Sitzung ab, geht es beim ersten offenen Punkt weiter.

### Erledigt

- Runde 1: Übergabe-Gerüst · Gerüst und Architektur (D3–D7) · Kernmodule · Designsystem, App-Shell, Styleguide (D8) · Referenzspiele Rotation, Blickfeld, Kopfrechnen-Kern + Sprint · Vorlage für neue Spiele (D9–D12).
- Runde 2: Prüfpunkte der Referenzspiele · PWA und Deploy (D13) · Phase 0 mit `docs/GAMES.md` · Papierfalten · Schnittansichten · Tagesprogramm (D14) · Übergabe.

### Offen

1. **Daten sichern** – zuerst, weil der Nutzer die App täglich nutzt und iOS den Speicher räumen kann.
   - [x] `navigator.storage.persist()` beim Start anfragen; Ergebnis in den Einstellungen anzeigen. (`src/app/storage.ts`, Karte „Daten“ in den Einstellungen, `e2e/settings.spec.ts`)
   - [x] JSON-Export und -Import aller Daten über `repo` (`exportAll`/`importAll`, `src/data/backup.ts`), mit `SCHEMA_VERSION`; der Import führt zusammen und löscht nie (D15). Tests in `src/data/backup.test.ts` (verlustfrei, zusammenführen, ablehnen, Upgrade einer älteren Sicherung).
   - [x] Datei-Weg fürs iPhone: „Sicherung erstellen“ → „Datei speichern“ öffnet das Teilen-Menü (`navigator.share` mit Datei), sonst Download; „Sicherung einlesen“ nimmt eine Datei an (`src/app/backupFile.ts`, Karte „Daten“ in den Einstellungen, `e2e/backup.spec.ts`). **Auf dem echten iPhone noch nicht bestätigt** – dem Nutzer ist gesagt, wie er es testet.
2. **Aufwärm-Spiele** per `/neues-spiel <id>` (Bereich `warmup`), je Spiel ein Schritt, in dieser Reihenfolge. IDs, Titel, Kurzzeile und Beschreibung wörtlich aus `docs/GAMES.md` (Test `registry.test.ts`; Kurzzeile und Beschreibung beginnen mit „Aufwärm-Spiel“). Jedes Spiel in 1–3 min spielbar, adaptiv über den Staircase, Aufgaben-Korrektheit unabhängig geprüft; Darbietung, Antwortfenster und Wartezeiten nur über die Timing-Engine, zeitbegrenzte Reize mit Soll/Ist in den Rohdaten wie bei `ufov`.
   - [ ] `schulte` – Zahlensuche. Mit dem ersten Aufwärm-Spiel stellt `planDaily` Aufwärmen an den Anfang des Tagesprogramms: `e2e/program.spec.ts` (Reihenfolge und Schrittzahl stehen dort fest) und die Bots in `e2e/helpers.ts` anpassen.
   - [ ] `corsi` – Blockfolge.
   - [ ] `flanker` – Pfeilfokus.
   - [ ] `nback` – N-Back.
   - [ ] `taskswitch` – Wechselspiel.
3. **Kopfrechnen ausbauen**
   - [ ] Modi „Präzision“ (ohne Zeitdruck, feste Aufgabenzahl) und „Fehlertraining“ (fällige Aufgaben per Spaced Repetition, D11) in `arithmetic/index.ts` (`modes`); `arithmetic/Run.svelte` nach `mode.id` verzweigen. Bereit liegen `dueTasks()` (`reviews.ts`) und `pickDue()` (`core/srs.ts`); die Liste füllt der Sprint schon. Modus-IDs stehen danach in den Daten – vorher festlegen. Tests für die Auswahl fälliger Aufgaben, je Modus ein E2E-Lauf.
   - [ ] Auswahl einzelner Rechenarten (bisher mischt der Sprint alle; `pickKind` nimmt schon eine Typliste).
   - [ ] Rechentrick nach Fehlern, je Typ.
4. **Messung**
   - [ ] Timing-Log über 200 Durchgänge (Soll- gegen Ist-Dauer, Abnahmekriterium) als Playwright-Lauf mit Prüfung auf ±1 Frame, dazu eine Seite `#/dev/timing`, die dieselbe Messung auf dem iPhone des Nutzers ausführt und anzeigt.
   - [ ] Pixel-Profil in `playwright.config.ts`, CI-Workflow anpassen (Chromium installieren). Wird die CI zu langsam, dürfen die langen Läufe (Blickfeld bis Stufe 3, Tagesprogramm) nur im iPhone-Profil laufen – begründen.
5. **Phase 3 – Fortschritt**
   - [ ] Verlauf je Spiel und je Rechentyp (`repo.sessionsOfGame`, `Session.summary`, `Trial.kind`), Bestwerte, Kalender (`Session.day`), Wochenziel (`ProgressRing`). Für neue Abfragen `repo` erweitern, nicht umgehen. Staircase-Schwellen streuen (D10) – Verläufe glätten.
   - [ ] Einstufungslauf beim ersten Start: Startwerte der Staircases setzen.
6. **Phase 4 – Rest**
   - [ ] Einstellungen: Ton, Haptik, reduzierte Bewegung (`data-motion="reduced"` am `<html>`), Sitzungslänge, Umfang des Tagesprogramms (Einstellung `daily` in der Form `DailyConfig`, wird von „Heute“ schon gelesen).
   - [ ] Erinnerung als `.ics`-Datei.
7. **Qualität**
   - [ ] Lighthouse CI (≥ 95 überall) und axe-core (0 schwere Verstöße) in GitHub Actions; Funde beheben, auch den schwachen Kontrast der Tippflächen im Blickfeld.
8. **Phase 5 – Red Team** (PLAN.md)
   - [ ] Als Spieletester, Messtechniker und Skeptiker angreifen, alle Funde beheben.
9. **Abschluss**
   - [ ] HANDOFF.md und DECISIONS.md auf den Endstand, Pull Request, dem Nutzer sagen, was er auf dem iPhone ansehen soll.

## Wissen aus Runde 2

### Schritt 1 – die drei Referenzspiele

- **Dunkles Design:** alle Spiele in Playwright-WebKit hell und dunkel angesehen. Ein Mangel: Die Würfelfiguren waren dunkel invertiert schattiert (Oberseiten am dunkelsten – das kann die Tiefenwirkung kippen). Behoben über die Tokens `--solid-lit`/`--solid-shade`, die auch die Schnittansichten nutzen.
- **Blickfeld Stufe 3:** gespielt und angesehen. Der gefüllte Zielpunkt hebt sich von den 15 Dreiecks-Umrissen klar ab; die Stufe ist fair, geantwortet wird nur die Richtung. `e2e/ufov.spec.ts` spielt drei fehlerfreie Läufe bis Stufe 3 und zählt in jeder Darbietung Zielpunkt und Ablenker.
- **Maleralgorithmus der Rotation:** Die Sortierung nach Flächenmittelpunkt ist für Einheitswürfel auf einem Gitter in Parallelprojektion beweisbar exakt (Begründung am `renderFaces`-Kommentar); ein Test rechnet die oberste Fläche an über 90 000 Bildpunkten per Raycasting nach, auch in Kantenansichten. Es gab keinen Fehler. Das gilt nur für Gitterwürfel.
- **Spieldesign, je Spiel der schwächste Punkt:** Rotation verwirft unlesbare Ansichten (`isLegible`) und schneidet jede Figur passend zu (`frameOf`); Blickfeld zeigt die Darbietungszeit im Lauf („12 / 30 · 83 ms“); Kopfrechnen zeigt die Punkte im Sprint („140 P · 42 s“).

### Schritt 4 – Papierfalten

- **Modell** (`paperfold/logic.ts`): Blatt 16 × 16, Faltlinien nur auf dem 4er-Raster (gerade und diagonal). Lochungen liegen auf `LATTICE` (64 Punkte), das unter allen Faltungen in sich übergeht und keine Faltlinie berührt – deshalb gibt es nie ein Loch auf einer Kante und alle Koordinaten bleiben ganzzahlig. Wer Faltlinien oder Lochpositionen ändert, muss beides zusammen ändern (Test „Lochgitter“).
- **Zwei Rechenwege:** Der Generator entfaltet rückwärts über Lagen-Vielecke (`trace`/`unfold`); der Test faltet jeden ganzzahligen Blattpunkt vorwärts (`foldPoint` in `logic.test.ts`, eigene Spiegelformeln). Die beiden nie zusammenlegen.
- **Distraktoren:** typische Denkfehler (eine Faltung nur halb mitgedacht, Muster falsch gespiegelt, ab Level 6 ein Loch versetzt); Vergleich über `keyOf`.
- **Auflösung:** Nach der Antwort zeigt jedes Faltbild die Löcher in diesem Zustand (`holesBySheet`) – so sieht man, warum das Muster stimmt.

### Schritt 5 – Schnittansichten

- **Exaktheit** (`sections/logic.ts`): Körper haben ganzzahlige Ecken, Ebenen ganzzahlige Normalen und `d2` (doppelter Abstand, also halbe Schritte). `section()` entscheidet mit ganzen Zahlen, welche Kanten geschnitten werden und welche Ecken auf der Ebene liegen. Neue Körper nur mit ganzzahligen Ecken und konvex (der Test „Körper“ prüft Euler, Ebenheit, Konvexität, Orientierung).
- **Zwei Rechenwege:** Generator = Kanten mit der Ebene schneiden; Test = großes Quadrat in der Ebene mit allen Flächen-Halbräumen beschneiden (`clipSection` in `logic.test.ts`), über alle Körper und gut 5000 Ebenen. Nicht zusammenlegen.
- **Distraktoren:** andere Schnitte desselben Körpers und die Lösung gestreckt/geschert. Verglichen wird die Form ohne Lage, Größe, Drehung, Spiegelung (`dissimilarity`); jede falsche Form liegt mindestens `MIN_DIFFERENCE` von der Lösung und den anderen entfernt. Die Antworten werden in ihr Feld eingepasst – Größe ist bewusst kein Merkmal.
- **Lesbarkeit:** nur Schnitte mit klarer Form (`isClearShape`), mindestens 40 % so breit wie der Körper (`MIN_SPAN`) und aus der gewählten Blickrichtung gut zu sehen (`isWellSeen`).
- **Darstellung:** Körper in `--solid-lit`/`--solid-shade`, Schnitt in `--ink` (im dunklen Design also hell) – App-Texte deshalb nicht „dunkle Fläche“ nennen. Konvexe Körper brauchen keinen Maleralgorithmus: gezeichnet werden nur zugewandte Flächen.
- **Nicht gemacht:** nicht konvexe Körper, Zylinder, Kegel. `section()` setzt Konvexität voraus.

### Schritt 6 – Tagesprogramm

- **Ablauf** (D14): „Heute“ plant mit `planDaily`, legt einen `ProgramRun` an und öffnet `#/spiel/<id>?mode=…&run=<id>`. `Play.svelte` lädt den Durchlauf, hakt nach einem beendeten Lauf den Schritt ab (`completeStep`) und führt mit „Weiter“ zum nächsten, nach dem letzten mit „Fertig“ auf „Heute“. Alle Regeln stehen als reine Funktionen in `src/program/run.ts` (getestet).
- **Fortsetzen:** „Heute“ zeigt den offenen Durchlauf des Tages (`currentRun`); ein beendeter bietet „Noch ein Durchlauf“. Durchläufe früherer Tage werden nicht fortgesetzt.
- **`recent`:** aus den letzten fünf Sitzungen je Spiel, abgebrochene zählen nicht (`recentGames`). Dadurch wechseln die Trainingsspiele von Durchlauf zu Durchlauf.
- **Text auf „Heute“:** nennt nur die Bereiche, die im Plan wirklich vorkommen, und keine Dauer – solange es keine Aufwärm-Spiele gibt, steht dort „Training, Kopfrechnen“.
- **Bots:** `e2e/helpers.ts` hat `playRotation`, `playUfov`, `playArithmetic` (fehlerfrei von der Einstiegsseite bis zum Ergebnis) – für neue Programm-Läufe ergänzen.

## Wissen aus Runde 3

### Schritt 1 – Daten sichern

- **Format:** `{ app: 'brainup', schemaVersion, exportedAt, tables: { trials, sessions, gameState, settings, reviews, programRuns } }`. Durchgänge ohne `id` (lokale laufende Nummer, nirgends referenziert) – wer `id` je als Verweis nutzt, muss den Export ändern.
- **Neue Tabelle oder neues Feld:** Eine neue Tabelle in `exportAll` **und** in `importAll` (`backup.ts`) aufnehmen und die Regel fürs Zusammenführen in D15 ergänzen; der Test „exportiert alle Tabellen“ zählt sie von Hand auf. Bekommen Einstellungen oder Wiederholungen je einen Zeitstempel, kann dort „der neuere gilt“ eingeführt werden.
- **Schemaänderung:** neuer Eintrag am Ende von `SCHEMA` in `db.ts` mit `upgrade`. Der Test „eine ältere Sicherung läuft … durch dieselben Upgrade-Schritte“ zeigt mit einer gedachten Version 2, dass alte Sicherungen dann von selbst mitwandern.
- **Zwei Tipps beim Export sind Absicht** (Safari verlangt für das Teilen-Menü eine unmittelbare Nutzeraktion, D15) – nicht zu einem Knopf zusammenlegen.
- **E2E:** Playwright-WebKit auf dem Mac kennt `navigator.canShare`, in der CI (Linux) nicht. `e2e/backup.spec.ts` legt deshalb in jedem Lauf fest, welcher Weg gilt (Download erzwingen oder `share` durch eine Attrappe ersetzen).

## Noch nicht geprüft

- Sicherung auf dem echten iPhone: ob das Teilen-Menü die `.json`-Datei annimmt („In Dateien sichern“) und ob „Sicherung einlesen“ sie in der Dateien-App auswählen lässt. Meldet der Nutzer ein Problem: `accept` am Datei-Feld lockern bzw. den Dateityp der Sicherung auf `text/plain` stellen und erneut testen lassen.

- Auf dem echten iPhone wurde nichts systematisch geprüft; der Nutzer spielt dort täglich, alle Testläufe liefen in Playwright-WebKit mit iPhone-15-Profil.
- Barrierefreiheit wurde nicht mit axe geprüft. Die Tippflächen im Blickfeld (Antwortphase) haben einen schwachen Rand (`--line`) und erfüllen vermutlich nicht 3 : 1 Kontrast.
- Papierfalten und Schnittansichten hat nur der Bot gespielt: Ob die Level gleichmäßig schwerer werden, zeigt erst das Spielen (Red Team).
- Im Tutorial von Papierfalten und Schnittansichten sind die vier Antwortfelder auf kleinen Bildschirmen klein (der Erklärtext braucht Platz).

## Bekannte Fallstricke

- GitHub Pages liegt unter `/brainup/`: Vite `base`, Manifest `start_url` und `scope` kommen aus derselben Konstante in `vite.config.ts`. Die Dev-URL braucht den Pfad ebenfalls – `http://localhost:5173/` allein zeigt nur einen Hinweis.
- Service Worker: nur im Produktions-Build (`npm run build`/`preview`, E2E), nicht im Dev-Server. Eine neue Version erscheint erst beim **übernächsten** Öffnen der App (erstes Öffnen lädt sie im Hintergrund, D13) – beim Prüfen eines Deploys also zweimal laden. Neue Dateitypen (Schriften, Audio) müssen in `workbox.globPatterns` ergänzt werden, sonst fehlen sie offline; der Offline-E2E-Lauf deckt nur ab, was er wirklich aufruft.
- Deploy: läuft im Job `deploy` von `ci.yml` nur bei Push auf `main` und nur nach grünem Testjob. Pages-Source ist auf „GitHub Actions“ gestellt. Icons nach Änderung von `public/icons/icon.svg` mit `node scripts/make-icons.mjs` neu erzeugen und committen.
- CI ist etwa viermal langsamer als der Mac: Ein Test mit 3 s lokal riss dort das 5-Sekunden-Limit von Vitest (`testTimeout` steht deshalb auf 20 s). Aufgabengeneratoren schnell halten – teure Vorräte wie `shapesOf` in `sections/logic.ts` einmal berechnen und cachen. Nach jedem Push das CI-Ergebnis ansehen (`gh run list --branch <branch>`), nicht nur lokal prüfen.
- Tagesprogramm und Mitternacht: Ein Durchlauf gilt nur am Tag seines Starts (D6). Wer um 23:55 beginnt und nach Mitternacht weitermachen will, bekommt auf „Heute“ einen neuen Plan; der alte Durchlauf bleibt unfertig gespeichert. `e2e/program.spec.ts` stellt deshalb die Uhr fest (`page.clock.setFixedTime`) – ein CI-Lauf über Mitternacht UTC war daran gescheitert. Tests, die vom Datum abhängen, immer so absichern.
- E2E-Zeitlimits: kurze Limits (3 s) nur dort, wo das Spiel selbst die Zeit begrenzt (Kopfrechen-Sprint). Im Tutorial hat ein 3-s-Limit unter CI-Last einmal nicht gereicht.
- Vor `npm run e2e` immer `npm run check`: Scheitert die Typprüfung, meldet Playwright nur „webServer was not able to start“. Tests laufen in Node ohne `@types/node` – Dateien liest man per `import text from '…?raw'`, nicht mit `node:fs`.
- Playwright: lokal einmalig `npx playwright install webkit`, in CI `npx playwright install --with-deps webkit`. `npm run e2e` startet selbst Build + Preview auf Port 4173 und dauert ≈ 5 min: Der Blickfeld-Lauf bis Stufe 3 (90 echte Durchgänge) und der Lauf durchs Tagesprogramm brauchen je etwa 2,5 min.
- Playwrights iPhone-15-Profil hat 393 × 659 Pixel (Safari mit Leisten), nicht 852 – Layouts müssen in 659 passen. Spielrahmen und Tutorial-Bildschirm sind genau bildschirmhoch (`Play.svelte`: `height: 100dvh`); ein Tutorial braucht deshalb einen Teil mit `flex: 1; min-height: 0`, der schrumpfen darf.
- Die Vorschau in der Claude-App (`.claude/launch.json`) lässt CSS-Übergänge teils nicht ablaufen (Rückmeldefarben bleiben unsichtbar). Zum Ansehen ein kleines Playwright-WebKit-Skript mit `devices['iPhone 15']` und `colorScheme: 'dark' | 'light'` gegen den Dev-Server schreiben; Spielzustände lassen sich dafür direkt in der IndexedDB-Tabelle `gameState` setzen.
- E2E-Bot: `data-correct`/`data-answer` gibt es nur mit `window.__brainupE2E` (D12). Nach einer Antwort auf den Aufgabenwechsel warten, nicht auf feste Zeiten (siehe `e2e/arithmetic.spec.ts`).
- TypeScript bleibt auf Version 6: svelte-check unterstützt TS 7 nur mit Parallelinstallation (D3). `Array.prototype.findLast` und andere ES2023-Methoden kennt die Typprüfung nicht (`lib` ist ES2022).
- `npm install` warnt wegen des Install-Skripts von `fsevents` – harmlos.
- Vitest zeigt `console.log` bestandener Tests mit dem Reporter `dot` nicht; zum Debuggen `--reporter=verbose`.
- Staircase-Schwelle streut: ±10 % erst nach einigen hundert Durchgängen, eine Sitzung liegt bei etwa ±20 % (D10). Verläufe glätten, Bestwerte nicht auf einer einzelnen Schwellenschätzung aufbauen.
- `<meta name="theme-color">` folgt dem System-Schema, nicht der App-Einstellung Hell/Dunkel.
- iOS: Daten bleiben nur in der installierten Home-Bildschirm-App zuverlässig erhalten; Vibration ist im Browser kaum verfügbar.
- Spiel-IDs (`rotation`, `ufov`, `paperfold`, `sections`, `arithmetic`) und Modus-IDs stehen in gespeicherten Daten – nicht umbenennen. Der Anzeigename darf sich ändern – dann in `docs/GAMES.md` **und** in `index.ts` des Spiels, sonst schlägt `registry.test.ts` fehl.
- Quellen in GAMES.md: nur nachgeschlagene Angaben (Crossref/PubMed), keine DOIs aus dem Gedächtnis. Aussagen über Studien stützen sich dort nur auf die Zusammenfassungen.
- Ändert sich die Form eines Schwierigkeitszustands: `stateVersion` erhöhen und `migrateState` schreiben, sonst startet das Spiel für alle wieder bei Level 1.
