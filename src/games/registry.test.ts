import { describe, expect, it } from 'vitest';
// CLAUDE.md, Regel 8: App-Texte decken sich mit docs/GAMES.md (als Text eingelesen).
import doc from '../../docs/GAMES.md?raw';
import { games } from './registry';

/** Der Abschnitt eines Spiels: von seiner Überschrift bis zur nächsten. */
function section(id: string): string {
  const start = doc.search(new RegExp('^### .*`' + id + '`', 'm'));
  if (start === -1) return '';
  const rest = doc.slice(start + 4);
  const end = rest.search(/^##/m);
  return end === -1 ? rest : rest.slice(0, end);
}

describe('Spiele-Registry gegen docs/GAMES.md', () => {
  it('jedes Spiel hat einen Abschnitt, und Titel, Kurzzeile und Beschreibung stimmen wörtlich überein', () => {
    expect(games.length).toBeGreaterThan(0);
    for (const game of games) {
      const text = section(game.id);
      expect(text, `Abschnitt für ${game.id} fehlt in docs/GAMES.md`).not.toBe('');
      expect(text).toContain(`- **Titel:** ${game.title}\n`);
      expect(text).toContain(`- **Kurzzeile:** ${game.tagline}\n`);
      expect(text).toContain(`- **Beschreibung:** ${game.description}\n`);
    }
  });

  it('Aufwärm-Spiele heißen in der App auch so', () => {
    for (const game of games.filter((g) => g.area === 'warmup')) {
      expect(game.tagline).toMatch(/^Aufwärm-Spiel/);
      expect(game.description).toMatch(/^Aufwärm-Spiel/);
    }
  });

  it('Spiel-IDs sind eindeutig', () => {
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
  });
});
