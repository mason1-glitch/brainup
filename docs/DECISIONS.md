# Architekturentscheidungen

Je Eintrag: Entscheidung, Grund, verworfene Alternative. Bestehende Einträge nur nach Rückfrage beim Nutzer ändern.

## D1 – Plattform: PWA statt nativer App

- **Entscheidung:** Web-App (PWA), gehostet auf GitHub Pages.
- **Grund:** Läuft auf iPhone und Mac, kein kostenpflichtiges Apple-Developer-Konto nötig, offline nutzbar.
- **Verworfen:** Native iOS-App (Kosten, nur ein Gerät).

## D2 – Daten nur lokal

- **Entscheidung:** Alle Daten in IndexedDB auf dem Gerät, Sicherung per JSON-Export.
- **Grund:** Kein Server, kein Konto, Datenschutz.
- **Verworfen:** Sync über einen Server (Aufwand, Betrieb).
