# Current spec: WP3A — Notes backend

## Goal
Add a lightweight notes/to-do data layer. Users can create, read, update, delete notes. No UI this iteration.

## Scope boundary — what NOT to do in WP3A
- No frontend changes. Do not touch `src/` at all.
- No calendar event linking logic beyond schema fields. Don't wire "find time for this."
- No week/month view integration.
- Do not modify scheduler, scoring engine, cycle profile, or any existing module.

## Deliverables

### 1. New entity: `backend/src/note/note.entity.ts`

Table name: `notes`. Columns:

- `id` — UUID primary key
- `userId` — string, indexed, foreign key to users (cascade delete)
- `title` — string, max 200 chars, required
- `body` — text, nullable
- `dueDate` — date, nullable (YYYY-MM-DD string)
- `dueTime` — varchar, nullable (HH:MM string)
- `isScheduled` — boolean, default false (reserved for WP3B — do not use yet)
- `linkedCalendarEventId` — UUID nullable, foreign key to calendar_events with `onDelete: 'SET NULL'` (reserved for WP3B)
- `completed` — boolean, default false
- `completedAt` — timestamp, nullable
- `createdAt` — timestamp, default now
- `updatedAt` — timestamp, default now, auto-updated

TypeORM relations: `@ManyToOne` to `User` with `onDelete: 'CASCADE'` via JoinColumn on `userId`.

### 2. DTOs: `backend/src/note/note.dto.ts`

Three classes with `class-validator` decorators:

**`CreateNoteDto`**
- `title: string` — required, `@IsString() @MaxLength(200)`
- `body?: string` — optional, `@IsString()`
- `dueDate?: string` — optional, `@IsDateString()`
- `dueTime?: string` — optional, `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`

**`UpdateNoteDto`**
- All fields from `CreateNoteDto`, all optional
- Plus `completed?: boolean` — optional, `@IsBoolean()`

**`ToggleCompleteDto`**
- `completed: boolean` — required, `@IsBoolean()`

### 3. Service: `backend/src/note/note.service.ts`

Standard NestJS service pattern, following `planned-session.service.ts` as a reference for owner-scoped queries.

Methods:

- `findAllByUser(userId: string): Promise<Note[]>` — order by `createdAt DESC`
- `findOne(id: string, userId: string): Promise<Note>` — throw `NotFoundException` if not found or wrong owner
- `create(userId: string, dto: CreateNoteDto): Promise<Note>`
- `update(id: string, userId: string, dto: UpdateNoteDto): Promise<Note>` — use `findOne` first to enforce ownership, then `Object.assign` and save
- `toggleComplete(id: string, userId: string, completed: boolean): Promise<Note>` — set `completed` flag + `completedAt` timestamp (null if uncompleting)
- `remove(id: string, userId: string): Promise<void>` — use `findOne` first for ownership check

Never query without a `userId` filter. Never return notes belonging to another user.

### 4. Controller: `backend/src/note/note.controller.ts`

Route prefix: `notes`. Protected by `JwtAuthGuard` at class level.

Endpoints:

- `GET /notes` → `findAllByUser(req.user.userId)`
- `GET /notes/:id` → `findOne(id, req.user.userId)`
- `POST /notes` → `create(req.user.userId, dto)` — body: `CreateNoteDto`
- `PUT /notes/:id` → `update(id, req.user.userId, dto)` — body: `UpdateNoteDto`
- `PUT /notes/:id/complete` → `toggleComplete(id, req.user.userId, dto.completed)` — body: `ToggleCompleteDto`
- `DELETE /notes/:id` → `remove(id, req.user.userId)` — return 204

Follow `planned-session.controller.ts` style for decorator patterns.

### 5. Module: `backend/src/note/note.module.ts`

Standard NestJS module:
- Imports: `TypeOrmModule.forFeature([Note])`
- Controllers: `NoteController`
- Providers: `NoteService`
- Exports: `NoteService` (for future cross-module use in WP3B)

### 6. Register module in `backend/src/app.module.ts`

Add `NoteModule` to the imports array. Do not touch anything else in this file.

## Acceptance criteria

Each must pass before the task is considered done.

### Build & lint
1. `cd backend; Remove-Item -Recurse -Force dist; npm run build` — completes with zero type errors
2. `npm run lint` — zero new errors or warnings from new files

### Schema sync
3. Start backend with `USE_DATABASE=true`. Verify `notes` table exists with all specified columns and correct types. Use this query (via `backend/query-planned-sessions.js` pattern, make a `backend/query-notes-schema.js` helper):
```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'notes'
   ORDER BY ordinal_position;
```
   All 12 columns must be present.

### API smoke tests (curl or REST client)

Authenticate first: `POST /api/v1/auth/login` with `me@test.com / test1234`, save the JWT.

4. **Create:** `POST /api/v1/notes` with `{"title": "Test note"}` → returns 201, note with id and createdAt
5. **List:** `GET /api/v1/notes` → returns array including the new note
6. **Get one:** `GET /api/v1/notes/:id` → returns the note
7. **Update:** `PUT /api/v1/notes/:id` with `{"title": "Updated", "body": "New body"}` → returns updated note
8. **Toggle complete:** `PUT /api/v1/notes/:id/complete` with `{"completed": true}` → returns note with `completed: true` and `completedAt` set
9. **Toggle uncomplete:** `PUT /api/v1/notes/:id/complete` with `{"completed": false}` → `completedAt` back to null
10. **Delete:** `DELETE /api/v1/notes/:id` → returns 204
11. **Security — other user's note:** register second user `other@test.com / test1234`, create a note as that user. Log back in as `me@test.com`, try `GET /api/v1/notes/:otherUserNoteId` → must return 404

### Ownership
12. All 6 methods in `NoteService` filter by `userId`. Grep to verify.
13. Deleting a user cascades to their notes. Sanity check only — don't actually delete the test user.

## Things to watch for

- Do not introduce migrations. `synchronize: true` will auto-create the table. Note this in session-notes.
- Do not add any scheduler logic. If you find yourself thinking about `linkedCalendarEventId` beyond the schema field, stop.
- Follow existing file patterns. Look at `backend/src/planned-session/` for reference — entity, service, controller, module, dto structure.
- PowerShell for all commands. `Remove-Item -Recurse -Force backend/dist` before every backend rebuild.
- If any part of the spec is unclear, ask before building.

## On completion

1. Run all 13 acceptance checks.
2. Update `docs/session-notes.md` with:
   - Files created (paths)
   - Files modified (should only be app.module.ts)
   - Any deviations from this spec and why
   - Known issues discovered
   - Suggested next step (WP3B UI, or stop here)
3. Do not start WP3B without explicit approval.
