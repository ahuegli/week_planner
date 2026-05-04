# WP10 Spec — Task Gamification (Light)

**Goal:** Add delight and motivation to the task half of the app, mirroring the existing workout badge/streak system. Light implementation — badges + animations + streak counter, no deep RPG mechanics.

**Estimated effort:** 3-4 hours CC.

---

## Why this matters

Tasks (notes with action) currently feel utilitarian. Workouts get badges, completion celebrations, streak counters — tasks get nothing. For ADHD-leaning users (your target persona), task completion needs the same dopamine reinforcement as workout completion.

Three goals:
1. Make completing tasks feel rewarding
2. Surface streak data so users see momentum
3. Lay groundwork for WP11 (notes-as-projects) without over-engineering

---

## Design principles

1. **Mirror existing workout systems.** Same badge calculator pattern, same streak signal, same animation language. Don't invent a new system.

2. **Light, not gamey.** No XP, no levels, no leaderboard. This is internal motivation reinforcement, not engagement-trap UX.

3. **Optional.** Users who don't care about gamification shouldn't notice it negatively. Animations subtle, badges discreet, no notifications.

4. **Categorize tasks for variety.** A user who completes 10 quick admin tasks gets different recognition than one who completes 1 long deep-work task.

---

## Pre-flight reading for CC

- `src/app/features/stats/utils/badge-calculator.ts` — existing badge logic, mirror this
- `src/app/pages/notes.page.ts` and template — task UI
- `src/app/core/models/app-data.models.ts` — Note interface
- `backend/src/note/note.entity.ts` — note model
- `backend/src/stats/stats.service.ts` — existing stats aggregation, may need task additions

---

## Part 1 — Task categories

### 1.1 Add category field to Note entity

```typescript
@Column({ 
  type: 'enum', 
  enum: ['quick_admin', 'long_admin', 'errand', 'deep_work', 'personal', 'other'],
  default: 'other'
})
taskCategory: 'quick_admin' | 'long_admin' | 'errand' | 'deep_work' | 'personal' | 'other';
```

Categories chosen to map to real ADHD task types:
- **quick_admin** — under 15 min, low cognitive load (reply email, pay bill)
- **long_admin** — 15-60 min, medium load (file taxes, organize folder)
- **errand** — has location component (groceries, post office)
- **deep_work** — focused effort 30+ min (write report, study)
- **personal** — self-care, family, social commitments
- **other** — fallback

### 1.2 UI category picker

In note creation form (and edit modal), add small category chip selector. Default to "other" — user picks if relevant.

### 1.3 Acceptance

- Notes can be categorized
- Existing notes default to "other" via DB default
- Category persists, edits work

---

## Part 2 — Task badges

Mirror `badge-calculator.ts` pattern.

### 2.1 Task-specific badges

Define ~6-8 task badges:
- **First step** — first task completed
- **Quick wins** — 10 quick_admin tasks completed
- **Deep diver** — 5 deep_work tasks completed
- **Errand runner** — 10 errands completed  
- **Streak builder** — 7 day task-completion streak
- **Streak champion** — 30 day task-completion streak
- **Polymath** — completed tasks in all 5 categories
- **Centurion** — 100 total tasks completed

Each badge has earned: boolean, progress: number, target: number — same shape as workout badges.

### 2.2 Backend stats endpoint extension

Existing `/api/v1/stats/summary` returns workout stats. Add:
- `tasksCompletedTotal` — lifetime count
- `tasksCompletedThisWeek` — current week
- `taskStreakDays` — consecutive days with at least one task completed
- `tasksByCategory` — record of category counts

### 2.3 Frontend badge calculator

New utility `task-badge-calculator.ts` mirroring workout one. Reads task stats, returns badge array.

### 2.4 Display badges

On stats page, add a "Task badges" section parallel to workout badges. Or merge into single "Achievements" section if cleaner.

### 2.5 Acceptance

- 8 task badges calculate correctly
- Badges show on stats page
- Earned/in-progress states render distinctly
- Tapping badge shows detail (matches workout badge UX)

---

## Part 3 — Completion animations

### 3.1 Lightweight celebration on task complete

When user marks a task done:
- Subtle scale-pulse animation on the task card
- Brief check-mark fade-in over the row
- Optional small confetti burst (CSS-only, no library) for first daily task

Use existing animation patterns if any exist — search `src/styles/` and component SCSS for animation/keyframes.

### 3.2 Special animation for badge earn

When a task action triggers a new badge:
- Toast or inline notification: "Badge earned: Quick wins"
- Tap dismisses
- Same UX as workout badge earning if that exists

### 3.3 Acceptance

- Animation fires on task completion
- Doesn't disrupt page flow or accessibility
- Badge-earn notification fires correctly when threshold crossed

---

## Part 4 — Streak counter on Notes page

### 4.1 Streak indicator

Top of Notes page (next to filter strip from earlier WP4 polish):
- Small streak counter: flame icon + "X day streak"
- Visible always
- Tap to expand brief tooltip: "Complete at least one task per day to maintain"

If streak is 0 or just broken, show muted version: flame outline + "Start a streak"

### 4.1.1 Streak counting rules

A streak day is preserved when EITHER:
- A workout was completed that day (planned or off-plan)
- At least one task was completed that day

Days with NEITHER workouts NOR tasks scheduled (free days where 
nothing was on the plan):
- Don't break the streak
- Don't increment it
- Treat as "pause days"

Days where the user HAD events scheduled but completed nothing:
- Break the streak

This means: a user on a rest day (nothing scheduled) doesn't lose 
their streak. A user who skipped their planned long run does.

The same logic applies to the workout-side streak (already in WP5/
stats system) — verify and align if needed during WP10 implementation.

### 4.2 Streak calculation

Backend computes from workout-log style aggregation but on tasks:
- Group by day in user timezone
- Streak = consecutive days where >= 1 task was completed
- Reset on a day with 0 completions

### 4.3 Acceptance

- Streak counter accurate against test data
- Updates when task is completed
- Gracefully resets when user misses a day

---

## Order of operations

1. Part 1 — entity + UI category picker
2. Part 2 — backend stats + frontend badges
3. Part 3 — completion animations
4. Part 4 — streak counter

After Part 4: smoke test full flow, commit.

---

## Out of scope

- AI task breakdown (premium feature, post-WP14)
- Cross-user task leaderboards
- Custom badge creation
- Achievements/quests beyond badges
- Notification system for streak warnings ("Don't break your streak!" notifications)

---

## Future hooks

- WP11 sub-tasks should ALSO trigger task-streak preservation
- Premium AI breakdown will use this category data ("This deep_work task is too big — break it down")
- Stats page motivational messages already have task-aware predicates (safe-guarded with `(s as any)` casts) — they activate automatically when WP10 wires the fields
