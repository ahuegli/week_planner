# Session notes

## Tuesday session — WP12B + WP12C shipped

Shipped:
- WP12B Parts 1B+2B+3B (brick generation, scheduling, UI)
- Bug fixes: volume progression, brick CalendarEvent links
- WP12C Parts 1C+2C+3C (race-day plan entity, generator, UI)
- Bundle 1 (settings persist) + Bundle 2 (load distribution + 
  retroactive reschedule) verified

Pending tomorrow:
- WP12C Part 4C smoke test (manual browser walkthrough)
- WP12B/12C polish: brick visual treatment, distance/pace targets 
  for triathlon, true beginner volume calibration
- runThresholdSecPerKm field for run race-day pacing

Decision points:
- WP10 task gamification next, or WP15 landing page first?
- WP14 production hardening before or after public beta?


## 2026-04-28 — WP12C Part 2C: Race-day plan generator

### Files modified (3)
- `backend/src/race-day-plan/race-day-plan.service.ts` — added `generateRaceDayPlan()` public method + 5 private builders: `buildPacingPlan`, `buildFuelingPlan` (with sprint duration-conditional logic), `buildHydrationPlan` (3-tier hot/neutral/cool), `buildTransitionPlan` (short vs long-course variants), `buildContingencyPlan` (if/then keyed rules, GI added for long course)
- `backend/src/race-day-plan/race-day-plan.controller.ts` — added `POST /generate/:planId` endpoint with `@Res({ passthrough: true })` for dynamic 201/200 status; injected `TrainingPlanService` and `SchedulerSettingsService`
- `backend/src/race-day-plan/race-day-plan.module.ts` — added `SchedulerSettingsModule` and `TrainingPlanModule` imports

### Methodology decisions
- Pace buffer: 15% (true_beginner) / 12% (tri_novice_but_fit) / 8% (intermediate) / 0% (experienced)
- Sprint fueling: duration-conditional — <60min skip gels, 60–75min optional, >75min recommended. Estimated from pacing targets.
- Hydration: 3-tier (hot >25°C → 750ml/h + electrolytes from start; neutral 15–25°C → 600ml/h + electrolytes after 90min; cool <15°C → 500ml/h + electrolytes after 90min + warning about suppressed thirst)
- Contingency: structured `{ trigger, action[] }` keyed objects; long-course adds GI contingency
- Auto-trigger: deferred to v2 — manual only via POST /generate/:planId
- Run threshold: not a stored field on SchedulerSettings → RPE fallback for all users. v2 item to add `runThresholdSecPerKm` to settings.

### Build

## 2026-05-01 — Loading indicator polish for slow calls

### Files modified
- `src/app/pages/plan.page.ts` — added `isInitialLoading` computed using DataStore loading + loaded state
- `src/app/pages/plan.page.html` — added initial-load skeleton week card block
- `src/app/pages/plan.page.scss` — added plan skeleton shimmer styles
- `src/app/pages/today.page.html` — added calendar skeleton cards while initial fetch is in-flight
- `src/app/pages/today.page.scss` — added today skeleton card styles
- `src/app/pages/stats.page.html` — expanded loading state with skeleton number placeholders
- `src/app/pages/stats.page.scss` — added number skeleton sizing styles
- `src/app/pages/onboarding.page.html` — added full-screen generating overlay with spinner + copy
- `src/app/pages/onboarding.page.scss` — added overlay and spinner styling
- `src/app/pages/onboarding.page.ts` — wrapped `generatePlan()` in `try/finally` so loading reliably resets

### Verification
- `npm run build` (frontend): clean
- Browser checks:
  - Plan page shows initial skeleton week card while loading
  - Today page renders skeleton cards when load state is active
  - Stats page renders skeleton number placeholders during loading
  - Onboarding shows full-screen overlay with “Generating your plan...” while loading

## 2026-05-01 — Today page tomorrow preview card

### Files modified
- `src/app/pages/today.page.ts` — added tomorrow-date/workout computed signals, preview metadata helpers, and week-view navigation handler
- `src/app/pages/today.page.html` — added bottom Tomorrow preview card with actionable workout state, `+ N more` indicator, and free-day fallback text
- `src/app/pages/today.page.scss` — added muted preview-card styling consistent with existing event card language

### Verification
- `npm run build` (frontend): clean
- Browser checks:
  - Real data case: tomorrow workout preview renders title/meta/time and navigates to `/week?date=...` on tap
  - Multiple-workout case: runtime-injected second workout shows `+ 1 more`
  - No-workout case: card shows `Free day tomorrow — rest up.` with no action button

## 2026-04-30 — Workout page cycle phase tooltip polish

### Files modified (3)
- `src/app/features/workout/workout.page.ts` — added inline cycle-phase tooltip state, tooltip copy per phase, outside-click dismissal, and hover/pin handling
- `src/app/features/workout/workout.page.html` — replaced the plain cycle-phase chip with inline info-button + conditional popover markup
- `src/app/features/workout/workout.page.scss` — added local tooltip/button/popover styling and aligned the chip for inline icon placement

### Implementation notes
- No reusable tooltip/info-icon pattern existed in `src/app/**`, so this was built inline in the workout page only
- Tooltip copy covers menstrual, follicular, ovulation, and luteal terminology in short user-facing language

### Verification
- Frontend build: clean (`npm run build`)
- Cycle disabled case: verified on a real workout route that no cycle-phase chip or info icon is shown when cycle tracking is off
- Cycle enabled case: verified in the running app by enabling the existing cycle state, loading cycle data, opening a workout with a visible phase chip, and confirming the `ⓘ` button opens the expected follicular explanation text

- Two compile errors fixed: `FUELING_SPECS` changed from `Partial<Record>` to full `Record` with sprint entry
- Final: clean, 0 TypeScript errors

### Smoke tests
- Test 1: POST /generate/:planId (Olympic, FTP=250W, CSS=95s/100m) → alreadyExisted=false; swim 1:46/100m (+12% CSS), bike 176W (70% FTP), run RPE, fueling 60g/h, hydration 600/750/500 ml/h, T1 6 steps, 4 contingency keys ✓
- Test 2: POST again same plan → alreadyExisted=true, plan.id unchanged ✓
- Test 3: Generate with no FTP/CSS/LTHR → swim RPE, bike RPE, run RPE — no numeric anchors ✓
- Test 4: POST for non-triathlon plan → 400 "Race-day plan generation requires a triathlon plan with a distance set." ✓

### Known gaps (v2)
- `runThresholdSecPerKm` not in SchedulerSettings — run pacing is always RPE-based for now
- Auto-trigger (2 weeks pre-race) deferred — would be a NestJS @Cron job ~30 min to add
- Weather integration out of scope; user selects hot/neutral/cool tier manually

### Pending
- WP12C Part 3C: race-day plan UI page
- WP12B Part 3B: frontend brick UI rendering

## 2026-04-28 — WP12C Part 1C: Race-day plan data model

### Files created (5)
- `backend/src/race-day-plan/race-day-plan.entity.ts` — `race_day_plans` table: userId, planId, raceDate (DATE), 5 jsonb columns, generatedAt/lastModified; unique index on (userId, planId)
- `backend/src/race-day-plan/race-day-plan.dto.ts` — CreateRaceDayPlanDto (planId + raceDate required, 5 optional jsonb fields); UpdateRaceDayPlanDto (all optional)
- `backend/src/race-day-plan/race-day-plan.service.ts` — create (409 on duplicate), findAll, findByPlan, update, remove; all userId-scoped
- `backend/src/race-day-plan/race-day-plan.controller.ts` — GET /, GET /plan/:planId, POST, PUT /:id, DELETE /:id; all under api/v1/race-day-plans
- `backend/src/race-day-plan/race-day-plan.module.ts` — mirrors calendar-share pattern; no UserModule dependency

### Files modified (2)
- `backend/src/app.module.ts` — RaceDayPlanModule added to databaseImports
- `src/app/core/models/app-data.models.ts` — RaceDayPlan, CreateRaceDayPlanPayload, UpdateRaceDayPlanPayload interfaces added

### Build
- Backend: clean (0 TypeScript errors, dist cleared before build)
- Frontend: no changes, not rebuilt

### Smoke tests
- POST /api/v1/race-day-plans → 201, row returned with correct id/raceDate/pacingPlan ✓
- POST again (same userId+planId) → 409 with message "A race-day plan already exists..." ✓
- GET /api/v1/race-day-plans/plan/:planId → row returned with correct fields ✓
- GET /api/v1/race-day-plans → count: 1 ✓
- TypeORM synchronize: `race_day_plans` table auto-created on backend restart ✓

### Notes
- Global prefix `api/v1` confirmed in main.ts; `@Controller('race-day-plans')` produces correct paths
- `raceDate` stored as Postgres DATE (string, no time-zone ambiguity)
- Unique index on (userId, planId) — generator in Part 2C should upsert (PUT by id)

### Pending
- WP12C Part 2C: race-day plan generator in triathlon-plan-template.service.ts
- WP12C Part 3C: race-day plan UI
- WP12B Part 3B: frontend brick UI rendering

## 2026-04-28 — WP12B Bug Fixes: brick CalendarEvent links + volume progression

### Files modified (5 total)

- `backend/src/calendar-event/calendar-event.entity.ts` — added `linkedNextSessionId` and `linkedPriorSessionId` nullable uuid columns (TypeORM auto-sync adds them on restart)
- `backend/src/calendar-event/calendar-event.dto.ts` — added both fields as optional string to `CreateCalendarEventDto` and `UpdateCalendarEventDto`
- `src/app/core/models/app-data.models.ts` — added `linkedNextSessionId?: string | null` and `linkedPriorSessionId?: string | null` to frontend `CalendarEvent` interface
- `backend/src/api/scheduler/scheduler.controller.ts` — added second-pass update after event save in `schedulePendingWeeks()`: iterates `pendingSessions`, finds brick pairs via `linkedNextSessionId`, cross-links their newly created `CalendarEvent` IDs
- `backend/src/domain/triathlon-plan-template.service.ts` — added `computeProgressionScaler()` method; replaced flat `phaseScaler` in `getWeekSessions()` with per-week ramp (base 0.70→1.00, build 0.90→1.15, peak 1.05→1.15, taper 1.00→0.50)

### Bug 2 verification (brick links in CalendarEvent)

Olympic 14-week plan generated (98 events placed, 14 weeks, 0 unplaced). Week 6 build:
- Bike brick Aug 23 07:00: `linkedNextSessionId = 0bdc704f-7e98-4a21-b4bb-c79489bdb117` ✓
- Run brick Aug 23 08:20: `linkedPriorSessionId = de579fc1-67b5-4c29-8332-4396b2fd8881` ✓
- IDs cross-match correctly ✓
- Non-brick events (standalone run, standalone bike): both link fields null ✓

### Bug 1 verification (volume progression)

Olympic 14w, tier3 (7 sessions/week), hourScaler=1.0. `run_quality` (baseDuration=45min) in build weeks:
- Week 5 (t=0.0, scaler=0.90): **41min**
- Week 6 (t=0.17, scaler=0.94): **42min**
- Week 7 (t=0.33, scaler=0.98): **44min**
- Week 8 deload (t=0.5, scaler=1.025 × 0.70): **32min**
- Week 9 (t=0.67, scaler=1.07): **48min**
- Week 10 (t=0.83, scaler=1.11): **50min**
- Week 11 (t=1.0, scaler=1.15): **52min**

Brick bike (baseDuration=80, race_sim): 72min in first build week → 92min in last build week ✓

All predictions match observations (±1min due to floating-point rounding on 0.7×45=31.499...). Base phase also ramps: 31→36→40→31(deload). Progression confirmed.

### Diagnosis note

The 7 sessions/week (not 10) is correct — the test user has no triathlon completions, so `experienceLevel = 'true_beginner'` → `tier = 'tier3'` (7 sessions). Tier 4+ requires `experienced` status. No template bug.

### Pending

- WP12B Part 3B: frontend brick UI rendering (brick pair display, T2 visual, linked-session grouping)

---

## 2026-04-28 — WP12B Parts 1B + 2B (brick session generation + DFS coupling)

### Files modified (6 total)

- `backend/src/planned-session/planned-session.entity.ts` — added `linkedNextSessionId` and `linkedPriorSessionId` nullable uuid columns
- `backend/src/shared/models/workout.model.ts` — added `linkedPriorSessionId?` to `Workout` interface
- `backend/src/domain/triathlon-plan-template.service.ts` — major changes:
  - Added `uuid` import, `brickGroupId?`/`isBrickRun?` to `TriTemplateSession`
  - New `computeBrickVariant()`, `buildBrickPair()`, `prescribeBrickRunSession()` methods
  - `tier4PlusTemplate` and `tier3Template` now accept `brickVariant` param; brick pair replaces `bike_long` stub
  - Tier 3: `run_long` removed (brick_run is the long run)
  - Tier 4+ 70.3/140.6: `run_long` dropped on race-rehearsal weeks only (last 2-3 build weeks)
  - `generateWeeksAndSessions()` pre-assigns UUIDs to brick sessions, links pairs in post-pass, warns on orphan brick groups
- `backend/src/api/scheduler/scheduler.controller.ts` — `toWorkout()` passes `linkedPriorSessionId`; brick session create includes `id`/`linkedNextSessionId`/`linkedPriorSessionId`; sorts workouts so bike precedes brick_run
- `backend/src/domain/schedule-generator.service.ts` — brick-coupling guard in `getCandidatesForSession()`: if `linkedPriorSessionId` set, forces same day as bike partner at bikeEnd+5min T2, skips `isHardViolation` (T2 is intentionally immediate)

### Verification results

- Build: zero TypeScript errors (clean `nest build`)
- TypeORM sync: two new uuid nullable columns added on startup
- Week 1 (base phase): transition brick — bike 45 min, run 20 min, co-placed same day 07:00-07:45 / 07:50-08:10 (5-min T2 gap) ✓
- Week 16 (race-rehearsal): full-volume brick — no `run_long`, brick_run is the long-run equivalent ✓
- Cross-link consistency: bike.linkedNextSessionId === run.id, run.linkedPriorSessionId === bike.id ✓
- Tier 3 + 140.6: rejected with "Ironman 140.6 requires Tier 4+" before template generation ✓
- 140 events placed across 20 weeks for a 70.3 goal-date plan ✓

### Methodology notes

- Race-rehearsal brick variant (full longBikeDuration + 60/90 min run): last 2 build weeks for 70.3, last 3 for 140.6. Other build weeks use race_sim (shorter). Base phase uses transition (short additive).
- `SESSIONS_PER_WEEK` updated to reflect max week counts; race-rehearsal weeks for 70.3/140.6 have one fewer session (brick_run replaces standalone run_long).
- Brick run skips `isHardViolation` because the 180-min same-day rest constraint is intentionally violated by design — T2 co-location is the methodology.

### Pending

- WP12B Part 3B: frontend brick UI rendering (brick pair display, T2 visual, linked-session grouping)

## 2026-04-24 (Friday evening — setup)
- Claude Code installed
- CLAUDE.md refined (working prefs, hard rules, doc pointers)
- docs/ structure created: work_packages.md, handover.md, known_bugs.md, decisions.md, session-notes.md
- Ready for tomorrow's WP3 Notes trial run

## 2026-04-24 (Saturday — WP3A)

### Files created
- `backend/src/note/note.entity.ts`
- `backend/src/note/note.dto.ts`
- `backend/src/note/note.service.ts`
- `backend/src/note/note.controller.ts`
- `backend/src/note/note.module.ts`
- `backend/query-notes-schema.js`

### Files modified
- `backend/src/app.module.ts` — NoteModule added to databaseImports only

### Acceptance checks
- Build: clean (zero TypeScript errors)
- Lint: deferred — run `npm run lint` from PowerShell (ESLint devDep not available in CI shell)
- Schema: all 12 columns present with correct types and nullability
- API smoke tests 4–11: all passed
- Ownership: all 6 NoteService methods filter by userId; cross-user GET returns 404

### Deviations from spec
- `userId` uses `@Column()` + `@Index()` only — no `@ManyToOne` to User, per approved adjustment. TypeORM `synchronize: true` does **not** create a DB-level FK constraint from `notes.userId` to `users.id` without a relation decorator. Cascade deletes will not propagate at the DB level (orphaned rows possible if a user is deleted via raw SQL). In practice, NestJS deletes users through TypeORM which will handle cascade via the ORM if a relation is later added. Low risk for now.
- `linkedCalendarEventId` does have `@ManyToOne(() => CalendarEvent, { onDelete: 'SET NULL' })` matching the planned-session pattern — the DB FK and SET NULL behaviour are active for this column.

### Known issues
- None found during testing

### Suggested next step
WP3B (Notes UI) when approved — adds the Notes section to Today page, quick-add, and week view indicators.

## 2026-04-24 (Saturday — WP3B+)

### Files created
- `src/app/core/services/note-api.service.ts`
- `src/app/pages/notes.page.ts`

### Files modified
- `backend/src/note/note.entity.ts` — added `estimatedDurationMinutes`, `wantsScheduling`
- `backend/src/note/note.dto.ts` — added same to `CreateNoteDto` and `UpdateNoteDto`
- `src/app/core/models/app-data.models.ts` — added `Note`, `CreateNotePayload`, `UpdateNotePayload`
- `src/app/core/services/data-store.service.ts` — added `notes` signal + `loadNotes`, `addNote`, `updateNote`, `toggleNoteComplete`, `deleteNote`
- `src/app/app.routes.ts` — added `/notes` lazy route with `authGuard`
- `src/app/components/bottom-tab-nav/bottom-tab-nav.component.html` — added Notes tab (checklist icon, always visible)

### Build
- Backend: clean after entity/DTO changes; synchronize added 2 columns on restart
- Frontend: clean, `notes-page` lazy chunk generated (11.89 kB)

### Deviations
- None

### Known issues
- None found during build

### Suggested next step
WP2: cycle-aware scheduling (wire `cyclePhaseRules` into scorer)

## 2026-04-25 — Date format audit

### Files modified
- `src/app/pages/today.page.ts` — 2 locale changes (`en-US` → `en-GB`)
- `src/app/pages/week.page.ts` — 3 locale changes + rewrote `weekRangeLabel` string order (month now trails: "25-30 Apr 2026")
- `src/app/pages/plan.page.ts` — 1 locale change
- `src/app/features/week/day-row/day-row.component.ts` — 2 locale changes (share message monthDay: "Apr 25" → "25 Apr")
- `src/app/features/week/month-grid/month-grid.component.ts` — 2 locale changes
- `src/app/features/week/quick-add-fab/quick-add-fab.component.ts` — 1 locale change
- `src/app/features/plan/plan-week-timeline/plan-week-timeline.component.ts` — rewrote `weekDateRange()`: same-month "1–7 Jan", cross-month "28 Mar–3 Apr" (also fixed latent bug where cross-month ranges omitted end month)
- `src/app/features/plan/plan-header/plan-header.component.ts` — 1 locale change ("January 1, 2026" → "1 January 2026")
- `src/app/core/services/data-store.service.ts` — 2 locale changes (weekday-only, output unchanged)
- `src/app/shared/delete-workout-dialog/delete-workout-dialog.component.ts` — 1 locale change (weekday-only, output unchanged)

### Not changed
- `notes.page.ts` `formatDue()` — already used `en-GB`
- `toDisplayTime()` functions — time format explicitly out of scope

### Build
- Frontend: clean, zero TypeScript errors

## 2026-04-25 — Session close-out

### Wins tonight
- WP3A backend complete (Notes data layer, 13/13 acceptance checks)
- WP3B frontend complete (Notes tab live, optimistic updates, all manual tests passed)
- Date format fixed across the app (en-GB, DD MMM YYYY)
- `docs/training_methodology.md` saved (v5) — race-prep reference
- `docs/wellness_methodology.md` saved (v3) — wellness reference
- Both methodology docs are reference material for a future plan-template engine rewrite, NOT v1 commitments

### New known bug (high priority for next session)
- Plan creation, calendar event creation, and other write endpoints return 500 with FK constraint violations
- Root cause: JWT in browser localStorage references a userId that no longer exists in the users table (German error: "verletzt Fremdschlüssel-Constraint")
- Workaround: clear localStorage + re-login, OR re-register test users via `/api/v1/auth/register`
- Long-term fix: backend should return 401 (not 500) when JWT user doesn't exist; investigate whether user table was affected by cascade during recent schema syncs
- Added to `docs/known_bugs.md` as high-priority fix-on-next-session

### Saturday plan
- WP2 cycle-aware scheduling
- Post-menopause mode addition
- Energy/symptom logging schema (scorer ignores for v1)
- Architect spec coming Friday evening from architect chat

## 2026-04-27 — WP4 Calendar Sharing + Event Invitations (full suite)

### What shipped

**WP4A — Calendar sharing backend (earlier session)**
- `backend/src/calendar-share/` — entity, dto, service, controller, module
- Shares table with `shareLevel: 'full' | 'busy_only' | 'workouts_only'`
- `GET /calendar-events/shared/:ownerId` — filtered by share level
- Frontend: Settings → Sharing accordion (People I share with / People who share with me)
- Frontend: week view "Share my calendar" button (navigates to sharing settings)
- Frontend: `DataStoreService` signals: `outgoingShares`, `incomingShares`, `viewingSharedCalendar`
- "Viewing X's calendar" banner on week view; "Exit" button

**WP4B — Busy event type (Part 9B)**
- Added `'busy'` to `CalendarEventType` in both `mock-data.ts` and `app-data.models.ts`
- Renders in week view as lighter grey (no chevron expand, no isFreeDay suppression)
- `TYPE_COLORS` in event-card updated with `busy` entry

**WP4C — Event invitations (Parts 10C–13C)**
- `backend/src/event-invitation/` — entity, dto, service, controller, module (5 new files)
- Backend: `POST /event-invitations`, `GET /incoming`, `GET /outgoing`, `PUT /:id/respond`, `DELETE /:id`
- On acceptance: event copied to recipient's calendar with `linkedInvitationId` set
- Hydration: service resolves emails via `UserService` (no FK joins in entity)
- Frontend: `event-invitation-api.service.ts`, DataStore signals: `pendingInvitations`, `outgoingInvitations`
- Part 12C: "Invite someone" panel in `event-detail-modal` (z-index 62, slides over modal)
- Part 13C: red notification dot on Today tab nav; pending invitations section on Today page (accept/decline); amber person icon on events with `linkedInvitationId`

**FIX A — Monthly invite silent failure + UX clarity**
- Root cause: `shareEvent()` in `month-grid.component.ts` was an empty function body
- Fix: routes to `openEditor(event)` → `event-detail-modal` with working Invite panel
- Renamed "Share my schedule" → "Share my calendar" with two-person icon (vs upload arrow)

**FIX B — Accepted-invitee bubbles on events**
- `UserService.findByIds(ids)` — batched IN query
- `EventInvitationService.getAcceptedInviteesForEvents(eventIds)` — 2 queries total (IN on invitations + IN on users), returns Map<eventId, email[]>
- `CalendarEventController.findAll` enriches response with `acceptedInviteeEmails: string[]`
- Bubbles rendered in both `day-row` (weekly view pill) and `event-card` (Today view)
- 18px overlapping circles; hash of email → 5-color palette; cap at 3 + "+N" overflow chip

**FIX C — Deleted-account edge cases + one-way info text + stale data doc**
- `CalendarShareService.findOutgoing`: deleted recipient → `'Unknown user (account deleted)'` sentinel; frontend shows greyed row + Revoke-only (no edit badge)
- `CalendarShareService.findIncoming`: filters out shares where owner is deleted
- `EventInvitationService.hydrate()`: returns null if either party missing; findIncoming/findOutgoing filter nulls
- C.4 "Sharing is one-way" info text: was already present at line 513 of settings.page.html — no change needed
- C.5 Stale data: added entry to `docs/known_bugs.md`

### Build status
- Frontend: clean (1 pre-existing RouterLink warning on CoachPageComponent, unrelated)
- Backend: clean after null-assertion fix on `hydrate()` callers in create/respond

### Commit
`0368f351` — WP4 final: invite UX cleanup, accepted-invitee bubbles, edge case polish

### Still pending / known gaps
- WP7A AI Coach UI: input field invisible, error swallowed — parked (see known_bugs.md)
- Triathlon plan generates only run sessions (missing bike/swim branching in plan-template.service.ts)
- No off-plan workout logging
- Fix 500→401 for stale JWT userId
- Real-time sync for shared calendars: v2 item (stale-data entry now in known_bugs.md)

## 2026-04-27 — WP12A Part 1A: Triathlon calibration data model

### Files modified
- `backend/src/scheduler-settings/scheduler-settings.entity.ts` — 8 new triathlon calibration columns: `ftpWatts`, `lthrBpm`, `cssSecondsPer100m`, `poolAccess` (enum), `hasPowerMeter`, `triathlonsCompleted`, `endurancePedigree` (enum), `periodisationOverride` (enum)
- `backend/src/scheduler-settings/scheduler-settings.dto.ts` — 8 new optional fields added to `UpdateSchedulerSettingsDto`
- `backend/src/training-plan/training-plan.entity.ts` — `TriathlonDistance` type export + `triathlonDistance` enum column
- `backend/src/training-plan/training-plan.dto.ts` — `triathlonDistance` optional field added to both CreateDto and UpdateDto
- `backend/src/planned-session/planned-session.entity.ts` — `PlannedSessionType` and `PlannedSessionDiscipline` type exports; `discipline` (enum) and `prescriptionData` (jsonb) columns
- No planned-session DTO changes (sessions are engine-generated, not user-POSTed)

### Build
- Backend: clean, 0 TypeScript errors
- TypeORM `synchronize: true` added all new columns to Supabase on startup

### Verification
- GET /api/v1/scheduler-settings: all 8 new triathlon fields present as null ✓
- PUT /api/v1/scheduler-settings with `{ ftpWatts: 250, poolAccess: "25m", triathlonsCompleted: 1, endurancePedigree: "runner", periodisationOverride: "traditional" }` → 200, values persisted ✓
- GET /api/v1/plans: existing plans return with `triathlonDistance: null` (backward compatible) ✓
- GET /api/v1/sessions/{planId}/week/1: existing sessions return with `discipline: null, prescriptionData: null` ✓

### Gotcha
There was a pre-existing server process (PID 25848) still running on port 3000, causing the new backend to fail to bind. All smoke tests initially ran against the old server (no new columns). Killed the old process and restarted before final verification.

### Next
WP12A Part 2A — backend triathlon plan template generator. Awaiting approval.

## 2026-04-27 — WP12A Part 2A: Triathlon plan template generator

### File created
- `backend/src/domain/triathlon-plan-template.service.ts` (~855 lines): full methodology-driven triathlon generator — Tier 4+/Tier 3 templates, phase resolution (base/build/peak/taper), CSS/FTP/RPE prescription cascade, pool access adaptation, brick stub with WP12B TODOs

### File modified
- `backend/src/domain/domain.module.ts` — `TriathlonPlanTemplateService` added to providers + exports

### Build
- Backend: clean, 0 TypeScript errors. DomainModule initialises correctly.

### Deviations
- File placed in `backend/src/domain/` not `backend/src/plan-template/` — the `plan-template/` directory does not exist; all domain services live in `domain/`. Codebase-is-source-of-truth (CLAUDE.md rule 7).

---

## 2026-04-27 — WP12A Part 3A: Wire TriathlonPlanTemplateService into generate-plan endpoint

### Files modified
- `backend/src/api/scheduler/scheduler.controller.ts`:
  - `TriathlonPlanTemplateService` injected into constructor
  - `generatePlan` endpoint restructured: raw `SchedulerSettings` entity loaded for triathlon field access; converted to model separately
  - Triathlon branch: if `sportType === 'triathlon'` and `triathlonDistance` missing → 400; otherwise `buildAndPersistTriathlonTemplate` generates + persists PlanWeeks + PlannedSessions, then plan is reloaded and scheduled as normal
  - `buildAndPersistTriathlonTemplate`: computes experienceLevel + periodisation via Part 2A static helpers, derives tier (experienced → tier4plus, else tier3), derives weeklyHours from STANDARD_WEEKLY_HOURS defaults, extracts calibration from settings, persists template in transaction
  - `deriveWeeklyHours`: tier/distance → hours lookup (matches STANDARD_WEEKLY_HOURS constants)
  - `SESSION_TYPE_WORKOUT_MAP`: added `run: 'running'` and `brick: 'biking'` for triathlon session types

### Acceptance checks
- Build: clean, 0 TypeScript errors
- POST `/scheduler/generate-plan` with triathlon plan + no `triathlonDistance` → 400 ✓
- POST with `olympic` distance + race date 16 weeks out → 200, 16 weeks scheduled, 112 events placed, 0 unplaced ✓
- Week 1 (base phase) sessions: 2×swim, 2×bike, 2×run, 1×strength (Tier 3 olympic template) ✓

### Architecture note
The `generate-plan` endpoint is now a unified "template + schedule" endpoint for triathlon plans. Non-triathlon plans continue to use the existing flow (template generated separately via `POST /plans/:id/generate`, then scheduled via `generate-plan`). The frontend will need to skip the separate `/plans/:id/generate` call for triathlon plans when calling `generate-plan`.

---

## 2026-04-27 — WP12A Part 4A: Frontend plan creation UI for triathlon

### Files modified
- `backend/src/training-plan/training-plan.entity.ts` — `totalWeeks` column gets `{ default: 0 }` so triathlon plans can be created without a frontend-calculated total
- `backend/src/training-plan/training-plan.dto.ts` — `totalWeeks` made optional in `CreateTrainingPlanDto` (`@IsOptional()` added)
- `backend/src/api/scheduler/scheduler.controller.ts` — after `buildAndPersistTriathlonTemplate` transaction, calls `trainingPlanService.update()` to persist actual `totalWeeks` (e.g. 14 for olympic)
- `src/app/core/models/app-data.models.ts` — 8 triathlon fields added to `SchedulerSettings`; `triathlonDistance` added to `TrainingPlan`; `PlanCreatePayload.totalWeeks` made optional, `triathlonDistance` added
- `src/app/features/onboarding/onboarding.models.ts` — 11 triathlon fields added to `OnboardingData` and defaults
- `src/app/features/onboarding/onboarding-step-sport.component.ts` — added "Triathlon (Full / 140.6)"; `setRaceEvent()` now also emits `triathlonDistance`
- `src/app/features/onboarding/onboarding-step-triathlon.component.ts` (NEW) — calibration step: general training toggle, triathlons completed, endurance pedigree, pool access, power meter, FTP/LTHR/CSS conditional inputs, RPE fallback info text
- `src/app/features/onboarding/onboarding-step-summary.component.ts` — added `isTriathlonPlan` computed + `stepFor()` helper; all Availability/Work/Cycle edit links use `stepFor()` to avoid step-number drift for triathlon users
- `src/app/pages/onboarding.page.ts` — `totalSteps` is now a computed (7 or 8); `stepDots` computed for template; `nextStep()`/`backStep()` skip step 4 for non-triathlon; `resolveSportType()` returns `'triathlon'` for triathlon plans; `generatePlan()` skips `generatePlanTemplate` for triathlon, saves calibration to scheduler settings before scheduling
- `src/app/pages/onboarding.page.html` — dots loop uses `stepDots()`; added `@case (4)` for triathlon step; shifted old cases 4→5, 5→6, 6→7, 7→8
- `src/app/pages/settings.page.ts` — `hasTriathlonPlan` computed; 9 triathlon calibration signals; `loadSettings()` hydrates them from schedulerSettings; `saveTriathlonCalibration()` method
- `src/app/pages/settings.page.html` — Triathlon Calibration accordion (shown only when `hasTriathlonPlan()`): FTP, LTHR, CSS, pool access, power meter, triathlons completed, endurance pedigree, periodisation override, save button
- `docs/known_bugs.md` — added periodisation override UX gap entry

### Correction #1 — totalWeeks
Backend `resolveTotalWeeks()` uses `plan.totalWeeks || PLAN_LENGTH_DEFAULT[distance]`. Making `totalWeeks` optional (default 0) means the backend falls back to the methodology defaults (sprint:10, olympic:14, 70.3:20, 140.6:27). After template generation, the controller updates `plan.totalWeeks` with the actual generated count so the UI shows correct progress. For race date provided, backend counts back from race date using this default length — full race-date-aware length calculation is a v2 item.

### Build
- Backend: clean, 0 TypeScript errors
- Frontend: clean, 0 TypeScript errors; onboarding-page chunk 48.75 kB, settings-page 54.36 kB

### Pending (browser test not yet run — awaiting approval)
- WP12B: real brick session logic (linked bike+run as single session type, T2 simulation)
- WP2 bundle: cycle-aware scheduling + energy schema + post-menopause mode
- Fix 500→401 for stale JWT userId (known_bugs.md)
- WP7A AI Coach UI fix (known_bugs.md)

## 2026-04-28 — WP12A Part 5A: Sport-aware UI rendering

### Files modified (9 total, 1 new)
- `src/app/core/models/app-data.models.ts` — added `discipline?` and `prescriptionData?` to `PlannedSession`
- `src/app/shared/utils/discipline-colors.util.ts` — NEW: shared discipline→color helper (grep "discipline" to find)
- `src/app/features/week/day-row/day-row.component.ts` — `eventColor`/`eventBg` delegate to discipline helper
- `src/app/features/today/event-card/event-card.component.ts` — `barColor` computed delegates to discipline helper
- `src/app/features/week/month-grid/month-grid.component.ts` — `eventTypeColor`/`eventBorderColor`/`eventBackground` delegate to discipline helper
- `src/app/features/workout/workout.page.ts` — added `prescriptionDiscipline`, `prescription`, `showPrescriptionCard` signals; `rxStr`/`rxArr`/`rxTargetLine` helpers
- `src/app/features/workout/workout.page.html` — discipline prescription card (swim/bike); run falls through to existing steps
- `src/app/features/workout/workout.page.scss` — prescription block styles
- `src/app/pages/stats.page.html` — swim distance displayed as meters (×1000), bike/run remain km

### Architecture decisions
- Discipline derived from `sessionType` prefix (`swim_*` / `bike_*` / `run_*`) — no `discipline` field added to `CalendarEvent`
- `prescriptionData` rendered from formatted strings (already formatted by template engine) — no client-side formatting helpers
- Month-grid mini-pills stay generic workout blue — they only have MonthEventLabel (no sessionType); discipline colors visible in day-sheet and week/today views
- `current-week-card` excluded — uses PlannedSession objects with intensity dots, no CalendarEvent color coding
- No new backend endpoints; stats API already returns swim data in km; frontend converts to meters at display only

### Colors chosen
- Swim: `#2a6ea8` (bright water blue, distinct from steel `--color-workout`)
- Bike: `#5c8a4a` (forest green, distinct from mealprep olive `#6B7F5E`)
- Run: `#d4782a` (warm orange, distinct from oncall amber `#C4923A`)
- Brick: `#7c5fa8` (purple, stub — not generated until WP12B)

### Build
- Frontend: clean (zero TypeScript errors, zero warnings)
- Backend: no changes this session

### Pending
- Browser verification steps 1-7 (user to perform)
- WP12B: real brick session logic
- WP2 bundle
- Fix 500→401 stale JWT
- WP7A AI Coach fix
