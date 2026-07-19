# Family Arcade Project Guide

## Product boundary

- Family Arcade hosts independent family-game modes under `src/app/{game}`.
- Persist only durable state required by each mechanic. An MVP reduces feature breadth, never validation, authorization, data integrity, or deployment quality.
- Do not copy room/player/realtime architecture into a game that does not need shared state.
- Heads Up is public and anonymous. Prisma/Supabase store only its bilingual catalog; rounds, timer, score, and sensor state stay on the active phone.
- Heads Up catalog mutations are owner-only. Never expose credentials or signing secrets to client code.

## Heads Up contract

- Public flow: language → category → configurable timer → sensor permission → countdown → round → results.
- Default round duration is 60 seconds; allow changing it before a round.
- During play, only the active phone displays the option.
- Gameplay uses device tilt only: down = correct, up = pass. No correct/pass button fallback.
- Every category and option has Spanish and English text.
- Catalog entries support optional image URLs. Direct file upload/storage is a later feature.
- Normal removal is reversible archival (`isActive`), not destructive deletion.

## Delivery

- Read this file and repository context before changes.
- Use Route Handlers as public boundaries: validate all input and authorize every admin mutation.
- Run targeted tests, lint, and production build before completion.
- For served production instances, build first, restart second, then smoke-test the served URL.
