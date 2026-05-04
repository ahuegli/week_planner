# WP13 Spec — Off-Plan Workout Logging

**Goal:** Allow users to log workouts that weren't on their training plan. Currently the app only logs completion of pre-scheduled `PlannedSession` events. If a user does an unplanned yoga class or spontaneous run, there's no path to record it.

**Estimated effort:** 1-2 hours CC.

---

## Why this matters

Real users don't always follow plans. A user who:
- Did an unplanned hike on Saturday
- Took a yoga class their friend invited them to
- Went for a spontaneous run on a free day
- Did a strength session at the gym while traveling

...currently has no way to log it. The session disappears from their training history. Stats undercount their actual training. The app feels rigid.

This is a small but high-friction gap.

---

## Design principles

1. **One-tap entry from Today page.** "Log a workout" button always visible, prominent enough to find but not distracting from planned content.

2. **Minimal required fields.** Type + duration is enough. Distance/intensity/notes optional.

3. **Counts toward stats and streaks.** Off-plan workouts contribute to weekly volume, streak counters, badges — same as planned ones.

4. **No retroactive plan adjustment.** Logging an off-plan session doesn't reshuffle upcoming sessions. The plan stays as-is.

5. **Distinguishable in history.** Off-plan workouts have a subtle visual marker (e.g., "logged" tag) so users can see plan adherence vs supplementary work.

---

## Pre-flight reading for CC

- `backend/src/workout-log/workout-log.entity.ts` — existing entity
- `backend/src/workout-log/workout-log.service.ts` — existing service
- `backend/src/workout-log/workout-log.controller.ts` — existing endpoints
- `backend/src/planned-session/planned-session.entity.ts` — to understand the link
- `src/app/pages/today.page.ts` — where new button lands
- `src/app/features/workout/workout.page.ts` — existing post-workout form
- `src/app/core/services/data-store.service.ts` — log-workout method

---

## Part 1 — Backend support for unlinked workout logs

### 1.1 WorkoutLog entity changes

Current entity probably requires `plannedSessionId`. Make it nullable:

```typescript
@Column({ type: 'uuid', nullable: true })
plannedSessionId: string | null;
```

If the field is already required, this is a small migration but synchronize handles nullable additions cleanly.

### 1.2 Add fields to capture off-plan context

```typescript
@Column({ type: 'varchar', nullable: true })
sessionType: string | null;  // 'run', 'swim', 'bike', 'strength', 'yoga', 'other'

@Column({ type: 'int', nullable: true })
durationMinutes: number | null;

@Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
distanceKm: number | null;

@Column({ type: 'varchar', length: 50, nullable: true })
title: string | null;  // user-provided, e.g., "Trail run with friends"
```

If these or equivalent fields already exist on the entity (workout.page post-form already collects some), reuse them.

### 1.3 Service method updates

`workoutLogService.create()` should accept logs with no `plannedSessionId`. When unlinked, the log is "off-plan" — no validation against any plan/session.

### 1.4 DTO updates

`CreateWorkoutLogDto`:
- `plannedSessionId` becomes optional
- New optional fields validated per type

### 1.5 Acceptance criteria for Part 1

- POST `/api/v1/workout-logs` with `{ sessionType: 'yoga', durationMinutes: 60, completedAt: '...' }` returns 201
- GET responses include both linked and unlinked logs
- Stats endpoints aggregate both into totals
- Existing planned-session-linked logs unaffected

---

## Part 2 — Frontend "Log a workout" button + form

### 2.1 Today page button

Add a button on Today page header or below the events list:
- Label: "Log a workout"
- Icon: dumbbell or pencil-line (Lucide)
- Tap opens a modal or inline form

### 2.2 Quick-log form

Modal/sheet with these fields:
- **Activity type** (required) — dropdown: Run, Swim, Bike, Strength, Yoga, Other
- **Title** (optional) — text input, placeholder "Trail run, yoga class, etc."
- **Duration** (required) — minutes
- **Distance** (optional, only for run/swim/bike) — km
- **Energy** (optional) — Easy / Moderate / Hard
- **Notes** (optional) — short textarea
- **When** (default: now) — datetime picker, defaults to current time
- **Save** button

Submit creates a `WorkoutLog` with `plannedSessionId: null`.

### 2.3 Visual marker in history

In stats and any session-history UI, off-plan logs get a small tag:
- Subtle "Logged" badge OR a different background tint
- Distinct from planned sessions but not visually noisy

### 2.4 Stats integration

Existing stats already aggregate workout logs. With unlinked logs added, totals naturally include them. No new endpoints needed — verify stats counts match expectations.

### 2.5 Acceptance criteria for Part 2

- "Log a workout" button visible on Today page
- Form opens, captures all fields, validates required ones
- Submit creates log, modal closes
- Today's logged-but-unplanned workout shows in some "completed today" view OR at least counts in stats
- Logging doesn't disrupt planned events
- Streak counter increments same day if a log is recorded

---

## Out of scope for WP13

- Editing past logs (defer to v2)
- Bulk import from Strava/Garmin (defer to v2)
- AI-detected duplicate logging (e.g., user logs run AND it gets imported from Strava)
- Custom session types beyond the dropdown

---

## Open questions for v2

- Photos attached to logs?
- GPS route capture?
- Heart rate / power data import?
- "I did this earlier today" backdating UX