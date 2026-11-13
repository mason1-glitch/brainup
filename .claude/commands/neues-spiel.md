---
description: Führt Schritt für Schritt durch ein neues Spiel nach dem Muster der Referenzspiele
argument-hint: <spiel-id> [kurze Beschreibung]
---

Baue das Spiel **$ARGUMENTS** für BrainUp. Halte dich genau an `docs/ADDING_A_GAME.md`; die Referenzen sind `src/games/rotation/` (Reiz bis zur Antwort) und `src/games/ufov/` (zeitlich begrenzter Reiz). Arbeite die Schritte der Reihe nach ab und prüfe nach jedem, bevor du weitergehst.

## 0. Vorbereiten

- Lies `docs/ADDING_A_GAME.md`, `src/games/types.ts` und das Referenzspiel, das näher an deinem Spiel liegt (alle Dateien des Ordners).
- Lies den Eintrag des Spiels in `docs/GAMES.md`. Fehlt er, lege ihn zuerst an (Spiel · Bereich · was es fordert · Quelle · App-Text) und lass ihn vom Nutzer bestätigen.
- `git status` muss sauber sein.

## 1. Entwurf (kurz, im Chat – noch kein Code)

Schreibe in höchstens zehn Zeilen auf:

- Was sieht der Spieler, was tippt er, wann ist eine Antwort richtig?
- Welche eine Zahl regelt der Staircase (Level oder Darbietungszeit) und wie wird daraus die Aufgabe?
- Was speichert ein Durchgang in `task` und `response`?
- Die 2–3 Schritte des Tutorials.
- Wertung: Was ist die große Zahl auf dem Ergebnisbildschirm?

Ist etwas davon unklar oder gibt es zwei sinnvolle Varianten, frag den Nutzer, bevor du baust.

## 2. Logik mit Tests

- `src/games/<id>/logic.test.ts` zuerst: Korrektheit der Aufgaben über ≥ 500 Seeds mit unabhängiger Nachprüfung, Schwierigkeitsparameter, Verteilung der richtigen Antwort, Wertung.
- Dann `src/games/<id>/logic.ts`, bis die Tests bestehen.
- Prüfen: `npx vitest run src/games/<id> --reporter=dot`

## 3. Lauf

- Durchgangs-Komponente (`Board.svelte`/`Round.svelte`), dann `Run.svelte` nach dem Gerüst in `docs/ADDING_A_GAME.md`.
- Reize, Masken und Wartezeiten nur über `timing` (`src/core/timing.ts`); Antworten über `onpointerdown`; `data-correct` für den Bot.
- Nur Tokens aus `src/design/tokens.css` und Komponenten aus `src/ui/`.

## 4. Tutorial

`Tutorial.svelte`: 2–3 Schritte zum Mitmachen, ≈ 30 s, jeder Schritt wiederholt bis richtig, am Ende `onDone()`.

## 5. Registrieren

`index.ts` mit `defineGame`, Eintrag in `src/games/registry.ts`. Prüfen: `npm run check`

## 6. E2E

`e2e/<id>.spec.ts` nach `e2e/rotation.spec.ts`: Tutorial (einmal absichtlich falsch), ganzer Lauf mit einigen Fehlern, Ergebnis. Prüfen: `npx playwright test e2e/<id>.spec.ts`

## 7. Ansehen und verbessern

Starte `npm run dev`, öffne `#/spiel/<id>` im iPhone-Viewport, spiele Tutorial und einen Lauf, hell und dunkel. Beurteile wie ein Spieldesigner (Spiel oder Test? Sofort verständlich? Level 1 leicht genug? Rückmeldung schnell genug?) und verbessere den schwächsten Punkt.

## 8. Abschluss

- `npm test && npm run build && npm run e2e` – alles grün.
- Checkliste am Ende von `docs/ADDING_A_GAME.md` durchgehen.
- `docs/HANDOFF.md` aktualisieren (Stand, nächster Schritt, neue Fallstricke), committen, pushen.
- Dem Nutzer in drei Sätzen sagen, was das Spiel fordert, wie die Schwierigkeit steigt und was noch offen ist.
