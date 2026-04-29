# WP2 Spec — Cycle-Aware Scheduling, Mode Variants & Energy Logging

**Goal:** Make the scheduler intelligent about menstrual cycle phases, handle four cycle modes (natural, hormonal contraception, perimenopause, manual) with appropriate UI variants, and wire real persistence for energy + symptom logging.

**Scope explicitly NOT in this WP:** post-menopause mode (next session), "find time for this" notes integration, "I have time" task-vs-workout choice, full plan-template rewrite using the methodology docs.

**Estimated effort:** 3–4 hours of CC execution, ~30 min of your verification.

---

## Architectural principles

1. **`weeklyContext` carries cycle data.** The scoring engine doesn't query the cycle profile directly — it reads phase + confidence from the WeekContext that's already plumbed through.
2. **Mode-aware everything.** Phase scoring only applies when `mode === 'natural'`. Other modes get the energy-logging path but no phase prediction.
3. **`cycleTrackingEnabled` is a master switch.** When off, all cycle-aware behaviour is bypassed regardless of mode.
4. **Energy + symptom logging works for all modes.** It's a parallel data layer, not gated by cycle mode.
5. **Confidence multiplier softens predictions.** Variability `high` and short cycle history reduce phase scoring impact.

---

## Pre-flight reading for CC

Before any edits, CC must read these in full to match existing patterns:

- `backend/src/domain/scoring-engine.service.ts` — current scoring functions, ScoringContext shape
- `backend/src/domain/schedule-generator.service.ts` — how WeekContext flows
- `backend/src/api/scheduler/scheduler.controller.ts` — where WeekContext is constructed (around line 320 in `schedulePendingWeeks`)
- `backend/src/cycle-profile/cycle-profile.service.ts` — existing `getCurrentPhase` logic
- `backend/src/cycle-profile/cycle-profile.entity.ts` — current mode enum
- `backend/src/scheduler-settings/scheduler-settings.entity.ts` — where to add `cycleTrackingEnabled`
- `backend/src/shared/models.ts` — find the WeekContext type
- `src/app/pages/cycle.page.ts` — current UI, `saveCheckin` stub
- `src/app/features/onboarding/onboarding-step-cycle.component.ts` — current cycle onboarding
- `src/app/features/onboarding/onboarding.models.ts` — CycleStatus type
- `src/app/pages/onboarding.page.ts` — `generatePlan()` and how cycle data flows
- `src/app/core/services/cycle-api.service.ts` — existing cycle API
- `src/app/core/services/data-store.service.ts` — cycle state, find a similar pattern (e.g. workouts or notes) for new energy/symptom signals

---

## Part 1 — Backend: cycle phase computation per day

### 1.1 New service method: `computePhasesForWeek`

**File:** `backend/src/cycle-profile/cycle-profile.service.ts`

Add a new public method:

```typescript
async computePhasesForWeek(
  userId: string, 
  weekStartDate: string, // YYYY-MM-DD, day 0 of the target week
): Promise<{
  phasesByDay: Array<'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'>; // length 7
  confidence: number; // 0.0–1.0
  mode: string; // current mode
  trackingEnabled: boolean; // pulled from scheduler-settings
}>
```

**Logic:**

1. Load cycle profile via existing `getByUser(userId)`.
2. Load `cycleTrackingEnabled` from scheduler-settings (see Part 2).
3. If `trackingEnabled === false` OR `mode !== 'natural'` OR `lastPeriodStart` is null OR `currentPhaseOverride` is set: return `phasesByDay` as `['unknown', ...]`, `confidence: 0`, plus mode and trackingEnabled.
4. Otherwise, for each of 7 days starting from `weekStartDate`:
   - Compute `cycleDay` for that calendar day using existing logic from `getCurrentPhase` (diff in days from `lastPeriodStart`, mod by `averageCycleLength`, +1).
   - Apply phase boundaries identical to `getCurrentPhase`:
     - `cycleDay <= 5` → menstrual
     - `cycleDay >= lutealStart` (cycleLength - 13) → luteal
     - `cycleDay >= ovulationStart && cycleDay < lutealStart` → ovulation
     - else → follicular
5. Compute confidence:
   - Start at 1.0
   - `variability === 'medium'`: multiply by 0.75
   - `variability === 'high'`: multiply by 0.5
   - `recentCycleLengths.length < 3`: multiply by 0.7
   - Clamp to [0.0, 1.0]

**Why this lives on the cycle service, not the scheduler:** the cycle service owns cycle math. The scheduler consumes the result.

### 1.2 Acceptance criteria for 1.1

- Unit test (or REPL test): for a profile with `lastPeriodStart = '2026-04-01'`, `averageCycleLength: 28`, `variability: 'low'`, `mode: 'natural'`, calling `computePhasesForWeek(userId, '2026-04-22')` returns 7 phases starting at cycle day 22 (luteal), and confidence ≈ 1.0.
- Same call with `variability: 'high'` returns confidence ≈ 0.5.
- Same call with `mode: 'hormonal_contraception'` returns all 'unknown' and confidence 0.
- Same call with `trackingEnabled: false` returns all 'unknown' and confidence 0.

---

## Part 2 — Backend: scheduler-settings additions

### 2.1 Add column to entity

**File:** `backend/src/scheduler-settings/scheduler-settings.entity.ts`

Add:
```typescript
@Column({ default: false })
cycleTrackingEnabled: boolean;
```

Synchronize will add the column on next backend restart.

### 2.2 Add to DTO

**File:** `backend/src/scheduler-settings/scheduler-settings.dto.ts`

Add to `UpdateSchedulerSettingsDto`:
```typescript
@IsOptional()
@IsBoolean()
cycleTrackingEnabled?: boolean;
```

### 2.3 Add to service create defaults

**File:** `backend/src/scheduler-settings/scheduler-settings.service.ts`

In the `create` method's defaults object, add `cycleTrackingEnabled: false`.

### 2.4 Acceptance criteria for Part 2

- Backend restarts cleanly after column addition (check log for synchronize step).
- `GET /api/v1/scheduler-settings` returns `cycleTrackingEnabled: false` for an existing user.
- `PUT /api/v1/scheduler-settings` with `{cycleTrackingEnabled: true}` succeeds and persists.

---

## Part 3 — Backend: WeekContext extension

### 3.1 Extend the WeekContext type

**File:** `backend/src/shared/models.ts` (find the `WeekContext` interface)

Add three new optional fields:
```typescript
cyclePhasesByDay?: Array<'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'>;
cycleConfidence?: number; // 0.0–1.0, defaults to 0
cycleTrackingEnabled?: boolean; // defaults to false
```

Update `DEFAULT_WEEK_CONTEXT` to include these as undefined / 0 / false.

### 3.2 Populate from scheduler controller

**File:** `backend/src/api/scheduler/scheduler.controller.ts`

In `schedulePendingWeeks`, around the existing `weekContext` construction (look for `const weekContext = { ...DEFAULT_WEEK_CONTEXT, ...}`):

1. Inject `CycleProfileService` into the controller (constructor parameter).
2. For each week being scheduled, call `cycleProfileService.computePhasesForWeek(userId, week.startDate)` and merge the result into `weekContext`:

```typescript
const cycleData = await this.cycleProfileService.computePhasesForWeek(userId, week.startDate);
const weekContext = {
  ...DEFAULT_WEEK_CONTEXT,
  previousWeekEndedWithWorkout: previousWeekEndWorkouts.length > 0,
  cyclePhasesByDay: cycleData.phasesByDay,
  cycleConfidence: cycleData.confidence,
  cycleTrackingEnabled: cycleData.trackingEnabled,
};
```

3. Same in `generate` endpoint where weekContext from the DTO is merged. If client doesn't pass cycle data, controller fills it in.

### 3.3 Acceptance criteria for Part 3

- A `POST /api/v1/scheduler/generate-plan` call for a user with `cycleTrackingEnabled: true`, `mode: 'natural'`, valid period date → backend logs show 7-element `cyclePhasesByDay` populated for each week.
- Same call for a user with `cycleTrackingEnabled: false` → all `unknown`, confidence 0.

---

## Part 4 — Backend: cycle-aware scoring

### 4.1 Add scoring function

**File:** `backend/src/domain/scoring-engine.service.ts`

Add a new private method `cyclePhaseAdjustment`:

```typescript
private cyclePhaseAdjustment(
  day: number,
  type: CalendarEventType,
  ctx: ScoringContext,
): number {
  if (type !== 'workout') return 0;
  if (!ctx.weekContext.cycleTrackingEnabled) return 0;
  
  const phasesByDay = ctx.weekContext.cyclePhasesByDay;
  const confidence = ctx.weekContext.cycleConfidence ?? 0;
  if (!phasesByDay || phasesByDay.length !== 7 || confidence === 0) return 0;
  
  const phase = phasesByDay[day];
  if (phase === 'unknown') return 0;
  
  const sessionType = ctx.candidateWorkout?.sessionType?.toLowerCase() ?? '';
  const workoutType = ctx.candidateWorkout?.workoutType;
  
  // Classify the candidate as endurance vs strength, hard vs not
  const isEndurance = workoutType === 'running' || workoutType === 'biking' || workoutType === 'swimming';
  const isStrength = workoutType === 'strength';
  const isHardEndurance = isEndurance && (
    sessionType.includes('intervals') ||
    sessionType.includes('tempo') ||
    sessionType.includes('hill') ||
    sessionType.includes('long_run') ||
    (ctx.candidateWorkout?.isLongEndurance === true)
  );
  const isHardStrength = isStrength && (sessionType === 'strength' || sessionType === 'hiit');
  const isExplosive = sessionType.includes('hiit') || sessionType.includes('plyo');
  
  // Penalty matrix from research-backed methodology
  let raw = 0;
  
  if (phase === 'luteal') {
    if (isHardEndurance) raw = -0.6;
    else if (isHardStrength) raw = -0.3;
  } else if (phase === 'menstrual') {
    if (isHardEndurance) raw = -0.5;
    else if (isHardStrength) raw = -0.2;
  } else if (phase === 'follicular') {
    if (isHardEndurance) raw = +0.2;
    else if (isHardStrength) raw = +0.2;
  } else if (phase === 'ovulation') {
    if (isExplosive) raw = -0.1; // injury caution flag, soft penalty
    else if (isHardEndurance) raw = +0.1;
  }
  
  // Per-session override: read cyclePhaseRules if present
  // (cyclePhaseRules is uniform today via plan-template, but read defensively for future per-session variation)
  // For v1, the phase defaults above already encode this — skip rule reading
  
  return raw * confidence;
}
```

Wire it into the main `score()` method. Add as the 12th term:

```typescript
total += this.cyclePhaseAdjustment(day, type, ctx);
```

### 4.2 Acceptance criteria for Part 4

- Test via `/api/v1/scheduler/score` endpoint:
  - User with `cycleTrackingEnabled: true`, currently in luteal phase
  - Score a hard interval session → returns score with -0.6 × confidence applied vs same call with `cycleTrackingEnabled: false`
- Same scoring call when `mode: 'hormonal_contraception'` → no adjustment (returns same as if disabled)
- High variability profile: adjustment magnitude is roughly half that of low variability profile

---

## Part 5 — Backend: energy + symptom logging

### 5.1 Energy check-ins module

Create new module: `backend/src/energy-check-in/`

**File:** `energy-check-in.entity.ts`
```typescript
@Entity('energy_check_ins')
export class EnergyCheckIn {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() userId: string;
  @Column({ type: 'date' }) date: string; // YYYY-MM-DD
  @Column({ type: 'enum', enum: ['low', 'normal', 'high'] }) level: 'low' | 'normal' | 'high';
  @Column({ type: 'enum', enum: ['daily_checkin', 'post_workout', 'manual'], default: 'daily_checkin' }) source: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn() createdAt: Date;
}
```

**File:** `energy-check-in.dto.ts`
- `CreateEnergyCheckInDto`: `date` (ISO date string), `level` (enum), `source` (optional, defaults to daily_checkin), `notes` (optional)
- `UpdateEnergyCheckInDto`: all fields optional

**File:** `energy-check-in.service.ts` — standard pattern matching `note.service.ts`:
- `findAllByUser(userId, options?)` — order by `date DESC`, optional date range filter
- `findByUserAndDate(userId, date)` — single check-in for a specific date (latest if multiple)
- `create(userId, dto)` — upsert behaviour: if a check-in with same userId + date + source exists, update it; otherwise insert
- `update(id, userId, dto)`
- `remove(id, userId)`

**File:** `energy-check-in.controller.ts`
- `GET /api/v1/energy-check-ins` — list all for user, optional `?startDate=&endDate=` query
- `GET /api/v1/energy-check-ins/today` — convenience: today's check-in or null
- `POST /api/v1/energy-check-ins` — create or upsert
- `PUT /api/v1/energy-check-ins/:id` — update
- `DELETE /api/v1/energy-check-ins/:id` — delete

**File:** `energy-check-in.module.ts` — standard.

Register in `app.module.ts` databaseImports.

### 5.2 Symptom logs module

Create new module: `backend/src/symptom-log/`

Same pattern as energy-check-in. Entity:

```typescript
@Entity('symptom_logs')
export class SymptomLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() userId: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'simple-json' }) symptoms: string[]; // ['cramps', 'headache', ...]
  @Column({ type: 'text', nullable: true }) otherSymptom: string | null;
  @CreateDateColumn() createdAt: Date;
}
```

DTOs:
- `CreateSymptomLogDto`: `date`, `symptoms` (array of strings), `otherSymptom` (optional)
- `UpdateSymptomLogDto`: all optional

Service: same pattern + upsert by userId + date.

Controller:
- `GET /api/v1/symptom-logs` (with date range)
- `GET /api/v1/symptom-logs/today`
- `POST /api/v1/symptom-logs`
- `PUT /api/v1/symptom-logs/:id`
- `DELETE /api/v1/symptom-logs/:id`

### 5.3 Acceptance criteria for Part 5

- Both tables created on backend restart (schema sync logged).
- `POST /api/v1/energy-check-ins` with `{date: '2026-04-25', level: 'low'}` → 201 with full entity.
- Second `POST` same date+source → 200 with updated entity (upsert).
- `GET /api/v1/energy-check-ins/today` returns today's check-in or null.
- Same for symptom-logs.
- Cross-user security: GET another user's check-in by ID → 404.

---

## Part 6 — Frontend: cycle profile mode mapping

### 6.1 Mapping logic in onboarding

**File:** `src/app/pages/onboarding.page.ts`

In the `generatePlan` method, currently the cycle data is loosely passed. Add explicit mapping:

```typescript
private mapCycleStatusToBackendMode(status: CycleStatus): {
  mode: 'natural' | 'hormonal_contraception' | 'perimenopause' | 'manual';
  variability: 'low' | 'medium' | 'high';
} {
  switch (status) {
    case 'regular': return { mode: 'natural', variability: 'low' };
    case 'irregular': return { mode: 'natural', variability: 'high' };
    case 'hormonal': return { mode: 'hormonal_contraception', variability: 'low' };
    case 'menopause': return { mode: 'perimenopause', variability: 'high' };
  }
}
```

Call this in `generatePlan` and persist the cycle profile via `dataStore.updateCycleProfile()`. Also persist `cycleTrackingEnabled` to scheduler-settings via `dataStore.updateSchedulerSettings()` based on `data.cycleEnabled`.

### 6.2 Reverse mapping for display

**File:** `src/app/core/services/data-store.service.ts`

Add a computed signal `cycleStatusForDisplay` that reverses the mapping for the cycle page UI:

```typescript
readonly cycleStatusForDisplay = computed<CycleStatus | null>(() => {
  const profile = this.cycleProfile();
  if (!profile) return null;
  switch (profile.mode) {
    case 'natural':
      return profile.variability === 'high' ? 'irregular' : 'regular';
    case 'hormonal_contraception':
      return 'hormonal';
    case 'perimenopause':
      return 'menopause';
    case 'manual':
      return 'regular'; // best display fallback
  }
});
```

### 6.3 Acceptance criteria for Part 6

- Onboarding with "regular cycles" → backend `mode: 'natural', variability: 'low'`
- Onboarding with "irregular cycles" → backend `mode: 'natural', variability: 'high'`
- Onboarding with "hormonal contraception" → backend `mode: 'hormonal_contraception'`
- Onboarding with "menopause" → backend `mode: 'perimenopause'`
- Cycle page correctly displays the user's chosen mode after onboarding completion.

---

## Part 7 — Frontend: cycle tracking master toggle

### 7.1 Add toggle to settings

**File:** `src/app/pages/settings.page.ts` (or the cycle section of settings — read first to find)

In the cycle-related settings section, add a new toggle:
- Label: "Cycle-aware scheduling"
- Subtitle: "Adjust workout placement based on your cycle phase"
- Bound to `schedulerSettings.cycleTrackingEnabled` via DataStoreService

### 7.2 Wire reschedule trigger

**File:** `src/app/core/services/data-store.service.ts`

In the method that updates scheduler settings (find the existing pattern), when `cycleTrackingEnabled` changes value (compare old to new), trigger:

1. After successful save, prompt the user: `confirm("Cycle tracking changed — reschedule this week to apply?")`
2. If confirmed, call existing `dataStore.rescheduleConflicts(currentPlanId)` (or equivalent — find the method that calls `/api/v1/scheduler/reschedule-conflicts`)

For v1 use a simple `confirm()` dialog. A polished prompt component is a polish pass for later.

### 7.3 Acceptance criteria for Part 7

- Toggle visible in settings, reflects current backend state on load
- Toggling on → confirmation prompt appears → on confirm → reschedule API called → schedule updates
- Toggling off → same flow → schedule reverts to non-cycle-aware placements

---

## Part 8 — Frontend: mode-aware cycle page

### 8.1 Conditional rendering by mode

**File:** `src/app/pages/cycle.page.ts`

Add computed signals:

```typescript
protected readonly showsPhaseRing = computed(() => {
  const profile = this.cycleProfile();
  if (!profile) return false;
  if (!this.cycleTrackingEnabled()) return false;
  return profile.mode === 'natural' && !!profile.lastPeriodStart;
});

protected readonly showsPhaseBanner = computed(() => {
  const profile = this.cycleProfile();
  if (!profile) return false;
  if (!this.cycleTrackingEnabled()) return false;
  return profile.mode === 'hormonal_contraception' || profile.mode === 'perimenopause';
});

protected readonly bannerMessage = computed(() => {
  const profile = this.cycleProfile();
  if (!profile) return '';
  if (profile.mode === 'hormonal_contraception') {
    return "You're on hormonal contraception, so phase-based predictions don't apply. We'll use your energy and symptom logs to adapt your training.";
  }
  if (profile.mode === 'perimenopause') {
    return "Your cycle is likely irregular — we're using your logged energy and symptoms instead of phase predictions to adapt your training.";
  }
  return '';
});
```

In the template:

- Wrap the existing `phase-card` block with `@if (showsPhaseRing()) { ... }`
- Above it, render an info banner block with `@if (showsPhaseBanner()) { <banner with bannerMessage()> }`
- The energy check-in card and symptoms card stay visible for all modes when `cycleTrackingEnabled()` is true.

### 8.2 Banner styling

A simple banner card matching the existing design system:
- Cream background
- Steel blue left border (4px)
- Padding 12px
- Body text in `--color-text`
- Icon optional (info icon from lucide if available)

### 8.3 Acceptance criteria for Part 8

- Natural mode + tracking enabled + period logged → ring visible, banner hidden
- Hormonal contraception + tracking enabled → ring hidden, banner visible with hormonal copy
- Perimenopause + tracking enabled → ring hidden, banner visible with perimenopause copy
- Tracking disabled → existing "tracking is off" card shown (current behaviour)

---

## Part 9 — Frontend: wire energy + symptom persistence

### 9.1 New API services

**File:** `src/app/core/services/energy-check-in-api.service.ts`

Following `note-api.service.ts` pattern. Methods:
- `list(startDate?, endDate?)` → `GET /api/v1/energy-check-ins?startDate=&endDate=`
- `today()` → `GET /api/v1/energy-check-ins/today`
- `create(dto)` → `POST /api/v1/energy-check-ins`
- `update(id, dto)` → `PUT /api/v1/energy-check-ins/:id`
- `delete(id)` → `DELETE /api/v1/energy-check-ins/:id`

**File:** `src/app/core/services/symptom-log-api.service.ts`

Same pattern for `/api/v1/symptom-logs`.

### 9.2 DataStore additions

**File:** `src/app/core/services/data-store.service.ts`

Add:
```typescript
readonly energyCheckIns = signal<EnergyCheckIn[]>([]);
readonly symptomLogs = signal<SymptomLog[]>([]);

async loadEnergyCheckIns(startDate?: string, endDate?: string): Promise<void> { ... }
async saveEnergyCheckIn(dto: CreateEnergyCheckInDto): Promise<EnergyCheckIn | null> { 
  // Optimistic: update signal first, call API, revert on failure
  // Upsert logic: replace existing entry for same date+source if present
}
async loadSymptomLogs(startDate?: string, endDate?: string): Promise<void> { ... }
async saveSymptomLog(dto: CreateSymptomLogDto): Promise<SymptomLog | null> { ... }
```

Add corresponding TypeScript interfaces to `app-data.models.ts`.

### 9.3 Wire `saveCheckin` in cycle.page.ts

**File:** `src/app/pages/cycle.page.ts`

Replace the existing `saveCheckin()` method (currently `console.log`) with:

```typescript
protected async saveCheckin(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const energyLevel = this.energyLevel();
  const symptoms = this.selectedSymptoms();
  const otherSymptom = this.otherSymptom().trim();
  
  if (energyLevel) {
    await this.dataStore.saveEnergyCheckIn({
      date: today,
      level: energyLevel,
      source: 'daily_checkin',
    });
  }
  
  if (symptoms.length > 0 || otherSymptom) {
    await this.dataStore.saveSymptomLog({
      date: today,
      symptoms,
      otherSymptom: otherSymptom || null,
    });
  }
  
  // Visual feedback — toast or transient label "Saved" — keep simple
  // Reset selections after successful save
  this.energyLevel.set(null);
  this.selectedSymptoms.set([]);
  this.otherSymptom.set('');
}
```

### 9.4 Pre-populate today's check-in if exists

In `loadCycleData` of cycle.page.ts, also call `dataStore.loadEnergyCheckIns()` for today's date and pre-fill the form if a check-in already exists. Same for symptoms.

### 9.5 Acceptance criteria for Part 9

- Save energy check-in on cycle page → appears in DB via `GET /api/v1/energy-check-ins/today`
- Save symptoms → same
- Reload cycle page → today's existing check-in pre-fills the form
- Save again same day → existing entry updated (upsert), not duplicated
- Optimistic update: form clears immediately, reverts on API failure

---

## Part 10 — End-to-end verification (requires JWT bug fixed)

After your friend (or localStorage clear) fixes the JWT bug, manual verification:

### Scenario A — Natural cycle, regular
1. Onboarding with "regular cycles", set period start to 21 days ago (puts you in luteal)
2. Toggle "cycle-aware scheduling" on in settings
3. Generate a plan
4. Open Week view → verify: hard sessions (intervals, tempo, long runs) are clustered toward the start of the week (follicular days), recovery/easy sessions in the back half (luteal)

### Scenario B — Hormonal contraception
1. Onboarding with "hormonal contraception"
2. Cycle page: ring hidden, banner visible
3. Generate plan → schedule should be identical with cycle tracking on or off (no phase scoring applied)

### Scenario C — Energy logging
1. On cycle page, log "low energy" + "cramps" + "fatigue"
2. Refresh page → form should pre-fill with the saved entry
3. Modify and save again → check DB: same row updated, not duplicated

### Scenario D — Toggle reschedule
1. With a generated plan, toggle cycle-aware scheduling off
2. Confirm prompt
3. Verify schedule changes (some sessions move)
4. Toggle back on → schedule moves again

---

## Order of operations for CC

CC executes in this order. Each part has a checkpoint where you can verify before moving on.

1. **Part 2** — scheduler-settings additions (smallest, isolated)
2. **Part 5** — energy + symptom logging modules (independent, clean)
3. **Part 1** — cycle phase computation
4. **Part 3** — WeekContext extension
5. **Part 4** — scoring engine integration
6. **Backend restart, verify all schema syncs cleanly**
7. **Part 6** — onboarding mode mapping
8. **Part 7** — settings toggle + reschedule trigger
9. **Part 8** — cycle page mode variants
10. **Part 9** — wire energy/symptom persistence

After each backend section, run `Remove-Item -Recurse -Force backend/dist; npm run build` from backend.
After each frontend section, run `npm run build` from repo root.

---

## Rules CC must follow

- Read CLAUDE.md hard rules first (especially rules 9 and 10 on strict scope)
- Read all pre-flight files in full before editing
- Match existing patterns (note module is the closest reference for energy/symptom modules)
- Do NOT touch the scheduling DFS algorithm — only add the new scoring function and weekContext fields
- Do NOT modify scoring values from the existing 11 functions — only ADD the 12th
- Do NOT invoke `/simplify`, `/refactor`, or other broad-cleanup commands
- PowerShell commands, Windows paths
- Skip lint (npm SSL issue, separate problem)
- After each part: rebuild and confirm no type errors
- Update `docs/session-notes.md` at end of session with what shipped and what's pending

If anything in the spec is ambiguous, ask before building.
