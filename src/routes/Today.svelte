<script lang="ts">
  // Startseite. Das Tagesprogramm ist bisher nur geplant (planDaily); das Durchspielen
  // am Stück mit ProgramRun folgt (siehe docs/HANDOFF.md).
  import { findGame, games } from '../games/registry';
  import { planDaily } from '../program/daily';
  import Card from '../ui/Card.svelte';
  import GameRow from './GameRow.svelte';
  import Page from './Page.svelte';

  const date = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const plan = planDaily(games, []).flatMap((step) => findGame(step.gameId) ?? []);
</script>

<Page title="Heute" eyebrow={date}>
  <Card>
    <h2>Tagesprogramm</h2>
    {#if plan.length}
      <p class="muted intro">Aufwärmen, Training, Kopfrechnen – etwa 10 bis 15 Minuten.</p>
      <div class="rows">
        {#each plan as game, i (game.id)}
          <GameRow {game} step={i + 1} />
        {/each}
      </div>
    {:else}
      <p class="muted intro">Noch keine Spiele vorhanden.</p>
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
</style>
