# WeekPlanner

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# Week Planner: How Workout Placement Works








## Selection/ placement logic - MVP

The placement engine uses a **depth-first search (DFS) algorithm** with **multi-objective optimization** to find the best weekly schedule. It processes workouts one at a time, exploring where each can fit while respecting hard constraints and optimizing for soft scoring preferences.

---

## The Placement Strategy (3-Level Hierarchy)

### Level 1: **Lexicographic Primary Objective** — Maximize Long Sessions
- The algorithm first tries to fit as many **long-endurance workouts** (swims, long runs, long bikes) as possible
- It uses a **feasible band**: accepts any schedule with `[Lmax - 1, Lmax]` long sessions, where `Lmax` is the absolute maximum possible
- This ensures you get close to your best endurance capacity without sacrificing quality

### Level 2: **Quality Optimization** — Diversity & Total Score
- Among all schedules with acceptable long-session counts, pick the one with:
  1. **Most workouts placed** (minimize unplaced count)
  2. **Highest weighted score** (endurance/strength balance)
  3. **Highest total score** (soft bonuses/penalties)

### Level 3: **Soft Scoring** — Distribute Workouts Intelligently
The algorithm rewards beneficial placements with points:

| Factor | Points | Why |
|--------|--------|-----|
| **Diversity combo** | +0.6 | Mixing strength + endurance on same day |
| **Shift-aware after-work** | +0.45 | Placing workouts after work shifts (when afternoon window exists) |
| **Early morning (7-9am)** | +0.2 | Preferred time for fresh starts |
| **Evening (5-7pm)** | +0.2 | Natural recovery time after work |
| **Widest available window** | up to +0.45 | Placing in largest contiguous free time blocks |
| **Meal prep spacing** | +0.2-0.6 | Spacing meal prep 2-3 days apart |

And penalizes undesirable placements:

| Factor | Penalty | Why |
|--------|---------|-----|
| **Same workout type on same day** | -1.5 | e.g., 2 runs on Wed blocks strength placement |
| **Concentration** | -0.5 per workout | Each extra workout on same day (soft; not absolute) |
| **Pre-work placement (when after-work exists)** | -0.35 | Waste prime muscle recovery hours before shift |
| **Event day clutter** | -0.05 per event | Custom events / meal prep take mental load |
| **Fatigue** | 0.05× exhaustion% | High fatigue days penalized |

---

## Hard Constraints (Absolute Blockers)

These **cannot be violated** — a placement fails if it violates any of these:

### Shift & Commute Buffers
- **Pre-shift buffer**: If work shift is 09:00-17:00 with 30min commute, no workout can end after 08:30 or start before 08:30 (pre-shift buffer)
- **Post-shift buffer**: No workout can start before 17:30 or encroach the 30min commute window after

### Custom Event Commute
- Same logic as shifts: e.g., Doctor appointment 16:00-19:00 with 30min commute blocks workout start until 19:30

### Endurance Rest Days
- After a long-endurance workout (e.g., 75+ min run), **no other workouts allowed for 1 day** (configurable per-sport)
- Before an intensive endurance session, previous day must be activity-free

### Long Workouts Block Same Day
- A long-endurance session **must be alone** on its day — no other workouts

### Minimum 3-Hour Rest Between Workouts
- If 2+ workouts on same day, must be **180+ minutes apart**

### No Workouts After Night Shift
- After a night shift, no workouts allowed the next morning

### Meal Prep Spacing
- Minimum 1 day gap between meal prep sessions (configurable)

### Same-Type Diversity Requirement ⭐ NEW
- **No two workouts of the same type on the same day** (e.g., can't do 2 runs on Wednesday)
- Forces the algorithm to spread workout types across the week

---

## The Search Process

1. **Build Sessions Queue**: Orders workouts by priority (endurance > strength > mealprep), then by frequency needed
2. **DFS Exploration**: For each session, finds all valid candidate slots
3. **Candidate Evaluation**:
   - Check hard constraints first (fails if violated)
   - Score remaining slots using soft penalties/bonuses
   - Keep best 8 candidates (to limit search explosion)
4. **Two Branches Per Session**:
   - **Try placing it**: Recursively place next session
   - **Try skipping it**: Mark as unplaced, recurse (allows future sessions to fit better)
5. **Select Best Complete Schedule**: Among all explored paths, pick one with:
   - Most long sessions (within feasible band)
   - Then: most workouts placed → highest quality → highest total score

---

## When Placement Fails (Unplaced Workouts)

If a workout cannot fit, it's marked **unplaced** with a reason:

| Reason | Meaning |
|--------|---------|
| **Insufficient 3-hour recovery window** | Can't fit both workouts 180+ min apart on available days |
| **Required rest day after intensive session** | Long endurance uses up day + next day, no room for this workout |
| **Consecutive day has intensive workout** | Can't place this workout because previous/next day already has an intensive recovery block |
| **No available time window** | All candidate slots are blocked by shifts, custom events, or other workouts |
| **Conflicts with long workout placement** | The DFS determined placing this prevents better long-session optimization |

---

## Example: Why 2 Runs Don't Go On Wednesday

**Scenario**: Wed has Doctor (16:00-19:00), 2× weekly runs needed (problem was that it placed 2 runs back to back and a single strength session on sunday - instead of enforcing diversity)

**Before Fix**: Algorithm would place both on Wed → Hard constraint now blocks this
**With Fix**: 
- Tries Run #1 on Wed → checks 20:00+ (after 30min commute) → fits ✓
- Tries Run #2 on Wed → **BLOCKED** (same type already on day)
- Moves to explore Thu-Sun → finds free slot on Sun morning
- **Final**: Wed gets 1 run + strength, Sun gets 1 run → diverse, balanced

---

## Customization Points

All scoring weights are tunable in `scoring-engine.service.ts`:
```typescript
SAME_TYPE_STACKING_PENALTY = 1.5;     // Increase to strictly enforce diversity
DIVERSITY_COMBO_BONUS = 0.6;           // Reward mixed workout types
WIDEST_WINDOW_BONUS_CAP = 0.45;        // Prefer spacious time slots
DAY_CONCENTRATION_PENALTY = 0.5;       // Discourage stacking too many on one day
```

Hard constraints live in `constraint-checker.service.ts` — edit to change rest-day rules, commute buffers, etc.

---

## Key Design Insights

✅ **Soft penalties alone weren't enough** → Needed hard constraint on same-type diversity
✅ **Lexicographic approach** → Ensures you always maximize long-endurance capacity first
✅ **Widest window bonus** → Spreads workouts naturally vs. cramming them
✅ **Shift-aware scoring** → Respects your work schedule and gives after-work priority
✅ **DFS branching** → Explores both "place it" and "skip it" paths, finding global optimum (not greedy)
