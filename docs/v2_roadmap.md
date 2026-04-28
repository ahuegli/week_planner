### WP11 — Notes as three-mode system + shareable projects

Here is the full content for docs/v2_roadmap.md. Replace the file 
with this exact content:

# v2 Roadmap

## App architecture (decided Sunday session)

Three pillars + one foundation:
- Foundation: Calendar (substrate, sharing lives here)
- Pillar 1: Workouts (training plans, cycle-aware scheduling, logs, badges)
- Pillar 2: Cycle (phase tracking, methodology, visibility)
- Pillar 3: Tasks (notes, find-time scheduling, gamification)

Cross-cutting (each pillar reuses): badges, streaks, completion 
animations, sharing.

Premium tier: AI features sit on top of free tier.
- AI coach (chat) — premium
- AI task breakdown (Goblin Tools-style) — premium
- AI weekly review — premium
- AI plan adaptation — premium

## WP queue (priority order)

### WP12 — Triathlon support (PRIORITY — ships before public launch)
Beta user prepares for triathlon. Currently tri mode reroutes to run plans.
- Plan templates: sprint, olympic, 70.3, 140.6
- Session types: swim, bike, brick (back-to-back bike+run)
- Sport-aware scheduling: pool access, longer time blocks for bike, brick rules
- Sport-aware UI and stats
- Plan-template engine branches on sportType
- Estimate: 8-12 hours
- Methodology in triathlon_methodology.md

### WP13 — Off-plan workout logging
Currently can only log workouts that started as planned sessions. Need:
- "Log a workout" button on Today opens post-workout form without linkedSessionId
- Stats include these
- Estimate: 1-2 hours

### WP10 — Task gamification (light)
Parallel to workout badges. No deep RPG.
- Task categories (quick admin, long admin, errand, etc.)
- Task-specific badges
- Completion animation + optional sound
- Streak counter on Notes page
- Goblin Tools-style AI task breakdown — PREMIUM
- Estimate: 3-4 hours

### WP11 — Notes as three-mode system + shareable projects (revised)

Notes tab holds three information types:

1. Tasks/To-dos (current behavior — already shipped via WP3+WP3C)
   - Single actionable items
   - Optional duration, due date, "find time" scheduling
   - Shareable (gets WP4-style sharing applied)

2. Projects (larger tasks with sub-tasks)
   - A note becomes a project when sub-tasks are added (no formal 
     distinction in UI top-level — discovery via "edit task" → "add 
     sub-task" affordance)
   - Sub-tasks are unassigned by default; can be assigned to a member 
     or claimed by someone in the share group
   - Status per sub-task: not started / in progress / done
   - Visual: bullet list with status icons (similar to training plan)
   - Description field on the project itself
   - Shareable (multi-user collaboration via WP4 share infrastructure)

3. Reminders / standalone notes
   - Plain text, no scheduling, no sub-tasks
   - For things like "remember this password" or quick captures
   - NOT shareable by default (privacy)
   - Optional category labels

Data model:
- Note entity gets `description: text | null` and `parentNoteId: 
  uuid | null` (self-reference for sub-tasks)
- Sub-tasks store `assignedUserId: uuid | null` (nullable — claimable)
- Sub-task status enum: 'not_started' | 'in_progress' | 'done'
- Note type enum: 'task' | 'reminder' (project = task with subtasks)

UI flow:
- Click task → edit modal → optional "Add sub-tasks" affordance 
  appears below
- Once sub-tasks added, the note renders as a project with bullet 
  list on the Notes page
- Assignment dropdown on each sub-task: shows current user, "Claim 
  it", or list of project members (if shared)

Sharing layer:
- Reuses WP4 calendar-share infrastructure pattern
- New `note_shares` table: ownerId / recipientId / noteId / 
  permission ('view' | 'collaborate')

AI sub-task generation — PREMIUM tier:
- "This feels too big" button on tasks
- AI breaks task into 3-5 micro-steps (Goblin Tools pattern)
- Uses existing AI coach infrastructure once unparked

Estimate: 8-12 hours (significant new entity relationships, 
collaboration logic, three-mode UI affordances)

### WP14 — Production hardening
- Rate limiting on AI coach endpoint
- 401-instead-of-500 for stale JWT users
- Migration system replacing synchronize: true
- Estimate: 2-3 hours

### WP15 — Public landing page + signup flow
For going beyond friends-and-family beta. TBD.

### Architectural cleanup (low priority, post-v1)
Four separate event-rendering components (day-row, month-grid, 
event-card, current-week-card) duplicate similar manage-row UI 
(Edit/Delete/Mark as done/Skip/Invite). Extract a shared 
event-card-actions component. Required to add new features cleanly. 
Fixes the WP4 invite-button-visibility gap as a side effect.

### Progressive overload — long-session threshold adjustment (v2 / post-v1)
Currently long-session threshold is user-defined in settings, 
static. Future: engine tracks completed long sessions, auto-suggests 
threshold bumps when athlete hits current limit consistently 
("you've hit 4h three weeks in a row — ready for 4:30?"). Could be 
surfaced via AI coach as gentle nudge rather than auto-applied. 
Builds on top of existing workout-log + AI infrastructure once 
WP7A unparked.

## Bundle 3 — Distance, pace, and zone targets

Currently workouts show only duration. Need to add:
- Distance target (km) computed from duration + intended pace
- Pace target (min/km) anchored to threshold pace, CSS, or FTP
- Zone description ("Z2 easy", "Z4 threshold") in workout view
- Visible on workout page and event cards

Methodology:
- Run pace zones from runThreshold setting (or RPE fallback)
- Swim pace zones from CSS (or RPE fallback)
- Bike power zones from FTP (or HR fallback, already partially done)

Files touched: triathlon-plan-template.service.ts, plan-template.
service.ts (run plans too), workout-descriptions.ts, workout.page.ts, 
day-row, event-card, month-grid event titles.

Estimated: 2-3h CC. Push after WP12B bug fixes ship.


