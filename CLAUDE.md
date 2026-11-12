# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Projekt: BrainUp

Brain-Training-PWA fürs Handy (Training: räumliches Denken + Verarbeitungsgeschwindigkeit, Kopfrechnen, Aufwärmen & Fokus). Live unter https://mason1-glitch.github.io/brainup/

## Pflichtlektüre vor jeder Arbeit

1. `docs/PLAN.md` – Gesamtplan, Phasen, Abnahmekriterien
2. `docs/HANDOFF.md` – aktueller Stand und nächste offene Aufgabe
3. `docs/DECISIONS.md` – getroffene Architekturentscheidungen

## Übergaberegeln

- An dieser App arbeiten nacheinander mehrere Modelle (erst Fable, dann Opus). Jede Sitzung kann jederzeit enden.
- Nach jedem abgeschlossenen Schritt: Tests grün → Commit → Push → `docs/HANDOFF.md` aktualisieren (Status, nächster Schritt, Fallstricke).
- Architekturentscheidungen kommen in `docs/DECISIONS.md` (Entscheidung, Grund, verworfene Alternative). Bestehende Entscheidungen nur nach Rückfrage beim Nutzer ändern.
- Beim Start einer Sitzung zuerst `git status` prüfen: Unfertige Änderungen zu Ende führen oder begründet verwerfen.

## Architektur, Befehle, verbindliche Regeln

_Wird beim Bau des Fundaments ergänzt (Befehle für dev/test/build, Ordnerstruktur, Regeln zu Design-Tokens, Timing-Engine, Datenzugriff, Spiel-Vorlage, Definition of Done)._
