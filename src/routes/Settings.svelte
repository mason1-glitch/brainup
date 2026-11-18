<script lang="ts">
  // Design, Rückmeldung, Tagesprogramm, Kopfrechnen, Erinnerung und Datensicherung.
  import { backupFile, canShare, saveFile } from '../app/backupFile';
  import { HAPTICS_SETTING, loadFeedback, SOUND_SETTING } from '../app/feedbackSettings';
  import { loadMotion, setMotion } from '../app/motion';
  import { link } from '../app/router.svelte';
  import { requestPersistence, type Persistence } from '../app/storage';
  import { loadTheme, setTheme, type Theme } from '../app/theme';
  import { reminderIcs } from '../core/ics';
  import { BackupError } from '../data/backup';
  import { localDay, repo } from '../data/repo';
  import { KIND_TITLES, KINDS, type Kind } from '../games/arithmetic/generators';
  import { activeKinds, KINDS_SETTING, TRICKS_SETTING } from '../games/arithmetic/logic';
  import { DAILY_PRESETS, DEFAULT_DAILY, presetOf, type DailyConfig, type DailyPreset } from '../program/daily';
  import { DEFAULT_WEEKLY_GOAL, WEEKLY_GOAL_SETTING } from '../progress/stats';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import { configureFeedback } from '../ui/feedback';
  import Segmented from '../ui/Segmented.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Switch from '../ui/Switch.svelte';
  import TimeInput from '../ui/TimeInput.svelte';
  import WeekdayPicker from '../ui/WeekdayPicker.svelte';
  import Page from './Page.svelte';

  let theme = $state<Theme>('auto');
  void loadTheme().then((t) => (theme = t));

  let reduced = $state(false);
  void loadMotion().then((m) => (reduced = m === 'reduced'));

  let sound = $state(false);
  let haptics = $state(true);
  void loadFeedback().then((f) => {
    sound = f.sound;
    haptics = f.haptics;
  });
  function setFeedback(key: typeof SOUND_SETTING | typeof HAPTICS_SETTING, on: boolean) {
    if (key === SOUND_SETTING) sound = on;
    else haptics = on;
    configureFeedback({ sound, haptics });
    void repo.setSetting(key, on);
  }

  const PRESET_TITLES: Record<DailyPreset, string> = { short: 'Kurz', normal: 'Normal', long: 'Lang' };
  let preset = $state<DailyPreset | 'custom'>('custom');
  void repo.getSetting<DailyConfig>('daily', DEFAULT_DAILY).then((c) => (preset = presetOf(c) ?? 'custom'));
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const scope = $derived.by(() => {
    if (preset === 'custom') return '';
    const c = DAILY_PRESETS[preset];
    return `${plural(c.warmup, 'Aufwärm-Spiel', 'Aufwärm-Spiele')}, ${plural(c.training, 'Trainingsspiel', 'Trainingsspiele')}, ${plural(c.arithmetic, 'Runde Kopfrechnen', 'Runden Kopfrechnen')}`;
  });
  function setPreset(id: DailyPreset) {
    // Gespeichert wird eine Kopie – die Voreinstellung selbst bleibt unberührt.
    void repo.setSetting('daily', { ...DAILY_PRESETS[id] });
  }

  let weeklyGoal = $state(DEFAULT_WEEKLY_GOAL);
  void repo.getSetting(WEEKLY_GOAL_SETTING, DEFAULT_WEEKLY_GOAL).then((g) => (weeklyGoal = g));

  const pad = (n: number) => String(n).padStart(2, '0');
  let time = $state('18:00');
  let weekdays = $state<number[]>([0, 1, 2, 3, 4, 5, 6]);
  // Je Installation fest: Eine neue Datei ersetzt im Kalender den alten Termin.
  let uid = $state(`${crypto.randomUUID()}@brainup`);
  interface StoredReminder {
    hour: number;
    minute: number;
    weekdays: number[];
    uid: string;
  }
  void repo.getSetting<StoredReminder | null>('reminder', null).then((r) => {
    if (!r) return;
    time = `${pad(r.hour)}:${pad(r.minute)}`;
    weekdays = [...r.weekdays];
    uid = r.uid;
  });

  function reminder(): StoredReminder {
    const [hour, minute] = time.split(':').map(Number);
    return { hour: hour!, minute: minute!, weekdays: [...weekdays], uid };
  }
  function saveReminder() {
    void repo.setSetting('reminder', reminder());
  }

  /** Muss ohne Warten aus dem Tipp heraus an `saveFile` gehen (Teilen-Menü, siehe dort). */
  function createCalendarFile() {
    const stored = reminder();
    void repo.setSetting('reminder', stored);
    const text = reminderIcs(stored, localDay(Date.now()), stored.uid, Date.now(), 'https://mason1-glitch.github.io/brainup/');
    void saveFile(new File([text], 'brainup-erinnerung.ics', { type: 'text/calendar' }));
  }

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

  let tricks = $state(true);
  void repo.getSetting(TRICKS_SETTING, true).then((on) => (tricks = on));

  function toggleKind(kind: Kind, on: boolean) {
    // Gespeichert wird die einfache Liste – der reaktive Zustand selbst lässt sich nicht in die Datenbank legen.
    const next = KINDS.filter((k) => (k === kind ? on : kinds.includes(k)));
    kinds = next;
    void repo.setSetting(KINDS_SETTING, next);
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
    <div class="list">
      <Switch label="Bewegung reduzieren" bind:checked={reduced} onChange={(on) => setMotion(on ? 'reduced' : 'auto')} />
    </div>
  </Card>
  <Card>
    <h2>Rückmeldung</h2>
    <div class="list">
      <Switch label="Ton" checked={sound} onChange={(on) => setFeedback(SOUND_SETTING, on)} />
      <Switch label="Vibration" checked={haptics} onChange={(on) => setFeedback(HAPTICS_SETTING, on)} />
    </div>
    <p class="muted note">Vibration gibt es nicht auf jedem Gerät – der Browser des iPhones unterstützt sie nicht. Töne folgen dem Stummschalter.</p>
  </Card>
  <Card>
    <h2>Tagesprogramm</h2>
    <div class="control">
      <Segmented
        label="Umfang"
        bind:value={preset}
        onChange={(id) => id !== 'custom' && setPreset(id)}
        options={(Object.keys(DAILY_PRESETS) as DailyPreset[]).map((id) => ({ id, title: PRESET_TITLES[id] }))}
      />
    </div>
    <p class="muted note">{scope}</p>
    <div class="list">
      <Stepper
        label="Wochenziel (Tage)"
        bind:value={weeklyGoal}
        min={1}
        max={7}
        onChange={(g) => repo.setSetting(WEEKLY_GOAL_SETTING, g)}
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
    <p class="muted note">Nach einem Fehler zeigt die App einen Rechenweg für genau diese Aufgabe – in der Präzision und im Fehlertraining, nicht im Sprint.</p>
    <Switch label="Rechentrick nach Fehlern" bind:checked={tricks} onChange={(on) => repo.setSetting(TRICKS_SETTING, on)} />
  </Card>
  <Card>
    <h2>Erinnerung</h2>
    <div class="list">
      <TimeInput label="Uhrzeit" bind:value={time} onChange={saveReminder} />
    </div>
    <div class="control">
      <WeekdayPicker label="Wochentage" bind:value={weekdays} onChange={saveReminder} />
    </div>
    <div class="actions">
      <Button variant="secondary" block disabled={weekdays.length === 0} onclick={createCalendarFile}>Kalenderdatei erstellen</Button>
    </div>
    <p class="muted note">Die Datei legt in deinem Kalender einen wiederkehrenden Termin mit Hinweis an. Ändern oder löschen kannst du ihn dort.</p>
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
  <a class="muted" href={link('/dev/timing')}>Timing-Messung</a>
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
