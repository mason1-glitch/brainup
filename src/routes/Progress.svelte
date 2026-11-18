<script lang="ts">
  // Fortschritt: Wochenziel statt Tages-Serie, Kalender, Verlauf und Bestwerte je Spiel, Rechenarten.
  import { localDay, repo } from '../data/repo';
  import type { Session, Trial } from '../data/types';
  import { KIND_TITLES, KINDS, type Kind } from '../games/arithmetic/generators';
  import { games } from '../games/registry';
  import {
    activeDays,
    addDays,
    addMonths,
    bests,
    DEFAULT_WEEKLY_GOAL,
    history,
    kindStats,
    monthGrid,
    mondayOf,
    smooth,
    WEEKLY_GOAL_SETTING,
    weekStatus,
    type HistoryPoint,
    type KindStats,
    type WeekStatus,
  } from '../progress/stats';
  import Card from '../ui/Card.svelte';
  import Icon from '../ui/Icon.svelte';
  import ProgressRing from '../ui/ProgressRing.svelte';
  import Sparkline from '../ui/Sparkline.svelte';
  import Page from './Page.svelte';

  const DAY_MS = 86_400_000;
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
  const decimal = (n: number, digits: number) => n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const number = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  const percent = (n: number) => `${Math.round(n * 100)} %`;
  const seconds = (ms: number | null) => (ms === null ? '–' : `${decimal(ms / 1000, 2)} s`);
  const shortDate = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;

  const today = localDay(Date.now());
  const currentMonth = today.slice(0, 7);

  interface GameCard {
    id: string;
    title: string;
    level: number;
    trend: number[];
    latest: HistoryPoint;
    bests: { mode: string; title: string; score: number; day: string }[];
  }

  let loaded = $state(false);
  let week = $state.raw<WeekStatus | null>(null);
  let cards = $state.raw<GameCard[]>([]);
  let unplayed = $state.raw<string[]>([]);
  let kinds = $state.raw<KindStats[]>([]);

  async function load() {
    const goal = await repo.getSetting<number>(WEEKLY_GOAL_SETTING, DEFAULT_WEEKLY_GOAL);
    const monday = mondayOf(today);
    week = weekStatus(activeDays(await repo.sessionsBetweenDays(monday, addDays(monday, 6))), today, goal);

    const found: GameCard[] = [];
    const missing: string[] = [];
    for (const game of games) {
      const sessions: Session[] = await repo.sessionsOfGame(game.id, 60);
      const points = history(sessions);
      const latest = points[points.length - 1];
      if (!latest) {
        missing.push(game.title);
        continue;
      }
      found.push({
        id: game.id,
        title: game.title,
        level: latest.level,
        trend: smooth(points.map((p) => p.level)).slice(-30),
        latest,
        bests: [...bests(sessions)].map(([mode, best]) => ({
          mode,
          title: game.modes.find((m) => m.id === mode)?.title ?? mode,
          ...best,
        })),
      });
    }
    cards = found;
    unplayed = missing;

    const trials: Trial[] = await repo.trialsOfGame('arithmetic', Date.now() - 30 * DAY_MS);
    const stats = kindStats(trials);
    kinds = KINDS.flatMap((kind: Kind) => stats.find((s) => s.kind === kind) ?? []);
    loaded = true;
  }
  void load();

  // ----- Kalender -----
  let month = $state(currentMonth);
  let monthDays = $state.raw<ReadonlySet<string>>(new Set());
  let request = 0;

  $effect(() => {
    const shown = month;
    const mine = ++request;
    const last = addDays(`${addMonths(shown, 1)}-01`, -1);
    void repo.sessionsBetweenDays(`${shown}-01`, last).then((sessions) => {
      if (mine === request) monthDays = new Set(activeDays(sessions).keys());
    });
  });

  const grid = $derived(monthGrid(month));
  const title = $derived(monthName.format(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)));
</script>

<Page title="Fortschritt">
  <Card>
    <h2>Diese Woche</h2>
    {#if week}
      <div class="week">
        <ProgressRing value={week.goal > 0 ? week.done / week.goal : 0} label="Wochenziel">
          <div>
            <p class="num ring-value" data-testid="week-count">{week.done} von {week.goal}</p>
            <p class="label">Tagen</p>
          </div>
        </ProgressRing>
        <p class="muted goal">
          {#if week.reached}Wochenziel erreicht.{:else}Ziel: an {week.goal} Tagen der Woche trainieren.{/if}
        </p>
      </div>
      <ul class="dots">
        {#each week.days as d, i (d.day)}
          <li class:future={d.future}>
            <span class="dot" class:today={d.day === today} data-active={d.active}></span>
            <span class="label">{WEEKDAYS[i]}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <Card>
    <div class="cal-head">
      <button type="button" class="nav" aria-label="Monat zurück" onclick={() => (month = addMonths(month, -1))}>
        <Icon name="back" size={20} />
      </button>
      <h2 data-testid="month-title">{title}</h2>
      <button type="button" class="nav" aria-label="Monat vor" disabled={month >= currentMonth} onclick={() => (month = addMonths(month, 1))}>
        <Icon name="chevron" size={20} />
      </button>
    </div>
    <div class="cal" role="grid" aria-label="Kalender">
      <div class="cal-row" role="row">
        {#each WEEKDAYS as w (w)}<span class="label" role="columnheader">{w}</span>{/each}
      </div>
      {#each grid as weekRow, r (r)}
        <div class="cal-row" role="row">
          {#each weekRow as day, c (c)}
            {#if day}
              <span class="day num" class:today={day === today} role="gridcell" data-day={day} data-active={monthDays.has(day)}>
                {Number(day.slice(8))}
              </span>
            {:else}
              <span role="gridcell"></span>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </Card>

  {#if loaded}
    {#if cards.length === 0}
      <p class="muted empty">Sobald du gespielt hast, siehst du hier deinen Verlauf.</p>
    {:else}
      <section class="games">
        <h2 class="label">Spiele</h2>
        {#each cards as card (card.id)}
          <Card>
            <div data-game={card.id}>
              <div class="game-head">
                <h3>{card.title}</h3>
                <p class="num level">Level {number(card.level)}</p>
              </div>
              <Sparkline values={card.trend} label="Level-Verlauf, geglättet über drei Sitzungen" />
              <p class="muted caption">Level-Verlauf, geglättet über drei Sitzungen</p>
              <dl>
                <div><dt>Trefferquote</dt><dd class="num">{percent(card.latest.accuracy)}</dd></div>
                <div><dt>Median-Zeit</dt><dd class="num">{seconds(card.latest.medianRtMs)}</dd></div>
                {#each card.bests as best (best.mode)}
                  <div data-best={best.mode}>
                    <dt>{card.bests.length > 1 ? `Bestwert ${best.title}` : 'Bestwert'}</dt>
                    <dd class="num">{number(best.score)} <span class="muted">({shortDate(best.day)})</span></dd>
                  </div>
                {/each}
              </dl>
            </div>
          </Card>
        {/each}
        {#if unplayed.length > 0}
          <p class="muted note">Noch nicht gespielt: {unplayed.join(', ')}</p>
        {/if}
      </section>

      {#if kinds.length > 0}
        <Card>
          <h2>Rechenarten</h2>
          <p class="muted note">aus den letzten 30 Tagen</p>
          <table data-testid="kinds">
            <thead>
              <tr><th scope="col">Art</th><th scope="col">Level</th><th scope="col">Treffer</th><th scope="col">Zeit</th></tr>
            </thead>
            <tbody>
              {#each kinds as k (k.kind)}
                <tr data-kind={k.kind}>
                  <th scope="row">{KIND_TITLES[k.kind as Kind]}</th>
                  <td class="num">{decimal(k.level, 1)}</td>
                  <td class="num">{percent(k.accuracy)}</td>
                  <td class="num">{seconds(k.medianRtMs)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </Card>
      {/if}
    {/if}
  {/if}
</Page>

<style>
  .week {
    display: flex;
    align-items: center;
    gap: var(--s-5);
    margin-top: var(--s-3);
  }
  .ring-value {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
  }
  .goal {
    flex: 1;
  }
  .dots {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--s-1);
    margin-top: var(--s-4);
    list-style: none;
    padding: 0;
  }
  .dots li {
    display: grid;
    justify-items: center;
    gap: var(--s-1);
  }
  .dots li.future .dot {
    opacity: 0.45;
  }
  .dot {
    box-sizing: border-box;
    width: var(--s-5);
    height: var(--s-5);
    border-radius: var(--r-full);
    background: var(--sunken);
  }
  .dot[data-active='true'] {
    background: var(--accent);
  }
  .dot.today {
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent);
  }

  .cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--s-3);
  }
  .cal-head h2 {
    text-transform: capitalize;
  }
  .nav {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border: 0;
    border-radius: var(--r-full);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .nav:disabled {
    color: var(--ink-3);
    opacity: 0.4;
    cursor: default;
  }
  .nav:not(:disabled):active {
    background: var(--sunken);
  }
  .cal {
    display: grid;
    gap: var(--s-1);
  }
  .cal-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--s-1);
    text-align: center;
  }
  .day {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: var(--r-full);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .day[data-active='true'] {
    background: var(--accent);
    color: var(--on-accent);
    font-weight: var(--weight-bold);
  }
  .day.today {
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent);
    color: var(--ink);
  }
  .day.today[data-active='true'] {
    color: var(--on-accent);
  }

  .games {
    display: grid;
    gap: var(--s-4);
  }
  .game-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--s-3);
    margin-bottom: var(--s-3);
  }
  .level {
    font-weight: var(--weight-bold);
    color: var(--accent);
  }
  .caption,
  .note {
    font-size: var(--text-xs);
  }
  dl {
    display: grid;
    margin: var(--s-3) 0 0;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    gap: var(--s-3);
    padding: var(--s-2) 0;
    border-top: 1px solid var(--line);
  }
  dt {
    color: var(--ink-2);
  }
  dd {
    margin: 0;
    font-weight: var(--weight-bold);
    text-align: right;
  }
  dd .muted {
    font-weight: var(--weight-regular);
  }
  table {
    width: 100%;
    margin-top: var(--s-3);
    border-collapse: collapse;
    font-size: var(--text-sm);
  }
  th,
  td {
    padding: var(--s-2) var(--s-1);
    border-top: 1px solid var(--line);
    text-align: right;
  }
  thead th {
    border-top: 0;
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--ink-3);
  }
  th:first-child {
    text-align: left;
    font-weight: var(--weight-regular);
  }
  tbody th {
    color: var(--ink);
  }
  .empty {
    text-align: center;
  }
</style>
