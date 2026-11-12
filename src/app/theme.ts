import { repo } from '../data/repo';

export type Theme = 'auto' | 'light' | 'dark';

function apply(theme: Theme): void {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export async function loadTheme(): Promise<Theme> {
  const theme = await repo.getSetting<Theme>('theme', 'auto');
  apply(theme);
  return theme;
}

export async function setTheme(theme: Theme): Promise<void> {
  apply(theme);
  await repo.setSetting('theme', theme);
}
