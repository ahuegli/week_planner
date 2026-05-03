# WP14 Spec — Production Hardening

**Goal:** Ship the boring infrastructure that prevents the app from falling over when real users (or attackers) hit it. Three concrete pieces: rate limiting on AI endpoints, proper auth error responses, and a real migration system replacing TypeORM's `synchronize: true`.

**Estimated effort:** 2-3 hours CC.

---

## Why this matters

Right now the app works for friends and family beta. For anything beyond that:

1. **AI coach endpoint costs money per call.** A motivated bad actor or a buggy client could rack up an Anthropic bill in minutes. No rate limiting = financial risk.

2. **Stale JWT errors return 500.** When a user's token expires or their user record changes, the app throws 500 errors instead of redirecting to login. Confusing for users, noisy in logs, hard to triage real bugs.

3. **`synchronize: true` is a footgun in production.** A typo in an entity could drop a column or table. Real migration system is required for any deployment that holds real user data long-term.

None of these are user-visible features. All three are required for any meaningful public deployment.

---

## Design principles

1. **Don't break the dev experience.** Migrations should be one CLI command. Rate limits shouldn't trip during normal testing. Auth errors should be debuggable.

2. **Configure once, forget.** Rate limit decorators should be declarative. Migration generation should be automated. Auth filter should be globally registered.

3. **Don't over-engineer.** Real apps don't need fancy distributed rate limiters or rolling migration systems. Use NestJS built-in patterns.

---

## Pre-flight reading for CC

- `backend/src/api/coach/` — AI coach endpoints (parked but loaded)
- `backend/src/auth/` — JWT auth setup
- `backend/src/app.module.ts` — TypeORM config with synchronize
- `backend/package.json` — TypeORM CLI scripts
- `backend/src/main.ts` — global filters and pipes

---

## Part 1 — Rate limiting on AI endpoints

### 1.1 Install and configure NestJS Throttler

`@nestjs/throttler` package — built-in rate limiting.

In `app.module.ts`:
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,  // 1 minute
  limit: 10,   // 10 requests per minute default
}]),
```

Provide `APP_GUARD` with `ThrottlerGuard` for global enforcement.

### 1.2 Custom limits on AI endpoints

AI coach endpoints get tighter limits:
- POST `/api/v1/coach/chat` — 5 requests per minute, 20 per hour, 100 per day per user
- Use `@Throttle()` decorator on specific routes

Pattern:
```typescript
@Throttle({ short: { ttl: 60000, limit: 5 } })
@Throttle({ medium: { ttl: 3600000, limit: 20 } })
@Throttle({ long: { ttl: 86400000, limit: 100 } })
@Post('chat')
async chat(...) { }
```

### 1.3 Rate limit by user, not IP

Default throttler keys by IP. For authenticated routes, key by `req.user.userId` instead. Custom guard or `getTracker` override.

### 1.4 Graceful 429 responses

When limit hit, return:
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in X seconds.",
  "retryAfterSeconds": 30
}
```

Frontend should handle 429 gracefully — show toast, disable button briefly.

### 1.5 Acceptance

- 6th rapid-fire request to coach/chat returns 429
- Other endpoints (calendar, workout-log, etc.) use default 10/min
- 429 response includes retryAfterSeconds
- Logs show rate-limit triggers

---

## Part 2 — 401 instead of 500 for auth issues

### 2.1 Custom exception filter

Create `JwtAuthExceptionFilter`:
- Catches `UnauthorizedException`, `JsonWebTokenError`, `TokenExpiredError`, and any user-record-not-found errors
- Returns 401 with clean message, not 500

### 2.2 Specific cases handled

- Token expired → 401 "Session expired. Please log in again."
- Invalid token → 401 "Invalid session."
- Token signed but user not in DB (deleted account) → 401 "Account not found."
- User exists but is_active = false → 401 "Account disabled."

Currently many of these throw 500 because the auth flow doesn't gracefully handle missing users.

### 2.3 Frontend handling

Frontend `auth-interceptor` already exists — verify it catches 401 and redirects to /login. If not, wire it up.

On 401:
- Clear localStorage
- Redirect to /login
- Show toast: "Your session has expired. Please log in again."

### 2.4 Acceptance

- Stale JWT (token from deleted user) returns 401 not 500
- Expired JWT returns 401 with clear message
- Frontend redirects to login on 401
- localStorage cleared on logout flow

---

## Part 3 — Migration system

### 3.1 Add TypeORM CLI configuration

`backend/data-source.ts` — separate from runtime config, used by CLI:
```typescript
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export default new DataSource({
  type: 'postgres',
  // ... DB connection
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
```

### 3.2 Add CLI scripts to package.json

```json
"migration:generate": "typeorm migration:generate -d data-source.ts",
"migration:run": "typeorm migration:run -d data-source.ts",
"migration:revert": "typeorm migration:revert -d data-source.ts"
```

### 3.3 Generate baseline migration

Run `npm run migration:generate -- src/migrations/initial`. This snapshots current schema as the first migration. Going forward, each entity change generates a new migration.

### 3.4 Disable synchronize in production

In `app.module.ts`:
```typescript
synchronize: process.env.NODE_ENV !== 'production',
```

Already correctly gated per session-notes — verify still in place. Production ALWAYS uses migrations, dev keeps synchronize for fast iteration.

### 3.5 Migration runs on deploy

Update deploy scripts (or document for friend's Railway deploy):
- `npm run migration:run` before app starts
- App startup with `synchronize: false` does nothing destructive

### 3.6 Acceptance

- `npm run migration:generate -- src/migrations/test` creates a file with current schema
- `npm run migration:run` applies migrations cleanly
- `npm run migration:revert` rolls back last migration
- Production deploys NEVER run with synchronize: true
- Dev deploys still work with synchronize: true (no regression)

---

## Order of operations

1. Part 2 first — smaller, lower risk, immediate user benefit
2. Part 1 — rate limiting, isolated changes
3. Part 3 — migration system, biggest change but well-bounded

After all three: deploy to staging if available, smoke test.

---

## Out of scope

- DDOS protection beyond basic rate limiting (CDN-level concern)
- Audit logging
- API versioning beyond current /api/v1 prefix
- Health check endpoints (might be added if friend's Railway needs them)
- Database backup automation
- Secrets rotation

---

## Open questions for v2

- Distributed rate limiting (Redis-backed) when scaling beyond single instance
- Per-tier rate limits (premium users get higher AI quotas)
- Migration testing in CI
- Schema validation between deploys
