# Saturday Verification Report
**Date:** 2026-04-26  
**Reviewer:** Claude Sonnet 4.6 (diagnostic pass — read-only)  
**Scope:** WP1, WP2, WP3, WP3C, WP5, WP6, WP7A

---

## WP1 — Dedicated Workout Page

**Spec calls for:**
- 1A: Pre-workout view — session header, step-by-step structure (warm-up, main, cool-down), equipment checklist, weather placeholder, "Start Workout" timer button, "Ask my coach" section
- 1B: During-workout timer with interval support, pause/resume, "End Early" with reason
- 1C: Post-workout energy rating, actual distance/pace/duration, notes field, well-done confirmation, data saved to planned session + new `workout_logs` table
- 1D: Workout history on Plan tab

**Actually shipped:**
- `src/app/features/workout/workout.page.ts` (full component with pre/post states)
- `backend/src/workout-log/` (entity, DTO, service, controller, module — all present)
- `src/app/core/services/workout-log-api.service.ts` (not explicitly read but confirmed via import in workout.page.ts)
- Route `/workout/:eventId` registered in app.routes.ts with authGuard
- Pre-workout: header with phase context, step-by-step structure via `getWorkoutStructure()`, workout description via `getWorkoutDescription()`, cycle-aware coaching note, "Ask my coach" navigates to `/coach`
- Post-workout: energy rating, actual duration, distance, pace, speed, HR, max HR, calories, elevation, notes — all fields present and saved via `workoutLogApi.create()`
- Completion wires to `dataStore.completeSession()` and `dataStore.updateCalendarEvent()` with `status: 'completed'`

**MATCHES:**
- Post-workout data model is rich and matches spec intent (1C)
- `workout_logs` table exists with all expected columns
- Pre-workout phase context and coaching note wired correctly
- "Ask my coach" button navigates to `/coach` with workout context
- Route is registered

**MISMATCHES:**
- **1B (During-workout timer) is not implemented.** The component has states `'pre' | 'during' | 'post'` defined but the `'during'` state has no actual timer UI — tapping "Start Workout" triggers `goToPostWorkout()` directly, skipping the timer entirely. No interval timer, pause/resume, or "End Early" flow exists.
- **1D (Workout history on Plan tab)** is not implemented — plan.page.ts was not modified to show per-session completion history.
- **No equipment checklist or weather placeholder** in the pre-workout view (the spec called for these; they were dropped).

**BUGS DETECTED:**
- `goToPostWorkout()` skips `'during'` state entirely: `this.pageState.set('post')` — the timer was planned but not built. If a user taps "Start Workout," they land on the post-workout form immediately with no opportunity to actually track the workout in progress.
- `acceptSuggestion()` in coach.page.ts is a no-op stub (just calls `dismissSuggestion`) — not a WP1 bug, but surfaced here as scope creep.

**SCOPE CREEP:**
- Cycle-phase awareness integrated into workout page (cyclePhaseInfo, cycleCoachingNote, cyclePhaseLabel) — this was not in the WP1 spec but is a sensible cross-feature enhancement.
- Sport-category-aware post-workout fields (distance gated on running/cycling/swim, pace gated on running, speed on cycling) — goes beyond the basic spec, positive addition.

**INCOMPATIBILITIES:**
- None. WP1 backend does not conflict with WP3 or WP6.

---

## WP2 — Cycle-Aware Scheduling

**Spec calls for:**
- 2A: Load cycle profile on scheduling, compute phases per day, pass into `WeekContext` via `cyclePhasesByDay` and `cycleTrackingEnabled`
- 2B: Phase-based scoring — luteal/menstrual penalize hard sessions, follicular/ovulation boost them
- 2C: Read `cyclePhaseRules` from planned sessions and layer on top of phase defaults
- 2D: Cycle-aware workout descriptions (different text per phase)

**Actually shipped:**
- `CycleProfileService.computePhasesForWeek()` exists and is called in `scheduler.controller.ts` for both `generate` and `generate-plan` endpoints — phase data is injected into `weekContext`
- `ScoringEngineService.cyclePhaseAdjustment()` implemented with full penalty matrix (luteal hard endurance −0.6, menstrual hard endurance −0.5, follicular +0.2, ovulation injury caution −0.1)
- `cyclePhaseRules` from planned sessions is read and applied on top (additional ±0.2 adjustments)
- Confidence scaling applied: `raw * confidence` (reduces impact when cycle data is sparse)
- Workout page (WP1) shows cycle-phase coaching note inline (cycle-aware descriptions, spec 2D)
- Settings page has `cycleAwareSchedulingEnabled` toggle that persists to backend

**MATCHES:**
- 2A: Phase injection is fully wired in both generate endpoints
- 2B: Penalty matrix broadly matches spec intent (luteal caps, follicular boosts)
- 2C: `cyclePhaseRules` field is read and applied in `cyclePhaseAdjustment()`
- 2D: Cycle descriptions present in workout page

**MISMATCHES:**
- **Spec says menstrual penalty = −0.2 for hard sessions; code has −0.5.** The spec (work_packages.md) says "−0.2 for hard sessions" in the menstrual phase. The scorer applies −0.5. This is not necessarily wrong — decisions.md shows tuned values were hand-decided — but it's a deviation from the spec as written.
- **Spec says follicular gets +0.2 bonus for speed work specifically.** The scorer gives +0.2 for any hard endurance or hard strength during follicular, which is broader than "tempo/intervals." Minor.
- **No post-menopause mode added.** decisions.md and known_bugs.md both list adding `post_menopause` to the backend `CycleMode` enum as a WP2 target. The frontend `CycleMode` type still only has `'natural' | 'hormonal_contraception' | 'perimenopause' | 'manual'` — `post_menopause` absent.
- **`saveCheckin()` now calls real DataStore methods** (`saveEnergyCheckIn`, `saveSymptomLog`) but energy check-in and symptom log infrastructure was presumably added as part of WP2 — needs verification that those backend tables exist.

**BUGS DETECTED — CYCLE SCORING MATH (CRITICAL INVESTIGATION):**

This is the focus area: can the cycle phase penalty overcome the free-day Sunday bonus?

From the code, for a long run on a shift-free Sunday in luteal phase:
- `longSessionFreeDayBonus`: **+0.5** (no shift on day) + **+0.2** (wide window) = **+0.7**
- `offDayBonus`: **+0.6** (no shifts, no other events)
- `cyclePhaseAdjustment` for hard endurance in luteal: raw = **−0.6**, multiplied by confidence

At confidence = 1.0 (well-established cycle, no variability): cycle penalty = **−0.6**

Total for Sunday luteal long run: roughly +0.7 + 0.6 − 0.6 = **+0.7**  
vs. a Wednesday in follicular (shift day, no free-day bonus): roughly +0.0 + 0.0 + 0.2 = **+0.2**

**Sunday still wins by ~+0.5 even at maximum cycle penalty.** This confirms the bug: the combined free-day bonus (+0.7) plus off-day bonus (+0.6) totals +1.3, and the maximum cycle phase penalty (−0.6 at confidence 1.0) is insufficient to override it. A long run on a shift-free Sunday will be preferred by the scheduler even during luteal phase regardless of cycle state. The cycle phase influence is cosmetic for long sessions on free days.

At typical confidence (medium variability, 3+ history): confidence ≈ 0.75, so penalty = −0.45. The gap widens further.

**This is a real bug.** The cycle-phase scoring for long sessions needs to be stronger (e.g., −1.2 for luteal hard endurance) to compete with structural bonuses, or the `longSessionFreeDayBonus` needs to be conditionally capped by phase.

**SCOPE CREEP:**
- `cyclePhaseInfo` and `cycleCoachingNote` added to workout page — useful cross-WP enhancement
- `reminder-library.ts` created with cycle-aware reminders (not explicitly spec'd in WP2, useful for future)

**INCOMPATIBILITIES:**
- None detected.

---

## WP3 — Notes & To-Do System (3A + 3B)

**Spec calls for:**
- 3A: `notes` entity (id, userId, title, body, dueDate, dueTime, isScheduled, linkedCalendarEventId, completed, createdAt), CRUD endpoints with JWT auth
- 3B: Notes UI on Today page, quick-add, three states (note / deadline / scheduled), "Should I find time" prompt, swipe to complete

**Actually shipped:**
- Complete `backend/src/note/` module (entity, DTO, service, controller, module)
- Entity has all spec'd columns plus `estimatedDurationMinutes`, `wantsScheduling`, `completedAt`, `updatedAt` (good extensions)
- `@ManyToOne` to CalendarEvent with `onDelete: 'SET NULL'` for `linkedCalendarEventId`
- Dedicated `/notes` page at its own route (not embedded in Today page as spec'd)
- DataStore has `notes` signal + `loadNotes`, `addNote`, `updateNote`, `toggleNoteComplete`, `deleteNote`, `createNoteEventFromSlot`
- Notes tab visible in bottom nav

**MATCHES:**
- Backend entity matches spec with sensible additions
- All 6 CRUD operations present and userId-scoped
- Notes signal + optimistic updates
- Route registered with authGuard

**MISMATCHES:**
- **Spec 3B says notes appear on the Today page "below workouts, above tips."** The implementation created a separate `/notes` route instead. The Today page was not modified. This is a significant deviation from spec — the notes are in a silo, not integrated into daily workflow.
- **"Swipe to complete"** not implemented — uses a tap-checkbox instead. Acceptable for web but differs from spec.
- **"Note indicator dots on Month view"** (spec 3C) not implemented — week.page.ts `buildMonthDays()` does not include note indicators.
- **"Week view: notes with dates appear as small cards on their day"** (spec 3C) not implemented.

**BUGS DETECTED:**
- `UpdateNoteDto` does not include `linkedCalendarEventId` — the backend cannot be updated with a link via PUT. DataStore's `createNoteEventFromSlot` calls `noteApi.update(note.id, { linkedCalendarEventId: normalizedCreated.id })` — this payload field will be silently ignored by the backend because it's not declared in `UpdateNoteDto`. **The note → calendar event link will not persist to the database.** The client UI will show it (optimistic update) but after a page reload it will be gone.
- `NoteService.remove()` does not cascade-delete the linked calendar event at the database level — this is by design (the `onDelete: 'SET NULL'` sets the FK to null if the CalendarEvent is deleted, but note deletion doesn't propagate to the CalendarEvent). DataStore handles this in JavaScript, which is correct.

**SCOPE CREEP:**
- `estimatedDurationMinutes` and `wantsScheduling` fields added to entity/DTO — these belong to WP3C but were pre-emptively added.
- `completedAt` timestamp tracked — useful but not spec'd.

**INCOMPATIBILITIES:**
- The missing `linkedCalendarEventId` in `UpdateNoteDto` directly breaks WP3C's slot-selection flow (see WP3C section).

---

## WP3C — Slot Suggestion / "Find time for this"

**Spec calls for:**
- Part 1: Toggle gated on `canScheduleNote` (duration required)
- Part 2: `SlotSuggestionService` — candidate generation with 90-min block throttle, score via `/scheduler/score`, top 3 per spec
- Part 3: `SlotPickerDialogComponent` — modal with 3 slot cards
- Part 4: Wire `saveNote()` to trigger slot flow
- Part 5: DataStore `createNoteEventFromSlot()` method
- Part 6: Visual indicator ("Scheduled for..." / "Scheduling pending")
- Part 7: Edge cases (cascade delete, stale link detection, duration change, no-plan fallback)

**Actually shipped:**
- All 7 parts implemented and present in code
- `SlotSuggestionService` exists at `src/app/core/services/slot-suggestion.service.ts`
- `SlotPickerDialogComponent` at `src/app/components/slot-picker-dialog/`
- Notes page wires all flows correctly
- `createNoteEventFromSlot` in DataStore with optimistic update + rollback
- Cascade-delete of linked event implemented in `deleteNote()`
- "Scheduling pending — retry" state and indicator present

**MATCHES:**
- Toggle gate with `canScheduleNote` computed signal — matches spec exactly
- Duration effect auto-disables toggle (effect-based)
- 90-min block throttling documented in code comment
- Slot picker modal UI matches spec structure
- "Scheduled for [day] [time]" indicator shows and links to week view
- Retry button for pending-but-unlinked notes
- No-plan fallback (scores against existing events only)

**MISMATCHES:**
- **Critical: `UpdateNoteDto` missing `linkedCalendarEventId`** (inherited from WP3 bug). After the user picks a slot and `createNoteEventFromSlot` runs, the PATCH to `noteApi.update(note.id, { linkedCalendarEventId: ... })` sends a payload the backend ignores. The local signal updates correctly but the DB row retains `linkedCalendarEventId = null`. On next page load the note loses its link.
- **Slot suggestion calls `/score` with `type: 'workout'`** (line 57 of slot-suggestion.service.ts) explicitly noted in a comment as a workaround since `'custom-event'` type isn't handled. This means the scoring applies workout-specific bonuses/penalties (off-day bonus, stacking penalties) to a note-derived event. For the purpose of finding a good time this is reasonable but technically incorrect.
- **Spec Part 7 — "calendar event deleted while note has link"** detection is not implemented. The spec says "detect on next page load, clear `linkedCalendarEventId` and revert `wantsScheduling` to false." No such reconciliation logic exists.

**BUGS DETECTED:**
- The link persistence bug (UpdateNoteDto) is the highest-priority issue in WP3C.
- `resolveWeekStart()` when `dueDate` is null returns "upcoming Monday" but uses `(8 - ref.getDay()) % 7` — when today IS Monday (`getDay() === 1`), this returns `7` (next Monday) rather than 0 (this Monday). So notes without a due date always suggest slots starting next week, never the current week if today is Monday. Minor edge case.

**SCOPE CREEP:**
- None beyond what was spec'd.

**INCOMPATIBILITIES:**
- None with other WPs.

---

## WP5 — Stats Dashboard

**Spec calls for:**
- 5A: Basic dashboard (weekly summary card, completion streak, completion rate chart — last 8 weeks)
- 5B: Sport-specific stats (running distance/pace, cycling distance/speed, strength sessions)
- 5C: Gamification (streak counter, weekly badges, fun milestone messages)
- 5D: Plan progress visualization (ring/bar, phase timeline, race readiness score)

**Actually shipped:**
- `src/app/pages/stats.page.ts` (full component)
- `backend/src/stats/` (service with getSummary, getWeekly, getStreaks, getSportStats)
- Frontend: completion ring, weekly bar chart with duration/distance toggle, sport-specific expandable cards, badge calculator, motivational messages
- Backend: reads from `workout_logs` and `planned_sessions` tables

**MATCHES:**
- 5A: Weekly summary, completion rate, streak counter all present
- 5B: Sport stats for running/cycling/swimming/strength/yoga with weekly trend (8 weeks)
- 5C: `calculateBadges()` utility, motivational message rotation
- Route registered at `/stats` with authGuard

**MISMATCHES:**
- **5D: Plan progress visualization (ring/bar, phase timeline, race readiness score)** is partially implemented. The completion ring shows `thisWeek.completed / thisWeek.total`, not plan-level progress. There is no phase timeline or race readiness score. `currentPlan` info is returned in the summary endpoint but the frontend stats.page.ts does not render a plan progress section.
- **Stats not accessible from the main navigation.** The bottom-tab-nav was not updated to include a Stats tab. Stats is accessible only by navigating to `/stats` directly (e.g., from a URL or back button). The spec says "new tab or accessible from Today page gear menu" — neither is wired.
- **`getWeekly()` returns last 12 weeks, but spec says "last 8 weeks."** Minor — more data is harmless.

**BUGS DETECTED:**
- `StatsService.getStreaks()` uses logs ordered by `completedAt ASC` for `workoutLogService.findAllByUser`, then slices `logs.slice(0, 5)` in prompt builder. The streak day-calculation loop in `getStreaks` starts from today and walks backward — it will break the streak if today has no log entry even if yesterday did (it checks `logDates.includes(dateStr)` where `checkDate` starts at today). A user who just woke up and hasn't trained yet would always show `currentDayStreak = 0`. This is a minor UX quirk, not a hard bug.
- `getSportStats()` weekly trend calculation: `weekStart.setDate(thisMonday.getDate() - (7 * (7 - i)))` — for `i = 0` this is `thisMonday - 49 days`, for `i = 7` it's `thisMonday`. The intent is 8 weeks ending this week. The math produces weeks ending THIS Monday (not this Sunday), which is off by 6 days. Logs completed on Mon–Sun of any week may be miscounted.

**SCOPE CREEP:**
- `MiniBarChartComponent` and `badge-calculator` utility created as standalone feature components — reasonable decomposition.

**INCOMPATIBILITIES:**
- None.

---

## WP6 — Conflict Resolution

**Spec calls for:**
- 6A: Conflict detected when adding personal event that overlaps workout, bottom sheet suggesting move
- 6B: Smart reschedule rules (minimal disruption, max 2 session moves, respect `isManuallyPlaced`)
- 6C: Settings shift change → auto-reschedule

**Actually shipped:**
- `backend/src/api/scheduler/scheduler.controller.ts`: `POST /check-conflicts` and `POST /apply-conflicts` endpoints
- `src/app/core/services/conflict-detector.service.ts` — thin wrapper calling `checkConflicts`
- `src/app/shared/conflict-resolution-dialog/` — modal with accept/reject per conflict
- `week.page.ts` integrates conflict check in `onEventUpdated()` and `onQuickAddEvent()`
- Settings page calls `syncRecurringShiftsAndReschedule` → shows reschedule prompt (6C)
- Backend respects `isManuallyPlaced` (filtered from `sameDayWorkouts`) and skips `completed` sessions

**MATCHES:**
- 6A: Conflict detection fires when adding non-workout events (shifts, personal, custom)
- 6B: Suggestion logic tries ±60/90/120 min same-day, then adjacent days
- 6C: Settings save triggers shift sync + reschedule with user confirmation
- `isManuallyPlaced` respected in `checkConflicts` backend filtering
- Completed sessions are protected (`completedEventIds` set built from `plannedSessionRepository`)

**MISMATCHES:**
- **Spec says "max 2 sessions to accommodate 1 change."** Backend slices `toProcess` to 2 (`sameDayWorkouts.filter(...).slice(0, 2)`), which is correct, but there is no check limiting total moves across the whole event edit flow (a shift change could trigger reschedule of many weeks via `rescheduleConflicts`).
- **`conflictingEventIds` in `week.page.ts`** (the local visual overlap highlighting) checks ALL event pairs including workout vs. workout, which is useful for display but the actual conflict check only fires for non-workout events being added/edited. Completing or editing an existing workout does not trigger the WP6 flow — only `onEventUpdated` with `event.type !== 'workout'` triggers it.
- **6D (Weekly schedule refinement Sunday prompt)** not implemented.

**BUGS DETECTED:**
- `checkConflicts` backend only queries events in `[date-1, date, date+1]` range. If a shift spans midnight or a commute buffer bleeds into the next day beyond +1, events outside that window won't be detected.
- The conflict suggestion logic (`generateConflictSuggestion`) uses hardcoded candidate times `[6*60, 7*60, 8*60, 17*60, 18*60, 19*60]` for adjacent-day moves, ignoring the user's `preferredWorkoutTimes` setting.
- When `onEventUpdated` receives a completed workout event, it calls `dataStore.completeSession()` and returns early, skipping conflict check — correct behavior. However, it does not handle `event.type === 'workout'` with a status other than `'completed'` (e.g., editing a workout's time). Editing a workout's time via the detail modal will not trigger conflict detection against other events.

**SCOPE CREEP:**
- None.

**INCOMPATIBILITIES:**
- None.

---

## WP7A — AI Coach Integration

**Spec calls for:**
- 7A: Anthropic API key in backend .env, rate limiting, cost tracking, prompt template system, base coaching prompt with user context

**Actually shipped:**
- `backend/src/ai/ai.service.ts` — Anthropic SDK, `claude-sonnet-4-20250514`, 500 max tokens
- `backend/src/ai/coach-prompt.builder.ts` — loads plan, sessions, cycle profile, recent logs (last 5), upcoming events, scheduler settings
- `backend/src/ai/coach.controller.ts` — `POST /coach/chat`, JWT-guarded, trims to last 5 messages, parses `suggestedAction` JSON block from reply
- `backend/src/ai/coach.dto.ts` — `CoachChatRequestDto`, `CoachChatResponseDto`, `SuggestedActionDto`
- `src/app/features/coach/` — full chat page with starter chips, input field, message bubbles, typing indicator, suggestion cards
- `src/app/core/services/coach-api.service.ts`
- Route `/coach` registered
- ANTHROPIC_API_KEY present in `backend/.env`
- AiModule imports all domain modules for context building

**MATCHES:**
- API key configured
- Context loading from all major domain entities (plan, sessions, cycle, logs, events, settings)
- JWT-guarded endpoint
- Suggested action parsing and pass-through to frontend
- Starter chips, chat history, error handling in frontend

**MISMATCHES:**
- **No rate limiting implemented.** Spec 7A calls for "rate limiting (budget per user per day)" and "cost tracking." The controller has no per-user throttle or token budget. Any authenticated user can send unlimited requests at full AI cost.
- **No prompt template table.** Spec says "prompt template system reading from `prompt_templates` table." The system prompt is hardcoded in `CoachPromptBuilder`.
- **`acceptSuggestion()` is a stub** that just calls `dismissSuggestion()`. Suggested actions (reschedule, skip, swap) are displayed but can't be acted upon from the coach UI.
- **Known bug from `known_bugs.md`:** text input field was invisible/missing, generic error masked real failures. The current coach.page.html uses `<textarea>` with `[value]="inputText()"` — this pattern works in Angular with signals but is unusual; `[(ngModel)]` would be cleaner. Visually the field should render now with the textarea approach.

**BUGS DETECTED:**
- `AiService.chat()` throws unhandled exceptions if the Anthropic API returns an error — there is no try/catch in `ai.service.ts`. If the API key is invalid or rate-limited, the NestJS exception filter will catch it but the error response will be a generic 500, not a useful message. `coach.controller.ts` also has no error handling, so any API failure becomes a 500 to the client, which the frontend shows as "couldn't reach the server."
- **The model ID `claude-sonnet-4-20250514` may not be valid.** The current Claude Sonnet 4 model ID should be verified — if it's incorrect the API will return a 400 and the frontend will show the generic error. This is a likely culprit for the known bug.
- `CoachPromptBuilder` calls `workoutLogService.findAllByUser(userId)` with no limit — for a long-running user with hundreds of logs this loads all records. Only `slice(0, 5)` is used. Should query with a limit.
- The backend hardcodes `model: 'claude-sonnet-4-20250514'` with `max_tokens: 500`. No configuration or override mechanism exists.

**SCOPE CREEP:**
- `CoachPromptBuilder` is more sophisticated than the spec required — it pulls from 5 different domain services and builds a rich context. This is positive scope creep.

**INCOMPATIBILITIES:**
- **CRITICAL: `backend/.env` contains the Anthropic API key in plaintext and what appears to be a real Supabase DB password.** This file should not be committed to the repository. The current `.gitignore` status of this file is unknown from this diagnostic — must be verified immediately.

---

## Cross-Cutting Findings

### isFreeDay predicate — exact condition

In `src/app/features/week/day-row/day-row.component.ts` line 78:

```typescript
protected readonly isFreeDay = computed(() => !this.visibleEvents().some((event) => event.type === 'shift'));
```

**The predicate marks a day as "free" if and only if it has no shift events.** Days with workouts, meal prep, personal events, or custom events are still considered "free" by this predicate. The coloring/styling tied to `isFreeDay` applies to any day without a shift, regardless of how many other events it has.

In `week.page.ts` `buildMonthDays()` at line 649:
```typescript
isFreeDay: dayEvents.length === 0,
```

The month view uses a stricter definition: `isFreeDay` is only true when there are **zero events** of any kind. So the two views have inconsistent definitions of "free day":
- **Day row (week view):** free = no shifts (workouts/personal events don't disqualify)
- **Month grid:** free = no events at all

This inconsistency means a day with only a workout shows as "free" in the week view styling but NOT free in the month grid. It's not a crash-level bug but it creates visual inconsistency.

---

### Type drift — Frontend vs Backend

**CalendarEvent — frontend interface vs backend entity:**
- Frontend `CalendarEvent` has `duration?: number` (duplicate of `durationMinutes`) — backend entity only has `durationMinutes`. The frontend carries both and uses `event.duration ?? this.durationFromTimes(...)` in several places.
- Frontend has `distanceTarget?: number` — not present in backend entity (backend has `distanceKm` on the scheduler model but CalendarEvent entity doesn't have it). This field is only set by the frontend via linked session data, not stored on the event itself.
- Frontend has `workoutType?` on CalendarEvent — backend CalendarEvent entity does not have this column. It comes from the linked PlannedSession. No mismatch in DB but the frontend interface treats it as a first-class CalendarEvent property.
- Frontend `CalendarEventType` includes `'personal'` and `'oncall'` — backend entity uses these types too (inferred from controller code), alignment looks fine.

**Note — frontend interface vs backend entity:**
- Frontend `Note.completedAt` is `string | null` — backend is `Date | null`. TypeORM returns it as a date object but JSON serialization converts to ISO string, so this works in practice.
- Frontend `Note.updatedAt` is `string` — backend has `@UpdateDateColumn()`. Match via JSON serialization.
- **Frontend `UpdateNotePayload` does not include `linkedCalendarEventId`** (the critical bug flagged in WP3). The backend `UpdateNoteDto` also lacks it. Both sides are consistently wrong.

**WorkoutLog — frontend vs backend:**
- `frontend WorkoutLog` interface (in app-data.models.ts lines 331–349) matches backend entity closely.
- Backend has `endedEarlyReason?: string` — frontend interface does not have this field. Not a functional issue as the frontend never sets it.

**SchedulerSettings — frontend vs backend:**
- Frontend `SchedulerSettings` lacks `preferredWorkoutTimes`, `runningDistanceThreshold`, `bikingDistanceThreshold`, `swimmingDistanceThreshold`, `enduranceRestDays` fields that exist in the backend entity. These are loaded from DB but not surfaced in the frontend model, causing settings.page.ts to hardcode fallback values (`distanceKm: 15`, `enduranceRestDays: 1`) in the scheduler payload instead of reading the user's actual configured thresholds.

---

### WP6 × WP3C Integration

**Flow:** Note saved with `wantsScheduling: true` → `SlotSuggestionService.suggestSlotsForNote()` → `SlotPickerDialogComponent` → user picks slot → `DataStore.createNoteEventFromSlot()` → creates CalendarEvent → does NOT call `conflictDetector.check()`.

**The slot creation bypasses WP6's conflict detection entirely.** When `createNoteEventFromSlot` calls `calendarEventApi.create()`, it goes through the standard calendar event creation API endpoint — the conflict check is only wired in the frontend at the Week page's `onQuickAddEvent()` and `onEventUpdated()` handlers. The Notes page has no such check. A note-derived calendar event can be placed at a time that overlaps an existing workout without any warning.

The slot suggestion service does check for overlaps with 15-minute buffers (`overlapsEvents`), so it won't _suggest_ a conflicting slot — but it only looks at events already in the DataStore signal at the time of scoring. If a new event was added by another tab or if the store is slightly stale, a conflict is possible.

**Verdict:** Not a hard integration break, but the conflict-detection contract is not honored for note-scheduled events.

---

## Final Summary

### Overall Ship Quality: **has-real-issues**

The core features are functional and the code quality is generally high. The critical issues are mostly data persistence bugs and missing integrations rather than architectural failures.

---

### TOP 5 Highest-Priority Issues to Fix Before WP4

**#1 — `UpdateNoteDto` missing `linkedCalendarEventId` (WP3C data loss)**  
When a user schedules a note, the link to the calendar event is not persisted to the database. On page reload, the note shows as unscheduled. Fix: add `@IsOptional() @IsString() linkedCalendarEventId?: string | null` to `UpdateNoteDto` in `backend/src/note/note.dto.ts`.

**#2 — Cycle phase penalty too weak to influence long-session placement (WP2 scoring bug)**  
The free-day bonus (+0.6 off-day + up to +0.7 longSessionFreeDayBonus = +1.3) is never overcome by the maximum cycle phase penalty (−0.6 at confidence 1.0). A long run on a free Sunday will always be preferred over any other placement regardless of cycle phase. Fix: scale luteal/menstrual penalties for long endurance sessions to at least −1.5, or apply a conditional cap on `longSessionFreeDayBonus` when cycle penalty is active.

**#3 — AI Coach: no rate limiting + model ID may be wrong (WP7A)**  
No per-user token budget or request throttle exists. With a live API key in production, any authenticated user could run up uncapped AI costs. Also verify model ID `claude-sonnet-4-20250514` is correct — this is likely what caused the "couldn't reach server" bug in known_bugs.md. Fix immediately by adding a rate limiter (e.g., per-user 10 requests/day counter in DB) and confirming the model string.

**#4 — `backend/.env` contains plaintext credentials (security)**  
The file at `backend/.env` contains a Supabase DB password and Anthropic API key. Verify this file is in `.gitignore` and has not been committed to git history. If it's been pushed to the remote, rotate both credentials immediately.

**#5 — Notes page not integrated into Today page (WP3B spec deviation)**  
The spec required notes to appear on the Today page. A separate `/notes` route was built instead. This significantly reduces discoverability and daily-use friction. Either move the notes section into Today page (preferred) or add a prominent entry point from Today.

---

### Blockers for Beta Deployment

1. **Credential exposure** — if `backend/.env` is in git history, the Supabase password and Anthropic API key are public. Must verify and rotate before any public deployment.
2. **`synchronize: true`** — known bug, listed in known_bugs.md. Schema auto-sync in production is a data integrity risk. Requires migration step before beta.
3. **AI rate limiting absent** — with a live API key and no throttle, a small number of power users could generate significant monthly API costs before launch.
4. **500 instead of 401 for stale JWT users** — documented in known_bugs.md, high severity. A user whose DB row was deleted (e.g., during schema syncs) gets a confusing 500 on all write operations. This needs an auth middleware fix before beta.
5. **WP1B (during-workout timer) missing** — the workout page jumps from "Start Workout" directly to the post-workout form. This is a regression relative to the spec and will surprise users who expect a timer. Not a data correctness blocker but a UX blocker for beta if the workout page is a key feature.
