# WP3C Spec — Wire "Find time for this" to the Scheduler

**Goal:** When a user toggles "Find time for this" on a note (with duration set), the app suggests 2-3 calendar slots, user picks one, app creates a linked calendar event.

**Estimated effort:** ~1 hour CC execution.

**Reuses:** Existing `wantsScheduling` and `linkedCalendarEventId` fields on Note (already in DB from Thursday). Existing `/api/v1/scheduler/score` endpoint. Existing CalendarEvent CRUD.

---

## Architectural principles

1. **No new scheduler endpoint needed.** Reuse `/score` to evaluate slots; client picks top 3.
2. **Slot suggestion is client-driven, not backend.** Frontend builds candidate slots, calls score endpoint, sorts, shows top 3.
3. **Scheduling a note creates a `custom-event` calendar event.** Not a workout. Type stays distinct.
4. **`wantsScheduling` toggle is the trigger.** On save → if true and duration set → suggestion flow fires.
5. **Hard gate on duration.** Toggle is disabled in UI until `estimatedDurationMinutes` is set.

---

## Pre-flight reading for CC

- `src/app/pages/notes.page.ts` — current quick-add form, toggle UI
- `src/app/core/services/data-store.service.ts` — Notes signals + saveNote
- `src/app/core/services/note-api.service.ts`
- `src/app/core/services/scheduler-api.service.ts` — find the `score` method, confirm signature
- `backend/src/api/scheduler/scheduler.controller.ts` — `/score` endpoint, what payload it expects
- `backend/src/api/scheduler/dto/scheduler.dto.ts` — `ScoreSlotDto` shape
- `src/app/pages/today/event-card.component.ts` (if exists) — to understand how custom-events render

---

## Part 1 — Frontend: gate the toggle on duration

**File:** `src/app/pages/notes.page.ts`

The `wantsScheduling` toggle should be disabled until `estimatedDurationMinutes` is a positive number.

Add computed signal:
```typescript
protected readonly canScheduleNote = computed(() => {
  const duration = this.estimatedDurationMinutes();
  return typeof duration === 'number' && duration > 0;
});
```

In the template:
- Apply `[disabled]="!canScheduleNote()"` to the "Find time for this" toggle/checkbox
- Add visual greyed-out state (matching existing disabled styling)
- Add helper text below the toggle: when disabled, show "Set an estimated duration to enable" in muted color
- When `wantsScheduling` is true but `canScheduleNote` becomes false (user clears duration), force `wantsScheduling` back to false via effect

### Acceptance for Part 1
- Toggle is greyed out by default (no duration)
- Set duration to 30 min → toggle becomes interactive
- Toggle on → save the note → triggers Part 2
- Clear duration after toggle was on → toggle disables and resets to off

---

## Part 2 — Frontend: slot suggestion service

Create new service: `src/app/core/services/slot-suggestion.service.ts`

```typescript
export interface SlotCandidate {
  date: string; // YYYY-MM-DD
  day: number; // 0-6 (offset from week start)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  score: number;
  label: string; // human-readable, e.g. "Tuesday 14:00"
}
```

Method: `async suggestSlotsForNote(note: Note, count: number = 3): Promise<SlotCandidate[]>`

**Logic:**
1. Determine target week:
   - If `note.dueDate` is set, use that week
   - Otherwise, use the upcoming Monday's week
2. Get existing calendar events for that week (already in DataStore)
3. Build candidate slots:
   - For each of 7 days in target week
   - For each 30-min window between user's `autoPlaceEarliestTime` and `autoPlaceLatestTime`
   - Skip windows that overlap existing events with a 15-min buffer
   - Skip windows where end > latest time
4. For each candidate, call `schedulerApi.score()` with payload:
   - `day`, `startMin`, `endMin`
   - `type: 'custom-event'`
   - `existingEvents`: the week's events
   - `settings`: user's scheduler settings
5. Sort by score descending, deduplicate (one slot per day max), take top `count`
6. Return as `SlotCandidate[]` with human-readable labels

**Performance note:** scoring all candidates of a full week is ~14 hours × 2 slots × 7 days = ~200 calls. Too many. **Throttle: only score one candidate per 90-min block per day** (reduces to ~50 calls). Document this in code comment.

### Acceptance for Part 2
- Service returns 3 SlotCandidate objects sorted by score
- Each candidate has different days when possible
- Slots don't overlap existing events
- Service handles "no plan exists" gracefully (returns empty array)

---

## Part 3 — Frontend: slot picker UI

Create new component: `src/app/components/slot-picker-dialog/slot-picker-dialog.component.ts`

A modal dialog component that:

**Inputs:**
- `note`: the Note being scheduled
- `slots`: SlotCandidate[]

**Output events:**
- `slotSelected`: SlotCandidate
- `cancelled`: void

**UI:**
- Title: "When should we schedule '[note title]'?"
- Subtitle: "[duration] minutes — pick a time:"
- 3 cards, each showing:
  - Day label ("Tuesday")
  - Date ("28 Apr")
  - Time range ("14:00 – 14:30")
  - Tap area triggers `slotSelected`
- "Cancel" button at bottom
- Modal overlay, dismissible by tapping outside or Cancel
- Match existing modal styling from event-detail-modal if it exists

### Acceptance for Part 3
- Opens via call from Notes page
- Renders 3 slot cards correctly
- Selecting a slot fires the event and closes the modal
- Cancel closes without selecting

---

## Part 4 — Frontend: wire it together in Notes page

**File:** `src/app/pages/notes.page.ts`

Modify `saveNote()`:

1. Save the note as before (with `wantsScheduling: true`)
2. After save succeeds, if `wantsScheduling: true`:
   - Show a loading state ("Finding good times…")
   - Call `slotSuggestionService.suggestSlotsForNote(note)`
   - If empty array returned, show toast: "Couldn't find a free slot this week. Set a due date to suggest a different week."
   - Otherwise, open `SlotPickerDialogComponent` with the slots
3. On `slotSelected`:
   - Create CalendarEvent via DataStore (new method needed: `createNoteEventFromSlot(note, slot)`)
   - The created event:
     - `type: 'custom-event'`
     - `title: note.title`
     - `date: slot.date`
     - `startTime`, `endTime` from slot
     - `durationMinutes`: note.estimatedDurationMinutes
     - `isManuallyPlaced: false` (algorithm picked, but user confirmed)
     - `isPersonal: true` (it's a note-derived event)
   - Update note's `linkedCalendarEventId` via API PUT
   - Show success toast: "Scheduled for [day] at [time]"
4. On `cancelled`:
   - Note remains saved with `wantsScheduling: true` but no linked event
   - Show subtle indicator on the note card "Scheduling pending" with a retry button

### Acceptance for Part 4
- Toggle + save → modal appears with 3 slots
- Pick slot → calendar event appears in Week view at that time/day
- Note card shows "Scheduled for Tuesday 14:00" subtitle
- Refresh page → linkage persists

---

## Part 5 — DataStore additions

**File:** `src/app/core/services/data-store.service.ts`

Add method:

```typescript
async createNoteEventFromSlot(
  note: Note, 
  slot: SlotCandidate
): Promise<CalendarEvent | null> {
  // 1. Create calendar event via calendarEventApi.create()
  // 2. Update note.linkedCalendarEventId via noteApi.update()
  // 3. Update local notes signal
  // 4. Update local calendarEvents signal
  // 5. Return created event
}
```

Optimistic update pattern matching existing services. Revert on failure.

### Acceptance for Part 5
- Method creates both rows
- Local signals update immediately
- Both views (Notes, Week) reflect the new event/link

---

## Part 6 — Visual indicator on note card

**File:** `src/app/pages/notes.page.ts`

In the note card rendering:

- If `note.linkedCalendarEventId` is set: show small calendar icon + "Scheduled for [day] [time]" (resolve from calendarEvents signal)
- If `note.wantsScheduling` is true but no `linkedCalendarEventId`: show "Scheduling pending — retry" button that re-runs the slot suggestion flow
- Tapping the scheduled indicator opens the calendar event (navigate to Week view that day, or reuse event-detail-modal)

### Acceptance for Part 6
- Scheduled notes are visually distinct from unscheduled
- Pending notes are recoverable
- Click-through to calendar works

---

## Part 7 — Edge cases

Handle these in the implementation:

1. **Note deleted while linked event exists**: cascade — when note is deleted, also delete the linked calendar event. Add to `deleteNote` in DataStore.
2. **Calendar event deleted while note has link**: detect on next page load, clear `linkedCalendarEventId` and revert `wantsScheduling` to false. Add to existing data refresh logic.
3. **Note edit changes duration**: if `linkedCalendarEventId` is set, prompt: "Duration changed. Re-schedule the calendar entry?" → if yes, re-run slot suggestion. If no, leave existing event with old duration.
4. **No plan exists**: notes scheduling still works — the slot suggester scores against existing calendar events only, doesn't need a plan.

---

## Order of operations for CC

1. Part 5 (DataStore method) — foundation
2. Part 2 (slot suggestion service) — core logic
3. Part 3 (slot picker dialog) — UI component
4. Part 1 (toggle gate) — small, isolated
5. Part 4 (wire it together)
6. Part 6 (visual indicator)
7. Part 7 (edge cases)

After each Part, build cleanly. Final integration test in browser.

---

## Rules CC must follow

- Read CLAUDE.md hard rules (especially 9 and 10 on strict scope)
- Read all pre-flight files in full before editing
- Match existing patterns (SlotPickerDialog should mirror event-detail-modal style)
- Do NOT modify scoring engine, scheduling DFS, or any backend (Backend already has /score endpoint and CalendarEvent CRUD)
- Do NOT add new backend endpoints
- Strict scope per rules 9 and 10
- After each Part: rebuild, confirm clean
- Update docs/session-notes.md at end

If anything is unclear, ask before building.
