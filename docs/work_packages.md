# Week Planner — Remaining Work Packages

## What's Built and Working Today
- Full onboarding (7-step wizard)
- Training plan creation (race, fitness, weight loss) with 12-week periodized templates
- Recurring shifts auto-fill all weeks
- Full-plan scheduling (workouts placed around shifts, weekends preferred for long sessions)
- Priority-based scheduling (Key sessions placed first)
- Week/Month/Today/Plan/Cycle views with real data
- Event edit/delete with day picker
- Reschedule suggestions (scheduler finds best slot)
- Carry-forward for missed key sessions
- "I Have Time" smart suggestions
- Quick plan switch without re-onboarding
- Workout descriptions (running, cycling, swimming, triathlon)
- Cycle tracking (phase ring, energy check-ins, period logging, menopause mode)
- Settings (8 sections, all configurable)
- Session completion + skip from Today and Week views

---

## Work Package 1: Dedicated Workout Page
*The feature that turns a calendar into a coach*

### 1A: Pre-Workout View
- Full-screen workout page opens from Today, Week, "I Have Time"
- Session header: name, duration, intensity, priority badge, phase context
- "Week 5 Build Phase — speed work begins this week"
- Step-by-step structure:
  - Warm-up section with duration and instructions
  - Main set with detailed breakdown (e.g., "6x800m at 3:50/km with 90s jog recovery")
  - Cool-down section
- Equipment checklist if relevant ("Running shoes, water bottle, HR monitor")
- Weather awareness placeholder ("Check conditions before outdoor sessions")
- "Start Workout" button → starts a simple timer
- "Ask my coach" section (placeholder until AI is wired)

### 1B: During Workout (Simple)
- Timer running with session structure visible
- Interval timer for interval/tempo sessions (beep at each interval)
- Pause/resume
- "End Early" option with reason prompt
- No GPS or HR tracking (that's Garmin's job)

### 1C: Post-Workout View
- "How did it feel?" — energy rating (easy / moderate / hard)
- Optional fields: actual distance, actual pace, actual duration
- "Notes" free text field ("knee felt tight after km 12")
- Quick stats summary if they entered data
- "Well done" confirmation with streak/progress note
- Data saves to planned session + new workout_logs table

### 1D: Workout History on Plan Tab
- Each completed session shows post-workout data
- Session history: "Week 1: 10km @ 5:30/km felt easy → Week 5: 13km @ 5:15/km felt moderate"
- This feeds the stats dashboard later

---

## Work Package 2: Cycle-Aware Scheduling
*The scheduling algorithm considers menstrual cycle phases*

### 2A: Wire Cycle Phase into Scheduler
- Load user's cycle profile when scheduling
- Calculate which cycle phase each day falls in
- Pass phase data into scoring engine via weekContext
- Add cyclePhase field to WeekContext model

### 2B: Phase-Based Scoring Adjustments
- Menstrual (days 1-5): cap intensity at moderate, +0.3 bonus for yoga/recovery, -0.2 for hard sessions
- Follicular (days 6-13): allow hard intensity, +0.2 bonus for speed work (tempo/intervals)
- Ovulation (days 14-17): allow hard, flag injury caution in workout descriptions
- Luteal (days 18-28): cap intensity at moderate, reduce volume scoring, prefer shorter sessions

### 2C: Read cyclePhaseRules from Planned Sessions
- Each session already has cyclePhaseRules JSON — make the scorer read it
- If a session says maxIntensity: 'moderate' for the current phase, penalize hard time slots
- If a session says preferred: true for the current phase, boost scoring

### 2D: Cycle-Aware Descriptions
- Workout descriptions change based on cycle phase
- "You're in your follicular phase — great time for this tempo run. Push the pace."
- "Luteal phase — keep this easy run truly easy. Your body needs more recovery right now."

---

## Work Package 3: Notes & To-Do System
*Lightweight task management integrated with the calendar*

### 3A: Notes Data Model
- New entity: notes (id, userId, title, body, dueDate nullable, dueTime nullable, isScheduled boolean, linkedCalendarEventId nullable, completed boolean, createdAt)
- CRUD endpoints with JWT auth

### 3B: Notes UI
- "Notes" section on Today page (below workouts, above tips)
- Quick-add: tap + → type a note → optional date/time
- Three states: just a note, note with deadline, scheduled event
- "Should I find time for this?" prompt when adding a note with a date
- If yes → creates a calendar event and links it
- Swipe to complete (or tap checkbox)

### 3C: Notes in Other Views
- Week view: notes with dates appear as small cards on their day
- Month view: note indicator dots
- Settings: notes preferences (show/hide on calendar)

---

## Work Package 4: Calendar Sharing
*Share your schedule with friends, training partners, or coaches*

### 4A: Share as Image
- "Share my schedule" button on Month view → renders month grid as PNG
- Includes legend, user name, month title
- Native share sheet on mobile

### 4B: Individual Event Sharing
- "Invite a friend" on any workout → generates a message
- "Join me for a Long Run on Saturday at 10:00 — 15km easy pace"
- Deep link that opens the app or a web preview

### 4C: Calendar Access (Multi-User)
- New entity: calendar_shares (id, ownerUserId, sharedWithUserId, accessLevel)
- Access levels:
  - "Full" — see everything with details
  - "Busy/Free" — see blocked vs free time only
  - "Workouts only" — see training sessions, can request to join
- Share via invite link or email
- Shared calendar appears as a toggle overlay on the viewer's Week/Month view

### 4D: Personal Trainer View (V2)
- Trainer account type with client management
- Trainer creates custom plans for clients
- Trainer sees client completion/energy data
- Trainer can override AI suggestions
- Trainer dashboard: all clients at a glance

---

## Work Package 5: Stats Dashboard
*Visual performance tracking*

### 5A: Basic Dashboard Page
- New tab or accessible from Today page gear menu
- Weekly summary card: sessions completed, total duration, total distance
- Completion streak (Duolingo-style): "3 weeks hitting all key sessions"
- Completion rate chart: bar chart by week (last 8 weeks)

### 5B: Sport-Specific Stats
- Running: weekly distance, average pace trend, longest run progression
- Cycling: weekly distance, average speed
- Strength: sessions per week, duration trend
- All sourced from post-workout logs (WP1C)

### 5C: Gamification Elements
- Streak counter with fire icon
- Weekly badges: "Perfect Week" (all sessions), "Long Run Club" (completed long run), "Consistency King" (4+ weeks streak)
- Fun pop-up messages: "You've run further this month than the distance from London to Brighton!"
- Milestone celebrations: "Your longest run ever — 18km!"

### 5D: Plan Progress Visualization
- Progress ring or bar showing plan completion %
- Phase timeline showing where you are
- Race readiness score (race mode): "78% ready — strong endurance base, speed work on track"
- Predicted finish time based on training data (needs AI later)

---

## Work Package 6: Dynamic Scheduling & Conflict Resolution
*The schedule adapts when life changes*

### 6A: Auto-Reschedule on Conflict
- User adds a personal event that overlaps a scheduled workout
- App detects the conflict immediately
- Bottom sheet: "This conflicts with your Easy Run at 18:00. Move it to [suggested slot]?"
- Accept → workout moves. Decline → workout stays (user's choice)

### 6B: Smart Reschedule Rules
- Prefer minimal disruption: shift by 1-2 hours before changing days
- Never move more than 2 sessions to accommodate 1 change
- If can't resolve: show optimization proposal ("We could fit everything if you move X and Y")
- Manual placements (isManuallyPlaced) are never auto-moved

### 6C: Settings Shift Change → Auto-Reschedule
- Change shift times in Settings → Save
- App detects which scheduled workouts now conflict
- Auto-reschedules affected weeks
- Shows summary: "Shifts updated — 3 workouts rescheduled"

### 6D: Weekly Schedule Refinement
- Sunday evening (or user-configured day): app reviews next week
- "Your upcoming week has 2 conflicts and 1 unplaced session. Review?"
- User opens a quick review screen showing the week with issues highlighted
- One-tap fixes for each issue

---

## Work Package 7: AI Coach Integration
*The brain of the app*

### 7A: Anthropic API Setup
- API key in backend .env
- Rate limiting (budget per user per day)
- Cost tracking
- Prompt template system reading from prompt_templates table
- Base coaching prompt with full user context

### 7B: Coaching Chatbot
- "Ask my coach" button on Today page and Workout page
- Full-screen chat interface
- Pre-loaded with: plan, phase, recent sessions, cycle phase, energy history
- Capabilities: adjust today's session, swap sessions, explain the plan, answer training questions
- Actions modify real data (with user confirmation)
- Conversation doesn't persist across days (keeps costs low)

### 7C: Weekly AI Review
- Sunday evening push/in-app: "Your coach reviewed your week"
- AI analyzes: completion rate, energy ratings, cycle phase patterns
- Suggests adjustments for next week
- User accepts/rejects each suggestion
- Card on Today page Monday morning

### 7D: AI-Powered Plan Adaptation
- "Too easy" / "Too hard" feedback → AI adjusts intensity
- Spontaneous activity recognition ("I went hiking") → AI adjusts plan
- Mid-plan goal change → AI generates new plan from current fitness
- Auto-adjustment based on completion patterns over time

### 7E: AI-Powered Workout Descriptions
- Replace static templates with personalized AI descriptions
- "This is your 6th tempo run. Last week you held 5:10/km — try 5:05 today."
- Generated once per session, cached
- Uses post-workout data from previous sessions

### 7F: AI Buttons Visual Pass
- Orange/amber color for all AI-triggered actions
- "Ask my coach" → orange
- "Get suggestions" → orange
- Weekly review card → orange accent

---

## Work Package 8: Performance-Based Goal Adjustment
*The plan evolves based on how you're doing*

### 8A: Manual Performance Feedback
- After each session: "Was this too easy / just right / too hard?"
- After each week: "How was this week overall?"
- This data feeds AI adaptation (WP7D)

### 8B: Rule-Based Adjustment (Layer 1, no AI)
- If user completes all sessions + rates them "easy" for 2 weeks → bump volume 10%
- If user misses 30%+ sessions for 2 weeks → reduce volume 15%, suggest plan review
- If user consistently rates sessions "hard" → reduce intensity, extend current phase by 1 week
- These rules run automatically, with user notification

### 8C: AI-Based Adjustment (Layer 2-3, needs WP7)
- AI reviews the full history and makes nuanced changes
- "You're consistently faster than your targets — I've adjusted your race pace from 5:00 to 4:50/km"
- Can restructure remaining weeks (extend build, shorten taper, etc.)
- Always explains why and lets user accept/reject

---

## Work Package 9: Integrations
*Connect with the outside world*

### 9A: FridgeMate Integration
- Shared auth (same Supabase user)
- Scheduler → FridgeMate: daily macro targets based on training load
- FridgeMate → Scheduler: meal prep time needs
- Cycle-aware nutrition adjustments

### 9B: Apple Health Integration
- Import: steps, resting HR, sleep duration, active energy
- Use for: fatigue estimation, recovery scoring, sleep-based scheduling
- No watch required — iPhone data is enough for basics

### 9C: Garmin/Strava Sync
- Auto-import completed runs with full data (pace, HR, distance, splits)
- Populate post-workout stats automatically (no manual entry needed)
- Feed AI coach with real performance data
- Enable: pace trend graphs, training load charts, predicted race time

### 9D: Calendar Sync (Google/Outlook)
- Import external calendar events as blockers
- Smart categorization: "Team dinner" → personal event, "Client meeting" → work
- Two-way optional: export scheduled workouts to external calendar

---

## Work Package 10: Production & Launch
*Ship it*

### 10A: Infrastructure
- Replace synchronize:true with proper TypeORM migrations
- Environment configs (dev/staging/prod)
- Configurable API base URLs
- CORS for production domains
- Request rate limiting
- Input sanitization review

### 10B: Deployment
- Supabase (DB) + Vercel (frontend) + Railway (backend)
- CI/CD pipeline (GitHub Actions)
- SSL, domain setup
- Monitoring (Sentry)
- Database backups

### 10C: Monetization
- Free tier vs Premium split
- Stripe integration for subscriptions
- Feature gating based on user.tier
- Trial period logic

### 10D: App Store
- PWA wrapper for iOS/Android
- Push notifications
- Offline mode with sync
- App store submission





---

## V2 Features (Post-Launch)
- Personal trainer dashboard and B2B model
- Multi-sport periodization (triathlon blocks)
- Template tuning session (marathon distances, speed plans, all race types)
- Plyometrics and prehab session types
- Drag-and-drop event reordering
- Friend connections and groups
- Group training coordination
- Performance prediction (AI-powered race time estimates)
- Wearable-based fatigue detection (HRV, RHR trends)
- Dark mode
- Internationalization (multi-language)
- Accessibility audit

---

## Suggested Execution Order

| Order | Work Package | Why This Order | Sessions |
|-------|-------------|----------------|----------|
| 1 | WP2: Cycle-Aware Scheduling | Already designed, completes core differentiator | 1 |
| 2 | WP1A-1C: Workout Page | Biggest UX impact, enables post-workout data collection | 2-3 |
| 3 | WP6A-6C: Dynamic Conflict Resolution | Makes scheduling feel alive | 1-2 |
| 4 | WP7A-7B: AI Coach Setup + Chatbot | Core premium feature, uses all existing data | 2-3 |
| 5 | WP5A-5C: Stats Dashboard | Needs WP1C data, adds retention/gamification | 1-2 |
| 6 | WP8A-8B: Performance Adjustment (Rule-Based) | Uses WP1C + WP5 data | 1 |
| 7 | WP7C-7E: AI Weekly Review + Adaptation | Builds on WP7A-7B + all collected data | 2 |
| 8 | WP3: Notes & To-Do | Nice-to-have, quick build | 1 |
| 9 | WP4A-4B: Share Features | User growth, quick wins | 1 |
| 10 | WP9A: FridgeMate Integration | Cross-app value | 1 |
| 11 | WP10: Production & Launch | Ship it | 2 |
| 12 | WP9B-9D: External Integrations | Post-launch growth | 2-3 |
| 13 | WP4C-4D: Multi-User + Trainer | V2 business model | 3-4 |
| **Total** | | | **~20-25 sessions** |
