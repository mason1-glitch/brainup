# Übergabe

## Stand

Fundament, fünf Spiele, PWA/Deploy und Tagesprogramm sind fertig, in `main` (PR #3–#5) und live unter https://mason1-glitch.github.io/brainup/. Deploy am 16.11. geprüft: Live-Bundle = Stand von `main`, Service Worker aktiv, alle Spiele starten ohne Netz. Der Nutzer nutzt die App täglich als Home-Bildschirm-App auf seinem iPhone.

**Wer arbeitet:** Fable, solange Kontingent da ist – an der ganzen Liste „Offen“, auch an den Spielen. Opus springt nur ein, wenn Fable nicht verfügbar ist, und macht beim ersten offenen Punkt weiter (CLAUDE.md, Übergaberegeln).

- **Gerüst:** Vite 8, Svelte 5 (Runes), TypeScript 6 strict, Vitest, Dexie, Playwright.
- **Kernmodule** (`src/core/`, alle getestet): `timing`, `staircase`, `fraction`, `srs`, `rng`.
- **Daten** (`src/data/`): Datenmodell, Dexie-Schema Version 1, Repository als einziger Zugang, Sicherung als JSON-Datei (D15).
- **Design** (`src/design/`, `src/ui/`): Tokens, Basiskomponenten, Styleguide unter `#/dev/styleguide`.
- **App-Shell** (`src/app/`, `src/routes/`): Hash-Router, Tab-Leiste, Seiten Heute (Tagesprogramm) und Spiele; Fortschritt zeigt Wochenziel, Kalender, Verläufe und Bestwerte; Einstellungen: Design und Bewegung, Ton und Vibration, Tagesprogramm und Wochenziel, Rechenarten und Rechentricks, Erinnerung, Datensicherung; Spiel-Host `Play.svelte`.
- **Zehn Spiele** (`src/games/`), jeweils mit Tutorial, Adaptivität, Tests und E2E-Lauf:
  - `rotation` – Mentale Rotation (chirale Würfelfiguren, SVG)
  - `ufov` – „Blickfeld“ (Verarbeitungsgeschwindigkeit, frame-genaue Darbietung, drei Stufen)
  - `paperfold` – Papierfalten (Faltfolge, Lochung, vier Lochmuster)
  - `sections` – Schnittansichten (Körper mit Schnittebene, vier Formen)
  - `arithmetic` – Kopfrechnen (zehn Typen × zehn Level; Modi Sprint, Präzision, Fehlertraining; Rechentricks)
  - `schulte` – Zahlensuche (Aufwärm-Spiel: Tafel 3×3 bis 6×6, dann rückwärts und im Wechsel)
  - `corsi` – Blockfolge (Aufwärm-Spiel: Folge auf 4×4 Feldern merken; Länge adaptiv, Stufen schnell und rückwärts)
  - `flanker` – Pfeilfokus (Aufwärm-Spiel: Richtung des mittleren Pfeils; Antwortfenster adaptiv)
  - `nback` – N-Back (Aufwärm-Spiel: Feld wie vor n Schritten? n und Tempo steigen blockweise)
  - `taskswitch` – Wechselspiel (Aufwärm-Spiel: gerade/ungerade oder kleiner/größer als 5; Antwortfenster adaptiv)
- **Tagesprogramm** (D6, D14): auf „Heute“ starten, im Host Schritt für Schritt spielen, am selben Tag fortsetzen.
- **PWA und Deploy** (D13): Service Worker mit vollständigem Precache, Manifest, Icons; GitHub Actions prüft jeden Push/PR und veröffentlicht `main` auf Pages.
- **Spiele-Liste:** `docs/GAMES.md` – was jedes Spiel fordert, Quellen, verbindliche App-Texte, Auswahl der Aufwärm-Spiele (vom Nutzer bestätigt: „Passt so“).
- **Vorlage:** `docs/ADDING_A_GAME.md`, Befehl `/neues-spiel <id>`. Für Aufgaben mit vier Antwortbildern sind `paperfold` und `sections` die Muster (`Board.svelte` mit 2×2-Auswahl, die sich der Höhe anpasst).
- **Abnahme zuletzt:** `npm test`, `npm run build`, `npm run e2e` (iPhone-Profil 32 Läufe ≈ 8 min, Pixel-Profil 29 Läufe ≈ 4 min) grün.

**Branches:** Alles bis PR #6 ist in `main`. Runde 3 läuft auf dem Branch `fable-4` (Pull Request nach `main` offen); dort weiterpushen, bis der Nutzer ihn mergt.

**Nächster Schritt:** der erste offene Unterpunkt unter „Offen“ (Punkt 7, Lighthouse CI und axe-core; danach Punkt 8, Red Team).

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
   - [x] `schulte` – Zahlensuche. Das Tagesprogramm beginnt jetzt mit einem Aufwärm-Spiel (4 Schritte); `e2e/program.spec.ts` und der Bot `playSchulte` in `e2e/helpers.ts` sind angepasst.
   - [x] `corsi` – Blockfolge.
   - [x] `flanker` – Pfeilfokus.
   - [x] `nback` – N-Back.
   - [x] `taskswitch` – Wechselspiel.
3. **Kopfrechnen ausbauen**
   - [x] Modi „Präzision“ (`precision`, 15 Aufgaben ohne Uhr) und „Fehlertraining“ (`review`, bis zu 10 fällige Aufgaben der Wiederholungsliste) neben `sprint`. `arithmetic/Run.svelte` verzweigt nach `mode.id`; Tests in `arithmetic/logic.test.ts` („Modi“), je Modus ein E2E-Lauf in `e2e/arithmetic.spec.ts`.
   - [x] Auswahl einzelner Rechenarten: Schalter in den Einstellungen (Karte „Kopfrechnen“), Einstellung `arithmetic.kinds`, gilt für Sprint und Präzision.
   - [x] Rechentrick nach Fehlern, je Typ: `arithmetic/tricks.ts` rechnet für genau die Aufgabe einen Weg vor; gezeigt in Präzision und Fehlertraining, abschaltbar (Einstellung `arithmetic.tricks`).
4. **Messung**
   - [x] Timing-Log über 200 Darbietungen: Seite `#/dev/timing` (Link „Timing-Messung“ unten in den Einstellungen) misst Soll gegen Ist auf dem jeweiligen Gerät; `e2e/timing.spec.ts` führt dieselbe Messung aus und verlangt mindestens 198 von 200 auf ±1 Frame. Auswertung in `src/core/timingReport.ts` (getestet). **Auf dem echten iPhone noch nicht abgelesen** – dem Nutzer ist gesagt, wo er sie findet.
   - [x] Pixel-Profil: Playwright-Projekt `pixel` (Chromium, `devices['Pixel 7']`) neben `iphone`; in der CI ein eigener, paralleler Job. Drei besonders lange Läufe (Tag `@lang`: Blickfeld über drei Stufen, N-Back über zwei Blöcke, Timing-Messung) laufen nur im iPhone-Profil – alles andere, auch Tagesprogramm und Offline-Lauf, in beiden.
5. **Phase 3 – Fortschritt**
   - [x] Seite „Fortschritt“: Wochenziel (Tage mit Training, Standard 4), Kalender zum Blättern, je Spiel Level-Verlauf (geglättet), Trefferquote, Median-Zeit und Bestwert je Modus, Tabelle der Rechenarten. Rechenkerne in `src/progress/stats.ts` (D18), Abfragen `repo.sessionsBetweenDays`/`trialsOfGame`, `e2e/progress.spec.ts`. Offen geblieben: Das Wochenziel lässt sich noch nicht einstellen (Einstellung `weeklyGoal` wird schon gelesen – Schalter dafür gehört zu Punkt 6), Bestzeiten je Tafelgröße der Zahlensuche und Verläufe je Rechenart über die Zeit zeigt die Seite noch nicht.
   - [x] Einstufungslauf beim ersten Start: fürs Kopfrechnen als Modus `placement` (20 Aufgaben, setzt die Startlevel je Rechenart); die anderen Spiele brauchen keinen (D19).
6. **Phase 4 – Rest**
   - [x] Einstellungen: Ton, Vibration, Bewegung reduzieren, Umfang des Tagesprogramms (Kurz/Normal/Lang – so ist „Sitzungslänge“ umgesetzt, D20), Wochenziel.
   - [x] Erinnerung als `.ics`-Datei (Uhrzeit und Wochentage wählbar; `src/core/ics.ts`). **Auf dem echten iPhone noch nicht bestätigt**, ob das Teilen-Menü die Datei an den Kalender gibt.
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
- **Text auf „Heute“:** nennt nur die Bereiche, die im Plan wirklich vorkommen, und keine Dauer.
- **Bots:** `e2e/helpers.ts` hat `playSchulte`, `playCorsi`, `playRotation`, `playUfov`, `playArithmetic` (fehlerfrei von der Einstiegsseite bis zum Ergebnis) – für neue Programm-Läufe ergänzen.

## Wissen aus Runde 3

### Schritt 1 – Daten sichern

- **Format:** `{ app: 'brainup', schemaVersion, exportedAt, tables: { trials, sessions, gameState, settings, reviews, programRuns } }`. Durchgänge ohne `id` (lokale laufende Nummer, nirgends referenziert) – wer `id` je als Verweis nutzt, muss den Export ändern.
- **Neue Tabelle oder neues Feld:** Eine neue Tabelle in `exportAll` **und** in `importAll` (`backup.ts`) aufnehmen und die Regel fürs Zusammenführen in D15 ergänzen; der Test „exportiert alle Tabellen“ zählt sie von Hand auf. Bekommen Einstellungen oder Wiederholungen je einen Zeitstempel, kann dort „der neuere gilt“ eingeführt werden.
- **Schemaänderung:** neuer Eintrag am Ende von `SCHEMA` in `db.ts` mit `upgrade`. Der Test „eine ältere Sicherung läuft … durch dieselben Upgrade-Schritte“ zeigt mit einer gedachten Version 2, dass alte Sicherungen dann von selbst mitwandern.
- **Zwei Tipps beim Export sind Absicht** (Safari verlangt für das Teilen-Menü eine unmittelbare Nutzeraktion, D15) – nicht zu einem Knopf zusammenlegen.
- **E2E:** Playwright-WebKit auf dem Mac kennt `navigator.canShare`, in der CI (Linux) nicht. `e2e/backup.spec.ts` legt deshalb in jedem Lauf fest, welcher Weg gilt (Download erzwingen oder `share` durch eine Attrappe ersetzen).

### Schritt 2 – Aufwärm-Spiele

- **Zahlensuche** (`schulte/logic.ts`): Ein Durchgang ist eine **ganze Tafel**, ein Lauf hat drei. `task` = Tafel (Level, Spalten, Zeilen, Reihenfolge, Zellen), `response.taps` = jeder Tipp mit Zahl und Zeit seit Erscheinen der Tafel (auch Fehltipps), `rtMs` = Zeitpunkt des letzten Tipps, `correct` = in der Zielzeit geschafft (eine Sekunde je Zahl plus eine). `kind` = Tafelgröße (`4x4`, `6x6-down`, `6x6-alt`) – daraus lassen sich später Bestzeiten je Tafelgröße bilden. `replay()` ist die einzige Stelle, die Tipps auswertet; Lauf, Wertung und Tests nutzen sie, der Test hat dazu einen eigenen Löser.
- **Schwierigkeit:** Die Zielzeit je Zahl bleibt gleich, die Suche dauert auf großen Tafeln aber je Zahl länger – deshalb pendelt sich das Level dort ein, wo man eine Sekunde je Zahl gerade noch hält. 2-down-1-up (nur drei Tafeln je Lauf), erste Schritte in Zweiersprüngen. Die Zielzeit ist geschätzt, nicht gemessen: Erreicht der Nutzer Level 7–9 sehr schnell oder nie, `PAR_PER_NUMBER_MS` anpassen (Red Team).
- **Trefferquote** im Ergebnis zählt Tipps, nicht Tafeln; „Median-Zeit“ ist die Zeit je gefundener Zahl.
- **Tafel-Layout:** `Board.svelte` passt das Feld über Container-Abfragen (`cqw`/`cqh`) in den freien Platz ein – das Muster eignet sich auch für `corsi` und `nback`.
- **Blockfolge** (`corsi/logic.ts`): 4×4 Felder, Folge ohne Wiederholung. Der Staircase regelt die Länge **1-down-1-up** – der App-Text sagt „nach jedem Erfolg länger“, also nicht auf 3-down umstellen, ohne GAMES.md zu ändern. Der erste falsche Tipp beendet den Durchgang (`judge`). Stufen wie beim Blickfeld: ab Länge 7 nach dem Lauf „schnell“, dann „rückwärts“ (`advance`). Rohdaten: `task.shown` = Soll/Ist jedes aufleuchtenden Felds, `response.taps` = Feld und Zeit seit Öffnen der Eingabe.
- **Abläufe mit mehreren Wartezeiten** (`corsi/Run.svelte`, `nback/Run.svelte`, Tutorials): `async`-Funktion mit `hold(handle)` und einem Zähler `generation`. Ein abgebrochenes Handle erfüllt sein Promise nie – der Zähler fängt den Rest ab (eine schon eingereihte Fortsetzung nach Pause). Dieses Muster übernehmen, nicht `setTimeout`.
- **Pfeilfokus** (`flanker/logic.ts`): Der Staircase regelt das **Antwortfenster** (3-down-1-up, multiplikativ); die Reihe steht per `timing.present` genau so lange. Dafür übergibt `present` jetzt den Reizbeginn an `show(onset)` – so lässt sich schon während der Darbietung antworten und die Reaktionszeit messen. Läuft das Fenster ab, zählt der Durchgang als falsch (`response: null`, `rtMs: null`) und trägt Soll/Ist (`task.actualMs`, `task.frames`); bei beantworteten Durchgängen gibt es kein Ist, weil die Antwort die Darbietung beendet. `kind` = `stimmig`/`widerspruch`; daraus rechnet `summarize` „Ablenkung kostet“.
- **E2E bei schrumpfendem Antwortfenster:** nie eine feste Zahl richtiger Antworten erwarten – in der CI verpasst der Bot Durchgänge. In einer Schleife spielen, bis das Ergebnis da ist, und die Rohdaten gegen ihre eigene Regel prüfen (`e2e/flanker.spec.ts`).
- **N-Back** (`nback/logic.ts`): 3×3 Felder, eine Taste „Treffer“. Ein gewerteter Durchgang ist ein Feld ab dem (n+1)-ten; die ersten n Felder einer Folge sind Vorlauf und werden nicht gespeichert (jeder Durchgang trägt aber `task.back`, das Feld vor n Schritten). Angepasst wird **zwischen** den Blöcken von 20 Feldern: `rateBlock` (höchstens 5 % Fehler → schwerer, ab 25 % → leichter), `afterBlock` ruft dafür den Staircase mit „ein Block = ein Durchgang“. Level 1–6 = n und Tempo (`LEVELS`). Nach einer Pause beginnt eine neue Folge mit Vorlauf für den Rest des Blocks; die Ergebnisse des Blocks bleiben erhalten. Das Antwortfenster reicht bis zum Beginn des nächsten Felds; Soll/Ist der Leuchtdauer steht in `task.actualMs`/`task.frames`.
- **Wechselspiel** (`taskswitch/logic.ts`): gebaut wie der Pfeilfokus (Antwortfenster per `timing.present`, 3-down-1-up). Die Tasten heißen je Regel anders (`LABELS`), links ist immer „ungerade“ bzw. „kleiner“. `kind` = `start` (erste Karte, auch nach einer Pause), `gleich`, `wechsel` – daraus „Wechsel kostet“. Der Anteil der Regelwechsel wächst von 25 % auf 50 %.
- **Bot beim N-Back:** Das Board trägt `data-step` (laufende Nummer des Felds), die Taste `data-correct` nur bei gewerteten Feldern. Der Bot wartet auf einen neuen `data-step` und tippt nur bei `data-correct="true"` (`e2e/nback.spec.ts`).
- **Registry-Reihenfolge:** Neue Spiele hinten anhängen; die Reihenfolge innerhalb eines Bereichs entscheidet bei Gleichstand im Tagesprogramm (`planDaily`), und `e2e/program.spec.ts` legt die Abfolge fest.

### Schritt 3 – Kopfrechnen

- **Modi** (`ModeId` in `arithmetic/logic.ts`): `sprint`, `precision`, `review` – die IDs stehen in gespeicherten Sitzungen. `outcomeIn()` legt fest, wie eine Antwort je Modus zählt: Präzision kennt kein „langsam“; im Fehlertraining zählt das Tempo, aber die Level der Rechenarten bleiben unberührt (es sind alte Aufgaben).
- **Fehlertraining:** lädt beim Start einmal die fälligen Aufgaben (`dueTasks(repo, jetzt, 10)`) – die Sitzung ist so lang wie diese Liste. Nach einer Pause kommt die verworfene Aufgabe wieder. Ist nichts fällig, zeigt der Lauf einen Hinweis mit „Zurück“.
- **Host:** Ein Lauf, der ohne einen einzigen Durchgang endet, gilt als abgebrochen (`Play.svelte`, `onFinish`) – kein Ergebnisbildschirm, keine beendete Sitzung. Das gilt für alle Spiele.
- **Rechenarten:** Die Einstellung `arithmetic.kinds` (Liste von `Kind`) liest der Lauf einmal beim Start über `activeKinds()` – leer, fehlend oder unbekannt heißt „alle“. Die Schalter kommen aus der neuen Basiskomponente `src/ui/Switch.svelte` (im Styleguide); für Ton, Haptik und Bewegung in Phase 4 wiederverwenden.
- **Rechentricks** (`arithmetic/tricks.ts`): `trickFor(task)` liefert Zeilen – Gleichungsketten („a = b = c“, beim Überschlag „a ≈ b = c“) oder kurze Sätze ohne „=“. Der Test `tricks.test.ts` rechnet **jede** Gleichung mit einem eigenen kleinen Parser nach (über alle Typen × Level × 200 Seeds) und prüft, dass der Weg bei der Lösung ankommt; er hat beim Schreiben einen falschen Prozent-Trick gefunden. Wer einen Trick ergänzt, hält sich an diese Zeilenform, sonst kann der Test ihn nicht prüfen. Beim Überschlag wird nur ein Rundungsweg gezeigt, dessen Ergebnis wirklich in der Toleranz liegt.
- **Trick im Lauf:** nur ohne Uhr. Nach einem Fehler mit Trick wartet der Lauf auf „Weiter“ (kein automatisches Weiter); der Trick liegt über der Zahlentastatur (`TaskPad.svelte`, `.pad`), damit die Aufgabe nicht springt. Die Speicherform einer Aufgabe (`TaskRecord`) trägt dafür jetzt die Rechenvorschrift `expr`; ältere Einträge ohne sie bleiben spielbar, haben aber keinen Trick.
- **Einstufung** (D19): `GameDefinition.placement` ist optional; der Host bietet sie an, solange kein Lauf des Spiels beendet wurde (`played` in `Play.svelte`). Der Knopf heißt bewusst „Einstufung beginnen“ und nicht „… starten“ – Playwright findet Knöpfe über Teiltexte, „Start“ soll eindeutig bleiben. In E2E-Läufen, die einen bestimmten Modus prüfen, zuerst „Ohne Einstufung“ tippen (`tutorial()` in `e2e/arithmetic.spec.ts`); der Bot `playArithmetic` spielt beim ersten Mal die Einstufung.
- **Wertung:** `summarize` kennt den Modus nicht (D5); „Punkte“ und „Richtig x von y“ gelten für alle drei. Bestwerte vergleicht der Host je Modus.
- **E2E mit Fälligkeiten:** `page.clock.setFixedTime` stellt nur `Date.now()` fest; Bildtakt und Timing-Engine laufen weiter. So lässt sich „elf Minuten später“ prüfen (`e2e/arithmetic.spec.ts`).

### Schritt 4 – Messung

- **Timing-Seite** (`src/routes/dev/Timing.svelte`): 200 Darbietungen mit 1 bis 15 Frames Dauer über `timing.present`, ausgewertet mit `reportTiming()`. Lokal (Playwright-WebKit, 60 Hz): 200 von 200 auf ±1 Frame, größte Abweichung 6 ms.
- **Beobachtung für das Red Team:** Die Ist-Dauer liegt dort im Mittel etwa 0,5 % unter dem Soll (15 Frames: 248,6 statt 250,0 ms) – der Bildtakt des Headless-WebKit ist offenbar etwas schneller als die 60 Hz, auf die `calibrate()` einrastet (±4 %). Auf dem iPhone mit der Seite nachmessen; ist es dort genauso, die Einrast-Toleranz in `measureFrameMs` enger fassen oder den gemessenen Median direkt nehmen.
- **Zwei Profile:** `npm run e2e` spielt `iphone` (WebKit) und `pixel` (Chromium); einzeln mit `npx playwright test --project=iphone`. Lokal einmalig `npx playwright install webkit chromium`. In der CI laufen sie als zwei parallele Jobs (`test`, `pixel`); veröffentlicht wird der Build aus `test`, aber erst wenn beide grün sind. Der Job `test` braucht inzwischen ≈ 14 von 20 Minuten – neue lange Läufe mit `{ tag: '@lang' }` kennzeichnen oder das Zeitlimit anheben.
- **Chromium ist schneller als WebKit:** Nach „Fertig“ erst auf die Spieleliste warten, bevor der Test die nächste Adresse aufruft – sonst überholt der zweite Seitenwechsel den ersten und die App bleibt auf dem Ergebnisbildschirm. Nach dem Ändern einer Einstellung erst in IndexedDB nachsehen, dann neu laden (`e2e/arithmetic.spec.ts`).
- **Warum 198 statt 200 im Test:** Die Engine protokolliert ehrlich, wenn der Rechner einen Frame zu lange festhält. Unter CI-Last (mehrere Browser parallel) kann das vereinzelt passieren; mehr als zwei Ausreißer in 200 wären ein Fehler der Engine.

### Schritt 5 – Fortschritt

- **Aufteilung:** `src/progress/stats.ts` rechnet (getestet, ohne Browser), `src/routes/Progress.svelte` lädt über `repo` und zeigt. Neue Kennzahlen zuerst als reine Funktion mit Test, dann in die Seite.
- **Wochenziel:** zählt Tage mit mindestens einer **beendeten** Sitzung, Montag bis Sonntag; abgebrochene Läufe zählen nicht. Keine Serie, kein Tadel – so lassen (PLAN.md: keine Dark Patterns).
- **Kalendertage sind Text** („YYYY-MM-DD“, `Session.day`); `addDays` rechnet ohne Uhrzeit und ist damit sicher gegen die Zeitumstellung. Nicht mit `Date`-Objekten in Ortszeit nachbauen.
- **Verlaufslinie:** `src/ui/Sparkline.svelte` (im Styleguide) – für weitere Verläufe wiederverwenden.
- **E2E mit gesäten Daten:** `e2e/progress.spec.ts` liest eine von Hand geschriebene Sicherung ein („Sicherung einlesen“) und stellt die Uhr fest – das Muster taugt für jeden Test, der gespeicherte Sitzungen braucht.

### Schritt 6 – Einstellungen und Erinnerung

- **Rückmeldung:** `signal(correct)` aus `src/ui/feedback.ts` steht in jedem Lauf an der Stelle, an der die Rückmeldung gesetzt wird (nicht im Tutorial). Ein neues Spiel ruft es selbst auf – der Host tut es nicht (D20). `unlockAudio()` läuft in `Play.svelte` beim Start eines Laufs, weil iOS Töne nur nach einer Nutzeraktion zulässt.
- **Einstellungen und IndexedDB:** nie reaktiven Zustand (`$state`) an `repo.setSetting` geben, immer ein einfaches Objekt oder eine einfache Liste – sonst wird still nichts gespeichert (so geschehen bei der Rechenarten-Auswahl).
- **Schlüssel der Einstellungen:** `theme`, `motion`, `sound`, `haptics`, `daily`, `weeklyGoal`, `arithmetic.kinds`, `arithmetic.tricks`, `reminder`. Sie stehen in Sicherungen – nicht umbenennen.
- **Erinnerung:** Die Kalenderdatei trägt eine feste `UID` je Installation (in der Einstellung `reminder`); eine neu erstellte Datei ersetzt damit den alten Termin. Die Uhrzeit ist „schwebend“ (ohne Zeitzone).

## Noch nicht geprüft

- Erinnerung auf dem echten iPhone: ob „Kalenderdatei erstellen“ über das Teilen-Menü im Kalender landet (sonst: Datei in „Dateien“ sichern und dort antippen). Töne: ob sie nach dem ersten Start eines Laufs zu hören sind (Stummschalter aus).
- Sicherung auf dem echten iPhone: ob das Teilen-Menü die `.json`-Datei annimmt („In Dateien sichern“) und ob „Sicherung einlesen“ sie in der Dateien-App auswählen lässt. Meldet der Nutzer ein Problem: `accept` am Datei-Feld lockern bzw. den Dateityp der Sicherung auf `text/plain` stellen und erneut testen lassen.

- Auf dem echten iPhone wurde nichts systematisch geprüft; der Nutzer spielt dort täglich, alle Testläufe liefen in Playwright-WebKit mit iPhone-15-Profil.
- Barrierefreiheit wurde nicht mit axe geprüft. Die Tippflächen im Blickfeld (Antwortphase) haben einen schwachen Rand (`--line`) und erfüllen vermutlich nicht 3 : 1 Kontrast.
- Papierfalten, Schnittansichten und alle fünf Aufwärm-Spiele hat nur der Bot gespielt (Zielzeiten, Antwortfenster und Blockregeln sind geschätzt, nicht am Menschen geeicht): Ob die Level gleichmäßig schwerer werden, zeigt erst das Spielen (Red Team).
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
- Spiel-IDs (`rotation`, `ufov`, `paperfold`, `sections`, `arithmetic`, `schulte`, `corsi`, `flanker`, `nback`, `taskswitch`) und Modus-IDs stehen in gespeicherten Daten – nicht umbenennen. Der Anzeigename darf sich ändern – dann in `docs/GAMES.md` **und** in `index.ts` des Spiels, sonst schlägt `registry.test.ts` fehl.
- Quellen in GAMES.md: nur nachgeschlagene Angaben (Crossref/PubMed), keine DOIs aus dem Gedächtnis. Aussagen über Studien stützen sich dort nur auf die Zusammenfassungen.
- Ändert sich die Form eines Schwierigkeitszustands: `stateVersion` erhöhen und `migrateState` schreiben, sonst startet das Spiel für alle wieder bei Level 1.
