# Week Planner Backend

NestJS API for schedule generation and optimization.

## Setup

```bash
cd backend
npm install
```

## Development

```bash
# Start in watch mode
npm run start:dev

# Start normally
npm run start
```

The API runs on `http://localhost:3000` by default.

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### POST /api/v1/scheduler/generate

Generate an optimal schedule based on inputs.

**Request Body:**

```json
{
  "existingEvents": [...],
  "workouts": [...],
  "mealPrep": { "duration": 90, "sessionsPerWeek": 2 },
  "settings": { ... },
  "weekContext": { ... }
}
```

**Response:**

```json
{
  "placedEvents": [...],
  "unplacedWorkouts": [...],
  "totalScore": 85,
  "placedWorkoutCount": 5,
  "placedLongWorkoutCount": 2,
  "weightedWorkoutScore": 7.1
}
```

### POST /api/v1/scheduler/validate

Check if a time slot violates hard constraints.

### POST /api/v1/scheduler/score

Get the score for a specific time slot.

## Architecture

```
backend/
├── src/
│   ├── api/              # HTTP layer (controllers, DTOs)
│   │   └── scheduler/
│   ├── domain/           # Business logic (pure services)
│   │   ├── constraint-checker.service.ts
│   │   ├── scoring-engine.service.ts
│   │   └── schedule-generator.service.ts
│   └── shared/           # Shared types and utilities
│       ├── models/
│       └── utils/
└── package.json
```

## Running with Frontend

1. Start the backend: `cd backend && npm run start:dev`
2. Start the frontend: `npm run start` (in root folder)
3. Frontend calls `http://localhost:3000/api/v1/scheduler/*`

## Schema management

**Development:** `synchronize: true` auto-migrates on startup. No manual steps needed.

**Production:** `synchronize` is disabled when `NODE_ENV=production`. Schema changes must be applied via migrations before starting the new app version.

### Production deploy workflow

```powershell
# 1. After modifying entities, generate a migration (run from backend/)
npm run migration:generate -- src/migrations/DescriptiveName

# 2. Review the generated file in src/migrations/
#    Confirm the SQL matches your intent before committing.

# 3. Apply the migration against the production database
npm run migration:run

# 4. Start the app
NODE_ENV=production node dist/main
```

### Other migration commands

```powershell
npm run migration:show    # list applied and pending migrations
npm run migration:revert  # roll back the last applied migration
```

### First production deploy

Generate a baseline migration that captures the full schema as it exists in dev:

```powershell
npm run migration:generate -- src/migrations/InitialSchema
```

Running `migration:run` on a fresh production database applies it and creates the migrations
tracking table. Subsequent migrations track incremental changes only.

### Notes

- The app never auto-runs migrations on startup — they are always a deliberate deploy step.
- `data-source.ts` (backend root) is used exclusively by the TypeORM CLI. It reads the same
  `.env` values as the app but always sets `synchronize: false`.
- Never delete a migration that has already been applied to a shared database.
