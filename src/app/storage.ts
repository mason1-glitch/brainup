// Speicher-Zusage des Browsers: Ohne sie darf er IndexedDB bei Platzmangel räumen.

export type Persistence = 'granted' | 'denied' | 'unsupported';

/** Bittet darum, die Daten nicht von sich aus zu löschen. Mehrfach aufrufen ist harmlos. */
export async function requestPersistence(): Promise<Persistence> {
  if (!navigator.storage?.persist) return 'unsupported';
  return (await navigator.storage.persist()) ? 'granted' : 'denied';
}
