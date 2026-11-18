# Architekturentscheidungen

Je Eintrag: Entscheidung, Grund, verworfene Alternative. Bestehende Einträge nur nach Rückfrage beim Nutzer ändern.

## D1 – Plattform: PWA statt nativer App

- **Entscheidung:** Web-App (PWA), gehostet auf GitHub Pages.
- **Grund:** Läuft auf iPhone und Mac, kein kostenpflichtiges Apple-Developer-Konto nötig, offline nutzbar.
- **Verworfen:** Native iOS-App (Kosten, nur ein Gerät).

## D2 – Daten nur lokal

- **Entscheidung:** Alle Daten in IndexedDB auf dem Gerät, Sicherung per JSON-Export.
- **Grund:** Kein Server, kein Konto, Datenschutz.
- **Verworfen:** Sync über einen Server (Aufwand, Betrieb).

## D3 – Technik: Svelte 5 (Runes), TypeScript 6 strict, Vitest in Node, Hash-Routing ohne Bibliothek

- **Entscheidung:** Vite 8 + Svelte 5 im Runes-Modus (`$state`, `$props`, `$derived`), TypeScript 6 mit `strict`. Vitest läuft in der Node-Umgebung und testet reine Logik (`*.test.ts` neben der Datei); Oberflächen werden per Playwright geprüft. Routing über den URL-Hash (`#/spiel/rotation`) mit ~40 Zeilen eigenem Code (`src/app/router.svelte.ts`).
- **Grund:** Runes sind der Svelte-5-Standard. Logik ohne DOM testet schnell und stabil. GitHub Pages kennt keinen SPA-Fallback – Hash-Routen funktionieren ohne 404-Trick und unabhängig von `base: '/brainup/'`.
- **Verworfen:** TypeScript 7 (svelte-check braucht dafür derzeit TS 6 und TS 7 parallel plus experimentelles Flag); jsdom-Komponententests (langsam, wenig Aussagekraft für Timing und Layout); SvelteKit oder Router-Bibliothek (unnötige Abhängigkeit für eine Handvoll Seiten).

## D4 – Datenmodell in Dexie und Migrationsstrategie

- **Entscheidung:** Sechs Tabellen, Typen in `src/data/types.ts`, Schema in `src/data/db.ts`, Zugriff ausschließlich über `repo` aus `src/data/repo.ts`:
  - `trials` – **Durchgang**, roh und unveränderlich: Aufgabe (JSON), Antwort (JSON), `rtMs`, `correct`, `difficulty`, `ts`, `kind` (Untertyp, z. B. Rechentyp).
  - `sessions` – **Sitzung** = ein Lauf eines Spiels in einem Modus; trägt `day` (lokales Datum), `completed`, optional `programRunId` und die aus den Durchgängen berechnete `summary` (Cache, jederzeit neu berechenbar).
  - `gameState` – **Spielzustand** je Spiel: Schwierigkeitszustand (JSON, Form bestimmt das Spiel, mit `stateVersion`) und `tutorialDone`.
  - `settings` – **Einstellungen** als Schlüssel/Wert.
  - `reviews` – Spaced-Repetition-Warteschlange für Rechenfehler.
  - `programRuns` – Durchläufe des Tagesprogramms.
- **Migration:** (1) Eine veröffentlichte `version(n)` in `db.ts` wird nie geändert; jede Schemaänderung ist eine neue `version(n+1)` mit `.upgrade()`, alte Versionen bleiben stehen. (2) Im Schema stehen nur Indizes; neue unindizierte Felder brauchen keine Version, Lesecode muss fehlende Felder alter Datensätze abfangen. (3) Spielzustände migriert das Spiel selbst über `stateVersion` + `migrateState`; ohne Migration startet der Zustand neu – Rohdaten bleiben immer erhalten. (4) Der spätere JSON-Export schreibt `SCHEMA_VERSION` mit; Import älterer Exporte läuft durch dieselben Upgrade-Schritte.
- **Grund:** Rohdaten als einzige Wahrheit erlauben, Kennzahlen und Wertung nachträglich zu ändern, ohne Daten zu verlieren. JSON-Nutzlasten halten das Schema klein und spielunabhängig.
- **Verworfen:** Eigene Tabelle je Spiel (jedes neue Spiel wäre eine Migration); nur aggregierte Kennzahlen speichern (PLAN.md verlangt Rohdaten; Timing-Auswertung wäre unmöglich); Dexie direkt in Komponenten (Zugriffe wären verstreut, Export/Import und Tests schwer).

## D5 – Spiel-Schnittstelle `GameDefinition`

- **Entscheidung:** Jedes Spiel exportiert genau ein `GameDefinition<S>` (`src/games/types.ts`) und wird in `src/games/registry.ts` eingetragen. Es liefert: Metadaten und Modi (mit Budget in Durchgängen oder Sekunden); den **Schwierigkeitszustand** `S` (`initialState`, `stateVersion`, `migrateState`, `level`); die Komponenten **`Tutorial`** (`onDone`) und **`Run`** (`state`, `mode`, `paused`, `onTrial`, `onProgress`, `onFinish(nextState)`); und **`summarize(trials, state)`** für Wertung und Kennzahlen. Den Ablauf drumherum – Zustand laden, Tutorial beim ersten Mal, Countdown, Pause/Abbruch, Durchgänge und Zustand speichern, Ergebnisbildschirm – erledigt allein der Host `src/routes/Play.svelte`. Die Spiellogik liegt als reine Funktionen in `logic.ts` (mit Tests), die Svelte-Komponenten sind dünn.
- **Grund:** Ein neues Spiel besteht nur aus Logik + zwei Komponenten; Speichern, Pause, Ergebnis und Tagesprogramm funktionieren automatisch und überall gleich. `summarize` rechnet nur aus Rohdaten, also sind Kennzahlen reproduzierbar.
- **Verworfen:** Spiele speichern selbst (doppelter Code, uneinheitliche Daten); eine Basisklasse mit Vererbung (passt schlecht zu Svelte-Komponenten); Spiel als eine einzige Komponente inkl. Tutorial und Ergebnis (jedes Spiel würde den Rahmen neu bauen).
- **Pausenregel:** Bei `paused = true` hält das Spiel Uhren an und verwirft den laufenden Durchgang; er zählt nicht und wird neu gestellt.

## D6 – Ablauf des Tagesprogramms

- **Entscheidung:** `planDaily(games, recent, config)` in `src/program/daily.ts` plant rein funktional: Reihenfolge Aufwärmen → Training → Kopfrechnen, je Bereich die am längsten nicht gespielten Spiele, Standard 1 + 2 + 1 Spiele (≈ 10–15 min), über `settings` konfigurierbar. Die UI speichert den Plan als `ProgramRun` (Schritte mit `sessionId`, sobald gespielt), startet die Schritte nacheinander über denselben Host wie Einzelspiele (`programRunId` an der Sitzung) und kann ein unterbrochenes Programm desselben Tages fortsetzen. Zwischen den Schritten steht der normale Ergebnisbildschirm mit „Weiter“.
- **Grund:** Deterministische Planung ist testbar; Fortsetzen nach App-Wechsel ist auf dem Handy der Normalfall; kein zweiter Spielablauf neben dem Host.
- **Verworfen:** Zufällige Auswahl (nicht testbar, wiederholt sich unglücklich); Programmzustand nur im Speicher (geht beim Schließen verloren).

## D7 – Ordnerstruktur

- **Entscheidung:**
  - `src/core/` – reine, DOM-freie Kernmodule: `timing`, `staircase`, `fraction`, `srs`, `rng`.
  - `src/data/` – `types`, `db` (Schema), `repo` (einziger Datenzugang).
  - `src/design/` – `tokens.css`, `base.css`.
  - `src/ui/` – Basiskomponenten.
  - `src/games/` – `types`, `registry`, `metrics` und je Spiel ein Ordner `<id>/` mit `logic.ts`, `logic.test.ts`, `Run.svelte`, `Tutorial.svelte`, `index.ts`.
  - `src/program/` – Tagesprogramm.
  - `src/routes/` – Seiten inkl. Host `Play.svelte` und `dev/Styleguide.svelte`.
  - `src/app/` – `App.svelte` (Shell), Router.
  - `e2e/` – Playwright.
- **Grund:** Abhängigkeiten zeigen nur nach unten (routes → games/ui → core/data); ein Spiel ist ein in sich geschlossener Ordner.
- **Verworfen:** Sortierung nach Dateityp (`components/`, `stores/`, `utils/`) – ein Spiel wäre über das ganze Projekt verstreut.

## D8 – Designsystem: CSS-Variablen als Tokens, Systemschrift, eine Akzentfarbe, keine UI-Bibliothek

- **Entscheidung:** Alle Gestaltungswerte sind CSS-Variablen in `src/design/tokens.css` (Farben, Schrift, Abstände, Radien, Bewegung, Safe Areas). Hell/Dunkel über `light-dark()` und `color-scheme`; `data-theme` am `<html>` erzwingt ein Schema, `data-motion="reduced"` schaltet Bewegung ab. Schrift ist die Systemschrift, für Zahlen, Überschriften und Tasten die runde Variante (`ui-rounded`). Eine Akzentfarbe (Indigo); Grün/Rot ausschließlich als Rückmeldung richtig/falsch. Basiskomponenten liegen in `src/ui/` (Button, Card, Segmented, Numpad, GameFrame, ResultScreen, ProgressBar, ProgressRing, Icon) und werden im Styleguide `#/dev/styleguide` gezeigt. Komponenten-CSS ist gekapselt (`<style>` in der Svelte-Datei) und verwendet nur Tokens.
- **Grund:** Ein Ort für jeden Wert hält die App einheitlich, auch wenn mehrere Modelle nacheinander daran bauen. Systemschrift lädt nichts nach (Start < 1 s, offline) und wirkt auf iPhone und Mac heimisch. `light-dark()` erspart doppelte Farbblöcke.
- **Verworfen:** Tailwind oder eine Komponentenbibliothek (Abhängigkeit, beliebiges Aussehen, größeres Bundle); Webfonts (Ladezeit, Offline-Aufwand); getrennte `@media (prefers-color-scheme)`-Blöcke (jede Farbe doppelt zu pflegen). `light-dark()` setzt iOS/Safari 17.5+ voraus – bewusst in Kauf genommen.
- **Regel:** Fehlt eine Komponente, wird sie in `src/ui/` ergänzt und in den Styleguide aufgenommen – nicht in einer Seite oder einem Spiel nachgebaut.

## D9 – Timing-Engine: rAF-Zeitstempel als Zeitbasis, Dauer in Frames, alles abbrechbar

- **Entscheidung:** `src/core/timing.ts` zeigt Reize im `requestAnimationFrame`-Callback und nimmt dessen Zeitstempel als Reizbeginn; Dauern werden auf ganze Frames gerundet (`quantize`), die Bildrate wird einmal je Spielstart gemessen (`calibrate`, Median, auf bekannte Raten eingerastet). Reaktionszeit = `pointerdown.timeStamp` − Reizbeginn. Jede Operation liefert ein Handle mit `cancel()`; Soll/Ist jeder Darbietung landet im Protokoll und – bei zeitkritischen Spielen – in den Rohdaten des Durchgangs.
- **Grund:** rAF-Zeitstempel und Ereignis-Zeitstempel teilen dieselbe Uhr; nur Frame-Vielfache sind tatsächlich darstellbar; abbrechbare Handles machen Pause und Abbruch sauber. Die Uhr ist injizierbar, dadurch ist die Engine ohne Browser testbar.
- **Verworfen:** `setTimeout` (Jitter von mehreren ms, nicht an den Bildaufbau gekoppelt); `click`-Ereignisse (auf Touch-Geräten verzögert).

## D10 – Staircase: ein Modul, Schwelle als Mittel der Durchgangswerte

- **Entscheidung:** `src/core/staircase.ts` ist rein funktional (n-down-1-up, additiv oder multiplikativ, Schrittweiten nach Zahl der Umkehrungen). Die Schwelle wird als (bei Zeiten geometrisches) Mittel der Durchgangswerte nach der Einschwingphase geschätzt.
- **Grund:** In der Simulation streut das klassische Mittel der Umkehrpunkte bei gleicher Datenmenge etwa doppelt so stark und verfehlte ±10 % in rund einem Viertel der Läufe; das Mittel der Durchgangswerte trifft über 100 Seeds mit je 500 Durchgängen.
- **Verworfen:** Mittel der Umkehrpunkte; Bayes-Verfahren wie QUEST (genauer, aber deutlich komplexer und schwerer zu erklären).
- **Folge:** Einzelne Sitzungen (30–40 Durchgänge) sind nur auf etwa ±20 % genau – Verläufe über mehrere Sitzungen glätten.

## D11 – Kopfrechnen: zehn Typen mit je zehn Leveln, Staircase je Typ, Tempo zählt

- **Entscheidung:** `src/games/arithmetic/generators.ts` kennt die Typen `table`, `add`, `sub`, `mul`, `div`, `percent`, `power`, `fraction`, `pow10`, `estimate`, jeweils Level 1–10 (Tabellen im Code: Stellenzahl, Überträge, Zahlenbereiche). Jeder Typ hat einen eigenen 2-down-1-up-Staircase. Falsch → leichter; richtig und zügig → zählt fürs Aufsteigen; richtig, aber langsamer als `slowMs(kind, level)` → keine Änderung. Der Sprint mischt alle Typen. Aufgaben werden als JSON mit der Lösung als Bruch-Text gespeichert (`toRecord`/`fromRecord`). Falsche und langsame Aufgaben wandern schon jetzt in die Wiederholungsliste (`reviews.ts`).
- **Grund:** Ein Level je Typ entspricht PLAN.md („Schwierigkeit je Typ adaptiv über Stellenzahl, Überträge und Tempo“). 2-down statt 3-down, weil im gemischten Sprint je Typ nur ein bis drei Aufgaben pro Sitzung anfallen. bigint ist nicht JSON-fähig, der Export soll aber JSON sein.
- **Verworfen:** Ein gemeinsames Level für alle Typen (wer gut addiert, bekäme zu schwere Brüche); Antwortzeit als zweite Staircase-Dimension (schwer vorhersagbar, kaum testbar).

## D12 – E2E: Playwright mit WebKit gegen den Produktions-Build, Bot liest `data-correct`

- **Entscheidung:** `npm run e2e` baut die App, startet `vite preview` und spielt im iPhone-15-Profil (WebKit). Spiele schreiben die richtige Antwort nur dann als `data-correct`/`data-answer` ins DOM, wenn `window.__brainupE2E` gesetzt ist (`src/games/e2e.ts`, `e2e/helpers.ts`).
- **Grund:** WebKit ist die Engine des iPhones; gegen den Build getestet wird, was ausgeliefert wird. Ein Bot, der richtig antwortet, prüft Adaptivität, Wertung und Speicherung statt nur „stürzt nicht ab“.
- **Verworfen:** Zufällig tippender Bot (prüft kaum etwas); Antworten immer im DOM (Schummeln per Entwicklerwerkzeug wäre egal, aber es bläht das DOM auf und verführt zu Abkürzungen im Code).

## D13 – PWA: alles im Precache, Aktualisierung beim nächsten Start, CI und Deploy in einem Workflow

- **Entscheidung:** `vite-plugin-pwa` (generateSW) legt den gesamten Build in den Precache (`js, css, html, svg, png, webmanifest`); es gibt keine Laufzeit-Caches und keine Netzabhängigkeit nach dem ersten Besuch. Manifest mit `start_url` und `scope` `/brainup/`, `display: standalone`, Icons 192/512 (any + maskable) und `apple-touch-icon` 180 – erzeugt aus `public/icons/icon.svg` per `node scripts/make-icons.mjs`. `registerType: 'autoUpdate'` ohne erzwungenes Neuladen: Ein neuer Service Worker übernimmt sofort (`skipWaiting`/`clientsClaim`), die offene Seite läuft mit ihrem geladenen Stand weiter, die neue Version erscheint beim nächsten Start. Im Dev-Server ist der Service Worker aus. Ein Workflow `.github/workflows/ci.yml` prüft jeden Push und Pull Request (Tests, Build, E2E) und veröffentlicht bei Push auf `main` genau den getesteten Build auf GitHub Pages.
- **Grund:** Die App ist klein und hat keine nachgeladenen Daten – Precache von allem ist die einfachste Form von „100 % offline“. Ein automatisches Neuladen mitten in einem Lauf würde einen Durchgang zerstören; „beim nächsten Start“ ist für eine Trainings-App früh genug. Deploy im selben Workflow verhindert, dass ungetestete Stände live gehen.
- **Verworfen:** Update-Dialog („Neue Version – neu laden?“; zusätzliche Oberfläche ohne Nutzen für eine Ein-Personen-App); eigener Service Worker mit `injectManifest` (mehr Code, nichts gewonnen); `@vite-pwa/assets-generator` für Icons (neue Abhängigkeit für vier Dateien); getrennter Deploy-Workflow (könnte bei rotem CI trotzdem veröffentlichen).

## D14 – Tagesprogramm: Durchlauf in der URL, Fortschritt am `ProgramRun`, `recent` ohne Schemaänderung

- **Entscheidung:** Umsetzung von D6. „Heute“ legt aus `planDaily` einen `ProgramRun` an und öffnet den ersten Schritt als `#/spiel/<id>?mode=<modus>&run=<durchlauf>`. Der Host lädt den Durchlauf über `run`, zeigt „Tagesprogramm · Schritt i von n“, trägt nach einem beendeten Lauf die Sitzung beim Schritt ein (`completeStep`) und führt mit „Weiter“ zum nächsten offenen Schritt, nach dem letzten mit „Fertig“ zurück auf „Heute“. Zwischen den Schritten steht die normale Einstiegsseite des Spiels (damit auch das Tutorial beim ersten Mal). „Heute“ zeigt den offenen Durchlauf des Tages zum Fortsetzen, sonst den beendeten mit „Noch ein Durchlauf“. Die Logik liegt als reine Funktionen in `src/program/run.ts`. `recent` für `planDaily` entsteht aus den letzten fünf Sitzungen je Spiel (`repo.sessionsOfGame`), abgebrochene zählen nicht. Die Konfiguration liest „Heute“ aus der Einstellung `daily` (Form `DailyConfig`); eine Oberfläche dafür gibt es noch nicht.
- **Grund:** Der Durchlauf in der URL übersteht Neuladen und App-Wechsel ohne zusätzlichen Zustand; der Host bleibt der einzige Spielablauf. Die Abfrage je Spiel nutzt den vorhandenen Index `[gameId+startedAt]` – keine neue Schema-Version.
- **Verworfen:** Durchlauf nur im Speicher (verloren beim Neuladen); automatischer Start des nächsten Spiels ohne Einstiegsseite (kein Platz für Tutorial und Verschnaufpause); neuer Index `startedAt` auf `sessions` (Schema-Version 2 für eine Abfrage, die auch so geht).

## D15 – Sicherung: eine JSON-Datei, Import führt zusammen und löscht nie

- **Entscheidung:** `repo.exportAll()` liefert alle sechs Tabellen mit `schemaVersion` und `exportedAt` (`src/data/backup.ts`); Durchgänge stehen in Speicherreihenfolge und ohne ihre lokale laufende Nummer `id`. `repo.importAll()` **führt zusammen**, statt zu ersetzen, in einer einzigen Transaktion (alles oder nichts):
  - *Sitzungen:* unbekannte kommen dazu; eine beendete Fassung ersetzt dieselbe unbeendete, nie umgekehrt.
  - *Durchgänge:* Vereinigung je Sitzung. Als gleich gilt nur, was in allen Feldern übereinstimmt – im Zweifel bleibt ein Durchgang doppelt, verloren geht keiner.
  - *Spielzustand:* der mit dem jüngeren `updatedAt` gilt; ein gespieltes Tutorial bleibt gespielt.
  - *Einstellungen, Wiederholungsliste:* tragen keinen Zeitstempel – Vorhandenes bleibt, Fehlendes kommt dazu.
  - *Tagesprogramm:* derselbe Durchlauf wird Schritt für Schritt ergänzt.
  - Ältere Sicherungen werden zuerst in eine Hilfsdatenbank im Stand ihrer `schemaVersion` geschrieben und mit dem aktuellen Schema geöffnet – Dexie führt dabei genau die `upgrade`-Schritte aus `db.ts` aus (D4). Dafür steht das Schema dort als Liste `SCHEMA` (Eintrag i = `version(i + 1)`). Sicherungen aus einer neueren App-Version, fremde und beschädigte Dateien werden abgelehnt.
  - *Datei:* Die Einstellungen erstellen die Sicherung erst („Sicherung erstellen“) und übergeben sie mit einem zweiten Tipp („Datei speichern“) an `navigator.share({ files })` – auf dem iPhone das Teilen-Menü mit „In Dateien sichern“. Wo Dateien nicht geteilt werden können, wird sie heruntergeladen. Eingelesen wird über `<input type="file">`.
- **Grund:** Der Normalfall ist „iOS hat den Speicher geräumt“ oder „neues Gerät“ – oft hat man dann schon wieder ein paar Runden gespielt. Zusammenführen kann dabei keine Rohdaten vernichten, Ersetzen schon. Zweimal dieselbe Datei einzulesen ändert nichts. Ohne `id` ist Export → Import → Export zeichengleich. Safari öffnet das Teilen-Menü nur als unmittelbare Folge eines Tipps; das Auslesen der Datenbank dazwischen würde die Freigabe verfallen lassen – deshalb zwei Schritte. Ein Download per `<a download>` ist in Home-Bildschirm-Apps auf iOS nicht verlässlich.
- **Verworfen:** Ersetzen (löscht still, was seit der Sicherung gespielt wurde); Wahl „Ersetzen oder Zusammenführen“ im Dialog (eine Frage mehr, und die falsche Antwort kostet Daten); Durchgänge nur über Sitzung + Zeitstempel abgleichen (zwei verschiedene Durchgänge mit gleichem Zeitstempel würden zu einem); Upgrade-Schritte für den Import als zweite Fassung neben den Dexie-Upgrades (zwei Wahrheiten); `dexie-export-import` (neue Abhängigkeit, Format an Dexie-Interna gebunden).
- **Folge:** Nach „Speicher geräumt → ein Spiel neu begonnen → Sicherung eingelesen“ behält genau dieses Spiel seinen neuen, niedrigen Stand (jünger); die Rohdaten sind vollständig, der Staircase holt das auf. Eine auf dem Gerät gelöschte (gelernte) Wiederholung kann durch eine ältere Sicherung wieder auftauchen – harmlos.

## D16 – Aufwärm-Spiele: was ein Durchgang ist und woran der Staircase dreht

- **Entscheidung:** Jedes der fünf Aufwärm-Spiele meldet dem Host „Durchgänge“ in der Einheit, in der es bewertet wird, und nutzt dafür das eine Staircase-Modul (D10):
  - *Zahlensuche:* Durchgang = eine ganze Tafel (jeder Tipp steht in `response.taps`); „richtig“ = in der Zielzeit von einer Sekunde je Zahl. 2-down-1-up über die Tafelgröße.
  - *Blockfolge:* Durchgang = eine Folge; 1-down-1-up über die Länge (der App-Text sagt „nach jedem Erfolg länger“), Stufen „schnell“ und „rückwärts“ wie beim Blickfeld.
  - *Pfeilfokus, Wechselspiel:* Durchgang = eine Reihe bzw. Karte; 3-down-1-up über das **Antwortfenster** (multiplikativ), der Anteil widersprüchlicher Reihen bzw. Regelwechsel wächst mit.
  - *N-Back:* Durchgang = ein gewertetes Feld; angepasst wird nur **zwischen Blöcken** von 20 Feldern (ein Block = ein Schritt des Staircase; mittelmäßige Blöcke ändern nichts).
  - Dazu zwei kleine Erweiterungen am Rahmen: `timing.present` übergibt den Reizbeginn an `show(onset)`, damit auf einen Reiz schon während seiner Darbietung geantwortet werden kann (Ergänzung zu D9); der Host wertet einen Lauf ohne einen einzigen Durchgang als abgebrochen (Ergänzung zu D5).
- **Grund:** Die Rohdaten bleiben in der Einheit, in der man später auswertet (Bestzeit je Tafelgröße, Kosten der Ablenkung, Trefferrate je Block), und alle Spiele adaptieren über dasselbe, getestete Verfahren. Ein Antwortfenster als Staircase-Wert macht „schneller“ zur einzigen Stellschraube und ist frame-genau darstellbar.
- **Verworfen:** Jeden Tipp der Zahlensuche als eigenen Durchgang (der Staircase hätte nichts Sinnvolles zu regeln, die Tafel stünde in jedem Durchgang erneut); N-Back von Feld zu Feld anpassen (n mitten in einer Folge zu ändern zerstört die Aufgabe); eigene Adaptionsregeln je Spiel (fünf ungetestete Verfahren statt eines).

## D17 – Kopfrechnen: drei Modi, Rechenarten-Auswahl und Rechentricks über Einstellungen

- **Entscheidung:** Modi `sprint`, `precision`, `review` (IDs stehen in gespeicherten Sitzungen). Präzision wertet kein Tempo; das Fehlertraining spielt die fälligen Aufgaben der Wiederholungsliste und lässt die Level der Rechenarten unberührt. Die Auswahl der Rechenarten (`arithmetic.kinds`) und der Rechentrick nach Fehlern (`arithmetic.tricks`) sind Einstellungen, die der Lauf beim Start liest; bedient werden sie auf der Seite „Einstellungen“. Tricks gibt es nur in den Modi ohne Uhr; der Lauf wartet dann auf „Weiter“. Die Speicherform einer Aufgabe trägt dafür zusätzlich die Rechenvorschrift (`TaskRecord.expr`, optional).
- **Grund:** `GameDefinition` kennt keine spielspezifische Oberfläche vor dem Lauf (D5) – Einstellungen sind der vorhandene Ort dafür, und der Host bleibt für alle Spiele gleich. Im Sprint läuft die Uhr; ein Trick, den man lesen muss, würde dort Zeit kosten.
- **Verworfen:** `summarize` den Modus als dritten Parameter geben (ändert D5 für alle Spiele; „Punkte“ und „Richtig x von y“ passen auf alle drei Modi); eine Options-Seite je Spiel im Host (neue Schnittstelle für ein einziges Spiel); Tricks als feste Texte je Rechenart (unprüfbar und oft unpassend – stattdessen wird der Weg für genau die Aufgabe gerechnet und im Test nachgerechnet).

## D18 – Fortschritt: Auswertung als reine Funktionen in `src/progress/`, Wochenziel in Tagen

- **Entscheidung:** Alles, was die Seite „Fortschritt“ zeigt, rechnen reine Funktionen in `src/progress/stats.ts` aus Sitzungen und Durchgängen (Wochenstatus, Kalenderblatt, Verlauf, Glättung, Bestwerte, Kennzahlen je Untertyp); die Seite lädt nur über `repo` (`sessionsBetweenDays`, `sessionsOfGame`, `trialsOfGame` – ohne neue Indizes) und stellt dar. Das Wochenziel zählt **Tage mit mindestens einer beendeten Sitzung** in der Woche von Montag bis Sonntag (Standard 4, Einstellung `weeklyGoal`); es gibt keine Serie, die reißen kann. Verläufe werden über drei Sitzungen geglättet gezeigt (D10).
- **Grund:** PLAN.md verlangt „Wochenziel statt Tages-Streak; keine Dark Patterns“. Reine Funktionen sind ohne Browser testbar; Kalendertage als Text („YYYY-MM-DD“) und Rechnen ohne Uhrzeit umgehen die Zeitumstellung.
- **Verworfen:** Kennzahlen beim Speichern mitschreiben (zweite Wahrheit neben den Rohdaten, D4); eine Diagramm-Bibliothek (neue Abhängigkeit für eine Linie); Tages-Serie mit „Freeze“ (genau das Muster, das PLAN.md ausschließt).

## D19 – Einstufungslauf: optionaler Modus `placement` an der Spiel-Schnittstelle, zunächst nur fürs Kopfrechnen

- **Entscheidung:** `GameDefinition` bekommt das optionale Feld `placement?: GameMode` (Ergänzung zu D5). Hat ein Spiel es und wurde noch nie ein Lauf beendet, bietet der Host auf der Einstiegsseite statt der Modusauswahl die Einstufung an („Einstufung beginnen“ bzw. nach dem Tutorial direkt), mit „Ohne Einstufung“ als Ausweg; der Lauf ist eine normale Sitzung im Modus `placement`. Umgesetzt fürs Kopfrechnen: je Rechenart zwei Aufgaben (Level 4, dann 7 oder 2), daraus das Startlevel 7, 5, 3 oder 1 (`placementProbe`, `placedLevel`, `applyPlacement`). Die Einstufung schreibt nichts in die Wiederholungsliste und zeigt keine Rechentricks.
- **Grund:** Nur beim Kopfrechnen dauert das Einpendeln lange – zehn Rechenarten mit je eigenem Staircase in Einerschritten, im gemischten Lauf ein bis drei Aufgaben je Art und Sitzung. Alle anderen Spiele beginnen mit groben Schritten (`steps: [2, 1]`, multiplikativ oder 1-up) und sind nach der ersten Sitzung ungefähr am Ziel; ein eigener Einstufungslauf wäre dort nur ein zweiter erster Lauf. Als Modus bleibt die Einstufung im vorhandenen Ablauf (Rohdaten, Pause, Ergebnis, Tagesprogramm).
- **Verworfen:** Ein gemeinsamer Einstufungslauf über alle Spiele beim ersten App-Start (zehn Tutorials und Proben am Stück – lang, und für neun Spiele unnötig); gröbere Schritte im Kopfrechen-Staircase (würde auch bestehende Spielstände in Dreiersprüngen bewegen); die Einstufung als vierter Eintrag der Modusauswahl (dauerhaft sichtbar, obwohl man sie einmal braucht).

## D20 – Einstellungen: Rückmeldung in den Spielen, Programm-Umfang statt Lauf-Länge, Erinnerung als Kalenderdatei

- **Entscheidung:**
  - *Ton und Vibration:* `src/ui/feedback.ts` (`signal(correct)`); jedes Spiel ruft es in dem Moment auf, in dem es seine Rückmeldung zeigt. Töne entstehen über WebAudio (keine Audiodateien), Vibration über `navigator.vibrate`, wo es das gibt. Einstellungen `sound` (Standard aus) und `haptics` (Standard an).
  - *Bewegung reduzieren:* Einstellung `motion`; setzt `data-motion="reduced"` am `<html>` (D8).
  - *„Sitzungslänge“ aus PLAN.md* ist als **Umfang des Tagesprogramms** umgesetzt (Kurz 3, Normal 4, Lang 6 Spiele; `DAILY_PRESETS`, Einstellung `daily`). Die Länge eines einzelnen Laufs bleibt je Spiel und Modus fest.
  - *Wochenziel:* 1–7 Tage, Einstellung `weeklyGoal` (D18).
  - *Erinnerung:* `src/core/ics.ts` erzeugt eine iCalendar-Datei mit einem wiederkehrenden Termin (schwebende Ortszeit, Hinweis zum Termin, feste `UID` je Installation); sie wird wie die Sicherung über das Teilen-Menü bzw. als Download übergeben (D15).
- **Grund:** Der Host kennt nur gemeldete Durchgänge – beim N-Back kämen Töne erst am Ende des Antwortfensters und auch für jedes nicht getippte Feld; deshalb entscheidet das Spiel, wann es ein Signal gibt. Wären Läufe unterschiedlich lang einstellbar, wären Punktzahlen und Bestwerte nicht mehr vergleichbar (ein 90-Sekunden-Sprint schlägt jeden 60-Sekunden-Sprint). Eine Web-App auf dem iPhone kann ohne Server keine Mitteilungen planen; der Kalender des Geräts kann es, und mit fester `UID` ersetzt eine neu erstellte Datei den alten Termin, statt einen zweiten anzulegen.
- **Verworfen:** Töne zentral im Host bei jedem gemeldeten Durchgang (falscher Zeitpunkt, siehe oben); ein Faktor für die Lauf-Länge je Spiel (unvergleichbare Bestwerte oder ein zusätzliches Feld an jeder Sitzung samt Auswertung je Länge); Web-Push für Erinnerungen (braucht einen Server, widerspricht D2); Audiodateien (müssten in den Precache, D13).
