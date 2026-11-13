# Spiele

Verbindliche Liste: was jedes Spiel fordert, worauf es sich stützt und welcher Text in der App steht. **App-Texte versprechen nur, was hier belegt ist** (CLAUDE.md, Regel 8). Der Test `src/games/registry.test.ts` prüft, dass `title`, `tagline` und `description` jedes eingetragenen Spiels wörtlich mit dieser Datei übereinstimmen – wer einen Text ändert, ändert ihn hier und im Spiel.

Zu den Quellen: Jede Angabe wurde nachgeschlagen (Crossref-Metadaten zur DOI; bei [U], [A], [B] und [E] zusätzlich die Zusammenfassung bei PubMed). Aussagen über Studien stützen sich nur auf diese Zusammenfassungen. Wo keine geprüfte Quelle vorliegt, steht das da.

## Was belegt ist – und was nicht

- **Räumliches Denken ist trainierbar.** Die Meta-Analyse [U] (217 Studien) findet einen mittleren Trainingseffekt von g = 0,47; die Effekte blieben über die Zeit stabil und übertrugen sich auf räumliche Aufgaben, die nicht direkt geübt wurden.
- **Tempo-Training in der ACTIVE-Studie.** In ACTIVE [B] übten ältere Erwachsene in zehn Sitzungen schnelles Suchen und Erkennen visueller Reize; ein Teil bekam später vier Auffrischungssitzungen. [A] verknüpft die Studie mit Krankenkassendaten über 20 Jahre: Wer das Tempo-Training **mit mindestens einer Auffrischungssitzung** absolviert hatte, bekam seltener eine Demenzdiagnose (Hazard Ratio 0,75; 95-%-KI 0,59–0,95); ohne Auffrischung zeigte sich kein Unterschied (1,01), ebenso wenig für Gedächtnis- und Logiktraining.
- **UFOV-Test.** Der Useful-Field-of-View-Test ist ein Maß der Verarbeitungsgeschwindigkeit [E]. Er besteht aus drei aufeinander aufbauenden Untertests: einen Reiz in der Mitte erkennen; zusätzlich einen Reiz am Rand orten; dasselbe zwischen Ablenkern. An diesem Aufbau orientieren sich die drei Stufen von „Blickfeld“.
- **Nicht belegt:** dass *diese App* dieselben Wirkungen hat. Die Spiele folgen den Aufgabenprinzipien, sind aber nicht die untersuchten Programme (ACTIVE: angeleitete Sitzungen an älteren Erwachsenen). Deshalb beschreibt die App Aufgaben und Fortschritt im Spiel und verspricht keine Wirkung auf Alltag, Intelligenz oder Gesundheit.
- **Kopfrechnen** ist Üben der Fertigkeit selbst; besser wird, was geübt wird. Kein Transferversprechen.
- **Aufwärmen & Fokus:** klassische Aufgaben aus der Kognitionspsychologie, hier ausdrücklich nur zum Warmwerden. Kein Wirkversprechen.

## Übersicht

| Spiel | ID | Bereich | Fordert | Stand |
| --- | --- | --- | --- | --- |
| Mentale Rotation | `rotation` | Training | räumliches Vorstellen: Drehen im Kopf | vorhanden |
| Blickfeld | `ufov` | Training | Verarbeitungsgeschwindigkeit, geteilte Aufmerksamkeit | vorhanden |
| Papierfalten | `paperfold` | Training | räumliches Vorstellen: Falten und Entfalten | geplant |
| Schnittansichten | `sections` | Training | räumliches Vorstellen: Körper und Schnittflächen | geplant |
| Kopfrechnen | `arithmetic` | Kopfrechnen | Rechenfertigkeit und Tempo | vorhanden |
| Zahlensuche | `schulte` | Aufwärmen & Fokus | visuelle Suche, Blickführung | geplant |
| Blockfolge | `corsi` | Aufwärmen & Fokus | räumliches Kurzzeitgedächtnis | geplant |
| Pfeilfokus | `flanker` | Aufwärmen & Fokus | Ablenkung ausblenden | geplant |
| N-Back | `nback` | Aufwärmen & Fokus | Arbeitsgedächtnis fortlaufend aktualisieren | geplant |
| Wechselspiel | `taskswitch` | Aufwärmen & Fokus | zwischen zwei Regeln umschalten | geplant (optional) |

Die IDs stehen später in gespeicherten Daten – nach dem ersten Release nicht mehr ändern.

## Training

### Mentale Rotation · `rotation`

- **Fordert:** Zwei Würfelfiguren vergleichen, die gegeneinander gedreht sind, und das Original vom Spiegelbild unterscheiden. Adaptiv über Zahl der Arme, Drehwinkel und Drehachse (erst in der Bildebene, dann in die Tiefe).
- **Quelle:** Aufgabe nach [SM]; Trainierbarkeit räumlicher Fähigkeiten [U].
- **Titel:** Mentale Rotation
- **Kurzzeile:** Würfelfiguren im Kopf drehen
- **Beschreibung:** Oben siehst du eine Figur aus Würfeln. Eine der beiden unteren ist dieselbe, nur gedreht – die andere ist ihr Spiegelbild. Tippe auf die gedrehte.

### Blickfeld · `ufov`

- **Fordert:** In sehr kurzer Darbietung eine Form in der Mitte erkennen (Stufe 1), zugleich einen Punkt am Rand orten (Stufe 2), dasselbe zwischen Ablenkern (Stufe 3). Adaptiv über die Darbietungszeit.
- **Quelle:** Aufgabenprinzip des UFOV-Tests [E]; Tempo-Training in ACTIVE [B], [A]. Die App bildet das Prinzip nach, nicht das untersuchte Programm.
- **Titel:** Blickfeld
- **Kurzzeile:** Mitte erkennen, Rand orten – in Sekundenbruchteilen
- **Beschreibung:** Kurz blitzt eine Form in der Mitte auf, ab Stufe 2 zugleich ein Punkt am Rand. Tippe danach an, welche Form es war und wo der Punkt lag. Je besser du wirst, desto kürzer die Darbietung.

### Papierfalten · `paperfold` (geplant)

- **Fordert:** Ein Blatt wird ein- bis dreimal gefaltet und gelocht; im Kopf entfalten und das Lochmuster bestimmen. Adaptiv über Zahl und Art der Faltungen (gerade, diagonal) und Zahl der Löcher.
- **Quelle:** Aufgabentyp des Paper Folding Test aus [K] (dort dem Faktor Visualisierung zugeordnet); Trainierbarkeit räumlicher Fähigkeiten [U].
- **Titel:** Papierfalten
- **Kurzzeile:** Falten, lochen, im Kopf wieder aufklappen
- **Beschreibung:** Ein Blatt wird gefaltet und gelocht. Welches Lochmuster siehst du, wenn es wieder aufgeklappt ist? Tippe auf das richtige Blatt.

### Schnittansichten · `sections` (geplant)

- **Fordert:** Ein Körper wird von einer Ebene geschnitten; die Form der Schnittfläche bestimmen. Adaptiv über Körper (Quader, Prisma, Pyramide, zusammengesetzt) und Lage der Ebene (parallel, senkrecht, schräg).
- **Quelle:** Aufgabentyp nach [CH] („Inferring cross sections of 3D objects“); Trainierbarkeit räumlicher Fähigkeiten [U].
- **Titel:** Schnittansichten
- **Kurzzeile:** Körper durchschneiden – welche Fläche entsteht?
- **Beschreibung:** Eine Ebene schneidet durch einen Körper. Welche Form hat die Schnittfläche? Tippe auf die richtige.

## Kopfrechnen

### Kopfrechnen · `arithmetic`

- **Fordert:** Rechenfertigkeit unter Zeitdruck in zehn Rechenarten (Einmaleins bis 20 × 20, mehrstellig ±, ×, ÷, Prozent, Quadrate/Wurzeln, Brüche ↔ Dezimal, Zehnerpotenzen, Überschlag). Adaptiv je Rechenart.
- **Quelle:** keine nötig – geübt wird die Fertigkeit selbst.
- **Titel:** Kopfrechnen
- **Kurzzeile:** Zehn Rechenarten, die mit dir wachsen
- **Beschreibung:** So viele Aufgaben wie möglich, quer durch alle Rechenarten – vom Einmaleins bis zum Überschlag. Jede Rechenart passt ihre Schwierigkeit einzeln an dich an.

## Aufwärmen & Fokus – Auswahl (Phase 0)

Kriterien aus PLAN.md: in 1–3 Minuten spielbar, adaptiv steigerbar, per Touch gut bedienbar, motivierend. Reihenfolge = empfohlene Baureihenfolge.

| # | Spiel | 1–3 min | Adaptiv über | Touch | Was motiviert |
| --- | --- | --- | --- | --- | --- |
| 1 | Zahlensuche | ja (eine Tafel 15–60 s) | Tafelgröße 3×3 bis 6×6, dann gemischte Reihenfolgen | Tippen direkt aufs Ziel | Bestzeit je Tafelgröße |
| 2 | Blockfolge | ja (≈ 10 Folgen) | Länge der Folge (Staircase), später Tempo und rückwärts | Tippen direkt auf die Felder | längste Folge |
| 3 | Pfeilfokus | ja (40 Durchgänge ≈ 90 s) | Antwortfenster (Staircase), Anteil widersprüchlicher Reihen | zwei große Tasten links/rechts | Tempo und Serie |
| 4 | N-Back | ja (2 Blöcke ≈ 2 min) | n (1 → 2 → 3), Darbietungstempo | eine Taste „Treffer“ | n steigt sichtbar |
| 5 | Wechselspiel | ja (40 Durchgänge ≈ 90 s) | Antwortfenster, Häufigkeit der Regelwechsel | zwei große Tasten | Wechselkosten schrumpfen sehen |

**Empfehlung:** 1–4 bauen; 5 nur, wenn danach noch Luft ist – es ähnelt in Bedienung und Gefühl dem Pfeilfokus am stärksten.

**Verworfen:** *Stroop* (Farbwörter) – braucht vier Farbtasten und sicheres Farbensehen und fordert Ähnliches wie der Pfeilfokus; *Go/No-Go* – zu eintönig, kaum sinnvoll steigerbar; *Zahlen verbinden (Trail Making)* – deckt sich mit der Zahlensuche; *einfache Reaktionszeit* – nicht adaptiv, nach zwei Runden reizlos.

### Zahlensuche · `schulte` (geplant)

- **Fordert:** In einer Tafel mit durcheinandergewürfelten Zahlen der Reihe nach 1, 2, 3 … antippen – schnelle visuelle Suche und Blickführung.
- **Quelle:** bekannt als Schulte-Tabelle; keine geprüfte Primärquelle – deshalb ohne Literaturangabe.
- **Titel:** Zahlensuche
- **Kurzzeile:** Aufwärm-Spiel: Zahlen der Reihe nach finden
- **Beschreibung:** Aufwärm-Spiel. Tippe die Zahlen der Reihe nach an – 1, 2, 3 … – so schnell du kannst. Die Tafel wächst mit dir.

### Blockfolge · `corsi` (geplant)

- **Fordert:** Felder leuchten nacheinander auf; die Folge in derselben Reihenfolge nachtippen – räumliches Kurzzeitgedächtnis.
- **Quelle:** Corsi-Block-Aufgabe, beschrieben und normiert in [KE].
- **Titel:** Blockfolge
- **Kurzzeile:** Aufwärm-Spiel: Folge merken und nachtippen
- **Beschreibung:** Aufwärm-Spiel. Felder leuchten nacheinander auf. Tippe sie danach in derselben Reihenfolge an. Nach jedem Erfolg wird die Folge länger.

### Pfeilfokus · `flanker` (geplant)

- **Fordert:** Die Richtung des mittleren Pfeils angeben, während die Pfeile daneben teils in die Gegenrichtung zeigen – Ablenkung ausblenden unter Zeitdruck.
- **Quelle:** Flanker-Aufgabe nach [EE] (dort mit Buchstaben; die Pfeil-Variante ist eine spätere, verbreitete Abwandlung).
- **Titel:** Pfeilfokus
- **Kurzzeile:** Aufwärm-Spiel: nur der mittlere Pfeil zählt
- **Beschreibung:** Aufwärm-Spiel. Wohin zeigt der mittlere Pfeil? Tippe links oder rechts – und lass dich von den Pfeilen daneben nicht ablenken.

### N-Back · `nback` (geplant)

- **Fordert:** Eine Folge von Positionen verfolgen und melden, wenn die aktuelle der von vor n Schritten gleicht – Arbeitsgedächtnis fortlaufend aktualisieren.
- **Quelle:** Aufgabe nach [KI]. Ob N-Back-Training über die Aufgabe hinaus wirkt, ist umstritten – die App verspricht dazu nichts.
- **Titel:** N-Back
- **Kurzzeile:** Aufwärm-Spiel: war das Feld vor n Schritten dasselbe?
- **Beschreibung:** Aufwärm-Spiel. Ein Feld nach dem anderen leuchtet auf. Tippe auf „Treffer“, wenn das Feld dasselbe ist wie vor n Schritten. Triffst du sicher, steigt n.

### Wechselspiel · `taskswitch` (geplant, optional)

- **Fordert:** Je nach Hinweis eine von zwei Regeln auf dieselbe Zahl anwenden (gerade/ungerade oder kleiner/größer als 5) – zügig zwischen Regeln umschalten.
- **Quelle:** Aufgabenwechsel-Paradigma nach [RM].
- **Titel:** Wechselspiel
- **Kurzzeile:** Aufwärm-Spiel: zwei Regeln, schnell umschalten
- **Beschreibung:** Aufwärm-Spiel. Mal fragt die Karte „gerade oder ungerade?“, mal „kleiner oder größer als 5?“. Antworte nach der Regel, die gerade gilt.

## Quellen

- **[A]** Coe, N. B., Miller, K. E. M., Sun, C., et al. (2026). Impact of cognitive training on claims-based diagnosed dementia over 20 years: evidence from the ACTIVE study. *Alzheimer's & Dementia: Translational Research & Clinical Interventions, 12*(1). https://doi.org/10.1002/trc2.70197
- **[B]** Ball, K., Berch, D. B., Helmers, K. F., et al. (2002). Effects of cognitive training interventions with older adults: A randomized controlled trial. *JAMA, 288*(18), 2271–2281. https://doi.org/10.1001/jama.288.18.2271
- **[CH]** Cohen, C. A., & Hegarty, M. (2012). Inferring cross sections of 3D objects: A new spatial thinking test. *Learning and Individual Differences, 22*(6), 868–874. https://doi.org/10.1016/j.lindif.2012.05.007
- **[E]** Edwards, J. D., Vance, D. E., Wadley, V. G., Cissell, G. M., Roenker, D. L., & Ball, K. K. (2005). Reliability and validity of Useful Field of View test scores as administered by personal computer. *Journal of Clinical and Experimental Neuropsychology, 27*(5), 529–543. https://doi.org/10.1080/13803390490515432
- **[EE]** Eriksen, B. A., & Eriksen, C. W. (1974). Effects of noise letters upon the identification of a target letter in a nonsearch task. *Perception & Psychophysics, 16*(1), 143–149. https://doi.org/10.3758/BF03203267
- **[K]** Ekstrom, R. B., French, J. W., Harman, H. H., & Dermen, D. (1976). *Kit of Factor-Referenced Cognitive Tests* (mit Handbuch). Princeton, NJ: Educational Testing Service. (Buch, keine DOI.)
- **[KE]** Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). The Corsi Block-Tapping Task: Standardization and normative data. *Applied Neuropsychology, 7*(4), 252–258. https://doi.org/10.1207/S15324826AN0704_8
- **[KI]** Kirchner, W. K. (1958). Age differences in short-term retention of rapidly changing information. *Journal of Experimental Psychology, 55*(4), 352–358. https://doi.org/10.1037/h0043688
- **[RM]** Rogers, R. D., & Monsell, S. (1995). Costs of a predictable switch between simple cognitive tasks. *Journal of Experimental Psychology: General, 124*(2), 207–231. https://doi.org/10.1037/0096-3445.124.2.207
- **[SM]** Shepard, R. N., & Metzler, J. (1971). Mental rotation of three-dimensional objects. *Science, 171*(3972), 701–703. https://doi.org/10.1126/science.171.3972.701
- **[U]** Uttal, D. H., Meadow, N. G., Tipton, E., Hand, L. L., Alden, A. R., Warren, C., & Newcombe, N. S. (2013). The malleability of spatial skills: A meta-analysis of training studies. *Psychological Bulletin, 139*(2), 352–402. https://doi.org/10.1037/a0028446
