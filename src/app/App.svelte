<script lang="ts">
  import Games from '../routes/Games.svelte';
  import Play from '../routes/Play.svelte';
  import Progress from '../routes/Progress.svelte';
  import Settings from '../routes/Settings.svelte';
  import Today from '../routes/Today.svelte';
  import Styleguide from '../routes/dev/Styleguide.svelte';
  import { route } from './router.svelte';
  import TabBar from './TabBar.svelte';
  import { loadTheme } from './theme';

  void loadTheme();

  const playId = $derived(route.path.startsWith('/spiel/') ? route.path.slice('/spiel/'.length) : null);
</script>

{#if playId}
  {#key playId}
    <Play id={playId} modeId={route.query.get('mode')} programRunId={route.query.get('run')} />
  {/key}
{:else if route.path === '/dev/styleguide'}
  <Styleguide />
{:else}
  <main>
    {#if route.path === '/spiele'}
      <Games />
    {:else if route.path === '/fortschritt'}
      <Progress />
    {:else if route.path === '/einstellungen'}
      <Settings />
    {:else}
      <Today />
    {/if}
  </main>
  <TabBar />
{/if}

<style>
  main {
    max-width: var(--content);
    margin-inline: auto;
    padding: calc(var(--safe-top) + var(--s-6)) calc(var(--safe-right) + var(--s-4))
      calc(var(--safe-bottom) + 3.5rem + var(--s-6)) calc(var(--safe-left) + var(--s-4));
  }
</style>
