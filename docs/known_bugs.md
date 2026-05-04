# Known bugs

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
| Onboarding `CycleStatus` enum does not map to backend `CycleMode` enum | High | Frontend collects "menopause" but backend has no matching mode |
| `saveCheckin()` in cycle.page.ts only console.logs — data not persisted | Medium | Needs energy_check_in + symptom_log tables (WP2) |
| **Write endpoints return 500 instead of 401 when JWT userId no longer exists in DB** | **High — fix next session** | Root cause: JWT in localStorage references deleted/missing user. Postgres FK violation ("verletzt Fremdschlüssel-Constraint"). Workaround: clear localStorage + re-login or re-register via `/api/v1/auth/register`. Fix: auth guard or global interceptor should catch missing-user and return 401. Investigate whether user table was affected by cascade during recent schema syncs. |
## WP7A AI Coach — UI broken, parked
- Text input field invisible/missing on /coach page
- Generic "couldn't reach server" error masks real failures (frontend 
  swallows actual error message, even after error handler was 
  rewritten — likely browser cache or fix didn't save)
- Suspected: 400 from backend on empty messages array, or DTO 
  validation mismatch
- Fix approach for next session: strip back to simple drawer pattern 
  rather than full chat page. Most apps work better with a one-shot 
  Q&A modal than a conversation history.
- Files to investigate: coach.page.html, coach.page.scss, coach.dto.ts


## Periodisation override not available in onboarding flow
Experienced triathletes who prefer reverse periodisation must create the plan first, then change the setting in Settings → Triathlon Calibration and regenerate. Future UX improvement: add an optional "I prefer reverse periodisation" toggle in onboarding step 4 for users who have checked 3+ triathlons completed or "experienced" pedigree.

## Triathlon plan generates only run sessions
Plan template service produces runs + strength + intervals correctly, 
but bike and swim sessions are missing for tri mode. Likely in 
plan-template.service.ts — missing sport branching when sportType === 
'triathlon'. Fix scope: investigate template generator, ensure all 
three disciplines get session types per training methodology doc.

## Shared calendar views show cached data
Recipient sees the owner's events as of the last time `GET /calendar-events/shared/:ownerId` was called (on page load). Changes the owner makes after that point are not pushed to the recipient in real-time. The recipient must navigate away and back (or refresh) to see updates. Real-time sync via WebSocket/SSE is a v2 item.

## No off-plan workout logging
Users can only log workouts that started as planned sessions. Need 
a "Log a workout" button on Today that opens the post-workout form 
without requiring a linkedSessionId. Stats should include these.


## Invite button missing on Today and Week views (WP4 polish gap)
The "Invite someone" button is only visible on monthly view event 
cards. Today page event-card and Week view day-row should also have 
it. Backend invite flow works fine — calling the API directly works. 
Just the entry-point UI is missing in two of four event-rendering 
components.

Files involved (all four event renderers):
- src/app/features/today/event-card/event-card.component.html/ts
- src/app/features/week/day-row/day-row.component.html/ts
- src/app/features/week/month-grid/month-grid.component.html/ts (working)
- src/app/features/plan/current-week-card/current-week-card.component.html/ts (intentionally excluded — different entity type)

Multiple Copilot attempts to fix it have failed silently — file 
saves report success but button never appears at runtime. Suspect 
a code path or component-tree issue we haven't surfaced yet.

Workaround for beta users: invite via month view only.

Underlying smell: four separate components rendering the same 
event UI with copy-paste drift. Resolution likely requires the 
shared event-card-actions extraction (see v2_roadmap.md).

Invite button missing on Today and Week views (WP4 polish gap)
The "Invite someone" button only renders on monthly view event cards.
Today page event-card and Week view day-row should also have it but 
multiple fix attempts failed silently — file saves report success, 
button never appears at runtime.

Backend invite flow works fine — only the entry-point UI is missing 
in two of four event-rendering components.

Workaround for beta: invite via month view only.

Resolution: extract shared event-card-actions component (see 
v2_roadmap.md "Architectural cleanup"). Single source of truth for 
manage-row UI fixes the visibility gap as a side effect.

## WP12 polish backlog (post-WP12B)

1. True beginner week-1 intensity is too aggressive. Engine should 
   apply a gentler initial scaler when experienceLevel === 
   'true_beginner' AND endurancePedigree === 'none'. Currently 
   week 1 of base phase feels intense for someone doing their 
   first triathlon.

2. Brick visual treatment works but rendering is rough. Polish 
   pass needed: stronger visual grouping (connected pill or shared 
   border), better off-bike label, possibly a single combined 
   card view.

3. Triathlon sessions don't show distance/pace targets like run 
   plans do. Need swim meters, bike km, run km on event cards 
   and workout pages. See Bundle 3 in v2_roadmap.md.


   ## Run threshold pace not in scheduler settings

Race-day plan generator falls back to RPE-only for run pacing 
because `runThresholdSecPerKm` doesn't exist in SchedulerSettings 
entity. Swim (CSS) and bike (FTP/LTHR) work correctly with numeric 
anchors.

Fix in v2 / WP12 polish: one column on entity, one DTO field, one 
generator check. Estimated 30 min CC.


## Triathlon plan creation doesn't always set triathlonDistance

Plans created via "quick goal switch" flow may have:
- sportType: "Triathlon (Olympic)" (display label, not enum)
- triathlonDistance: null

This breaks race-day plan generation (backend correctly rejects 
with 400 "triathlonDistance required").

Found Tuesday evening. Fix tomorrow:
- Audit plan creation paths for triathlon (onboarding flow vs quick 
  switch vs settings flow)
- Normalize sportType to enum 'triathlon' and persist 
  triathlonDistance reliably
- Possibly migrate existing rows where sportType matches 
  /^triathlon/i but distance is null

CC territory — multi-file logic + data migration consideration.


## Triathlon plan creation sometimes generates run-only sessions
Initial creation via quick-switch flow may produce a plan with 
only run + strength sessions (no swim, no bike) despite sportType 
being 'triathlon' and triathlonDistance set. Resetting the plan 
regenerates correctly with all four disciplines.

Hypothesis: race condition or wrong code path in initial generation. 
"Reset" takes a different route that works.

Diagnose after current CC SQL verification completes.

## Two same-discipline sessions same day not penalized
Scoring engine allows two runs (or two of any discipline) to land 
on the same day. Methodology says key sessions shouldn't double 
up same-day. Need penalty tuning or new constraint rule.

Diagnose alongside Bug A.


## Plan view week 1 generates run-only sessions (intermittent)
Despite triathlonDistance fix shipping Tuesday + Bug A fix shipping
Wednesday, plan view shows:
- Week 1: run-only with 2 long runs on Sunday
- Week 2: empty
- Week 3+: normal triathlon distribution

Suggests either:
- Race-condition between plan creation + initial template generation
- Plan view rendering pulls from a cache that doesn't refresh
- The initial weeks generate via a different code path than later weeks

Not blocking WP11. Diagnose alongside or after WP11B.

## Plan view doesn't show workout dates
The "Your Plan" weekly breakdown shows workout names + duration + 
distance but no specific date. Users can't tell when a workout is 
scheduled without going to the calendar.

Add concise date stamp per workout (e.g., "Mon, 27 May") in the 
expanded week view.

Single-component fix, ~15 min Copilot.

## Dark mode toggle in settings

Toggle exists but may not actually apply theme. To verify with 
Copilot:
- Confirm the toggle persists state to scheduler settings
- Confirm theme actually switches on toggle (CSS variables or 
  class on body)
- If toggle is decorative (UI only), implement actual theme 
  switching:
  - Use existing color palette CSS variables
  - Define dark equivalents (--color-bg-dark, etc.)
  - Apply 'dark' class to body when enabled
  - Persist to localStorage AND backend settings
- If broken, fix and verify across Today/Plan/Notes/Stats/Settings 
  pages

Single-day Copilot task once WP11B done.


## Generic triathlon "what to do" message on non-brick workouts
Some triathlon workouts (e.g., "Easy Run") show a generic 
methodology message: "Triathlon combines swim, bike, and run with 
phase-based progression. Brick workouts usually appear in build 
phase to train transitions."

This is meta-explanation about triathlon as a concept, NOT 
session-specific instructions. Should only show on brick sessions 
or as onboarding context, not on every individual easy run.

Fix: in workout-descriptions.ts, the triathlon-context-append 
logic should be conditional. Only append when:
- Session is a brick (genuinely needs the brick context)
- OR user is in their first week of triathlon training (general 
  context useful)
- Not on every workout in every week

Single-file Copilot fix, ~15 min.

## Workout descriptions audit

Some workout descriptions don't fit their session type or context 
well. The triathlon-context-on-every-workout was one example (now 
fixed for non-brick). Likely others.

Audit task: read through all entries in workout-descriptions.ts 
and verify each (sessionType × phase × duration bucket) message:
- Actually describes the session
- Doesn't generic methodology dump
- Matches the duration bucket (short/medium/long) appropriately
- Phase awareness is correct (base vs build vs peak vs taper)

Single-day Copilot task once WP11 done. Probably 1-2 hours of 
content review + edits.

## "I have time now" button not connected to task system

Today page "I have time now" feature (slot suggestion for 
unscheduled work) currently shows "You're all caught up" 
regardless of unscheduled tasks. Should:
- Read user's unscheduled notes (notes with hasn't been auto-placed 
  via find-time, where dueDate exists OR estimatedDuration is set)
- Pick a candidate based on: priority, due date proximity, fits 
  available time slot
- Suggest scheduling it now in the open time slot

Original WP3C "find time" feature partially does this but the 
Today-page "I have time now" entry point isn't wired correctly.

~30 min Copilot fix once WP14 ships.


## Skip reason not persisted to backend

UI captures the skip reason ("Sick/unwell", "Time constraint", etc.)
but doesn't send it to the backend. PlannedSession entity has no 
skipReason field. Add when WP14 hardening ships:
- Add @Column({ nullable: true }) skipReason: string | null to 
  planned-session.entity.ts  
- Update PlannedSessionDto with optional field
- Update markSkipped() to accept + save reason
- Frontend already sends the reason in the request body — wire to 
  controller param

~30 min CC fix.

## Cycle-aware sizing not in plan generator (v1.5)

Audit confirmed (2026-05-04): cycle phase IS used in scoring 
engine (placement layer) but NOT in sizing engine (generation 
layer). Methodology says luteal phase should reduce volume 
10-15%, but current sizing produces full volume regardless.

Effect: athletes with cycle tracking enabled get full-volume long 
sessions in luteal weeks. Scheduler may place them on better days, 
but distance/duration aren't reduced.

Fix scope (~2-3h CC):
- training-plan.service.ts fetches CycleProfile data
- Forwards to template services as part of generation context
- computeRunProgressionScaler and triathlon equivalent apply 
  luteal multiplier (0.85-0.90)

Defer to v1.5 — real beta users will inform the magnitude of 
adjustment. Document in cycle settings UI: "Cycle-aware volume 
adjustments coming soon."

## Cycle staleness not guarded
Phase computed confidently even when last period logged 60+ days 
ago. Should reduce confidence × 0.5 when staleness >45 days.
~30 min Copilot fix.

## bikeIntent rendering not wired
Field generated and persisted but no frontend component consumes 
it for display. Either wire into workout descriptions or document 
as future hook for premium AI coaching.
~30 min Copilot fix once decided.

## Peak performance window UI vs engine
Today page banner suggests hard sessions guaranteed in follicular 
phase. Engine offers soft bonus only. UI message should be softened 
to "Generally a good time for harder sessions" or engine should be 
upgraded to harder constraint.
~15 min copy fix OR ~1h engine work.
