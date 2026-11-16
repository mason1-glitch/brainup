<script lang="ts">
  // Der Host: einziger Ablauf für jedes Spiel (D5).
  // Einstieg → (Tutorial) → Countdown → Lauf → Speichern → Ergebnis.
  import { navigate } from '../app/router.svelte';
  import { timing } from '../core/timing';
  import { repo } from '../data/repo';
  import type { ProgramRun, Session, Summary, Trial } from '../data/types';
  import { findGame } from '../games/registry';
  import type { TrialInput } from '../games/types';
  import { completeStep, nextStep, stepPath } from '../program/run';
  import Button from '../ui/Button.svelte';
  import GameFrame from '../ui/GameFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import ResultScreen from '../ui/ResultScreen.svelte';
  import Segmented from '../ui/Segmented.svelte';

  interface Props {
    id: string;
    modeId?: string | null;
    /** Gesetzt, wenn der Lauf Teil eines Tagesprogramms ist. */
    programRunId?: string | null;
  }

  let { id, modeId = null, programRunId = null }: Props = $props();

  // svelte-ignore state_referenced_locally
  const game = findGame(id);
  // svelte-ignore state_referenced_locally
  let selectedMode = $state(game?.modes.find((m) => m.id === modeId)?.id ?? game?.modes[0]?.id ?? '');
  const mode = $derived(game?.modes.find((m) => m.id === selectedMode) ?? game?.modes[0]);

  let phase = $state<'loading' | 'intro' | 'tutorial' | 'run' | 'result'>('loading');
  let tutorialDone = $state(false);
  let level = $state(1);
  let paused = $state(true);
  let progress = $state(0);
  let label = $state('');
  let summary = $state<Summary | null>(null);
  let best = $state(false);
  let runKey = $state(0);

  /** Durchlauf des Tagesprogramms, zu dem dieser Lauf gehört (D6). */
  let run = $state.raw<ProgramRun | null>(null);
  const stepNumber = $derived(run ? run.steps.findIndex((s) => s.gameId === id) + 1 : 0);

  let difficulty = $state.raw<unknown>(undefined);
  // Bewusst nicht reaktiv: gehören zu genau einem Lauf.
  let session: Session | null = null;
  let trials: Trial[] = [];

  async function load() {
    if (!game) return;
    // Bildrate einmal messen, bevor Reize gezeigt werden.
    void timing.calibrate();
    const rec = await repo.loadGameState(game.id);
    if (!rec || rec.state === null) difficulty = game.initialState();
    else if (rec.stateVersion === game.stateVersion) difficulty = rec.state;
    else difficulty = game.migrateState?.(rec.state, rec.stateVersion) ?? game.initialState();
    tutorialDone = rec?.tutorialDone ?? false;
    level = game.level(difficulty);
    if (programRunId) run = (await repo.getProgramRun(programRunId)) ?? null;
    phase = 'intro';
  }
  void load();

  async function start() {
    if (!game || !mode) return;
    session = await repo.startSession(game.id, mode.id, programRunId);
    trials = [];
    progress = 0;
    label = '';
    paused = true;
    runKey++;
    phase = 'run';
  }

  function onTrial(input: TrialInput) {
    if (!game || !session) return;
    const trial: Trial = { ...input, sessionId: session.id, gameId: game.id };
    trials.push(trial);
    void repo.addTrial(trial);
  }

  async function onFinish(next: unknown) {
    if (!game || !session || !mode) return;
    // Ein Lauf ohne einen einzigen Durchgang (z. B. Fehlertraining, wenn nichts fällig ist) ist kein Ergebnis.
    if (trials.length === 0) return abort();
    difficulty = next;
    level = game.level(next);
    const result = game.summarize(trials, next);
    const earlier = (await repo.sessionsOfGame(game.id, 500)).filter((s) => s.mode === mode.id && s.summary);
    best = earlier.length > 0 && earlier.every((s) => s.summary!.score < result.score);
    await repo.saveGameState(game.id, game.stateVersion, next);
    await repo.finishSession(session.id, result, true);
    if (run) {
      // Schritt des Tagesprogramms abhaken; nach dem letzten ist der Durchlauf beendet.
      run = completeStep(run, game.id, session.id, Date.now());
      await repo.putProgramRun(run);
    }
    summary = result;
    phase = 'result';
  }

  async function abort() {
    // Rohdaten bleiben erhalten; der Schwierigkeitszustand ändert sich nur bei beendeten Läufen.
    if (session) await repo.finishSession(session.id, null, false);
    phase = 'intro';
  }

  async function tutorialFinished() {
    if (!game) return;
    const first = !tutorialDone;
    tutorialDone = true;
    await repo.markTutorialDone(game.id);
    if (first) await start();
    else phase = 'intro';
  }

  const leave = () => navigate(run ? '/' : '/spiele');

  /** Nach dem Ergebnis: im Tagesprogramm zum nächsten offenen Schritt, sonst zurück. */
  function onward() {
    const next = run ? nextStep(run) : null;
    if (run && next !== null) navigate(stepPath(run, next));
    else leave();
  }
</script>

{#if !game || !mode}
  <div class="screen">
    <p class="muted">Dieses Spiel gibt es nicht.</p>
    <Button variant="secondary" onclick={leave}>Zurück</Button>
  </div>
{:else if phase === 'intro'}
  <div class="screen">
    <button type="button" class="icon-btn" aria-label="Zurück" onclick={leave}><Icon name="back" /></button>
    <div class="intro">
      {#if run && stepNumber > 0}<p class="label">Tagesprogramm · Schritt {stepNumber} von {run.steps.length}</p>{/if}
      <p class="label">Level {level}</p>
      <h1>{game.title}</h1>
      <p class="muted">{game.description}</p>
    </div>
    <div class="actions">
      {#if game.modes.length > 1}
        <Segmented label="Modus" bind:value={selectedMode} options={game.modes} />
      {/if}
      {#if tutorialDone}
        <Button size="lg" block onclick={start}>Start</Button>
        <Button variant="ghost" block onclick={() => (phase = 'tutorial')}>Anleitung</Button>
      {:else}
        <Button size="lg" block onclick={() => (phase = 'tutorial')}>Kurz üben</Button>
      {/if}
    </div>
  </div>
{:else if phase === 'tutorial'}
  <div class="screen tutorial">
    <button type="button" class="icon-btn" aria-label="Anleitung schließen" onclick={() => (phase = 'intro')}>
      <Icon name="close" />
    </button>
    <div class="tutorial-body"><game.Tutorial onDone={tutorialFinished} /></div>
  </div>
{:else if phase === 'run'}
  {#key runKey}
    <GameFrame title={game.title} {progress} {label} bind:paused onAbort={abort}>
      <game.Run
        state={difficulty}
        {mode}
        {paused}
        {onTrial}
        onProgress={(f, l = '') => {
          progress = f;
          label = l;
        }}
        {onFinish}
      />
    </GameFrame>
  {/key}
{:else if phase === 'result' && summary}
  <ResultScreen
    title={game.title}
    {summary}
    {best}
    primaryLabel={run && nextStep(run) !== null ? 'Weiter' : 'Fertig'}
    onPrimary={onward}
    onAgain={run ? undefined : start}
  />
{/if}

<style>
  .screen {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    max-width: var(--content);
    margin-inline: auto;
    padding: calc(var(--safe-top) + var(--s-2)) calc(var(--safe-right) + var(--s-5))
      calc(var(--safe-bottom) + var(--s-5)) calc(var(--safe-left) + var(--s-5));
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    margin-left: calc(-1 * var(--s-3));
    border: 0;
    border-radius: var(--r-full);
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .intro {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--s-3);
  }
  .intro h1 {
    font-size: var(--text-2xl);
  }
  .actions {
    display: grid;
    gap: var(--s-2);
  }
  /* Wie der Spielrahmen genau bildschirmhoch: Tutorials passen sich ein, statt zu scrollen. */
  .tutorial {
    height: 100dvh;
  }
  .tutorial-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
