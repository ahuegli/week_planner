# WP11 Spec — Notes as Three-Mode System + Shareable Projects

**Goal:** Transform the Notes tab from a flat task list into a three-mode information system: tasks, projects (tasks with sub-tasks), and reminders. Tasks and projects become collaborative via WP4-pattern sharing. Sub-tasks are unassigned-by-default and can be claimed by any project member.

**Estimated effort:** 8-12 hours CC time across 4 sub-WPs.

**Prerequisites:**
- WP4 sharing infrastructure (calendar_shares table) — pattern is reused
- WP3 + WP3C notes system — current implementation extended
- WP12 stable enough that frontend isn't being heavily refactored

---

## Architectural principles

1. **Three modes, one entity.** Notes table holds tasks, projects, and reminders. The "mode" emerges from data shape, not a hard discriminator. A task with sub-tasks is a project. Discovery happens via UI affordances, not user configuration.

2. **Sub-tasks are first-class but lightweight.** Self-referential `parentNoteId` enables nesting. Status enum tracks individual sub-task progress. No separate sub-task entity.

3. **Unassigned-by-default with claiming.** No forced assignment friction. Anyone in the project can pick up a sub-task. Optional explicit assignment for cases where ownership matters.

4. **Reminders are private.** Standalone notes for personal info ("password hint", "doctor's address") are never shareable. Privacy by default for non-actionable content.

5. **Sharing reuses WP4 patterns.** New `note_shares` table mirrors `calendar_shares` structure. Same permission model, same revocation flow.

---

## Pre-flight reading for CC

- `docs/v2_roadmap.md` — three-pillar architecture, WP11 design intent
- `backend/src/note/note.entity.ts` — current note model
- `backend/src/note/note.service.ts` — current operations
- `backend/src/note/note.dto.ts` — current DTOs
- `backend/src/calendar-share/` (entire module) — pattern to mirror for note_shares
- `src/app/pages/notes.page.ts` and `.html` — current UI
- `src/app/core/services/data-store.service.ts` — note signals and methods
- `src/app/core/models/app-data.models.ts` — Note interface

---

# WP11A — Three-Mode Foundation

**Goal:** Add description and sub-task fields to notes. Render three modes (tasks / projects / reminders) on the Notes page. No sharing yet.

**Estimated effort:** ~3-4h CC time.

## Part 1A — Backend entity changes

In `backend/src/note/note.entity.ts`:
```typescript
@Column({ type: 'text', nullable: true }) description: string | null;

// Self-referential relation — parentNoteId as @ManyToOne with onDelete: 'CASCADE'.
// Decision: raw uuid column was ruled out in favour of a proper TypeORM relation so
// that deleting a parent note automatically cascade-deletes all its sub-tasks.
@Column({ type: 'uuid', nullable: true })
parentNoteId: string | null;

@ManyToOne(() => Note, (note) => note.subTasks, { nullable: true, onDelete: 'CASCADE' })
@JoinColumn({ name: 'parentNoteId' })
parentNote: Note | null;

@OneToMany(() => Note, (note) => note.parentNote)
subTasks: Note[];

@Column({ type: 'uuid', nullable: true }) assignedUserId: string | null;
@Column({ type: 'enum', enum: ['not_started', 'in_progress', 'done'], nullable: true })
subtaskStatus: 'not_started' | 'in_progress' | 'done' | null;
@Column({ type: 'enum', enum: ['task', 'reminder'], default: 'task' })
noteType: 'task' | 'reminder';
```

Update DTOs in `note.dto.ts` for create/update operations. All new fields optional.

## Part 2A — Backend service updates

In `note.service.ts`:
- `findSubTasksOf(parentNoteId)` — fetch children of a project
- `claimSubTask(noteId, userId)` — set assignedUserId
- `unassignSubTask(noteId)` — clear assignedUserId
- `updateSubTaskStatus(noteId, status)` — change subtaskStatus

Existing CRUD operations work for sub-tasks via the same endpoints — sub-tasks are notes with parentNoteId set.

## Part 3A — Frontend three-mode UI

Notes page filter strip at top: "All | Tasks | Projects | Reminders"

`tasks()` computed: notes where noteType === 'task' AND no children
`projects()` computed: notes where noteType === 'task' AND has children (via subtasksByParent map)
`reminders()` computed: notes where noteType === 'reminder'

Each note card renders differently based on category:
- **Task:** existing UI
- **Project:** title + sub-task bullet list with status icons + "+" to add
- **Reminder:** title + description, no scheduling/duration affordances

## Part 4A — Edit modal sub-task affordance

In note edit modal, below description field: "Add sub-tasks" button reveals inline list editor. Each row: text input + status icon + delete. Users can add/remove sub-tasks inline.

When first sub-task added, the parent note becomes a "project" automatically (no UI mode toggle needed).

## Acceptance criteria for WP11A

- Notes page shows three filter modes
- Adding sub-task to a task converts it to project view
- Sub-task status icons cycle: not_started → in_progress → done → cleared
- Reminders render as plain text cards, no scheduling affordances
- Existing notes still load correctly (default to noteType='task')

---

# WP11B — Note Sharing

**Goal:** Reuse WP4 sharing pattern for notes/projects. Recipients can view and collaborate on shared projects.

**Estimated effort:** ~2-3h CC time.

## Part 1B — Backend note_shares table

Mirror `calendar_shares` exactly:
- `note_shares` table: ownerId, recipientId, noteId, permission ('view' | 'collaborate'), createdAt, active
- Unique index on [ownerId, recipientId, noteId]
- Soft-delete via active flag

Service: `note-share.service.ts` with `grant`, `revoke`, `findOutgoing`, `findIncoming` methods.

Controller: `/api/v1/note-shares` with same 5 endpoints as calendar-shares.

## Part 2B — Filter notes by share access

In `note.service.ts`, `findAllForUser(userId)`:
- Owned notes (existing behavior)
- PLUS notes shared with userId via active note_shares

For shared notes, response includes `isOwner: false` flag and `sharedBy: { id, email }` info.

Reminders are NEVER shared (filter at the share grant level — return 400 if user tries to share a reminder).

## Part 3B — Frontend share UI

On project detail (when expanded), "Share" button opens existing share dialog (reuse calendar-share UI pattern).

Settings page: new "Note shares" accordion shows outgoing/incoming project shares (mirrors calendar-share UI).

## Part 4B — Acceptance

- Owner shares project with recipient → recipient sees project on Notes page with "shared with me" indicator
- Recipient can update sub-task status, claim sub-tasks
- Owner sees changes after refresh
- Revoking share immediately removes recipient access

---

# WP11C — Sub-task Claiming and Assignment

**Goal:** Make sub-task ownership explicit and visual.

**Estimated effort:** ~2-3h CC time.

## Part 1C — Claim button

On sub-task row, when in shared project AND assignedUserId is null:
- "Claim it" button → sets assignedUserId to current user
- Once claimed, button becomes "Assigned to [Name]" with avatar

When user is the assignee:
- Tap their own avatar → "Unclaim" option

## Part 2C — Member dropdown for explicit assignment

Project owner can tap unassigned sub-task → dropdown shows project members (from note_shares) → pick to assign.

## Part 3C — Avatar bubbles on project cards

Project card in Notes list shows avatar bubbles for sub-task assignees (similar to WP4 calendar invitation bubbles). Quick visual signal of who's involved.

## Part 4C — Acceptance

- Claim button only appears for shared projects
- Sub-task assignment persists across refresh
- Avatar bubbles render for accepted shares + assignees
- Unassigning works cleanly

---

# WP11D — AI Sub-task Generation (PREMIUM)

**Goal:** "This feels too big" button on tasks generates 3-5 micro-step sub-tasks via AI (Goblin Tools pattern).

**Estimated effort:** ~1-2h CC time. Lowest priority — can defer to v2.

Requires WP7A AI coach unparked.

## Acceptance

- Button appears on any task
- Tap → AI generates sub-tasks → user can accept/edit/discard
- Counted toward premium usage quota

---

## Open questions for WP11

- Real-time updates: do we poll on focus, or accept refresh-required for v1?
- Notification: when someone claims a sub-task on your project, do you get notified? (probably not v1)
- Project completion: does a project auto-mark as "done" when all sub-tasks are done? (probably yes)
- Sub-task ordering: drag-to-reorder, or chronological by creation?

---

## Beta deployment plan

- After WP11A: gf and friends have three-mode notes locally. No collaboration.
- After WP11B: project sharing works. Multi-user collaboration possible.
- After WP11C: assignment/claiming works. Real coordination happens.
- After WP11D: AI breakdown unlocks (premium gating).

WP11A alone is shippable. B-C-D are progressive enhancements.
