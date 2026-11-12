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
