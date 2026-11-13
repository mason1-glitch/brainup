# Ein neues Spiel hinzufügen

Jedes Spiel folgt demselben Muster wie die Referenzspiele. Vorbilder:

- `src/games/rotation/` – Reiz bleibt bis zur Antwort stehen, gemessen wird die Reaktionszeit.
- `src/games/ufov/` – Reiz wird für eine exakte Dauer gezeigt (frame-genau), dann maskiert.
- `src/games/arithmetic/` – Zeitbudget statt fester Durchgangszahl, Zahlentastatur, Untertypen (`kind`).

Der Projektbefehl `/neues-spiel <id>` führt durch genau diese Schritte.

## Was der Rahmen schon erledigt

Der Host `src/routes/Play.svelte` übernimmt für jedes registrierte Spiel: Einstiegsseite mit Beschreibung und Level, Tutorial beim ersten Mal, Countdown, Pause (auch beim App-Wechsel) und Abbruch, Speichern jedes Durchgangs, der Sitzung und des Schwierigkeitszustands, Bestwert-Erkennung, Ergebnisbildschirm. Ein Spiel speichert **nichts** selbst und baut **keinen** eigenen Rahmen.

## Dateien

```
src/games/<id>/
  logic.ts        reine Logik: Aufgaben erzeugen, prüfen, Schwierigkeit, Wertung
  logic.test.ts   Tests dazu
  Run.svelte      ein Lauf (dünn: ruft logic.ts und die Timing-Engine)
  Tutorial.svelte interaktives Tutorial, ≈ 30 s
  index.ts        GameDefinition
e2e/<id>.spec.ts  Bot spielt Tutorial und einen ganzen Lauf im iPhone-Viewport
```

Braucht ein Durchgang mehr als ein paar Zeilen Markup, kommt er in eine eigene Komponente (`Board.svelte` bzw. `Round.svelte`), die Lauf **und** Tutorial verwenden.

## Schritte

### 1. Beschreibung festlegen

Eintrag in `docs/GAMES.md` (Spiel · Bereich · was es fordert · Quelle · App-Text). Der App-Text verspricht nur, was belegt ist. `title`, `tagline` und `description` in `index.ts` kommen von dort.

### 2. Schwierigkeit entwerfen

Eine Zahl, die der Staircase regelt, und eine Funktion, die daraus die Aufgabenparameter macht:

- Level (`scale: 'add'`, `harder: 'up'`) → Tabelle oder Formel wie `paramsFor(level)` in `rotation/logic.ts`, oder
- Darbietungszeit in ms (`scale: 'mul'`, `harder: 'down'`) wie in `ufov/logic.ts`.

`down: 3` (≈ 79 % Trefferquote) ist der Standard; `down: 2` nur, wenn je Sitzung wenige Durchgänge anfallen. Level 1 muss jeder auf Anhieb schaffen.

### 3. `logic.ts` – erst die Tests

Rein und ohne DOM. Zufall kommt als Parameter `rng: Rng` herein (in Tests `seededRng(n)`), nie über `Math.random` in der Logik.

```ts
import type { Rng } from '../../core/rng';
import { initStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

export const STAIRCASE: StaircaseConfig = { start: 1, min: 1, max: 12, down: 3, steps: [2, 1], scale: 'add', harder: 'up' };

export interface MyState { stair: StaircaseState }            // JSON-serialisierbar, kein bigint, keine Klassen
export const initialState = (): MyState => ({ stair: initStaircase(STAIRCASE) });
export const levelOf = (s: MyState): number => Math.round(s.stair.value);

export interface MyTrial { level: number; /* alles, um die Aufgabe zu rekonstruieren */ correct: number }
export function makeTrial(rng: Rng, level: number): MyTrial { /* … */ }
export function isCorrect(trial: MyTrial, response: number): boolean { return response === trial.correct; }

export function summarize(trials: Trial[], state: MyState): Summary {
  const score = trials.filter((t) => t.correct).reduce((s, t) => s + 10 * t.difficulty, 0);
  return { ...baseMetrics(trials), score, level: levelOf(state), headline: { label: 'Punkte', value: String(score) }, extra: [] };
}
```

Tests (`logic.test.ts`) decken mindestens ab:

- **Korrektheit der Aufgaben** über viele Seeds (≥ 500): Die als richtig markierte Antwort ist wirklich richtig, möglichst **unabhängig nachgeprüft** (anderer Rechenweg als im Generator). Falsche Antworten sind wirklich falsch.
- **Schwierigkeit:** Parameter wachsen mit dem Level; Grenzen (Level 1, Maximum) halten.
- **Verteilung:** richtige Antwort liegt nicht bevorzugt an einer Stelle.
- **Wertung:** `summarize` an einem kleinen Beispiel.

### 4. `Run.svelte`

Vertrag (`RunProps` in `src/games/types.ts`):

- Startet erst, wenn `paused` false ist (der Rahmen zeigt vorher den Countdown).
- Wird `paused` true: alle Timing-Handles abbrechen, laufenden Durchgang **verwerfen**; danach einen neuen stellen.
- Jeden Durchgang sofort mit `onTrial` melden: `task` (JSON, rekonstruierbar), `response`, `rtMs`, `correct`, `difficulty` (der Staircase-Wert), `ts` (Epoch-ms beim Reizbeginn), `kind` (Untertyp oder `''`).
- Fortschritt mit `onProgress(anteil, text)`, Ende mit `onFinish(neuerZustand)`.

Gerüst (vollständig in `rotation/Run.svelte`):

```svelte
<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing } from '../../core/timing';
  import type { RunProps } from '../types';
  import { isCorrect, levelOf, makeTrial, STAIRCASE, type MyState, type MyTrial } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<MyState> = $props();
  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 20;
  // svelte-ignore state_referenced_locally
  let stair = initial.stair;
  let done = 0;
  let trial = $state.raw<MyTrial | null>(null);
  let visible = $state(false);
  let onset: number | null = null;
  let startedAt = 0;
  let pending: { cancel: () => void } | null = null;

  function next() {
    if (done >= total) return onFinish({ stair });
    trial = makeTrial(Math.random, levelOf({ stair }));
    visible = false;
    onset = null;
    const h = timing.onset(() => { visible = true; flushSync(); });   // Reizbeginn im Frame
    pending = h;
    void h.done.then((t) => { onset = t; startedAt = Date.now(); });
  }

  function answer(response: number, event: { timeStamp: number }) {
    if (!trial || onset === null || paused) return;
    const correct = isCorrect(trial, response);
    onTrial({ kind: '', ts: startedAt, task: trial, response, rtMs: timing.rt(event, onset), correct, difficulty: trial.level });
    stair = updateStaircase(STAIRCASE, stair, correct);
    done++;
    onProgress(done / total, `${done} / ${total}`);
    const h = timing.wait(correct ? 400 : 1200);                        // Rückmeldung stehen lassen
    pending = h;
    void h.done.then(next);
  }

  $effect(() => {
    if (paused) { pending?.cancel(); untrack(() => { trial = null; onset = null; }); }
    else untrack(next);
    return () => pending?.cancel();
  });
</script>
```

Wichtig:

- Den Prop `state` beim Destrukturieren umbenennen (`state: initial`) – eine Variable namens `state` kollidiert mit der Rune `$state`.
- Antworten über `onpointerdown` annehmen (nicht `onclick`) und das Ereignis an `timing.rt` geben.
- Zeitlich begrenzte Reize: `timing.present(ms, show, hide)` mit `timing.quantize` für die Dauer (siehe `ufov/Round.svelte`). `show`/`hide` setzen Zustand und rufen `flushSync()`.
- Kein `setTimeout`/`setInterval` für Reize, Masken oder Wartezeiten – immer `timing.present`, `timing.onset`, `timing.wait` (abbrechbar, frame-genau).
- Die richtige Antwort bekommt `data-correct={e2e ? … : undefined}` (`import { e2e } from '../e2e'`), damit der Playwright-Bot spielen kann.
- Aussehen nur mit Tokens (`var(--…)`) und Komponenten aus `src/ui/`. Rückmeldung: `--good`/`--bad` mit den `-soft`-Flächen.

### 5. `Tutorial.svelte`

Kein Textblock, sondern 2–3 kurze Schritte zum Mitmachen, zusammen ≈ 30 s: ein Satz Erklärung, dann sofort tun. Jeder Schritt wird wiederholt, bis er richtig ist; am Ende `onDone()`. Dieselbe Durchgangs-Komponente wie im Lauf verwenden, nur langsamer und leichter. Das Tutorial meldet keine Durchgänge.

### 6. `index.ts` und Registrierung

```ts
import { defineGame } from '../types';
import { initialState, levelOf, summarize, type MyState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const myGame = defineGame<MyState>({
  id: 'my-game',                 // auch Ordnername und Route #/spiel/my-game; nie mehr ändern (steht in den Daten)
  area: 'warmup',                // 'training' | 'arithmetic' | 'warmup'
  title: '…', tagline: '…', description: '…',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 20 } }],   // oder { seconds: 60 }
  stateVersion: 1,               // erhöhen, wenn sich MyState ändert; dann migrateState ergänzen
  initialState, level: levelOf, Tutorial, Run, summarize,
});
```

Dann in `src/games/registry.ts` in die Liste `games` aufnehmen. Mehr ist nicht nötig – Spieleliste, Tagesprogramm und Host finden das Spiel von dort.

### 7. E2E

`e2e/<id>.spec.ts` nach dem Muster von `e2e/rotation.spec.ts`: `openGame(page, id)`, Tutorial (einmal absichtlich falsch), kompletter Lauf über `data-correct` mit einigen absichtlichen Fehlern, Ergebnisbildschirm (`getByTestId('result-headline')`). Bei zeitkritischen Reizen zusätzlich Soll/Ist aus den gespeicherten Durchgängen prüfen (siehe `e2e/ufov.spec.ts`).

### 8. Spieldesign-Durchsicht

Einmal selbst im iPhone-Viewport spielen (`npm run dev`) und ehrlich beantworten: Fühlt es sich nach Spiel an oder nach Test? Ist nach 5 Sekunden klar, was zu tun ist? Ist Level 1 zu schwer, ein Fehler zu teuer, die Rückmeldung zu langsam? Den schwächsten Punkt verbessern.

## Checkliste (Definition of Done)

- [ ] `npm test`, `npm run build`, `npm run e2e` grün
- [ ] Logik-Tests prüfen die Korrektheit der Aufgaben unabhängig vom Generator
- [ ] Tutorial interaktiv, ≈ 30 s, wiederholt bei Fehlern
- [ ] Schwierigkeit adaptiv über den Staircase; Zustand JSON-serialisierbar
- [ ] Pause verwirft den Durchgang; keine Timer außerhalb der Timing-Engine
- [ ] Nur Tokens und Basiskomponenten; Touchflächen ≥ `var(--tap)`; hell und dunkel angesehen
- [ ] Kein Datenzugriff außer über `repo`; keine neue Abhängigkeit ohne Eintrag in `docs/DECISIONS.md`
- [ ] App-Texte decken sich mit `docs/GAMES.md`
- [ ] `docs/HANDOFF.md` aktualisiert, committet und gepusht
