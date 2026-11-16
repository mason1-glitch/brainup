# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Projekt: BrainUp

Brain-Training-PWA fürs Handy (Training: räumliches Denken + Verarbeitungsgeschwindigkeit, Kopfrechnen, Aufwärmen & Fokus). Live unter https://mason1-glitch.github.io/brainup/

## Pflichtlektüre vor jeder Arbeit

1. `docs/PLAN.md` – Gesamtplan, Phasen, Abnahmekriterien
2. `docs/HANDOFF.md` – aktueller Stand und nächste offene Aufgabe
3. `docs/DECISIONS.md` – getroffene Architekturentscheidungen

## Übergaberegeln

- An dieser App arbeiten nacheinander mehrere Modelle (erst Fable, dann Opus). Jede Sitzung kann jederzeit enden.
- Nach jedem abgeschlossenen Schritt: Tests grün → Commit → Push → `docs/HANDOFF.md` aktualisieren (Status, nächster Schritt, Fallstricke).
- Architekturentscheidungen kommen in `docs/DECISIONS.md` (Entscheidung, Grund, verworfene Alternative). Bestehende Entscheidungen nur nach Rückfrage beim Nutzer ändern.
- Beim Start einer Sitzung zuerst `git status` prüfen: Unfertige Änderungen zu Ende führen oder begründet verwerfen.

## Architektur, Befehle, verbindliche Regeln

### Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Dev-Server, http://localhost:5173/brainup/ (der Pfad `/brainup/` gehört dazu) |
| `npm run dev:phone` | Dev-Server im WLAN fürs iPhone („Network“-Adresse + `/brainup/`) |
| `npm test` | Vitest, alle `src/**/*.test.ts` (knappe Ausgabe) |
| `npx vitest run <pfad> --reporter=verbose` | einzelne Tests mit Details |
| `npm run check` | Typprüfung (svelte-check) |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` |
| `npm run e2e` | Playwright (WebKit, iPhone-Viewport) gegen den Produktions-Build; einmalig vorher `npx playwright install webkit` |
| `node scripts/make-icons.mjs` | PNG-Icons aus `public/icons/icon.svg` neu erzeugen (nur nach Änderung des SVG) |

Routen (Hash-Router): `#/` Heute · `#/spiele` · `#/fortschritt` · `#/einstellungen` · `#/spiel/<id>` · `#/dev/styleguide`.

### Ordnerstruktur

```
src/
  core/      reine Kernmodule ohne DOM-Abhängigkeit der Logik: timing, staircase, fraction, srs, rng
  data/      types (Datenmodell), db (Dexie-Schema), repo (einziger Datenzugang)
  design/    tokens.css (alle Gestaltungswerte), base.css
  ui/        Basiskomponenten: Button, Card, Segmented, Numpad, GameFrame, ResultScreen, ProgressBar, ProgressRing, Icon
  games/     types (GameDefinition), registry, metrics, e2e + je Spiel ein Ordner (logic, Run, Tutorial, index)
  program/   Tagesprogramm (planDaily)
  routes/    Seiten; Play.svelte ist der Host für jedes Spiel; dev/Styleguide.svelte
  app/       App.svelte (Shell), router, theme, TabBar
e2e/         Playwright-Tests und helpers
public/      Icons (werden unverändert ausgeliefert)
scripts/     Hilfsskripte (make-icons)
.github/     CI: Tests, Build, E2E bei jedem Push/PR; Deploy auf GitHub Pages bei Push auf main
docs/        PLAN, HANDOFF, DECISIONS, ADDING_A_GAME, GAMES
```

Abhängigkeiten zeigen nur nach unten: `routes` → `games`/`ui` → `core`/`data`. `core` importiert nichts aus anderen Ordnern.

### Verbindliche Regeln

1. **Nur Design-Tokens und Basiskomponenten.** Keine festen Farben, Schriftgrößen, Abstände, Radien oder Zeiten in Komponenten – immer `var(--…)` aus `src/design/tokens.css`. Bedienelemente kommen aus `src/ui/`. Fehlt eine Komponente oder ein Token, wird es dort ergänzt und im Styleguide gezeigt, nicht lokal nachgebaut.
2. **Reize nur über die Timing-Engine.** Alles, was im Spiel zeitlich zählt – Reizbeginn, Darbietungsdauer, Masken, Wartezeiten, Reaktionszeiten – läuft über `timing` aus `src/core/timing.ts` (`onset`, `present`, `wait`, `rt`, `quantize`). Kein `setTimeout`/`setInterval` in Spielen. Antworten werden per `pointerdown` angenommen.
3. **Daten nur über das Repository.** Zugriff auf IndexedDB ausschließlich über `repo` aus `src/data/repo.ts`; niemand sonst importiert Dexie oder `db.ts`. Spiele speichern nicht selbst – der Host tut es. Schemaänderungen nur als neue `version(n+1)` (Regeln in `db.ts` und D4). Rohdaten (`trials`) werden nie verändert oder gelöscht; Kennzahlen werden daraus berechnet.
4. **Neue Spiele nur per Vorlage.** `/neues-spiel <id>` bzw. `docs/ADDING_A_GAME.md`. Jedes Spiel erfüllt `GameDefinition`, hat Logik als reine Funktionen mit Tests, ein interaktives Tutorial und einen E2E-Lauf.
5. **Exakte Arithmetik.** Rechenaufgaben und Antwortprüfung nur mit `src/core/fraction.ts` (bigint-Brüche). Gleitkomma höchstens für die Anzeige.
6. **Zufall wird injiziert.** Logik bekommt `rng: Rng` als Parameter; Tests nutzen `seededRng`.
7. **Neue Abhängigkeiten nur mit Begründung.** Vor `npm install <paket>`: Eintrag in `docs/DECISIONS.md` (Entscheidung, Grund, verworfene Alternative). Bereits in PLAN.md vorgesehen und damit erlaubt: `vite-plugin-pwa`, Lighthouse CI, axe-core.
8. **App-Texte versprechen nur Belegtes** und decken sich mit `docs/GAMES.md`. Sprache der App und der Doku: Deutsch; Bezeichner im Code: Englisch.
9. **Bestehende Entscheidungen** in `docs/DECISIONS.md` nur nach Rückfrage beim Nutzer ändern.

### Svelte-5-Hinweise

- Runes-Modus überall. Reaktiver Zustand außerhalb von Komponenten braucht die Endung `.svelte.ts`.
- Prop `state` beim Destrukturieren umbenennen (`let { state: initial } = $props()`).
- Wird ein Reiz per Zustandsänderung gezeigt, danach `flushSync()` aufrufen, damit das DOM im selben Frame steht.

### Definition of Done

Ein Schritt ist fertig, wenn:

- `npm test`, `npm run build` und `npm run e2e` grün sind,
- neue Logik Tests hat (Aufgaben-Korrektheit unabhängig vom Generator geprüft),
- die Oberfläche im iPhone-Viewport hell und dunkel angesehen wurde,
- die Regeln oben eingehalten sind,
- `docs/HANDOFF.md` den neuen Stand, den nächsten Schritt und neue Fallstricke nennt (Architekturentscheidungen zusätzlich in `docs/DECISIONS.md`),
- committet und gepusht ist.
