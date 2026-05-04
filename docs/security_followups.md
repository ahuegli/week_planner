# Security audit follow-ups

These were identified in the pre-launch security audit but 
deferred to post-beta. Address before broader public launch.

## Medium

#8 — /scheduler/validate and /score trust client settings
- Document as advisory-only OR load settings from DB when 
  dto.settings is null
- Risk: probing engine with manipulated inputs (no data leak)

#9 — Email lookups leak account existence in sharing
- note-share and calendar-share findByEmail leaks registered 
  vs unregistered accounts
- Fix: generic "Invitation could not be sent" + constant-time 
  delay
- Risk: enumeration attack on user emails

#10 — Event type enum mismatch between DTO and scheduler
- DTO allows ['shift', 'workout', 'mealprep'] but scheduler uses 
  'custom-event' / 'personal' internally
- Fix: unify in shared TypeScript enum
- Risk: silent filtering bugs in cleanup logic

#11 — No Helmet / security headers
- Missing HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Fix: npm install helmet, app.use(helmet()) in main.ts
- Risk: clickjacking, MITM downgrades

## Low

#13 — console.log emits session data to stdout
- Replace with NestJS Logger
- Risk: info disclosure in shared logs

#14 — 7-day JWT, no refresh/revocation
- Document isActive=false as revocation path OR add refresh 
  tokens
- Risk: stolen tokens valid for week

#15 — No @MaxLength(72) on password
- Add to RegisterDto
- Risk: bcrypt CPU exhaustion on long passwords

#16 — Client can set isManuallyPlaced: true on create
- Strip from DTO or force to false server-side on create
- Risk: scheduler invariant broken (low impact)

#17 — ssl: { rejectUnauthorized: false } on DB
- Change to ssl: true (Supabase has valid cert)
- Risk: theoretical MITM (very low — within infra)

Estimated cleanup time: 2-3h CC after beta surfaces real-world 
priorities.