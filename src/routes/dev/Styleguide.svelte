<script lang="ts">
  // Styleguide: zeigt alle Tokens und Basiskomponenten. Neue Basiskomponenten hier ergänzen.
  import { link } from '../../app/router.svelte';
  import { setTheme, type Theme } from '../../app/theme';
  import type { Summary } from '../../data/types';
  import Button from '../../ui/Button.svelte';
  import Card from '../../ui/Card.svelte';
  import GameFrame from '../../ui/GameFrame.svelte';
  import Icon, { type IconName } from '../../ui/Icon.svelte';
  import Numpad from '../../ui/Numpad.svelte';
  import ProgressBar from '../../ui/ProgressBar.svelte';
  import ProgressRing from '../../ui/ProgressRing.svelte';
  import ResultScreen from '../../ui/ResultScreen.svelte';
  import Segmented from '../../ui/Segmented.svelte';

  const colors = ['bg', 'surface', 'sunken', 'line', 'ink', 'ink-2', 'ink-3', 'accent', 'accent-soft', 'good', 'good-soft', 'bad', 'bad-soft'];
  const sizes = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const spaces = [1, 2, 3, 4, 5, 6, 7, 8];
  const icons: IconName[] = ['today', 'games', 'chart', 'settings', 'pause', 'play', 'close', 'back', 'chevron', 'backspace', 'check'];

  let theme = $state<Theme>('auto');
  let entry = $state('');
  let submitted = $state('');
  let progress = $state(0.4);
  let demo = $state<'none' | 'frame' | 'result'>('none');
  let paused = $state(true);
  let moved = $state(false);

  const summary: Summary = {
    score: 23,
    level: 7,
    accuracy: 0.92,
    medianRtMs: 1840,
    trials: 25,
    headline: { label: 'richtige Aufgaben in 60 s', value: '23' },
    extra: [{ label: 'Schnellste Antwort', value: '0,94 s' }],
  };
</script>

{#if demo === 'frame'}
  <GameFrame title="Beispielspiel" {progress} label="12 / 30" bind:paused onAbort={() => (demo = 'none')}>
    <div class="demo-stage">
      <p class="label">{paused ? 'angehalten' : 'läuft'}</p>
      <p class="muted">Hier liegt das Spiel. Oben links pausieren, dort auch beenden.</p>
      <Button variant="secondary" onclick={() => (progress = (progress + 0.1) % 1.1)}>Fortschritt +10 %</Button>
    </div>
  </GameFrame>
{:else if demo === 'result'}
  <ResultScreen title="Kopfrechnen · Sprint" {summary} best onPrimary={() => (demo = 'none')} onAgain={() => (demo = 'none')} />
{:else}
  <div class="guide">
    <header>
      <a class="muted" href={link('/')}>← App</a>
      <h1>Styleguide</h1>
      <p class="muted">Tokens aus <code>src/design/tokens.css</code>, Komponenten aus <code>src/ui/</code>.</p>
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
    </header>

    <section>
      <h2 class="label">Farben</h2>
      <div class="swatches">
        {#each colors as c (c)}
          <div class="swatch">
            <span style:background="var(--{c})"></span>
            <code>--{c}</code>
          </div>
        {/each}
      </div>
    </section>

    <section>
      <h2 class="label">Typografie</h2>
      <Card>
        {#each sizes as s (s)}
          <p class="type num" style:font-size="var(--text-{s})">
            {s === '3xl' || s === '2xl' ? '0123' : 'Ruhig denken 0123456789'} <code>{s}</code>
          </p>
        {/each}
        <p style:margin-top="var(--s-4)">
          Fließtext in der Systemschrift. Zahlen und Überschriften in der runden Variante – das gibt der App ihren Ton.
        </p>
        <p class="muted">Sekundärer Text für Erklärungen.</p>
        <p class="label">Label</p>
      </Card>
    </section>

    <section>
      <h2 class="label">Abstände und Radien</h2>
      <Card>
        <div class="spaces">
          {#each spaces as n (n)}
            <div><span style:width="var(--s-{n})" style:height="var(--s-{n})"></span><code>s-{n}</code></div>
          {/each}
        </div>
        <div class="radii">
          {#each ['sm', 'md', 'lg', 'full'] as r (r)}
            <div><span style:border-radius="var(--r-{r})"></span><code>r-{r}</code></div>
          {/each}
        </div>
      </Card>
    </section>

    <section>
      <h2 class="label">Bewegung</h2>
      <Card>
        <div class="motion">
          {#each ['fast', '', 'slow'] as d (d)}
            <div class="lane">
              <span class:moved style:transition-duration="var(--dur{d ? '-' + d : ''})"></span>
              <code>--dur{d ? '-' + d : ''}</code>
            </div>
          {/each}
        </div>
        <Button variant="secondary" onclick={() => (moved = !moved)}>Abspielen</Button>
      </Card>
    </section>

    <section>
      <h2 class="label">Buttons</h2>
      <Card>
        <div class="stack">
          <Button size="lg" block>Start</Button>
          <Button block>Weiter</Button>
          <Button variant="secondary" block>Zweitrangig</Button>
          <Button variant="ghost" block>Zurückhaltend</Button>
          <Button block disabled>Deaktiviert</Button>
        </div>
      </Card>
    </section>

    <section>
      <h2 class="label">Karten</h2>
      <Card>
        <h3>Karte</h3>
        <p class="muted">Fläche für zusammengehörige Inhalte.</p>
      </Card>
      <Card href={link('/dev/styleguide')}>
        <h3>Karte als Link</h3>
        <p class="muted">Gibt beim Antippen leicht nach.</p>
      </Card>
      <Card flat>
        <h3>Flache Karte</h3>
        <p class="muted">Nur eine Linie, für Nebensächliches.</p>
      </Card>
    </section>

    <section>
      <h2 class="label">Auswahl</h2>
      <Segmented label="Beispiel" value="a" options={[{ id: 'a', title: 'Sprint' }, { id: 'b', title: 'Präzision' }, { id: 'c', title: 'Fehler' }]} />
    </section>

    <section>
      <h2 class="label">Fortschritt</h2>
      <Card>
        <div class="progress">
          <ProgressRing value={progress}>
            <div>
              <p class="num ring-value">{Math.round(progress * 5)}<span class="muted"> / 5</span></p>
              <p class="label">Tage</p>
            </div>
          </ProgressRing>
          <div class="stack grow">
            <ProgressBar value={progress} />
            <Button variant="secondary" onclick={() => (progress = progress >= 1 ? 0 : Math.min(1, progress + 0.2))}>Weiter</Button>
          </div>
        </div>
      </Card>
    </section>

    <section>
      <h2 class="label">Zahlentastatur</h2>
      <p class="entry num" aria-live="polite">{entry || ' '}</p>
      <Numpad bind:value={entry} decimal fraction negative onSubmit={(v) => ((submitted = v), (entry = ''))} />
      <p class="muted center">{submitted ? `Bestätigt: ${submitted}` : 'Auch mit der Tastatur bedienbar.'}</p>
    </section>

    <section>
      <h2 class="label">Rückmeldung</h2>
      <div class="feedback">
        <span class="good"><Icon name="check" /> Richtig</span>
        <span class="bad"><Icon name="close" /> Falsch</span>
      </div>
    </section>

    <section>
      <h2 class="label">Symbole</h2>
      <Card>
        <div class="icons">
          {#each icons as i (i)}<span title={i}><Icon name={i} /></span>{/each}
        </div>
      </Card>
    </section>

    <section>
      <h2 class="label">Spielrahmen und Ergebnis</h2>
      <div class="stack">
        <Button variant="secondary" block onclick={() => ((paused = true), (demo = 'frame'))}>Spielrahmen ansehen</Button>
        <Button variant="secondary" block onclick={() => (demo = 'result')}>Ergebnisbildschirm ansehen</Button>
      </div>
    </section>
  </div>
{/if}

<style>
  .guide {
    display: grid;
    gap: var(--s-7);
    max-width: var(--content);
    margin-inline: auto;
    padding: calc(var(--safe-top) + var(--s-5)) calc(var(--safe-right) + var(--s-4))
      calc(var(--safe-bottom) + var(--s-7)) calc(var(--safe-left) + var(--s-4));
  }
  header,
  section {
    display: grid;
    gap: var(--s-3);
  }
  h1 {
    font-size: var(--text-2xl);
  }
  code {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: var(--text-xs);
    color: var(--ink-3);
  }
  .swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: var(--s-3);
  }
  .swatch {
    display: grid;
    gap: var(--s-1);
  }
  .swatch span {
    height: 3.5rem;
    border-radius: var(--r-md);
    border: 1px solid var(--line);
  }
  .type {
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
    margin-bottom: var(--s-2);
  }
  .spaces,
  .radii {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--s-4);
  }
  .radii {
    margin-top: var(--s-5);
  }
  .spaces div,
  .radii div {
    display: grid;
    gap: var(--s-1);
    justify-items: center;
  }
  .spaces span {
    background: var(--accent);
    border-radius: 2px;
  }
  .radii span {
    width: 3.5rem;
    height: 3.5rem;
    background: var(--accent-soft);
    border: 1px solid var(--accent);
  }
  .motion {
    display: grid;
    gap: var(--s-3);
    margin-bottom: var(--s-4);
  }
  .lane {
    display: grid;
    gap: var(--s-1);
  }
  .lane span {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--r-full);
    background: var(--accent);
    transition: transform var(--dur) var(--ease);
  }
  .lane span.moved {
    transform: translateX(12rem);
  }
  .stack {
    display: grid;
    gap: var(--s-2);
  }
  .grow {
    flex: 1;
    gap: var(--s-4);
  }
  .progress {
    display: flex;
    align-items: center;
    gap: var(--s-5);
  }
  .ring-value {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
  }
  .ring-value span {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }
  .entry {
    text-align: center;
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
  }
  .center {
    text-align: center;
    font-size: var(--text-sm);
  }
  .feedback {
    display: flex;
    gap: var(--s-3);
  }
  .feedback span {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-4) var(--s-2) var(--s-3);
    border-radius: var(--r-full);
    font-weight: var(--weight-bold);
  }
  .good {
    background: var(--good-soft);
    color: var(--good);
  }
  .bad {
    background: var(--bad-soft);
    color: var(--bad);
  }
  .icons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-4);
    color: var(--ink-2);
  }
  .demo-stage {
    flex: 1;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--s-4);
    padding: var(--s-5);
    text-align: center;
  }
</style>
