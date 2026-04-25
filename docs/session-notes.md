# Session notes

## 2026-04-24 (Friday evening — setup)
- Claude Code installed
- CLAUDE.md refined (working prefs, hard rules, doc pointers)
- docs/ structure created: work_packages.md, handover.md, known_bugs.md, decisions.md, session-notes.md
- Ready for tomorrow's WP3 Notes trial run

## 2026-04-24 (Saturday — WP3A)

### Files created
- `backend/src/note/note.entity.ts`
- `backend/src/note/note.dto.ts`
- `backend/src/note/note.service.ts`
- `backend/src/note/note.controller.ts`
- `backend/src/note/note.module.ts`
- `backend/query-notes-schema.js`

### Files modified
- `backend/src/app.module.ts` — NoteModule added to databaseImports only

### Acceptance checks
- Build: clean (zero TypeScript errors)
- Lint: deferred — run `npm run lint` from PowerShell (ESLint devDep not available in CI shell)
- Schema: all 12 columns present with correct types and nullability
- API smoke tests 4–11: all passed
- Ownership: all 6 NoteService methods filter by userId; cross-user GET returns 404

### Deviations from spec
- `userId` uses `@Column()` + `@Index()` only — no `@ManyToOne` to User, per approved adjustment. TypeORM `synchronize: true` does **not** create a DB-level FK constraint from `notes.userId` to `users.id` without a relation decorator. Cascade deletes will not propagate at the DB level (orphaned rows possible if a user is deleted via raw SQL). In practice, NestJS deletes users through TypeORM which will handle cascade via the ORM if a relation is later added. Low risk for now.
- `linkedCalendarEventId` does have `@ManyToOne(() => CalendarEvent, { onDelete: 'SET NULL' })` matching the planned-session pattern — the DB FK and SET NULL behaviour are active for this column.

### Known issues
- None found during testing

### Suggested next step
WP3B (Notes UI) when approved — adds the Notes section to Today page, quick-add, and week view indicators.

## 2026-04-24 (Saturday — WP3B+)

### Files created
- `src/app/core/services/note-api.service.ts`
- `src/app/pages/notes.page.ts`

### Files modified
- `backend/src/note/note.entity.ts` — added `estimatedDurationMinutes`, `wantsScheduling`
- `backend/src/note/note.dto.ts` — added same to `CreateNoteDto` and `UpdateNoteDto`
- `src/app/core/models/app-data.models.ts` — added `Note`, `CreateNotePayload`, `UpdateNotePayload`
- `src/app/core/services/data-store.service.ts` — added `notes` signal + `loadNotes`, `addNote`, `updateNote`, `toggleNoteComplete`, `deleteNote`
- `src/app/app.routes.ts` — added `/notes` lazy route with `authGuard`
- `src/app/components/bottom-tab-nav/bottom-tab-nav.component.html` — added Notes tab (checklist icon, always visible)

### Build
- Backend: clean after entity/DTO changes; synchronize added 2 columns on restart
- Frontend: clean, `notes-page` lazy chunk generated (11.89 kB)

### Deviations
- None

### Known issues
- None found during build

### Suggested next step
WP2: cycle-aware scheduling (wire `cyclePhaseRules` into scorer)

## 2026-04-25 — Date format audit

### Files modified
- `src/app/pages/today.page.ts` — 2 locale changes (`en-US` → `en-GB`)
- `src/app/pages/week.page.ts` — 3 locale changes + rewrote `weekRangeLabel` string order (month now trails: "25-30 Apr 2026")
- `src/app/pages/plan.page.ts` — 1 locale change
- `src/app/features/week/day-row/day-row.component.ts` — 2 locale changes (share message monthDay: "Apr 25" → "25 Apr")
- `src/app/features/week/month-grid/month-grid.component.ts` — 2 locale changes
- `src/app/features/week/quick-add-fab/quick-add-fab.component.ts` — 1 locale change
- `src/app/features/plan/plan-week-timeline/plan-week-timeline.component.ts` — rewrote `weekDateRange()`: same-month "1–7 Jan", cross-month "28 Mar–3 Apr" (also fixed latent bug where cross-month ranges omitted end month)
- `src/app/features/plan/plan-header/plan-header.component.ts` — 1 locale change ("January 1, 2026" → "1 January 2026")
- `src/app/core/services/data-store.service.ts` — 2 locale changes (weekday-only, output unchanged)
- `src/app/shared/delete-workout-dialog/delete-workout-dialog.component.ts` — 1 locale change (weekday-only, output unchanged)

### Not changed
- `notes.page.ts` `formatDue()` — already used `en-GB`
- `toDisplayTime()` functions — time format explicitly out of scope

### Build
- Frontend: clean, zero TypeScript errors

## 2026-04-25 — Session close-out

### Wins tonight
- WP3A backend complete (Notes data layer, 13/13 acceptance checks)
- WP3B frontend complete (Notes tab live, optimistic updates, all manual tests passed)
- Date format fixed across the app (en-GB, DD MMM YYYY)
- `docs/training_methodology.md` saved (v5) — race-prep reference
- `docs/wellness_methodology.md` saved (v3) — wellness reference
- Both methodology docs are reference material for a future plan-template engine rewrite, NOT v1 commitments

### New known bug (high priority for next session)
- Plan creation, calendar event creation, and other write endpoints return 500 with FK constraint violations
- Root cause: JWT in browser localStorage references a userId that no longer exists in the users table (German error: "verletzt Fremdschlüssel-Constraint")
- Workaround: clear localStorage + re-login, OR re-register test users via `/api/v1/auth/register`
- Long-term fix: backend should return 401 (not 500) when JWT user doesn't exist; investigate whether user table was affected by cascade during recent schema syncs
- Added to `docs/known_bugs.md` as high-priority fix-on-next-session

### Saturday plan
- WP2 cycle-aware scheduling
- Post-menopause mode addition
- Energy/symptom logging schema (scorer ignores for v1)
- Architect spec coming Friday evening from architect chat

## Pending
- WP2 bundle: cycle-aware scheduling + energy schema + post-menopause mode
- Fix 500→401 for stale JWT userId (known_bugs.md)
