// Minimaler Hash-Router (D3): `#/spiel/rotation?mode=sprint` → path + query.
function parse() {
  const [path = '/', query = ''] = location.hash.replace(/^#/, '').split('?');
  return { path: path || '/', query: new URLSearchParams(query) };
}

export const route = $state(parse());

window.addEventListener('hashchange', () => {
  Object.assign(route, parse());
  window.scrollTo(0, 0);
});

export function navigate(path: string): void {
  location.hash = path;
}

/** Für href-Attribute: `href={link('/spiele')}`. */
export function link(path: string): string {
  return '#' + path;
}
