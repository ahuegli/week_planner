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