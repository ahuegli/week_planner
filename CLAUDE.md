# CLAUDE.md

Guidance for Claude Code working in this repository.

## Working preferences

- Short, high-level answers. Minimal numbers, no bracketed data dumps.
- Selective bolding on key phrases, not headers.
- Avoid "bold header — then explanation" structure. Write in prose.
- Don't restate what was asked. Don't over-apologize.
- One clarifying question at a time if needed, not a pile.
- PowerShell, not bash. This is Windows.

## Hard rules — never violate without explicit permission

1. **Do not refactor or "clean up" `backend/src/domain/scoring-engine.service.ts`.** The scoring values are hand-tuned. Previous sessions overwrote fixes during unrelated work. Only modify it when the current task explicitly says to.
2. **Do not switch TypeORM `synchronize: true` to `false`.** Not production-safe, but the fix requires proper migrations. Out of scope unless task says so.
3. **Before every backend rebuild, clear the dist folder:** `Remove-Item -Recurse -Force backend/dist` then `npm run build`. Stale dist causes old code to run.
4. **Respect `isManuallyPlaced = true` on calendar events.** These are user-placed and must never be auto-moved or auto-deleted by the scheduler.
5. **Never delete completed planned sessions** (`status === 'completed'`) or their linked calendar events during any cleanup.
6. **Cascade delete risk:** deleting a `TrainingPlan` cascades to `PlanWeek` → `PlannedSession`. Don't delete plans during routine operations.
7. **Read the file before editing it.** Don't trust documentation — the codebase is the source of truth.
8. **Ask before destructive DB operations** (table drops, mass deletes, schema changes beyond synchronize's auto-sync).
9. **Strict spec scope.** When working from docs/wp2_spec.md or any 
   spec, only edit files explicitly listed in the current Part. Never 
   invoke /simplify, /refactor, or other broad-cleanup commands. If you 
   notice unrelated issues, list them in your response and ask before 
   touching anything outside the current scope.
10. **Plan mode is read-only.** When asked to "produce a plan" or 
    "in plan mode," produce only the plan. Do not execute commands, 
    modify files, or invoke slash commands.
## How to work on a task

- Start by reading `docs/current_spec.md` if it exists. That's the active work.
- If the user's prompt doesn't match `current_spec.md`, ask which to follow.
- Feature backlog lives in `docs/work_packages.md`.
- Past decisions: `docs/decisions.md`. Known bugs: `docs/known_bugs.md`.
- End of session: update `docs/session-notes.md` with what was done, what's pending, and any issues found.
- Run `npm run build` (backend) and `npm run build` (frontend) before declaring a task done. Fix type errors.
- Use `/clear` between sub-tasks. Write to `session-notes.md` first.

## Commands

### Frontend (repo root)
```powershell
npm start          # ng serve on port 4200
npm run build      # production build
npm test           # Vitest
```

### Backend (`backend/` directory)
```powershell
Remove-Item -Recurse -Force dist   # always before build
npm run start:dev                  # watch mode (port 3000)
npm run start:mock                 # USE_DATABASE=false, no DB required
npm run build                      # nest build to dist/
npm run lint                       # eslint --fix
npm run test                       # jest
```

### Postgres — must be started manually after machine restart
```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl" -D "C:\Users\68023\pgdata" start
```

### Backend with real DB
```powershell
cd backend
$env:USE_DATABASE="true"
npm run start:dev
```

### Test accounts
- `me@test.com` / `test1234`
- `demo@example.com` / `demo123`

## Architecture

Monorepo. Angular 21 frontend at `/src`, NestJS 10 backend at `/backend`, PostgreSQL via TypeORM. Frontend → `http://localhost:3000/api/v1/`.

### Backend modules (`backend/src/`)

Each module has controller/service/entity/dto:

- `auth/` — JWT register/login (bcrypt, Passport)
- `user/` — profiles
- `workout/` — workout definitions
- `calendar-event/` — shifts, workouts, custom events
- `training-plan/` + `plan-week/` + `planned-session/` — multi-week programs with per-session priority/intensity
- `scheduler-settings/` — per-user scheduling preferences
- `mealprep-settings/` — meal prep preferences
- `cycle-profile/` — menstrual cycle data
- `weekly-progress/` — weekly performance metrics

**Scheduling engine** lives in `backend/src/domain/`:
- `schedule-generator.service.ts` — DFS with backtracking and place-or-skip branching
- `constraint-checker.service.ts` — hard constraints (shift buffers, rest days, stacking)
- `scoring-engine.service.ts` — soft scoring (diversity, timing, fatigue)
- `plan-template.service.ts` — generates multi-week plan templates per goal

Exposed via `backend/src/api/scheduler/scheduler.controller.ts`:
- `POST /generate` — schedule one week
- `POST /validate` — check constraints for a placement
- `POST /score` — score a slot
- `POST /generate-plan` — schedule entire plan
- `POST /reschedule-conflicts` — resolve shift-change conflicts

### Frontend (`src/app/`)

**Pages live in `src/app/pages/`** (not `src/app/features/`). Feature components (step wizards, sub-components) are in `src/app/features/`.

- `core/services/data-store.service.ts` — centralised signals-based state, 2000+ lines, read fully before editing
- `core/services/auth.service.ts` — JWT auth, localStorage persistence
- `core/services/*-api.service.ts` — HTTP wrappers per domain
- `core/interceptors/auth-token.interceptor.ts` — auto-injects Bearer
- `core/guards/auth.guard.ts` — redirects unauthenticated to `/login`
- `shared/state/` — cross-page signals (e.g. `cycle-ui.state.ts`)

State is **Angular Signals** + RxJS for HTTP. No external store.

### Database

TypeORM `synchronize: true` (dev). UUID PKs. User-owned entities cascade-delete. Env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

`USE_DATABASE=false` → swaps real modules for `MockDataModule` (frontend-only dev).

## Scheduling algorithm — sharp edges

The DFS optimiser uses **lexicographic multi-objective optimisation**:
1. Maximise long-endurance sessions placed (primary)
2. Maximise total workouts placed
3. Maximise weighted score

Hard constraints cause backtracking: shift + commute buffers, no workouts after night shifts, long-endurance sessions need ≥1 rest day before/after and must be alone on their day, ≥3 hours between same-day workouts.

**Carry-forward rules** (planned-session.service.ts): key session skipped → try current week → try next week days 0-2 → abort if next week has ≥5 sessions. Make-up sessions get `isCarryForward: true` and title suffix `(Make-up)`.

**Cycle phase rules:** `cyclePhaseRules` JSON exists on every session (populated uniformly from `CYCLE_PHASE_RULES` constant) but the scorer doesn't read them yet. Wiring this is WP2.

## Design system

- Primary: `#2d4d7a` steel blue
- Background: `#FAFAF7` cream
- AI accent: orange/amber (designed, not applied yet)
- Headings: Playfair Display (serif). Body: Inter.
- Cycle colours: menstrual `#A85454`, follicular `#2d4d7a`, ovulation `#C4923A`, luteal `#6B7F5E`
- Event colours: shift=grey, workout=blue, meal prep=olive, personal=terracotta
- Cards: white on cream, 12px radius, subtle borders.

## Database

This project uses **Supabase (cloud Postgres)**, not local Postgres. 
Do NOT run psql, pg_dump, or any tool against C:\Program Files\PostgreSQL\.
The local Postgres installation is unrelated to our data.

To verify schema changes:
- Read the backend startup log (TypeORM logs DDL for new columns)
- Hit the relevant API endpoint with curl + JWT (functional 
  verification)
- Or check Supabase dashboard directly via web UI