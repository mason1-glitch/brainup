# BrainUp – Plan

Ziel: Baue mir eine Brain-Training-App als PWA fürs Handy (läuft auch am Mac), die ich gern regelmäßig öffne – kurze Einheiten, schönes, minimalistisches Design, Fortschritt in der App sichtbar. Name: BrainUp, Repo: mason1-glitch/brainup, URL: https://mason1-glitch.github.io/brainup/

Drei Bereiche:

1. **Training** – wo die Studienlage am besten ist: räumliches Denken (mentale Rotation, Papierfalten, Schnittansichten; Uttal 2013, 10.1037/a0028446) und Verarbeitungsgeschwindigkeit (UFOV-Aufgabe: zentral erkennen + peripher lokalisieren; ACTIVE, 10.1002/trc2.70197).
2. **Kopfrechnen** – Rechenfertigkeit direkt üben.
3. **Aufwärmen & Fokus** – kurze Spiele (1–3 min) zum Konzentrieren und Warmwerden, z. B. n-back, Task Switching, Schulte-Tabelle, Flanker, Corsi-Sequenz. Kein Wirkversprechen nötig, aber sie müssen fordern und Spaß machen.

## Phase 0 – Auswahl (danach anhalten und mir zeigen)

Wähle für Bereich 3 die 4–5 besten Kandidaten: in 1–3 min spielbar, adaptiv steigerbar, per Touch gut bedienbar, motivierend. Lege docs/GAMES.md an: Spiel · Bereich · was es fordert · Quelle (falls vorhanden) · Beschreibungstext für die App. Texte versprechen nur, was belegt ist; Aufwärm-Spiele heißen in der App auch so.

## Phase 1 – Fundament

Vite + TypeScript + Svelte, vite-plugin-pwa, Dexie (IndexedDB), Deploy per GitHub Actions auf GitHub Pages; Abweichung nur mit Begründung.

- GitHub Pages liegt unter `/brainup/`: Vite `base: '/brainup/'`, im PWA-Manifest `start_url` und `scope` ebenso.
- Jeden Durchgang roh speichern (Aufgabe, Antwort, RT, korrekt, Schwierigkeit, Zeit); Kennzahlen daraus berechnen.
- Timing-Engine: Reizbeginn per requestAnimationFrame, Messung mit performance.now() und pointerdown, Bildrate erkennen, Darbietungszeiten auf Frames runden.
- Ein Staircase-Modul (z. B. 3-down-1-up ≈ 79 %) für alle Spiele.
- CLAUDE.md mit Konventionen.

## Phase 2 – Spiele

Je Spiel: interaktives 30-s-Tutorial statt Textanleitung, adaptive Schwierigkeit, prozedurale Reize (3D-Würfelfiguren inkl. Spiegelbilder). Prüfe nach jedem Spiel wie ein Spieldesigner, ob es sich nach Spiel oder nach Test anfühlt, und verbessere den schwächeren Teil.

Kopfrechnen:

- Typen: Einmaleins bis 20×20, mehrstellig ±, ×, ÷, Prozent, Quadrate/Wurzeln, Brüche ↔ Dezimal, Zehnerpotenzen, Überschlag (Ergebnis auf ±10 % schätzen).
- Schwierigkeit je Typ adaptiv über Stellenzahl, Überträge und Tempo.
- Modi: Sprint (60 s), Präzision (ohne Zeitdruck), Fehlertraining (falsche und langsame Aufgaben kommen per Spaced Repetition wieder).
- Eigene Zahlentastatur statt System-Tastatur; nach Fehlern optional ein passender Rechentrick.
- Exakte Arithmetik (Ganzzahlen/Brüche, keine Gleitkommafehler).

Tagesprogramm: Aufwärmen → Training → Kopfrechnen, ≈ 10–15 min, konfigurierbar; jedes Spiel auch einzeln spielbar.

## Phase 3 – Fortschritt (nur innerhalb der App)

Verlauf je Spiel und je Rechentyp (Level/Schwelle, Trefferquote, Median-RT), persönliche Bestwerte, Kalenderansicht, Wochenziel statt Tages-Streak; keine Dark Patterns. Kurzer Einstufungslauf beim ersten Start, damit die Startschwierigkeit passt.

## Phase 4 – Rest

Einstellungen (Ton, Haptik, Dark Mode, reduzierte Bewegung, Sitzungslänge); JSON-Export/-Import; navigator.storage.persist(); Erinnerungen als .ics-Datei; alle Daten lokal.

Design: minimalistisch, eine Akzentfarbe, Touchflächen ≥ 44 pt, Safe Areas, ruhige Mikroanimationen.

## Phase 5 – Red Team

Greif die App an wie ein Spieletester (Langeweile, Frust, unklare Regeln), wie ein Messtechniker (Timing, Rundung, Ausreißer) und wie ein Skeptiker (jeder App-Text gegen GAMES.md). Behebe alle Funde.

## Qualitätsziel

Lighthouse ≥ 95 überall, Start < 1 s auf einem Mittelklasse-Handy, 100 % offline, RT auf ±1 Frame genau. Das ist erreichbar – wenn etwas hakt, bleib dran.

## Abnahme (nicht dein eigenes Urteil)

- Vitest: Staircase mit simuliertem Spieler bekannter Schwelle trifft sie auf ±10 %; Kopfrechen-Generator per Property-Tests (fast-check) über 10 000 Aufgaben – jede Lösung exakt, keine Aufgabe direkt doppelt; Export/Import verlustfrei.
- Playwright mit iPhone- und Pixel-Emulation: Bot spielt jedes Spiel und das Tagesprogramm durch, auch offline.
- Lighthouse CI + axe-core (0 schwere Verstöße) in GitHub Actions.
- Timing-Log über 200 Durchgänge: Soll- vs. Ist-Dauer.
