# WP1: Dedicated Workout Page — Builder Spec

## Overview
Full-screen workout page that opens when a user taps any workout event. Three states: Pre-Workout (instructions), During Workout (timer), Post-Workout (logging + feedback). Build in 5 parts.

## Context
- Angular 21, standalone components, signals API
- Design system: cream background (#FAFAF7), steel blue (#2d4d7a), Inter body font, Playfair Display headings
- Existing workout descriptions utility at `src/app/core/utils/workout-descriptions.ts`
- Existing models at `src/app/core/models/app-data.models.ts`
- Existing data store at `src/app/core/services/data-store.service.ts`
- Route pattern: `/workout/:eventId` (new route)

---

## Part 1: Pre-Workout View

### Route & Navigation
- Add route `/workout/:eventId` in `app.routes.ts`
- Create page at `src/app/features/workout/workout.page.ts`
- Hide bottom tab bar on this page (same pattern as login/onboarding)
- Back arrow in top-left navigates back to previous page
- Gear icon in top-right links to /settings (same as other pages)

### Opening the Workout Page
Wire these entry points to navigate to `/workout/{eventId}`:
- Today page: tapping a workout card opens this page
- Week view: add a "Start" button on expanded workout cards (next to Mark as done / Skip)
- "I Have Time" sheet: "Let's do it" navigates here instead of just creating the event
- Plan tab: tapping a session in the current week card opens a preview version

### Page Layout (Pre-Workout State)

**Header Section:**
- Back arrow (top-left)
- Session name large: "Tempo Run" — 24px Playfair Display
- Phase + week context: "Week 5 · Build Phase" — 14px Inter, secondary color
- Priority badge: "Key" pill (if key session)
- Intensity indicator: colored dot + label ("Hard" in red, "Moderate" in amber, "Easy" in green)

**Quick Stats Row:**
- Duration: "45 min" with clock icon
- Distance: "8 km" with route icon (if applicable)
- Target pace: "4:58/km" with speed icon (if race mode with pace targets)
- Displayed as a horizontal row of 2-3 stat pills

**Workout Structure Section:**
Card with header "YOUR SESSION" (uppercase label, same style as "YOUR DAY" on Today page)

Break the session into structured steps based on session type:

For **Tempo Run:**
```
1. Warm-up     10 min    Easy pace
2. Main set    25 min    Tempo pace (4:58/km)
3. Cool-down    5 min    Easy pace
```

For **Intervals:**
```
1. Warm-up     10 min    Easy pace
2. Interval 1   3 min    Fast (4:30/km)
3. Recovery     2 min    Jog
4. Interval 2   3 min    Fast (4:30/km)
5. Recovery     2 min    Jog
6. (repeat 4-6x)
7. Cool-down   10 min    Easy pace
```

For **Easy Run / Long Run:**
```
1. Run          35 min   Easy conversational pace
   (or structured as: first half easy, second half steady)
```

For **Strength Training:**
```
1. Warm-up      5 min    Light cardio + dynamic stretches
2. Squats       3x10     Moderate weight
3. Deadlifts    3x8      Moderate weight  
4. Rows         3x10     Moderate weight
5. Overhead Press 3x10   Moderate weight
6. Cool-down    5 min    Static stretches
```

For **Yoga / Mobility:**
```
1. Hip openers      5 min
2. Hamstring stretches  5 min
3. Thoracic spine   5 min
4. Calf/ankle work  5 min
5. Savasana         5 min
```

Create a utility function `getWorkoutStructure(sessionType, duration, intensity, paceTarget?)` that returns an array of `{ step: string, duration: string, description: string }`. Hardcode the structures for now — later AI will generate personalized versions.

Each step displayed as a row: step number (circle) | step name | duration | description. Visual timeline connector line between steps (same pattern as plan week timeline).

**Coaching Description Section:**
Card with header "COACH'S NOTES"
- Pull from existing `getWorkoutDescription()` utility
- Show `whatToDo` text with lightbulb icon
- Show `whyItHelps` as expandable "Why?" section
- Below that: "Ask your coach" link (placeholder — logs to console for now). Style this in the AI orange/amber color (#D4880F) to signal it's an AI feature.

**AI Personalization Placeholder:**
Below the coaching description, show a subtle card:
- "Personalized tips coming soon" — 12px, secondary color, italic
- Small sparkle icon in amber
- This is where AI-generated personalized advice will appear later (e.g., "Last week you held 5:10/km on your tempo — try 5:05 today")

**Start Button:**
- Fixed at bottom of screen (above safe area, not scrolling)
- Full-width primary button: "Start Workout"
- On tap: transitions to During Workout state
- If the workout is already completed: show "Completed ✓" in green instead of start button
- If the workout is in the past and not completed: show "Log this workout" instead (skips timer, goes to post-workout)

---

## Part 2: During Workout View (Simple Timer)

**This is deliberately minimal.** The user's phone is in their pocket or on the gym floor. They glance at it occasionally.

**Layout:**
- Large timer in the center: "12:35" — 48px, bold, monospace
- Below timer: current step from the structure: "Main Set — Tempo Pace"
- Below that: next step preview: "Up next: Cool-down (5 min)"
- Progress bar showing overall workout progress (time elapsed / total duration)

**Controls (large, thumb-friendly):**
- Pause / Resume button — large circle, center
- "End Early" text link below — secondary color
- No other controls. Keep it simple.

**Step transitions:**
- When the timer passes a step boundary, update the current/next step display
- Optional: subtle vibration or color pulse on step change (if the browser supports it)
- For intervals: show the interval count "Interval 3 of 6"

**"End Early" flow:**
- Tapping "End Early" shows a bottom sheet: "How far did you get?"
- Options: "Completed main set", "Stopped during warm-up", "Custom" (text input)
- After selecting, transitions to Post-Workout with actual duration recorded

**Completion:**
- When timer reaches total duration, show a completion screen briefly (2 seconds):
- Large checkmark animation (or just a static green check)
- "Well done!" — 24px Playfair Display
- Auto-transitions to Post-Workout view

---

## Part 3: Post-Workout View

**This is the stats logging screen. All fields are optional — the user can skip everything and just tap "Done".**

**Header:**
- "How'd it go?" — 22px Playfair Display
- Session name: "Tempo Run · 45 min" — 14px secondary
- Date: "Wednesday, May 21" — 12px secondary

**Feeling Section:**
- "How did it feel?" — 16px semibold
- Three large tappable cards in a row:
  - "Easy" — green background tint, relaxed face icon
  - "Moderate" — amber tint, neutral face icon  
  - "Hard" — red tint, intense face icon
- One must be selected before saving (this is the only required field)
- Selecting one highlights it and dims the others

**Stats Section:**
Card with header "YOUR STATS" — all fields optional, numeric inputs

| Field | Label | Unit | Placeholder | When to show |
|-------|-------|------|-------------|--------------|
| actualDuration | "Duration" | min | Pre-filled from timer or planned duration | Always |
| actualDistance | "Distance" | km | Empty | Running, cycling, swimming |
| averagePace | "Avg Pace" | min/km | Empty | Running |
| averageSpeed | "Avg Speed" | km/h | Empty | Cycling |
| averageHeartRate | "Avg Heart Rate" | bpm | Empty | Always |
| maxHeartRate | "Max Heart Rate" | bpm | Empty | Always |
| calories | "Calories" | kcal | Empty | Always |
| elevationGain | "Elevation" | m | Empty | Running, cycling |

Show only the relevant fields based on the workout's sport type. Don't show pace for strength, don't show speed for running.

Pre-fill `actualDuration` from the timer (if they used it) or from the planned duration.

**HR Zone Summary (placeholder for Garmin integration):**
- Below the stats fields, show a subtle placeholder card:
- "Connect Garmin or Strava to auto-fill your stats" — 13px, secondary, italic
- Small link icon
- This is where the zone breakdown chart will appear when wearable data is available

**Notes Section:**
- "Notes" label with text area input
- Placeholder: "How did it feel? Anything to remember?"
- Max 500 characters
- 3 rows visible, expandable

**AI Coach Feedback Placeholder:**
- Card with amber/orange left border
- Header: "Coach's Review" with sparkle icon in amber
- Body: "AI-powered workout analysis coming soon. Your coach will review your performance and suggest improvements."
- 13px, secondary color, italic
- This is where the post-workout AI feedback will appear (e.g., "You ran 4:45/km vs target 5:00/km — great pace but be careful not to burn out before peak week")

**Action Buttons (fixed at bottom):**
- "Save & Finish" — primary button, full width
- On tap: saves the post-workout data, marks session as completed, navigates back
- "Skip Logging" — text link below
- On tap: marks session as completed with just the energy rating (easy/moderate/hard), no stats, navigates back

---

## Part 4: Data Model & Backend

### New Table: `workout_logs`
```
id: uuid PK
userId: FK → users
plannedSessionId: FK → planned_sessions, nullable
calendarEventId: FK → calendar_events, nullable
sessionType: string
sportType: string, nullable
energyRating: enum ('easy', 'moderate', 'hard')
plannedDuration: number (minutes)
actualDuration: number (minutes), nullable
actualDistance: number (km), nullable
averagePace: string, nullable (min/km format "5:30")
averageSpeed: number, nullable (km/h)
averageHeartRate: number, nullable (bpm)
maxHeartRate: number, nullable (bpm)
calories: number, nullable
elevationGain: number, nullable (meters)
notes: text, nullable
endedEarly: boolean, default false
endedEarlyReason: string, nullable
completedAt: timestamp
```

### New Endpoints
```
POST   /api/v1/workout-logs              — create workout log
GET    /api/v1/workout-logs              — get all logs for user
GET    /api/v1/workout-logs/:id          — get single log
GET    /api/v1/workout-logs/session/:id  — get log by planned session ID
PUT    /api/v1/workout-logs/:id          — update log
```

### Integration with Existing Session Completion
When "Save & Finish" is tapped:
1. Create the workout_log record
2. Mark the planned session as 'completed' (existing endpoint)
3. Update the calendar event status
4. Navigate back

### Frontend Service
Add `workout-log-api.service.ts` with typed methods for the new endpoints.
Add workout log state to DataStoreService (or keep it local to the workout page since it's only viewed there).

---

## Part 5: Wire Entry Points

### Today Page
- When user taps a workout card → navigate to `/workout/{eventId}` instead of just expanding
- Keep the quick-expand behavior too: short tap = expand (existing), long press or dedicated "Open" button = navigate to workout page
- Actually, simpler approach: add a "Start" button inside the expanded card that navigates to the workout page. The expand still works for quick info.

### Week View
- Add a small "▶ Start" button on expanded workout cards, positioned next to "Mark as done" and "Skip"
- On tap: navigate to `/workout/{eventId}`

### "I Have Time" Sheet
- "Let's do it" button: create the calendar event, THEN navigate to `/workout/{newEventId}`
- The user goes straight from suggestion to the pre-workout view

### Plan Tab
- Tapping a session in the current week card opens `/workout/{linkedEventId}` if the session has a linked calendar event
- If no linked event (unscheduled session): show a note "Schedule this session first" or offer to schedule it now

---

## Design Notes

- This page should feel like opening a personal coaching session, not a form
- The pre-workout view is the most important — it should make the user feel prepared and motivated
- The timer is deliberately minimal — don't overengineer it, the user will use their watch
- The post-workout view should feel rewarding, not like homework — "Well done!" before the form
- All stat fields are optional to reduce friction — the energy rating is the minimum viable log
- The AI placeholders should feel like preview of a premium feature, not broken functionality
- Use the amber/orange color ONLY for AI-related elements to maintain the visual language

## What NOT to Build
- No GPS tracking
- No real-time heart rate display
- No audio cues for intervals
- No social sharing from the workout page
- No comparison with previous workouts (that's the stats dashboard, WP5)
- No Garmin/Strava import (that's WP9)

## Execution Order (recommended)
1. Part 4 — Backend + frontend service
2. Part 1 — Pre-workout view
3. Part 3 — Post-workout view
4. Part 5 — Wire entry points
5. Part 2 — Timer (least critical)
