<script lang="ts">
  import Icon, { type IconName } from '../ui/Icon.svelte';
  import { link, route } from './router.svelte';

  const tabs: { path: string; title: string; icon: IconName }[] = [
    { path: '/', title: 'Heute', icon: 'today' },
    { path: '/spiele', title: 'Spiele', icon: 'games' },
    { path: '/fortschritt', title: 'Fortschritt', icon: 'chart' },
    { path: '/einstellungen', title: 'Einstellungen', icon: 'settings' },
  ];
</script>

<nav aria-label="Hauptnavigation">
  <ul>
    {#each tabs as tab (tab.path)}
      <li>
        <a href={link(tab.path)} aria-current={route.path === tab.path ? 'page' : undefined}>
          <Icon name={tab.icon} />
          <span>{tab.title}</span>
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  nav {
    position: fixed;
    inset: auto 0 0 0;
    padding: 0 var(--safe-right) var(--safe-bottom) var(--safe-left);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border-top: 1px solid var(--line);
  }
  ul {
    display: flex;
    max-width: var(--content);
    margin: 0 auto;
    padding: 0;
    list-style: none;
  }
  li {
    flex: 1;
  }
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.125rem;
    min-height: 3.5rem;
    color: var(--ink-3);
    font-size: 0.6875rem;
    font-weight: var(--weight-medium);
    transition: color var(--dur-fast) var(--ease);
  }
  a[aria-current='page'] {
    color: var(--accent);
  }
</style>
