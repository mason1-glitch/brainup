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
