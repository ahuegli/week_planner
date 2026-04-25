# Week Planner — Handover Document for New Chat Session

## What This Document Is
This is a complete context transfer for continuing development of the Week Planner app. It contains everything a new Claude session needs to pick up where we left off: architecture, decisions, what's built, what's not, known bugs, and priorities.

---

## Product Vision

**Week Planner** is a smart training scheduler for busy professionals who train seriously. It knows your work schedule AND your training plan, and schedules workouts around your real life.

**Target users:** Girlfriend (doctor with rotating shifts training for triathlon), friends training for marathons.

**Core promise:** "We plan your week — you focus on execution."

**Sibling app:** FridgeMate (meal planning). Shares Supabase auth and weight_log table. Cross-app integration planned (macro targets, meal prep scheduling).

**Competitive positioning:** Runna gives training plans but doesn't know your schedule. This app knows both sides. The differentiator is schedule intelligence + cycle-phase awareness + life integration.

---

## Tech Stack

- **Frontend:** Angular 21, TypeScript, Tailwind CSS + SCSS, mobile-first (390px viewport)
- **Backend:** NestJS 10, TypeORM, PostgreSQL 17
- **Database:** Local PostgreSQL (user=postgres, password=password, database=myapp, port=5432)
- **Auth:** JWT tokens, stored in localStorage
- **Frontend port:** 4200
- **Backend port:** 3000
- **Backend .env location:** `backend/.env`
- **Database mode:** Set `USE_DATABASE=true` environment variable when starting backend

### Starting the App
```powershell
# Start Postgres (if not running)
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl" -D "C:\Users\68023\pgdata" start

# Start backend
cd backend
$env:USE_DATABASE="true"
npm run start

# Start frontend (separate terminal)
cd ..  # back to project root
npm run start -- --port 4200
```

### Test Accounts
- `me@test.com` / `test1234`
- `demo@example.com` / `demo123`

---

## Architecture Decisions

### Three-Layer AI Architecture
- **Layer 1 (no AI, no cost):** Algorithm handles scheduling, template generation, cycle phase calculation, carry-forward, smart reminders. This is 80% of the intelligence.
- **Layer 2 (AI, rare):** Plan generation for edge cases. One call per plan creation (~monthly). Competition-specific prompt templates stored in `prompt_templates` DB table.
- **Layer 3 (AI, occasional):** Coaching chatbot, cycle adjustment, adaptive coaching. 2-3 calls/week/user.

### Three Plan Modes
- **Race:** Periodized (base → build → peak → taper), 8-20 weeks
- **General Fitness:** Repeating 4-week blocks
- **Weight Loss:** Repeating blocks, nutrition-dependent, longer cardio sessions (40+ min)

### Scheduling Philosophy
- Algorithm places workouts. AI adapts them over time.
- Key sessions get first pick of slots (priority-based scheduling).
- Long/intensive sessions prefer free days (weekends).
- Post-shift "golden window" for weekday workouts (30 min to 2.5 hours after arriving home).
- User-placed workouts are locked (isManuallyPlaced = true) and never auto-moved.
- Minimal disruption: prefer shifting 1 hour over redesigning the whole week.
- Reschedule is idempotent — pressing it 10 times gives the same result.

### Cycle-Phase Awareness (DESIGNED but NOT WIRED)
The `cyclePhaseRules` field exists on every planned session but the scoring engine does NOT read them yet. This is the #1 priority for next development. When wired:
- Menstrual: cap intensity at moderate, prefer recovery
- Follicular: allow hard intensity, prefer speed work
- Ovulation: allow hard, flag injury risk
- Luteal: cap intensity at moderate, reduce volume

---

## Project Structure

### Frontend (`src/app/`)
```
core/
  services/
    auth.service.ts          — JWT auth, login/register/logout, session restore
    auth.guard.ts            — Route guard, redirects to /login if unauthenticated
    auth-token.interceptor.ts — Adds Bearer token to API requests
    data-store.service.ts    — CENTRAL STATE STORE — all signals, all API calls, all business logic
    calendar-event-api.service.ts — Calendar events CRUD
    workout-api.service.ts   — Workouts CRUD
    settings-api.service.ts  — Scheduler + mealprep settings
    plan-api.service.ts      — Training plans, sessions, progress, generation
    scheduler-api.service.ts — Scheduler generate + generate-plan
    cycle-api.service.ts     — Cycle profile + phase
  utils/
    workout-descriptions.ts  — Contextual descriptions by session type + phase + sport

features/
  today/
    today.page.ts            — Daily view, event timeline, reminders, tips, cycle banner
    event-card.component.ts  — Expandable event cards with edit/delete/skip/done
    week-snapshot.component.ts — Tappable week bar at top of Today page
    cycle-banner.component.ts — Cycle phase info banner
    i-have-time.component.ts — "I Have Time" smart suggestion sheet
  week/
    week.page.ts             — Week + Month views, scheduling, navigation
    view-toggle.component.ts — Week/Month toggle
    week-summary.component.ts — Completion stats, unplaced count, week/phase info
    day-row.component.ts     — Day rows with expandable event pills
    month-grid.component.ts  — Month calendar grid with day detail sheet
    quick-add-fab.component.ts — Floating action button with add forms + day picker
    share-month.component.ts — Share month button
  plan/
    plan.page.ts             — Plan overview, week timeline, goal switching
    plan-header.component.ts — Plan mode/goal/progress bar
    current-week-card.component.ts — This week's sessions with completion
    plan-week-timeline.component.ts — All weeks grouped by phase
    create-plan-cta.component.ts — Goal selection cards (no plan state)
    quick-plan-switch/       — Quick goal change modal (3 steps)
  cycle/
    cycle.page.ts            — Phase ring, energy check-in, symptoms, period logging
  settings/
    settings.page.ts         — 8 accordion sections with all settings controls
  onboarding/
    onboarding.page.ts       — 7-step wizard
    onboarding-step-*.ts     — Individual step components
  login/
    login.page.ts            — Login/register page

shared/
  event-detail-modal/        — Edit modal with day picker, time pickers, fields per event type
  delete-workout-dialog/     — Reschedule / Skip / Remove dialog for workouts
  bottom-tab-nav.component.ts — Dynamic tab bar (3 or 4 tabs based on cycle tracking)
```

### Backend (`backend/src/`)
```
domain/
  schedule-generator.service.ts — DFS scheduling algorithm with place-or-skip branching
  scoring-engine.service.ts     — ALL scoring logic (off-day, spread, time-of-day, preferred times, long session, shift-aware)
  constraint-checker.service.ts — Hard constraints (overlaps, rest, night shift, endurance rest)
  plan-template.service.ts      — Template generation (race/fitness/weight loss with weekly progression)
  domain.module.ts

api/scheduler/
  scheduler.controller.ts       — /generate, /generate-plan, /reschedule-conflicts endpoints
  scheduler.module.ts
  dto/                          — Request/response DTOs

auth/                           — JWT auth, register, login
calendar-event/                 — CRUD + batch create + recurring shift upsert guardrail
workout/                        — Workout template CRUD
training-plan/                  — Plan CRUD + generate endpoint (calls template service)
planned-session/                — Session CRUD + complete/skip/move/schedule-now + carry-forward
weekly-progress/                — Progress tracking
cycle-profile/                  — Cycle profile + phase calculation
scheduler-settings/             — User scheduling preferences
mealprep-settings/              — Meal prep preferences
```

### Database Tables
```
users, workouts, calendar_events, scheduler_settings, mealprep_settings,
training_plans, plan_weeks, planned_sessions, weekly_progress, cycle_profiles
```

---

## Design System

- **Primary color:** Steel blue `#2d4d7a`
- **Background:** Cream `#FAFAF7`
- **Accent for AI buttons:** Orange/amber (designed, not implemented)
- **Headings:** Playfair Display (serif)
- **Body text:** Inter (sans-serif)
- **Cycle phase colors:** Menstrual `#A85454`, Follicular `#2d4d7a`, Ovulation `#C4923A`, Luteal `#6B7F5E`
- **Event type colors:** Shift=grey, Workout=blue, Meal prep=olive, Personal=terracotta
- **Component pattern:** White cards on cream background, 12px border-radius, subtle borders

---

## Scoring Engine Values (Current)

These are the tuned values in `scoring-engine.service.ts`:

| Factor | Value | Purpose |
|--------|-------|---------|
| offDayBonus (no shifts) | +0.6 | Prefer free days for workouts |
| offDayBonus (shifts + free windows) | +0.1 | Slight bonus for partial free days |
| longSessionFreeDayBonus | +0.5 | Long/intensive workouts strongly prefer free days |
| Buffer bonus (wide free window) | +0.2 | Prefer days with large contiguous free blocks |
| After-work shift-aware bonus | +0.35 | Prefer post-shift windows (reduced from +0.45) |
| Preferred time window bonus | +0.2 | Match user's selected preferred workout times |
| Spread penalty (3+ weekday, empty free days) | -0.4 | Don't stack all workouts on work days |
| Adjacent day penalty (both neighbors have workouts) | -0.3 | Spread workouts across the week |
| Adjacent day bonus (no neighbors) | +0.2 | Reward good spacing |
| Free-day morning bonus | +0.2 | Prefer mornings on days off (when user prefers morning) |
| Universal late night penalty (after 21:30) | -0.4 | Nobody wants to exercise at 9:30 PM |
| Candidate sort | Earlier first | When scores tie, earlier time wins |

### Settings Now Configurable (from DB, not hardcoded)
- autoPlaceEarliestTime / autoPlaceLatestTime
- preferredWorkoutTimes (JSON array)
- runningDistanceThreshold / bikingDistanceThreshold / swimmingDistanceThreshold
- enduranceRestDays
- enduranceWorkoutMinDuration

---

## Known Bugs & Issues

| Bug | Severity | Notes |
|-----|----------|-------|
| "Let's do it" button in "I Have Time" doesn't fire action | Medium | Logic is wired but handler may not match suggestion type branches |
| Edit modal doesn't always pre-fill intensity/priority on reschedule | Low | Merge logic was patched but not fully verified |
| Reschedule suggestion doesn't fire for Mon/Wed workouts (only Fri/Sun) | Medium | Scheduler may not find better slots when most days already have workouts |
| Stale backend dist folder causes old code to run | Process | Always `Remove-Item -Recurse -Force dist` before `npm run build` in backend |
| Postgres stops on machine restart | Process | Must manually start: `& "C:\Program Files\PostgreSQL\17\bin\pg_ctl" -D "C:\Users\68023\pgdata" start` |
| `synchronize: true` on TypeORM — not production safe | Must fix before deploy | Replace with proper migrations |
| Marathon template caps long run at 18km (should be 32-35km) | Medium | Template tuning needed per race type |
| Template doesn't vary sessions for speed-focused goals (e.g., sub-20 5K) | Medium | Needs more interval/race-pace sessions |

---

## Key Design Patterns

### Data Flow
- All state lives in `DataStoreService` as signals
- Components read signals reactively
- API calls go through typed services → DataStore orchestrates → signals update → UI re-renders
- Optimistic updates: signal updates immediately, API call in background, revert on failure

### Scheduling Flow
1. User creates plan → template engine generates weeks/sessions (planned_sessions table)
2. User adds shifts (recurring, isRepeatingWeekly=true)
3. "Schedule all weeks" calls generate-plan endpoint
4. For each week: load recurring shifts → convert planned sessions to workouts → DFS scheduling → save calendar events
5. Calendar events link back to planned sessions via linkedCalendarEventId
6. User sees placed events on Week/Month/Today views

### Event Protection During Reschedule
- Delete only: `type IN ('workout', 'mealprep') AND (isManuallyPlaced IS NULL OR false) AND linked session NOT completed`
- Quick-add events are marked `isManuallyPlaced = true`
- User-edited events are marked `isManuallyPlaced = true`
- Completed sessions are never deleted

### Carry-Forward Rules
- Key session skipped → try current week remaining days → try next week first 3 days → if next week has 5+ sessions, don't carry
- Supporting session skipped → note in progress, no carry
- Optional session skipped → ignore
- Make-up sessions get `isCarryForward: true` + `originalWeekNumber`
- Calendar event created with "(Make-up)" in title

---

## Work Package Priorities (Next Development)

1. **WP2: Cycle-Aware Scheduling** — wire cycle phase into scorer (1 session)
2. **WP1: Dedicated Workout Page** — pre/during/post workout views (2-3 sessions)
3. **WP6: Dynamic Conflict Resolution** — auto-reschedule on conflicts (1-2 sessions)
4. **WP7: AI Coach** — Anthropic API + chatbot (2-3 sessions)
5. **WP5: Stats Dashboard** — completion tracking, streaks, graphs (1-2 sessions)
6. **WP8: Performance Adjustment** — rule-based first, AI second (1 session)
7. **WP3: Notes** — lightweight to-do system (1 session)
8. **WP4: Sharing** — image export, event sharing, multi-user calendar (1-2 sessions)
9. **WP9: Integrations** — FridgeMate, Apple Health, Garmin, calendar sync (2-3 sessions)
10. **WP10: Production** — migrations, deployment, monetization (2 sessions)

Full details in `/mnt/user-data/outputs/work_packages.md`

---

## Files to Read First in New Session

1. This handover document
2. `/mnt/user-data/outputs/work_packages.md` — full work package details
3. `/mnt/user-data/outputs/full_roadmap.md` — original roadmap (may be slightly outdated)
4. `/mnt/user-data/outputs/decision_log.md` — original architecture decisions
5. `backend/src/domain/scoring-engine.service.ts` — the heart of scheduling intelligence
6. `src/app/core/services/data-store.service.ts` — the heart of frontend state

---

## User Preferences (for Claude)

- Prefers short, high-level responses with selective bolding
- Dislikes "bold header — then explanation" structure
- Wants small focused prompts (2-3 items max) — large prompts get partially implemented
- Always verify after each change — don't trust "done" without testing
- Always rebuild backend from scratch: `Remove-Item -Recurse -Force dist` before `npm run build`
- The user tests in the browser themselves and reports back in text (no more screenshot uploads — hit the 100 limit)
- Windows machine, PowerShell (not bash) — use PowerShell commands
