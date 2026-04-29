# WP12 Spec — Triathlon Support

**Goal:** Replace the current run-plan reroute on triathlon mode with a real, methodology-driven triathlon plan generator. Three disciplines (swim, bike, run), brick sessions, sport-aware scoring and UI, race-day plan output.

**Estimated effort:** 12-16 hours CC time across three sub-WPs (12A, 12B, 12C). Execute incrementally with beta checkpoints between each.

**Prerequisites:** docs/triathlon_methodology.md is the canonical reference — read it before writing any code. The three nuance edits applied (reverse periodisation hedge, long-ride caps, swim rebuild rate) are required reading.

---

## Architectural principles

1. **Three disciplines are independent.** Swim, bike, run each have their own threshold tests, zones, and progression. Don't unify them. The engine reads each discipline's calibration separately.

2. **Bricks are a first-class session type.** Not a flag on a bike session — a distinct entity with its own scheduling rules (must follow long bike same-day, never before long run next day).

3. **Calibration is adaptive.** User can have FTP or HR or RPE for bike; CSS or RPE for swim. Engine prescribes whatever it has data for, prompts to collect more over time.

4. **Pool access drives swim prescription.** 25m / 50m / open water / multiple — engine adapts session structure accordingly. No "default pool size" assumption.

5. **Race date is optional.** With race date → calculated periodisation. Without → repeating 4-week sweet-spot cycles ("general fitness for tri").

6. **Periodisation auto-defaults from experience hybrid.** triathlonsCompleted + endurancePedigree determine traditional vs reverse default. User can override.

7. **Triathlon mode is in the same plan creation flow as running.** Discipline picker at start of "New Plan" — `running` | `triathlon`.

---

## Pre-flight reading for CC

- `docs/triathlon_methodology.md` (the entire file — long, but essential)
- `backend/src/plan-template/plan-template.service.ts` — current plan generator (currently routes triathlon to running, the bug we're fixing)
- `backend/src/domain/scoring-engine.service.ts` — needs sport-aware additions
- `backend/src/api/scheduler/scheduler.controller.ts` — generate-plan endpoint
- `backend/src/planned-session/planned-session.entity.ts` — sessionType enum needs swim/bike/brick added
- `backend/src/training-plan/training-plan.entity.ts` — sportType field
- `backend/src/scheduler-settings/scheduler-settings.entity.ts` — needs new triathlon fields
- `backend/src/cycle-profile/cycle-profile.service.ts` — for cycle-aware scheduling on tri sessions
- `src/app/pages/onboarding/` (whatever components handle plan creation)
- `src/app/features/workout/workout.page.ts` — needs sport-aware structure rendering
- `src/app/pages/stats.page.ts` — needs sport-specific stats
- `docs/training_methodology.md` — already canonical for run discipline

---

# WP12A — Swim, Bike, and Triathlon Plan Foundation

**Goal:** Replace the run-plan reroute with a real triathlon plan that generates correctly-prescribed swim, bike, and run sessions for the four race distances. No bricks yet, no race-day plan yet — those come in 12B and 12C.

**Estimated effort:** ~6-8 hours CC time.

---

## Part 1A — Backend: Calibration data model

### 1A.1 Extend SchedulerSettings entity

Add to `backend/src/scheduler-settings/scheduler-settings.entity.ts`:

```typescript
// Triathlon-specific calibration
@Column({ type: 'int', nullable: true }) ftpWatts: number | null;
@Column({ type: 'int', nullable: true }) lthrBpm: number | null;
@Column({ type: 'int', nullable: true }) cssSecondsPer100m: number | null;
@Column({ type: 'enum', enum: ['25m', '50m', 'open_water', 'pool_and_open_water', 'none'], nullable: true })
poolAccess: '25m' | '50m' | 'open_water' | 'pool_and_open_water' | 'none' | null;
@Column({ type: 'boolean', default: false }) hasPowerMeter: boolean;
@Column({ type: 'int', nullable: true }) triathlonsCompleted: number | null;
@Column({ type: 'enum', enum: ['none', 'runner', 'cyclist', 'swimmer', 'multiple'], nullable: true })
endurancePedigree: 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple' | null;
@Column({ type: 'enum', enum: ['traditional', 'reverse'], nullable: true })
periodisationOverride: 'traditional' | 'reverse' | null;
```

All nullable — runners only need to fill what's relevant for them.

### 1A.2 Extend TrainingPlan entity

Add:

```typescript
@Column({ type: 'enum', enum: ['sprint', 'olympic', '70_3', '140_6'], nullable: true })
triathlonDistance: 'sprint' | 'olympic' | '70_3' | '140_6' | null;
```

Existing `sportType` field already supports `'triathlon'`. Just adding the sub-distance.

### 1A.3 Extend PlannedSession entity

Add to sessionType enum: `'swim'`, `'bike'`, `'brick'` (brick wired in WP12B but enum value reserved now).

Add fields for discipline-specific prescription:

```typescript
@Column({ type: 'enum', enum: ['swim', 'bike', 'run', 'brick', 'strength', 'mobility', 'rest'], nullable: true })
discipline: 'swim' | 'bike' | 'run' | 'brick' | 'strength' | 'mobility' | 'rest' | null;

@Column({ type: 'jsonb', nullable: true }) prescriptionData: any | null;
```

`prescriptionData` is a flexible JSON field for discipline-specific instructions:
- Swim: `{ poolLength: '25m'|'50m', mainSet: '6x200@CSS', technique: ['catch'], totalMeters: 2000 }`
- Bike: `{ format: 'sweet-spot', intervals: '3x15min @ 88% FTP', totalMinutes: 75 }`
- Run: existing run prescription format

### 1A.4 Acceptance criteria for Part 1A

- Backend builds clean
- New columns added to `scheduler_settings`, `training_plans`, `planned_sessions` tables in Supabase
- Existing plans still load (nullable defaults)
- API responses include new fields when set

---

## Part 2A — Backend: Triathlon plan template generator

### 2A.1 Create `backend/src/plan-template/triathlon-plan-template.service.ts`

New service. Mirrors the structure of `plan-template.service.ts` (which handles running). Methods:

```typescript
generateTriathlonPlan(params: {
  startDate: Date;
  raceDate: Date | null; // null = "general fitness for tri"
  distance: 'sprint' | 'olympic' | '70_3' | '140_6';
  weeklyHours: number;
  tier: 'tier4plus' | 'tier3'; // computed from sessions/week + weeklyHours
  experienceLevel: ExperienceLevel; // hybrid signal — see logic below
  periodisation: 'traditional' | 'reverse'; // resolved from defaults + override
  calibration: CalibrationData; // FTP, LTHR, CSS, etc.
  poolAccess: PoolAccessType;
}): Promise<PlannedSession[]>
```

### 2A.2 Experience level logic

```typescript
type ExperienceLevel = 'true_beginner' | 'tri_novice_but_fit' | 'intermediate' | 'experienced';

function computeExperienceLevel(
  triathlonsCompleted: number,
  endurancePedigree: 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple'
): ExperienceLevel {
  if (triathlonsCompleted >= 3) return 'experienced';
  if (triathlonsCompleted >= 1) return 'intermediate';
  if (endurancePedigree === 'none') return 'true_beginner';
  return 'tri_novice_but_fit';
}
```

### 2A.3 Periodisation default logic

```typescript
function defaultPeriodisation(
  experience: ExperienceLevel, 
  distance: TriathlonDistance,
  override: 'traditional' | 'reverse' | null
): 'traditional' | 'reverse' {
  if (override) return override;
  
  // Sprint and olympic always traditional
  if (distance === 'sprint' || distance === 'olympic') return 'traditional';
  
  // 70.3 / 140.6: experienced gets reverse, others traditional
  if (experience === 'experienced') return 'reverse';
  return 'traditional';
}
```

### 2A.4 Tier-based session count

Per methodology doc:

```typescript
const SESSIONS_PER_WEEK = {
  tier4plus: { sprint: 9, olympic: 9, '70_3': 10, '140_6': 11 },
  tier3:     { sprint: 6, olympic: 6, '70_3': 6, '140_6': null }, // not viable
};
```

If `tier3` + `140_6` → throw error or return error indicating "not viable for tier3, recommend tier4+ or different distance."

### 2A.5 Discipline allocation

Allocate weekly hours to disciplines per methodology:

```typescript
function allocateWeeklyHours(
  weeklyHours: number,
  distance: TriathlonDistance,
  phase: 'base' | 'build' | 'peak' | 'taper'
): { swim: number; bike: number; run: number; strength: number; mobility: number; brick: number } {
  // Per methodology: bike volume scales with race distance, run capped, 
  // swim consistent across distances, strength/mobility small but never zero
  // ... allocation logic per phase and distance
}
```

### 2A.6 Per-session prescription functions

Three discipline functions, each anchored to that discipline's calibration:

```typescript
prescribeSwimSession(
  phase: Phase,
  weekIntent: 'technique'|'endurance'|'threshold'|'tune-up',
  totalMinutes: number,
  poolAccess: PoolAccessType,
  cssSecondsPer100m: number | null
): SwimPrescription

prescribeBikeSession(
  phase: Phase,
  weekIntent: 'recovery'|'endurance'|'sweet-spot'|'threshold'|'vo2max',
  totalMinutes: number,
  ftpWatts: number | null,
  lthrBpm: number | null,
  hasPowerMeter: boolean
): BikePrescription

prescribeRunSession(
  phase: Phase,
  weekIntent: ...,
  totalMinutes: number,
  runThreshold: number
): RunPrescription
```

If FTP/LTHR/CSS missing, fallback to RPE-anchored prescription with descriptive language. Document the cascade in code comments.

### 2A.7 Pool access adaptation

```typescript
adaptSwimToPool(prescription: SwimPrescription, poolAccess: PoolAccessType): SwimPrescription {
  switch (poolAccess) {
    case '25m': // technique-emphasis structure
    case '50m': // endurance-emphasis structure
    case 'pool_and_open_water': // alternate per session intent
    case 'open_water': // continuous-time prescriptions, sighting drills
    case 'none': // skip swim, flag warning
  }
}
```

### 2A.8 Plan length back-calculation

```typescript
function calculatePlanLength(
  raceDate: Date | null,
  distance: TriathlonDistance,
  experienceLevel: ExperienceLevel
): { totalWeeks: number; phaseLengths: PhaseLengths } {
  // Per methodology:
  // sprint: 8-12 weeks; olympic: 12-16; 70.3: 16-24; 140.6: 24-30
  // Beginner +25% on base phase
  // No race date → repeating 4-week build cycle
}
```

### 2A.9 Brick scheduling — STUB ONLY

Reserve session type, but don't generate brick sessions in 12A. Document in comments:

```typescript
// TODO WP12B: Brick sessions are reserved as a first-class session type but 
// generation logic is implemented in WP12B. This 12A version produces long bike 
// + long run on consecutive days for now (not a true brick).
```

### 2A.10 Acceptance criteria for Part 2A

- Triathlon plan template generates correct number of sessions per week per distance
- Each session has correct discipline, duration, prescription data
- Pool access affects swim prescription correctly
- FTP/LTHR/RPE cascade works for bike
- CSS/RPE cascade works for swim
- Experience level + periodisation logic works for all 4 distances
- "General fitness for tri" (no race date) generates 4-week repeating cycle
- Build clean

---

## Part 3A — Backend: Wire into scheduler controller

### 3A.1 Update generate-plan endpoint

In `backend/src/api/scheduler/scheduler.controller.ts`, the `generate-plan` endpoint currently routes triathlon mode to running. Replace:

```typescript
// OLD (the bug):
if (sportType === 'triathlon') {
  // routes to runPlanTemplate (bug)
}

// NEW:
if (sportType === 'triathlon') {
  return this.triathlonPlanTemplate.generateTriathlonPlan({
    ...params,
    distance: dto.triathlonDistance,
    poolAccess: settings.poolAccess,
    calibration: extractCalibration(settings),
    experienceLevel: computeExperienceLevel(settings.triathlonsCompleted, settings.endurancePedigree),
    periodisation: defaultPeriodisation(experienceLevel, dto.triathlonDistance, settings.periodisationOverride),
  });
}
```

### 3A.2 Update CreateTrainingPlanDto

Add `triathlonDistance?: 'sprint' | 'olympic' | '70_3' | '140_6'` validation.

### 3A.3 Update SchedulerSettings DTO

Add validation for new triathlon fields. All optional.

### 3A.4 Acceptance criteria for Part 3A

- POST `/api/v1/scheduler/generate-plan` with `sportType: 'triathlon'` and `triathlonDistance: 'olympic'` produces a plan with swim+bike+run sessions
- POST without `triathlonDistance` for triathlon sport returns 400 error
- Settings save correctly persists new triathlon fields
- Build clean, restart backend, smoke test via curl

---

## Part 4A — Frontend: Plan creation UI

### 4A.1 Update plan creation flow

Find the "Create plan" / onboarding plan creation component. Add discipline picker as first step:

- Toggle: "Running" | "Triathlon"
- If "Triathlon" selected, next step is sub-distance picker: Sprint / Olympic / 70.3 / 140.6

After distance picker, ALL these inputs (triathlon-specific):
- Race date (optional, "I'm just training generally" toggle)
- Triathlons completed (number input, 0-99)
- Endurance pedigree dropdown: None / Runner / Cyclist / Swimmer / Multiple sports
- Pool access dropdown: 25m pool / 50m pool / Both / Open water only / Both pool and open water / No pool access
- "I have a power meter" checkbox
- "I know my FTP" → conditional FTP input (watts)
- "I know my LTHR" → conditional LTHR input (bpm)
- "I know my CSS swim pace" → conditional CSS input (seconds per 100m)
- Sessions per week / weekly hours (per existing pattern)

### 4A.2 Conditional prompts for missing calibration

If user skips calibration:
- Show subtitle: "We'll use perceived effort guidelines for now. You can add precise zones later in Settings."
- Don't block plan creation
- After plan generated, settings page shows "Improve your zones" prompt

### 4A.3 Settings page additions

In `src/app/pages/settings.page.ts`, add a "Triathlon calibration" section visible only when user has a triathlon plan:
- All same fields from creation flow
- Editable post-plan-creation
- Save triggers re-prescription on next plan regen (don't auto-regen)

### 4A.4 Acceptance criteria for Part 4A

- "New Plan" flow has discipline picker at start
- Triathlon flow collects all required inputs
- Optional inputs gracefully skipped
- Calibration persists to backend
- Settings page allows editing triathlon calibration

---

## Part 5A — Frontend: Sport-aware UI rendering

### 5A.1 Workout page

`src/app/features/workout/workout.page.ts` currently renders run-specific structure (warmup → main → cooldown). Make it sport-aware:

For swim sessions:
- Show pool length context
- Render swim set structure (e.g., "WU: 200m easy, MAIN: 6x100m @ CSS, CD: 100m easy")
- Show CSS pace if calibrated
- Sighting drills if open water

For bike sessions:
- Show power target (watts) if FTP set, HR target if LTHR set, RPE description otherwise
- Format: "30 min steady @ 75% FTP (200W)" or "30 min steady, conversation pace"
- Show interval structure if intervals session

For run sessions: existing rendering

For all: show cycle-aware coaching note (already exists from WP2)

### 5A.2 Stats page

Add sport-specific breakdowns:
- Total swim meters this week, this month
- Total bike kilometers/miles
- Total run kilometers/miles
- TSS (Training Stress Score) if calculable from prescriptions
- Per-discipline trend chart (last 8 weeks)

### 5A.3 Calendar event display

Day-row, event-card, etc. should render different colors/icons per discipline:
- Swim: blue water-drop icon
- Bike: green bike icon
- Run: orange/amber shoe icon (current)
- Brick: purple icon (reserved for 12B)

Use existing design tokens; pick colors that fit the palette.

### 5A.4 Acceptance criteria for Part 5A

- Triathlon workout pages render discipline-appropriate structure
- Stats show sport-aware breakdowns
- Calendar shows discipline color coding
- Build clean

---

## Order of operations for WP12A

1. Part 1A — entity changes + migrations
2. Part 2A — backend triathlon plan generator
3. Part 3A — wire into scheduler controller
4. Part 4A — frontend plan creation UI
5. Part 5A — frontend sport-aware rendering
6. **Checkpoint: smoke test end-to-end with all four distances + edge cases**

After WP12A clean, proceed to WP12B.

---

# WP12B — Brick Sessions

**Goal:** Add brick (back-to-back bike-then-run) sessions as first-class scheduled entities. Engine schedules them per methodology — weekly in build phase, race-rehearsal weekends 4-8 weeks out for 70.3 and 140.6.

**Estimated effort:** ~3-4 hours CC time.

## Part 1B — Brick session generation

In `triathlon-plan-template.service.ts`, replace the WP12A stub with real brick logic per methodology:

- Transition brick (weekly): short bike → short run, e.g. 30 min + 15 min
- Race-simulation brick (weekly in build): race-pace bike → race-pace run
- Race-rehearsal brick (2-4× in build for 70.3 and 140.6 only): full long ride + medium-long run

Brick sessions are stored as **two linked PlannedSession rows**:
- Bike session with `linkedNextSessionId: <run session id>`
- Run session with `linkedPriorSessionId: <bike session id>`, `discipline: 'run'`, `prescriptionData.isOffBike: true`

Both sessions land on same calendar day. Both must move together if rescheduled.

## Part 2B — Brick scheduling rules

In scheduling logic (scoring engine):
- Bricks scheduled on Saturday by default (or whichever day user has most time)
- Never the day before a long run
- Run pace prescription accounts for being off the bike (10-20 sec/km slower than fresh-leg pace at same RPE)

## Part 3B — Brick UI

- Calendar shows bricks as linked event pair (both render but visually grouped, e.g., connected via thin line or background tint)
- Workout page for brick run shows "Off the bike" header + adjusted pace prescription
- Dragging one brick session moves both

## Part 4B — Acceptance

- Brick sessions generate correctly per phase and distance
- Linked sessions move together
- Workout page renders off-bike context
- Build clean, smoke test

---

# WP12C — Race-Day Plan

**Goal:** In the final 2 weeks before race date, generate a race-day execution plan covering pacing, fuelling, hydration, transitions, contingencies. This is one of the most differentiated features vs Runna and similar.

**Estimated effort:** ~3-4 hours CC time.

## Part 1C — Race-day plan data model

New entity: `race_day_plans`
- userId, planId, raceDate
- pacingPlan: jsonb (per-discipline targets)
- fuelingPlan: jsonb (g/h carbs, hydration timing)
- transitionPlan: jsonb (T1/T2 procedures)
- contingencyPlan: jsonb (cramp protocol, mechanical, missed nutrition)
- generatedAt, lastModified

## Part 2C — Race-day plan generator

In `triathlon-plan-template.service.ts` add `generateRaceDayPlan()`:
- Reads recent threshold tests (CSS, FTP, run threshold)
- Reads weather forecast for race location (out of scope — assume neutral conditions)
- Generates per-discipline pace targets (10-15% conservative for first-timers)
- Generates fuelling plan per distance per methodology (60 g/h olympic, 80-100 g/h 70.3, 90-120 g/h 140.6)
- Generates transition reminders

Triggered automatically 2 weeks before race date, OR manually via button.

## Part 3C — Race-day plan UI

New page or section: "Race day plan" accessible from plan tab or as pre-race notification.

## Part 4C — Acceptance

- 2 weeks before race: race-day plan auto-generates
- User can view, edit, mark items as "got it" / "concern"
- Plan is shareable (uses existing WP4 sharing — share with coach or partner)

---

## Rules CC must follow throughout WP12

- Read CLAUDE.md hard rules 9 and 10
- Read docs/triathlon_methodology.md in full before any code
- Match existing patterns from running plan generation
- Strict scope per part — no cross-part work
- Build clean after every part
- Smoke test via curl + browser between parts
- Do NOT touch unrelated WPs (sharing, AI coach, notes)
- After each part, update docs/session-notes.md
- If anything is unclear, ASK before building

---

## Beta deployment plan

After WP12A: ship to gf and friends — they have working triathlon plans with three disciplines. Bricks and race-day plan are noted "coming soon" in UI.

After WP12B: bricks live. Race-day prep weekends now properly modeled.

After WP12C: full feature parity with mainstream triathlon plan apps. Race-day plan is the differentiator vs competitors.

---

## Open questions for v2

- Live in-race tracking / pacing (probably never — Apple Watch / Garmin handle this)
- Power-meter integration with cycling apps (Strava, TrainerRoad, Zwift) — WP15+
- Open-water sighting practice via in-app drill library (post-WP12)
- Multi-sport daily plan view (currently tri sessions render in calendar like any event — workable)