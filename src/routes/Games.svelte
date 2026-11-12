<script lang="ts">
  import type { Area } from '../data/types';
  import { games } from '../games/registry';
  import Card from '../ui/Card.svelte';
  import GameRow from './GameRow.svelte';
  import Page from './Page.svelte';

  const areas: { id: Area; title: string }[] = [
    { id: 'training', title: 'Training' },
    { id: 'arithmetic', title: 'Kopfrechnen' },
    { id: 'warmup', title: 'Aufwärmen & Fokus' },
  ];
</script>

<Page title="Spiele">
  {#each areas as area (area.id)}
    {@const list = games.filter((g) => g.area === area.id)}
    {#if list.length}
      <section>
        <h2 class="label">{area.title}</h2>
        <Card>
          <div class="rows">
            {#each list as game (game.id)}
              <GameRow {game} />
            {/each}
          </div>
        </Card>
      </section>
    {/if}
  {/each}
  {#if games.length === 0}<p class="muted">Noch keine Spiele vorhanden.</p>{/if}
</Page>

<style>
  section {
    display: grid;
    gap: var(--s-2);
  }
  h2 {
    padding-left: var(--s-2);
    font-family: var(--font);
  }
  .rows {
    margin-block: calc(-1 * var(--s-3));
  }
  .rows > :global(* + *) {
    border-top: 1px solid var(--line);
  }
</style>
