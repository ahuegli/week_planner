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
