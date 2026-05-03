# v2 Roadmap

## App architecture (locked)

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

---

## Status snapshot (end of Wednesday session)

**Beta-ready right now for gf + 2-5 close friends.**

Ships needed before public-ish beta:
- WP13 (off-plan logging, ~1-2h)
- WP14 (production hardening, ~2-3h)
- WP15 (landing page, ~3-5h)

Optional polish: WP10 task gamification, Bundle 3 distance/pace targets.

---

## Shipped (Sat–Wed)

### Core platform
- WP1 — Workout page with pre/post views
- WP2 — Cycle-aware scheduling (with parked scoring math edge case)
- WP3 + WP3C — Notes system + slot suggestion
- WP4 — Sharing suite: 3 modes (full, busy_only, workouts_only) + 
  invitations + accepted-invitee bubbles + deleted-account handling
- WP5 — Stats dashboard with badges
- WP6 — Conflict resolution
- WP7A — AI coach infrastructure (UI parked, /coach now shows 
  coming-soon page)

### Triathlon (WP12 — fully shipped)
- WP12A — Foundation: entity schema, plan generator, sport-aware UI, 
  plan creation with calibration
- WP12B — Bricks: linked-session generation, scheduling rules, 
  visual treatment, volume progression
- WP12C — Race-day plan: entity, generator, compact UI, run 
  threshold pacing
- Bundle 1 — Settings persistence (wake/bedtime, preferred times, 
  max training days)
- Bundle 2 — Load distribution (latest-free-day priority, 
  retroactive reschedule prompt)

### Engineering polish shipped this week
- Discipline persistence on calendar events (linkedNextSessionId, 
  sessionType, discipline columns)
- triathlonDistance normalization (frontend payload + DTO validator 
  + DB migration)
- Same-day same-discipline placement fix
- Symmetric rest-period check (tooCloseBefore)
- Unplaced-sessions surfacing (no more silent placement loss)
- 40+ state-aware motivational messages (triathlon + task safe-guarded)
- 4 empty-state copy improvements
- completionRateColor zero-state fix
- Brick visual polish + duration-aware workout descriptions
- Edit form auto-adjust end time
- RouterLink warning cleanup
- Race-day "too far" copy + error toast + cycle phase tooltip
- Time-of-day greeting on Today
- Loading states + tomorrow's preview + delete confirmation
- Skip cycle option in onboarding
- Notes filter strip + settings access
- "Scheduler settings" → "Schedule preferences" rename
- Run threshold field for race-day pacing
- Coming-soon page for /coach
- Compact race-day plan UI (no emoji)

---

## Outstanding WP queue (priority order)

### WP13 — Off-plan workout logging (1-2h CC)
**Status:** spec written (`docs/wp13_spec.md`)

Currently can only log workouts that started as planned sessions. 
Real users do unplanned things — yoga class, spontaneous run, hike. 
Need:
- "Log a workout" button on Today
- Quick-log form (type / duration / optional distance / optional energy)
- WorkoutLog entity accepts null plannedSessionId
- Logs count toward stats and streaks
- Visible marker for off-plan vs planned in history

**Beta blocker:** moderate — gap is real but not catastrophic for 
v0 beta.

### WP10 — Task gamification (3-4h CC)
**Status:** spec written (`docs/wp10_spec.md`)

Mirror existing workout badge/streak system on the task half:
- Task categories (quick_admin, long_admin, errand, deep_work, 
  personal, other)
- 8 task badges (First step, Quick wins, Deep diver, etc.)
- Completion animations
- Streak counter on Notes page

Stats motivational messages already have safe-guarded task-aware 
predicates that activate when WP10 wires the fields.

**Beta blocker:** no. Ships polish, not core function.

### WP14 — Production hardening (2-3h CC)
**Status:** spec written (`docs/wp14_spec.md`)

Three pieces:
- Rate limiting on AI coach endpoint (NestJS Throttler)
- 401-not-500 for stale JWT (custom exception filter)
- Migration system replacing `synchronize: true` (TypeORM CLI)

**Beta blocker:** required before any beta beyond trusted circle.

### WP11 — Notes as projects + sharing (8-12h CC)
**Status:** spec written (`docs/wp11_spec.md`)

Three-mode notes system: tasks / projects / reminders. Projects 
are tasks with sub-tasks, shareable via WP4-pattern infrastructure. 
Sub-tasks unassigned-by-default, claimable.

- Note entity gets description, parentNoteId, assignedUserId, 
  subtaskStatus
- New note_shares table mirroring calendar_shares
- Three-mode UI on Notes page
- AI sub-task generation (PREMIUM tier)

**Beta blocker:** no. Big feature, save for post-launch.

### WP15 — Public landing page + signup (3-5h)
**Status:** spec written (`docs/wp15_spec.md`)

Single-page marketing site at `/` with hero, feature trio, how-it-
works, sign-up CTA. Refreshed signup flow. No tracking pixels.

**Beta blocker:** required before sharing beyond direct friends.

### Bundle 3 — Distance, pace, and zone targets (2-3h CC)
**Status:** queued, not specced

Currently workouts show only duration. Add:
- Distance target (km) computed from duration + pace
- Pace target anchored to threshold pace, CSS, or FTP
- Zone descriptor ("Z2 easy", "Z4 threshold") in workout view

Run plans already have km. Triathlon doesn't. Polish, not 
beta-blocker.

---

## Parked bugs (non-blocking, documented)

- **WP4 invite button missing on Today/Week views.** Workaround: 
  invite via Month view. Real fix is architectural cleanup below.
- **WP2 cycle scoring math.** Long runs default to Sunday on free 
  days regardless of cycle phase. Magnitude tuning needed.
- **Stale JWT 500 errors.** Workaround: clear localStorage + 
  relogin. WP14 fixes properly.
- **True beginner week-1 intensity.** Volume scaler doesn't 
  conservatize enough for first-timers with no endurance pedigree.
- **Settings reschedule banner.** Fixed but auto-resolves silently 
  before user sees it. Low priority.

---

## Architectural cleanup (post-v1)

Four separate event-rendering components (day-row, month-grid, 
event-card, current-week-card) duplicate manage-row UI. Extract a 
shared event-card-actions component:
- Single source of truth for Edit / Delete / Mark as done / Skip / 
  Invite buttons
- Resolves WP4 invite button gap as side effect
- Required cleanly before adding any new event action

Estimate: 3-5h. Defer until post-v1.

---

## v2+ ideas (not yet specced)

### Progressive overload — long-session threshold auto-adjustment
Engine tracks completed long sessions, auto-suggests threshold 
bumps when athlete hits current limit consistently ("you've hit 4h 
three weeks in a row — ready for 4:30?"). Surfaced via AI coach 
as gentle nudge. Builds on workout-log + AI infrastructure post-WP7A 
unpark.

### Race-day plan — adaptive
Currently generated once from static calibration. Should update 
dynamically over the lead-up:
- **Pace adaptation:** if user trained consistently at target → 
  keep, if slower → conservatize -3-5%, if faster → optional stretch
- **Effort adaptation:** RPE trends shift recommended targets
- **Transition adaptation:** brick practice frequency → confidence 
  boost or buffer time
- **Fueling adaptation:** logged GI distress → more conservative
- **Cycle awareness:** luteal-phase race → +10% hydration, 
  conservative pace
- **Auto-regeneration:** final 4 weeks weekly, locked in final week

Estimate: 4-6h post-WP14.

### Race-day plan — compact UI polish
Already shipped this week. Adaptive version above is the next layer.

### Other v2 ideas
- Photos attached to workout logs
- GPS route capture
- Heart rate / power data import (Strava, Garmin)
- AI-detected duplicate logging
- Cross-user task leaderboards (probably never)
- Notification system for streak warnings

---

## Tool delegation rules (learned this week)

- **CC** for: entity design, scoring engine, methodology logic, 
  multi-file scaffolding (anything touching data-store.service.ts 
  or app-data.models.ts AND backend together)
- **Copilot Agent** for: UI rendering after data shape is set, 
  single-file fixes, doc updates, motivational/copy expansions, 
  smoke test walkthroughs
- Wait for CC to finalize data model before Copilot does UI on top
- Don't pre-allocate parts to tools — decide each as it comes based 
  on quota and energy


  ### AI-categorized session typing (v2 / premium)
Free-text session input ("pilates class", "trail run with friends") 
recognized by AI and categorized into engine-known types. Premium 
feature — uses AI quota. Falls back to dropdown picker for free 
tier. Builds on existing AI coach infrastructure post-WP7A unpark.

### Dark mode (v2)

Currently no theme system. Needs:
- Define dark color palette as CSS variable overrides
- [data-theme="dark"] selector pattern
- Persist preference to scheduler settings + localStorage fallback
- Audit all components for hardcoded colors that bypass variables
- Visual QA across every page

Estimate: 2-3h Copilot/CC mix. Real implementation, not toggle 
wiring.

### Reminder notifications (v2)

When a reminder has a due date, surface it to the user when the 
date approaches:
- In-app banner on Today page when reminder is due today
- Toast or inline alert when due in next hour (if time set)
- Optional: browser push notifications (requires PWA setup or 
  service worker)
- Optional: email reminder for users who opt in

Implementation tiers:
- Tier 1 (in-app only): Today page reads reminders due today, 
  shows them in a "Due today" section. ~30 min.
- Tier 2 (toast on date): cron-like check on app focus, fire 
  toast if due time crossed. ~1h.
- Tier 3 (browser push): service worker + push API. Requires 
  HTTPS, user permission, more setup. ~3-4h.
- Tier 4 (email): backend cron + SMTP integration. Out of scope 
  until v2 has SMTP set up for password resets etc.

Start with Tier 1 — biggest user value for least work. Build up 
as needed based on actual user behavior.