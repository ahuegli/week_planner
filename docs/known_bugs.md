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
   