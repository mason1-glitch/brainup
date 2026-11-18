// Sicherung als Datei: auf dem iPhone über das Teilen-Menü („In Dateien sichern“), sonst als Download.
import { localDay } from '../data/repo';
import type { Backup } from '../data/backup';

export function backupFile(backup: Backup): File {
  return new File([JSON.stringify(backup)], `brainup-${localDay(backup.exportedAt)}.json`, { type: 'application/json' });
}

/** Ob die Datei über das Teilen-Menü des Systems gesichert wird (sonst Download). */
export function canShare(file: File): boolean {
  return navigator.canShare?.({ files: [file] }) ?? false;
}

let lastUrl = '';

/**
 * Muss direkt aus einem Tipp heraus aufgerufen werden: Safari öffnet das Teilen-Menü
 * nur als unmittelbare Folge einer Nutzeraktion – die Datei also vorher fertig haben.
 */
export async function saveFile(file: File): Promise<void> {
  if (canShare(file)) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // Abgebrochen ist kein Fehler; alles andere versucht den Download.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = lastUrl;
  a.download = file.name;
  a.click();
}
