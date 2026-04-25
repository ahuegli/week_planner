# Architecture decisions

## Three-layer AI architecture
- Layer 1 (no AI, no cost): algorithm handles scheduling, templates, phase calc, carry-forward, reminders. ~80% of intelligence.
- Layer 2 (AI, rare): plan generation for edge cases. ~monthly per user.
- Layer 3 (AI, occasional): coaching chatbot, cycle adjustment, adaptive coaching. 2-3 calls/week/user.

## Three plan modes
- Race: periodised (base → build → peak → taper), 8-20 weeks
- General Fitness: repeating 4-week blocks
- Weight Loss: repeating blocks, longer cardio (40+ min)

## Scheduling philosophy
- Algorithm places workouts; AI adapts them over time.
- Key sessions get first pick of slots (priority-based).
- Long/intensive sessions prefer free days (weekends).
- Post-shift "golden window" for weekday workouts (30 min to 2.5h after shift end).
- User-placed workouts are locked (`isManuallyPlaced = true`) and never auto-moved.
- Minimal disruption: prefer shifting 1 hour over redesigning the week.
- Reschedule is idempotent — pressing it 10 times yields the same result.

## Cycle phase awareness (WP2 target)
- `cyclePhaseRules` exists on every session but the scorer does NOT read them yet.
- Rules are populated uniformly from `CYCLE_PHASE_RULES` constant in plan-template.service.ts.
- Will differentiate by session type (endurance vs strength) when wired.
- Research finding: effect sizes on cycle-phase performance are small; subjective effort is the real driver. Avoid hard endurance in luteal more strictly than hard strength.

## Cycle mode expansion (WP2)
- Add `post_menopause` to backend `CycleMode` enum.
- Reconcile frontend `CycleStatus` ('regular' | 'irregular' | 'hormonal' | 'menopause') with backend `CycleMode` ('natural' | 'hormonal_contraception' | 'perimenopause' | 'post_menopause' | 'manual').
- Hormonal contraception + perimenopause + post-menopause all share the same scheduler behaviour: no phase-based scoring, rely on logged energy + symptoms.
- Post-menopause gets distinct template rules: HIIT preferred over long cardio, heavy low-rep strength, plyometrics, +1 rest day default.

## Scoring engine values (tuned — do not change without permission)
| Factor | Value |
|--------|-------|
| offDayBonus (no shifts) | +0.6 |
| offDayBonus (shifts + free windows) | +0.1 |
| longSessionFreeDayBonus | +0.5 |
| Buffer bonus (wide free window) | +0.2 |
| After-work shift-aware bonus | +0.35 |
| Preferred time window bonus | +0.2 |
| Spread penalty (3+ weekday, empty free days) | -0.4 |
| Adjacent day penalty (both neighbours have workouts) | -0.3 |
| Adjacent day bonus (no neighbours) | +0.2 |
| Free-day morning bonus | +0.2 |
| Universal late night penalty (after 21:30) | -0.4 |
| Candidate sort | Earlier wins ties |
