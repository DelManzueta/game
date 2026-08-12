# Phase One Final — presentation build

Branch: `grok/phase-one-final`  
Base seal: `eb4e12e` (`grok/foundation-lock-v1`)

## Scope
Garage Phase One player shell only. Simulation store remains authoritative.

## Player journey
Menu → Garage → Plan → Stages → Polish → Release → Reviews → Sales → Library report → Research → Next game

## Presentation changes
- Room-first garage; numbered ops pad removed
- Dock: Garage · Library (after ship) · Lab · More (Phase One)
- Develop desk: allocation + real Design/Tech/Bugs; DRM/crunch/ports hidden in Garage
- Save & backup player path; JSON dump under Developer tools
- Library binds selected game id for reviews/reports
- Report modal uses release id + knowledge `sourceGameId`
- New campaign / delete save confirmations
- Timer interval no longer restarts on store action identity
- Allocation sliders: pointer, range input, keyboard

## Non-goals preserved
No office play, employees, hardware, NeonStore, late publishers as content.

## Gates
See commit message / handoff for `npm ci`, typecheck, test, lint, build, campaign trace.
