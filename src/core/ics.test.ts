import { describe, expect, it } from 'vitest';
import { reminderIcs } from './ics';

const URL = 'https://mason1-glitch.github.io/brainup/';
const STAMP = Date.UTC(2026, 10, 16, 9, 5, 7);
/** Zeilen wie ein Kalenderprogramm lesen: Fortsetzungszeilen wieder anfügen. */
const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');
const field = (ics: string, name: string) => unfold(ics).filter((l) => l.startsWith(`${name}:`)).map((l) => l.slice(name.length + 1));

describe('Erinnerung als Kalenderdatei', () => {
  it('täglicher Termin ab heute, schwebende Ortszeit, Hinweis zum Termin', () => {
    // Der 16.11.2026 ist ein Montag.
    const ics = reminderIcs({ hour: 18, minute: 30, weekdays: [] }, '2026-11-16', 'abc@brainup', STAMP, URL);
    expect(unfold(ics)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BrainUp//Erinnerung//DE',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:abc@brainup',
      'DTSTAMP:20261116T090507Z',
      'DTSTART:20261116T183000',
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      'SUMMARY:BrainUp',
      'DESCRIPTION:Zeit für dein Training.',
      `URL:${URL}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:BrainUp',
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ]);
  });

  it('Zeilenenden sind CRLF, keine Zeile ist länger als 75 Oktette', () => {
    const long = 'https://example.org/' + 'ä'.repeat(120);
    const ics = reminderIcs({ hour: 7, minute: 5, weekdays: [] }, '2026-11-16', 'x', STAMP, long);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    // Beim Zurücklesen ist die lange Zeile wieder ganz – kein Umlaut wurde zerteilt.
    expect(field(ics, 'URL')).toEqual([long]);
    expect(field(ics, 'DTSTART')).toEqual(['20261116T070500']);
  });

  it('gewählte Wochentage: wöchentliche Regel, der erste Termin fällt auf den nächsten gewählten Tag', () => {
    const on = (weekdays: number[], today: string) => {
      const ics = reminderIcs({ hour: 6, minute: 0, weekdays }, today, 'x', STAMP, URL);
      return [field(ics, 'DTSTART')[0], field(ics, 'RRULE')[0]];
    };
    // Montag, Mittwoch, Freitag – heute Montag: beginnt heute.
    expect(on([4, 0, 2], '2026-11-16')).toEqual(['20261116T060000', 'FREQ=WEEKLY;BYDAY=MO,WE,FR']);
    // … heute Dienstag: beginnt am Mittwoch.
    expect(on([0, 2, 4], '2026-11-17')).toEqual(['20261118T060000', 'FREQ=WEEKLY;BYDAY=MO,WE,FR']);
    // Nur sonntags, heute Montag, über den Monatswechsel: 30.11. ist ein Montag, der nächste Sonntag der 6.12.
    expect(on([6], '2026-11-30')).toEqual(['20261206T060000', 'FREQ=WEEKLY;BYDAY=SU']);
    // Alle sieben Tage gewählt ist dasselbe wie täglich; Doppelte und Unsinn fallen weg.
    expect(on([0, 1, 2, 3, 4, 5, 6], '2026-11-17')).toEqual(['20261117T060000', 'FREQ=DAILY']);
    expect(on([2, 2, 9, -1], '2026-11-16')).toEqual(['20261118T060000', 'FREQ=WEEKLY;BYDAY=WE']);
  });
});
