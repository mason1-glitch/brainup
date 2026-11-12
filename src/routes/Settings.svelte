<script lang="ts">
  // Bisher nur das Design; Ton, Haptik, Bewegung, Sitzungslänge, Export folgen in Phase 4.
  import { link } from '../app/router.svelte';
  import { loadTheme, setTheme, type Theme } from '../app/theme';
  import Card from '../ui/Card.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Page from './Page.svelte';

  let theme = $state<Theme>('auto');
  void loadTheme().then((t) => (theme = t));
</script>

<Page title="Einstellungen">
  <Card>
    <h2>Design</h2>
    <div class="control">
      <Segmented
        label="Design"
        bind:value={theme}
        onChange={setTheme}
        options={[
          { id: 'auto', title: 'Automatisch' },
          { id: 'light', title: 'Hell' },
          { id: 'dark', title: 'Dunkel' },
        ]}
      />
    </div>
  </Card>
  {#if import.meta.env.DEV}
    <a class="muted" href={link('/dev/styleguide')}>Styleguide</a>
  {/if}
</Page>

<style>
  .control {
    margin-top: var(--s-4);
  }
  a {
    font-size: var(--text-sm);
    text-decoration: underline;
    padding: var(--s-3) var(--s-2);
  }
</style>
