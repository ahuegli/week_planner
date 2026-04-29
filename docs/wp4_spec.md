# WP4 Spec — Calendar Sharing (Full, Filtered, and Event Invitations)

**Goal:** Three sharing modes, all built on a shared foundation, allowing users to:
- **WP4A**: Grant another user read-only access to their full calendar
- **WP4B**: Grant filtered access (recipient sees busy/free or workouts only, not personal event details)
- **WP4C**: Send specific event invitations (workout buddy requests, coffee chats)

**Estimated effort:** WP4A 2-3h, WP4B +2h, WP4C +3-4h. Total 7-9h CC. Execute incrementally with checkpoints between each.

**Architectural goal:** All three modes share one data model (`calendar_shares` and `event_invitations` tables) and one set of frontend services. Adding WP4B and WP4C on top of WP4A should be additive, not refactoring.

**Note:** This WP4 supersedes any older "Share as Image" feature in `work_packages.md`. Image export is deferred to a later WP.

---

## Architectural principles

1. **One pair, one share.** A single `calendar_shares` row represents the relationship from User A → User B. The `shareLevel` enum determines what B sees.
2. **Read-only across all share modes.** Recipients can never edit owner's events. Edit/co-management is post-v1.
3. **Per-event invitations are separate from calendar shares.** WP4C uses an `event_invitations` table; an event can be invited to a user without granting full calendar access.
4. **Owner controls revocation.** Recipient can opt-out (set `active=false` on incoming) but cannot fully delete shares.
5. **Symmetric viewing requires two grants.** A → B does not imply B → A.
6. **Recipients are existing users.** Email lookup at grant time. Non-existent emails get an inline error.
7. **No real-time sync in v1.** Recipients refresh to see updates.

---

## Pre-flight reading for CC

- `backend/src/calendar-event/calendar-event.service.ts`
- `backend/src/calendar-event/calendar-event.controller.ts`
- `backend/src/auth/jwt-auth.guard.ts`
- `backend/src/user/user.service.ts` — to find users by email
- `backend/src/note/note.service.ts` — closest reference for new module patterns
- `src/app/pages/week.page.ts`
- `src/app/core/services/data-store.service.ts`
- `src/app/core/services/calendar-event-api.service.ts`
- `src/app/pages/settings.page.ts/.html`

---

## WP4A — Full Calendar Sharing

### Part 1A — Backend: calendar_shares table & service

#### 1A.1 Entity

Create new module: `backend/src/calendar-share/`

**File:** `calendar-share.entity.ts`
```typescript
@Entity('calendar_shares')
@Index(['ownerId', 'recipientId'], { unique: true })
export class CalendarShare {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() ownerId: string;
  @Column() @Index() recipientId: string;
  @Column({ 
    type: 'enum', 
    enum: ['full', 'busy_only', 'workouts_only'], 
    default: 'full' 
  }) shareLevel: string;
  @Column({ type: 'boolean', default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

`shareLevel` enum has all three values from the start; only `full` is active in WP4A; the others are reserved for WP4B (no schema migration later).

#### 1A.2 DTOs

**File:** `calendar-share.dto.ts`
```typescript
export class CreateCalendarShareDto {
  @IsString() recipientEmail: string;
  @IsOptional() @IsIn(['full', 'busy_only', 'workouts_only']) shareLevel?: string;
}
export class UpdateCalendarShareDto {
  @IsOptional() @IsIn(['full', 'busy_only', 'workouts_only']) shareLevel?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
```

#### 1A.3 Service

**File:** `calendar-share.service.ts`

Inject `UserService` to resolve email → userId.

Methods:
- `findOutgoing(ownerId)` — joined with users to include `recipientEmail`
- `findIncoming(recipientId)` — joined with users to include `ownerEmail`
- `findActiveShare(ownerId, recipientId)` — single record or null
- `create(ownerId, dto)` — looks up recipient by email; if not found, throw 404 "User not found"; if exists and share already exists, update (re-activate, set new shareLevel); otherwise create new
- `update(id, ownerId, dto)` — owner-only auth check, throws 403 if non-owner
- `remove(id, requestingUserId)` — soft delete (set active=false). Both owner AND recipient can soft-delete (recipient opts out)

#### 1A.4 Controller

**File:** `calendar-share.controller.ts`

Endpoints (all JWT-guarded):
- `GET /api/v1/calendar-shares/outgoing`
- `GET /api/v1/calendar-shares/incoming`
- `POST /api/v1/calendar-shares`
- `PUT /api/v1/calendar-shares/:id`
- `DELETE /api/v1/calendar-shares/:id`

#### 1A.5 Module

Standard. Register in `app.module.ts` databaseImports.

#### 1A.6 Acceptance criteria

- Backend restarts cleanly, `calendar_shares` table created
- `POST` with `{recipientEmail: "anna@test.com"}` → 201 if anna exists, 404 if not
- `GET /outgoing` lists granted shares; `GET /incoming` lists received
- `DELETE` as owner → 204; share deactivated
- Cross-user security: non-owner non-recipient cannot DELETE → 403/404

---

### Part 2A — Backend: shared calendar read endpoint

#### 2A.1 Add endpoint to calendar-event.controller.ts

```typescript
@Get('shared/:ownerId')
@UseGuards(JwtAuthGuard)
async getSharedCalendar(
  @Param('ownerId') ownerId: string,
  @Request() req,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
)
```

Logic:
1. Look up active share where `ownerId` matches AND `recipientId` matches `req.user.userId`
2. If no active share → 403 "No active share"
3. For WP4A, only `full` is implemented; if `busy_only` or `workouts_only`, fall back to `full` and log a TODO
4. Return all calendar events for ownerId in date range

Inject `CalendarShareService` into `CalendarEventController`.

#### 2A.2 Acceptance criteria

- User A grants share to User B; B can fetch A's events
- User C (no share) → 403
- User B after revocation → 403

---

### Part 3A — Frontend: API service + DataStore

#### 3A.1 New API service

**File:** `src/app/core/services/calendar-share-api.service.ts`

Methods following note-api.service.ts pattern:
- `listOutgoing()`, `listIncoming()`, `create(dto)`, `update(id, dto)`, `delete(id)`
- `getSharedCalendar(ownerId, startDate?, endDate?)` → Observable<CalendarEvent[]>

#### 3A.2 DataStore additions

```typescript
readonly outgoingShares = signal<CalendarShare[]>([]);
readonly incomingShares = signal<CalendarShare[]>([]);
readonly viewingSharedCalendar = signal<{ ownerId: string; ownerEmail: string } | null>(null);
readonly sharedCalendarEvents = signal<CalendarEvent[]>([]);
```

Methods:
- `loadShares()` — calls /outgoing and /incoming in parallel
- `grantShare(recipientEmail, shareLevel = 'full')` → optimistic
- `revokeShare(shareId)` → optimistic
- `viewSharedCalendar(ownerId, ownerEmail)` — sets viewingSharedCalendar, loads sharedCalendarEvents
- `exitSharedCalendar()` — clears state

#### 3A.3 Add types to app-data.models.ts

```typescript
export interface CalendarShare {
  id: string;
  ownerId: string;
  ownerEmail: string;
  recipientId: string;
  recipientEmail: string;
  shareLevel: 'full' | 'busy_only' | 'workouts_only';
  active: boolean;
  createdAt: string;
}
```

---

### Part 4A — Frontend: Settings UI

#### 4A.1 Sharing section in settings.page.html

Add an accordion (placement: above or below "Cycle Tracking"):

**"People I share with":**
- Per row: email, share level badge ("Full access"), small "Revoke" button
- Empty state: "You haven't shared your calendar with anyone yet."
- "+ Share with someone" button → inline form with email input
- On submit: `grantShare(email)`. On 404, show "User not found" inline.

**"People who share with me":**
- Per row: email, "View calendar" button, "Stop receiving" button
- Empty state: "No one is sharing with you."

#### 4A.2 Acceptance criteria

- Both lists render
- Adding valid email succeeds; invalid shows error inline
- Revoking removes from list
- Owner and recipient see symmetric relationships

---

### Part 5A — Frontend: viewing shared calendar

#### 5A.1 Banner mode on Week view

When `dataStore.viewingSharedCalendar()` is set:
- Banner at top: "👁 Viewing [email]'s calendar — [Exit]"
- Amber background, 12px padding, full width
- Use `dataStore.sharedCalendarEvents()` instead of own events
- Hide quick-add FAB
- Hide edit-on-tap
- Hide drag-to-reschedule
- Hide "Schedule this week" / "Generate plan" buttons

Tap "Exit" → `exitSharedCalendar()`, returns to own calendar.

#### 5A.2 Persistence policy

**Don't persist viewing state across reloads.** Default back to own calendar on refresh — privacy default.

#### 5A.3 Acceptance criteria

- Tap "View calendar" → Week view shows shared events
- Banner shows email
- Cannot create/edit/delete while viewing
- Exit returns to own
- Refresh while viewing → returns to own

---

### Part 6A — Edge cases

1. **Recipient deletes account**: outgoing share returns null user. Filter or label "Unknown user".
2. **Owner deletes account**: incoming share invalid. Same pattern.
3. **Stale data while viewing**: known v1 limitation, document.
4. **Symmetric sharing**: UI message: "Sharing is one-way. They'll need to share back if you want to see theirs."

---

## WP4B — Privacy-Filtered Sharing

### Part 7B — Backend: filtered events response

#### 7B.1 Modify shared calendar endpoint

In `getSharedCalendar`, replace WP4A "always full" with proper shareLevel branching:

For `shareLevel === 'full'`: return events as-is.

For `shareLevel === 'busy_only'`:
- Per event return redacted version:
  - Keep `id`, `date`, `startTime`, `endTime`, `durationMinutes`
  - `type`: replace with `'busy'` | `'free'` | `'workout'`
    - `shift` → `'busy'`
    - `workout` → `'workout'`
    - All other types → `'busy'`
  - `title`: `'Busy'` for busy events; keep for workouts
  - Strip `description`, `location`, `notes`, `priority`, `isManuallyPlaced`

For `shareLevel === 'workouts_only'`:
- Filter to only events with `type === 'workout'`
- Return as-is

#### 7B.2 Filter logic in service

Move to private method `CalendarEventService.findVisibleForRecipient(ownerId, recipientId, dateRange)`. Controller stays thin.

#### 7B.3 Acceptance criteria

- `busy_only` share: titles show as "Busy" except workouts
- Personal event "Doctor appointment" → "Busy"
- `workouts_only` share: only workouts returned

---

### Part 8B — Frontend: shareLevel selector in grant dialog

#### 8B.1 Update grant form

Three options:
- **Full access** — "[email] sees my full calendar"
- **Busy/free only** — "[email] sees when I'm busy or free"
- **Workouts only** — "[email] sees only my workouts (training partner mode)"

Pass to `grantShare(email, shareLevel)`.

#### 8B.2 Display badge

Each row in "People I share with" shows badge: `Full` / `Busy/Free` / `Workouts`.

#### 8B.3 Edit existing share level

Tap badge → small dialog → updates via PUT.

#### 8B.4 Acceptance criteria

- Grant form has three options, defaults to Full
- Selected level persists
- Badge shows level
- Tap badge to change

---

### Part 9B — Frontend: filtered display

#### 9B.1 Handle filtered event types

In Week view rendering when viewing shared:
- `'busy'` events: solid grey blocks with title "Busy"
- `'free'`: not rendered
- `'workout'`: render normally
- Filtered events have no tap behavior

#### 9B.2 Update CalendarEventType

```typescript
type CalendarEventType = ... | 'busy' | 'free';
```

These types only appear in shared-view responses.

#### 9B.3 Acceptance criteria

- `busy_only`: see grey "Busy" blocks plus workouts
- `workouts_only`: see only workouts on otherwise empty days
- Tapping "Busy" does nothing

---

## WP4C — Event Invitations

### Part 10C — Backend: event_invitations table & service

#### 10C.1 Entity

Create `backend/src/event-invitation/`

```typescript
@Entity('event_invitations')
@Index(['recipientId', 'status'])
export class EventInvitation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() inviterId: string;
  @Column() @Index() recipientId: string;
  @Column() calendarEventId: string;
  @Column({ type: 'text', nullable: true }) message: string | null;
  @Column({ 
    type: 'enum', 
    enum: ['pending', 'accepted', 'declined', 'cancelled'], 
    default: 'pending' 
  }) status: string;
  @Column({ type: 'timestamp', nullable: true }) respondedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

Lean pattern: no FK to CalendarEvent.

#### 10C.2 DTOs

```typescript
export class CreateEventInvitationDto {
  @IsString() calendarEventId: string;
  @IsString() recipientEmail: string;
  @IsOptional() @IsString() message?: string;
}
export class RespondToInvitationDto {
  @IsIn(['accepted', 'declined']) status: string;
}
```

#### 10C.3 Service

Methods:
- `findPendingForRecipient(recipientId)`
- `findOutgoingByInviter(inviterId)`
- `create(inviterId, dto)` — verify inviter owns event, resolve recipientEmail to userId
- `respond(id, recipientId, dto)` — on accept, copy event to recipient's calendar
- `cancel(id, inviterId)` — inviter cancels before response

**Acceptance flow** (recipient accepts):
1. Update status to `'accepted'`, set respondedAt
2. Read original event via CalendarEventService
3. Create copy on recipient's calendar:
   - Same title, description, date, startTime, endTime, durationMinutes, type
   - New userId (recipient's)
   - `linkedInvitationId: invitation.id`
   - `notes`: append "Invited by [inviter email]"

Recipient's copy is independent — edits/deletes don't affect inviter's event. Sync between the two is out of scope.

#### 10C.4 Controller

- `GET /api/v1/event-invitations/pending`
- `GET /api/v1/event-invitations/outgoing`
- `POST /api/v1/event-invitations`
- `PUT /api/v1/event-invitations/:id/respond`
- `DELETE /api/v1/event-invitations/:id`

#### 10C.5 Add field to CalendarEvent entity

```typescript
@Column({ type: 'uuid', nullable: true }) linkedInvitationId: string | null;
```

#### 10C.6 Acceptance criteria

- A creates workout, invites B with optional message
- B sees pending in `/pending`
- B accepts → status `'accepted'`, new event on B's calendar
- B declines → status `'declined'`, no copy
- A cancels before response → status `'cancelled'`
- Cross-user security: C cannot accept B's invitation

---

### Part 11C — Frontend: invitation API + DataStore

#### 11C.1 API service

**File:** `src/app/core/services/event-invitation-api.service.ts`

#### 11C.2 DataStore additions

```typescript
readonly pendingInvitations = signal<EventInvitation[]>([]);
readonly outgoingInvitations = signal<EventInvitation[]>([]);
```

Methods:
- `loadInvitations()` — both in parallel
- `sendInvitation(eventId, recipientEmail, message?)` — optimistic
- `respondToInvitation(id, status)` — optimistic; on accept reload calendar events
- `cancelInvitation(id)` — optimistic

#### 11C.3 Types

```typescript
export interface EventInvitation {
  id: string;
  inviterId: string;
  inviterEmail: string;
  recipientId: string;
  recipientEmail: string;
  calendarEventId: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  respondedAt: string | null;
  createdAt: string;
}
```

---

### Part 12C — Frontend: invite from event UI

#### 12C.1 "Invite someone" button

In `event-detail-modal.component.ts`, add an "Invite" button visible for:
- Workout events (any priority)
- Custom-event/personal events that aren't all-day

Tapping opens dialog:
- Email input ("Invite to [event title]")
- Optional message textarea
- "Send invitation" button → `sendInvitation()`

After send: show "Invitation sent", close.

#### 12C.2 Acceptance criteria

- Button visible on workout/custom-event detail
- Tap opens dialog
- Submit creates invitation
- Recipient sees pending after refresh

---

### Part 13C — Frontend: notification + accept/decline UI

#### 13C.1 Notification badge

On bottom tab nav (or app header), small red dot when `pendingInvitations().length > 0`.

#### 13C.2 Pending invitations on Today page

Above today's events:

For each pending:
- Card with amber left border
- "[InviterEmail] invited you to [EventTitle]"
- "[date] at [time]"
- Optional message in italics
- "Accept" / "Decline" buttons

After response: card disappears or shows "Accepted!" briefly.

#### 13C.3 Accepted invitations on calendar

Visual distinction: small icon "from [InviterEmail]" or different border accent.

#### 13C.4 Acceptance criteria

- Pending appears on Today page after refresh
- Accept creates event on recipient's calendar
- Decline removes card
- Badge reflects count

---

## Order of operations for CC

**WP4A first:**
1. Part 1A — backend module + table
2. Part 2A — shared read endpoint
3. Part 3A — frontend service + DataStore
4. Part 4A — Settings UI
5. Part 5A — banner mode viewing
6. Part 6A — edge cases
7. **Checkpoint: commit, verify in browser, decide whether to continue.**

**WP4B (filtering) — only if WP4A clean:**
8. Part 7B — backend filter logic
9. Part 8B — shareLevel selector
10. Part 9B — filtered display
11. **Checkpoint: commit, verify, decide.**

**WP4C (invitations) — only if time + WP4B clean:**
12. Part 10C — invitations module
13. Part 11C — frontend service + DataStore
14. Part 12C — invite from event UI
15. Part 13C — notification + accept/decline UI

After each Part: rebuild and confirm clean. Commit after each WP block.

---

## Rules CC must follow

- Read CLAUDE.md hard rules 9 and 10 (strict scope, no /simplify)
- Read all pre-flight files in full before editing
- Match existing patterns (note module is the closest reference)
- Do NOT touch scoring engine, scheduler, plan-template, AI coach
- Do NOT add websockets or real-time sync
- Strict scope per rules 9 and 10
- After each Part: rebuild, confirm clean
- Update docs/session-notes.md after each WP block
- If anything is unclear, ASK before building

---

## Beta deployment notes

- Recipients are real users on Supabase. Test with friend's actual email.
- Privacy: shareLevel respect is critical for trust. WP4B must work correctly before any non-trivial private events exist.
- WP4C is the viral mechanic — workout buddy invitations could drive signups. Even if only WP4A ships for tomorrow, prioritize WP4C in week 2.
