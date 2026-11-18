// Erinnerung als Kalenderdatei (iCalendar, RFC 5545): ein wiederkehrender Termin mit Hinweis.
// Die Uhrzeit ist „schwebend“ (ohne Zeitzone) – sie gilt in der Ortszeit des Geräts, auch auf Reisen.

export interface Reminder {
  hour: number;
  minute: number;
  /** Wochentage 0 = Montag … 6 = Sonntag; leer = jeden Tag. */
  weekdays: number[];
}

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Text nach RFC 5545 maskieren. */
const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Zeilen über 75 Oktette umbrechen (Fortsetzung mit führendem Leerzeichen), ohne ein Zeichen zu zerteilen. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    if (encoder.encode(current + char).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
    }
    current += char;
  }
  return [...parts, current].join('\r\n ');
}

/**
 * @param today lokales Datum „YYYY-MM-DD“ – der erste Termin ist der erste passende Tag ab heute
 * @param uid eindeutige Kennung des Termins (wer dieselbe Datei zweimal importiert, bekommt ihn nur einmal)
 * @param stamp Erstellzeitpunkt (Epoch-ms)
 */
export function reminderIcs(reminder: Reminder, today: string, uid: string, stamp: number, url: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const weekdays = [...new Set(reminder.weekdays)].filter((w) => w >= 0 && w <= 6).sort((a, b) => a - b);
  // Erster Termin: heute, oder der nächste gewählte Wochentag.
  let start = Date.UTC(y!, m! - 1, d!);
  const weekdayOf = (utc: number) => (new Date(utc).getUTCDay() + 6) % 7;
  while (weekdays.length > 0 && !weekdays.includes(weekdayOf(start))) start += 86_400_000;
  const date = new Date(start);
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const at = new Date(stamp);
  const dtstamp =
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `T${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}Z`;
  const everyDay = weekdays.length === 0 || weekdays.length === 7;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BrainUp//Erinnerung//DE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${day}T${pad(reminder.hour)}${pad(reminder.minute)}00`,
    'DURATION:PT15M',
    everyDay ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=WEEKLY;BYDAY=${weekdays.map((w) => DAYS[w]).join(',')}`,
    `SUMMARY:${escape('BrainUp')}`,
    `DESCRIPTION:${escape('Zeit für dein Training.')}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape('BrainUp')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
