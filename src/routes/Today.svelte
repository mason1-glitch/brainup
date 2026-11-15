<script lang="ts">
  // Startseite: das Tagesprogramm (D6) – planen, starten, am selben Tag fortsetzen.
  import { navigate } from '../app/router.svelte';
  import { localDay, repo } from '../data/repo';
  import type { Area, ProgramRun, ProgramStep } from '../data/types';
  import { findGame, games } from '../games/registry';
  import { DEFAULT_DAILY, planDaily, type DailyConfig } from '../program/daily';
  import { createRun, currentRun, nextStep, recentGames, stepPath } from '../program/run';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import GameRow from './GameRow.svelte';
  import Page from './Page.svelte';

  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const AREAS: Record<Area, string> = { warmup: 'Aufwärmen', training: 'Training', arithmetic: 'Kopfrechnen' };

  let loaded = $state(false);
  /** Durchlauf von heute (offen oder beendet), falls es einen gibt. */
  let run = $state.raw<ProgramRun | null>(null);
  /** Plan für einen neuen Durchlauf. */
  let plan = $state.raw<ProgramStep[]>([]);

  async function load() {
    run = currentRun(await repo.programRunsOfDay(localDay(Date.now())));
    const config = await repo.getSetting<DailyConfig>('daily', DEFAULT_DAILY);
    // Zuletzt gespielt: aus den jüngsten Sitzungen jedes Spiels.
    const latest = await Promise.all(games.map((g) => repo.sessionsOfGame(g.id, 5)));
    plan = planDaily(games, recentGames(latest.flat()), config);
    loaded = true;
  }
  void load();

  const steps = $derived(run?.steps ?? plan);
  const open = $derived(run ? nextStep(run) : null);
  // Nur nennen, was heute wirklich dran ist.
  const areas = $derived([...new Set(steps.flatMap((s) => findGame(s.gameId)?.area ?? []))].map((a) => AREAS[a]).join(', '));

  async function start() {
    const now = Date.now();
    const next = createRun(plan, crypto.randomUUID(), localDay(now), now);
    await repo.putProgramRun(next);
    navigate(stepPath(next, 0));
  }
</script>

<Page title="Heute" eyebrow={date}>
  <Card>
    <h2>Tagesprogramm</h2>
    {#if loaded}
      <p class="muted intro">
        {#if run && open === null}Für heute geschafft.{:else}{steps.length} Spiele nacheinander: {areas}.{/if}
      </p>
      <div class="rows">
        {#each steps as step, i (i)}
          {@const game = findGame(step.gameId)}
          {#if game}<GameRow {game} step={i + 1} done={step.sessionId !== null} plain />{/if}
        {/each}
      </div>
      <div class="actions">
        {#if run && open !== null}
          <Button size="lg" block onclick={() => navigate(stepPath(run!, open!))}>Fortsetzen</Button>
        {:else if run}
          <Button variant="ghost" block onclick={start}>Noch ein Durchlauf</Button>
        {:else}
          <Button size="lg" block onclick={start}>Programm starten</Button>
        {/if}
      </div>
    {/if}
  </Card>
</Page>

<style>
  .intro {
    margin-top: var(--s-1);
  }
  .rows {
    margin-top: var(--s-3);
  }
  .rows > :global(* + *) {
    border-top: 1px solid var(--line);
  }
  .actions {
    margin-top: var(--s-4);
  }
</style>
