<script lang="ts">
  // Design und Datensicherung; Ton, Haptik, Bewegung, Sitzungslänge folgen in Phase 4.
  import { backupFile, canShare, saveFile } from '../app/backupFile';
  import { link } from '../app/router.svelte';
  import { requestPersistence, type Persistence } from '../app/storage';
  import { loadTheme, setTheme, type Theme } from '../app/theme';
  import { BackupError } from '../data/backup';
  import { repo } from '../data/repo';
  import { KIND_TITLES, KINDS, type Kind } from '../games/arithmetic/generators';
  import { activeKinds, KINDS_SETTING } from '../games/arithmetic/logic';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Switch from '../ui/Switch.svelte';
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

  /** Rechenarten, die Sprint und Präzision mischen. */
  let kinds = $state<Kind[]>([...KINDS]);
  void repo.getSetting<unknown>(KINDS_SETTING, null).then((stored) => (kinds = activeKinds(stored)));

  function toggleKind(kind: Kind, on: boolean) {
    kinds = KINDS.filter((k) => (k === kind ? on : kinds.includes(k)));
    void repo.setSetting(KINDS_SETTING, kinds);
  }

  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const counts = (sessions: number, trials: number) =>
    `${count(sessions, 'Sitzung', 'Sitzungen')}, ${count(trials, 'Durchgang', 'Durchgänge')}`;

  /** Fertige Sicherung – erst erstellen, dann mit einem eigenen Tipp sichern (siehe `saveFile`). */
  let file = $state.raw<File | null>(null);
  let message = $state('');
  let picker: HTMLInputElement;

  async function prepare() {
    const backup = await repo.exportAll();
    file = backupFile(backup);
    message = `Sicherung bereit: ${counts(backup.tables.sessions.length, backup.tables.trials.length)}.`;
  }

  async function restore() {
    const picked = picker.files?.[0];
    picker.value = '';
    if (!picked) return;
    file = null;
    try {
      const report = await repo.importAll(JSON.parse(await picked.text()));
      message = `Eingelesen. Neu dazugekommen: ${counts(report.sessions, report.trials)}.`;
    } catch (error) {
      message = error instanceof BackupError ? error.message : 'Die Datei ist keine BrainUp-Sicherung.';
    }
  }
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
    <h2>Kopfrechnen</h2>
    <p class="muted note">Diese Rechenarten kommen im Sprint und in der Präzision vor. Das Fehlertraining bringt alle fälligen Aufgaben.</p>
    <div class="list">
      {#each KINDS as kind (kind)}
        <!-- Die letzte eingeschaltete bleibt an: Ohne Rechenart gäbe es keine Aufgaben. -->
        <Switch
          label={KIND_TITLES[kind]}
          checked={kinds.includes(kind)}
          disabled={kinds.length === 1 && kinds[0] === kind}
          onChange={(on) => toggleKind(kind, on)}
        />
      {/each}
    </div>
  </Card>
  <Card>
    <h2>Daten</h2>
    <p class="muted note">Alle Daten liegen nur auf diesem Gerät.</p>
    {#if persistence}
      <p class="note" data-testid="persistence" data-persistence={persistence}>{PERSISTENCE[persistence]}</p>
    {/if}
    <div class="actions">
      {#if file}
        <Button block onclick={() => saveFile(file!)}>Datei speichern</Button>
      {:else}
        <Button variant="secondary" block onclick={prepare}>Sicherung erstellen</Button>
      {/if}
      <Button variant="secondary" block onclick={() => picker.click()}>Sicherung einlesen</Button>
      <input bind:this={picker} type="file" accept="application/json,.json" hidden onchange={restore} data-testid="backup-file" />
    </div>
    <p class="note" role="status" data-testid="backup-message">{message}</p>
    {#if file && canShare(file)}
      <p class="muted note">Im Teilen-Menü „In Dateien sichern“ wählen.</p>
    {/if}
    <p class="muted note">Einlesen fügt hinzu und löscht nichts. Bei Spielständen gilt der neuere Stand.</p>
  </Card>
  {#if import.meta.env.DEV}
    <a class="muted" href={link('/dev/styleguide')}>Styleguide</a>
  {/if}
</Page>

<style>
  .control {
    margin-top: var(--s-4);
  }
  .list {
    margin-top: var(--s-3);
  }
  .list > :global(* + *) {
    border-top: 1px solid var(--line);
  }
  .actions {
    display: grid;
    gap: var(--s-3);
    margin-top: var(--s-4);
  }
  .note:empty {
    display: none;
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
