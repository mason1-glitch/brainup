<script lang="ts">
  // Design und Datensicherung; Ton, Haptik, Bewegung, Sitzungslänge folgen in Phase 4.
  import { link } from '../app/router.svelte';
  import { requestPersistence, type Persistence } from '../app/storage';
  import { loadTheme, setTheme, type Theme } from '../app/theme';
  import Card from '../ui/Card.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Page from './Page.svelte';

  let theme = $state<Theme>('auto');
  void loadTheme().then((t) => (theme = t));

  const PERSISTENCE: Record<Persistence, string> = {
    granted: 'Geschützt: Der Browser hat zugesagt, die Daten nicht von sich aus zu löschen.',
    denied: 'Nicht geschützt: Der Browser darf die Daten löschen, wenn der Speicher knapp wird.',
    unsupported: 'Dieser Browser sagt nicht zu, die Daten zu behalten.',
  };
  let persistence = $state<Persistence | null>(null);
  void requestPersistence().then((p) => (persistence = p));
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
  <Card>
    <h2>Daten</h2>
    <p class="muted note">Alle Daten liegen nur auf diesem Gerät.</p>
    {#if persistence}
      <p class="note" data-testid="persistence" data-persistence={persistence}>{PERSISTENCE[persistence]}</p>
    {/if}
  </Card>
  {#if import.meta.env.DEV}
    <a class="muted" href={link('/dev/styleguide')}>Styleguide</a>
  {/if}
</Page>

<style>
  .control {
    margin-top: var(--s-4);
  }
  .note {
    margin-top: var(--s-2);
    font-size: var(--text-sm);
  }
  a {
    font-size: var(--text-sm);
    text-decoration: underline;
    padding: var(--s-3) var(--s-2);
  }
</style>
