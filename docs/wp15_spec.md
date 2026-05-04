# WP15 Spec — Public Landing Page + Signup Flow

**Goal:** Add a public-facing entry point so the app can be shared beyond friends-and-family beta. Currently `/` redirects to login. New visitors see no marketing context, no value proposition.

**Estimated effort:** 3-5 hours total. Marketing copy is the slow part. Code is straightforward.

---

## Why this matters

For a real beta with non-technical users:
- Friends will share with friends — those second-degree contacts land cold
- Anyone visiting the URL needs to understand what the app does
- Sign-up should feel intentional, not just "give us an email"

This spec covers a single-page landing site and a refreshed signup flow.

---

## Design principles

1. **One page, no scroll fight.** Hero + feature cards + sign-up CTA. Don't over-design.

2. **Honest positioning.** Don't oversell. The audience for this is athletes who want their schedule respected — not Strava-replacers.

3. **Show the differentiator.** Cycle awareness, shift work support, sport flexibility — say it explicitly. These are what sets the app apart.

4. **Mobile-first.** Most discovery happens on phones.

5. **No tracking pixels in v1.** Privacy-respecting by default. Add analytics later if genuinely useful.

---

## Pre-flight reading for CC

- `src/app/app.routes.ts` — routing setup
- `src/app/pages/login.page.ts` and template — current entry point
- `src/styles/` — tokens, typography, color variables
- `src/app/features/` — for any reusable components (buttons, cards)
- Any existing imagery or branding assets in `src/assets/`

---

## Part 1 — Landing page route + structure

### 1.1 Add `/welcome` route (or repurpose `/`)

Decision: keep `/` as the landing page, redirect authenticated users straight to `/today`.

In `app.routes.ts`:
- `/` → LandingPageComponent (public)
- Guard: if user is authenticated, navigate to `/today`
- `/login` → existing LoginPageComponent
- `/signup` → new SignupPageComponent

### 1.2 LandingPageComponent structure

Single Angular component, mostly template:

**Section 1: Hero**
- Logo or wordmark
- Headline (one line, ≤10 words)
- Subhead (one line, ≤20 words)
- Primary CTA: "Get started" → /signup
- Secondary CTA: "Log in" → /login

**Section 2: Feature trio (three cards)**
- Each card has icon + 3-word title + 1-2 sentence description
- Cards: 
  - "Trains around your schedule"
  - "Cycle-aware planning"
  - "Built for shift workers"

**Section 3: How it works (3-step strip)**
- "Tell us your goal" → "We build your plan" → "Train when you can"

**Section 4: Sign-up CTA panel**
- Bigger button at bottom
- "Free during beta" indicator if true

**Section 5: Footer**
- Privacy / Terms links (placeholder for now)
- Single line about beta status

### 1.3 Visual style

Use existing app design tokens. The landing page should feel like the app, not a separate marketing site.

- Same color palette
- Same typography
- Same border radius / spacing
- No marketing-photo stock imagery; rely on type and color
- Consider a subtle gradient or pattern background — not loud

### 1.4 Acceptance

- `/` shows landing page when not authenticated
- `/` redirects to `/today` when authenticated  
- All CTAs route correctly
- Mobile and desktop both work cleanly
- Build clean

---

## Part 2 — Signup page (separate from landing)

### 2.1 New SignupPageComponent

Currently signup happens inside login flow OR somewhere else — verify. If signup is already a distinct route, refresh it. If not, create.

Form fields:
- Email (required)
- Password (required, min 8 chars)
- Confirm password (required, must match)
- Name / display name (optional, can be set later in settings)
- "I accept terms" checkbox (placeholder URL for now)

Submit creates user via existing auth signup endpoint. On success, redirect to onboarding.

### 2.2 Visual consistency with landing

Same look and feel. Form styled cleanly, not a wall of fields.

### 2.3 Validation

- Email format check
- Password min length
- Password match check
- Submit button disabled until valid

### 2.4 Error handling

- Email already exists → clear error message
- Password too weak → guidance
- Network error → retry hint

### 2.5 Acceptance

- Signup creates user successfully
- Validation prevents bad submits
- Error messages helpful
- Redirects to onboarding on success

---

## Part 3 — Copy

This is the actual hard part of WP15. Code is easy.

### 3.1 Headline candidates

Pick one or write your own:
- "Training that fits your real life"
- "Your schedule. Your plan. No compromises."
- "A training plan that respects everything else"
- "Built for athletes with full lives"

### 3.2 Subhead candidates

- "Smart scheduling for runners, triathletes, and shift workers"
- "Plans that adapt to your work, your cycle, and your life"
- "From sprint to Ironman, built around your real availability"

### 3.3 Feature descriptions

**Trains around your schedule**
"Tell us when you can't train — work shifts, family, travel — and your sessions land in the slots that actually exist. No more skipped workouts."

**Cycle-aware planning**
"Your hormones change weekly. Your training should too. Sessions adapt automatically to your phase, with energy-aware coaching cues."

**Built for shift workers**
"Irregular shifts, on-call rotations, weekend nights — we work with all of it. Every plan respects your real availability."

### 3.4 How it works copy

- Step 1 — "Tell us your goal" / "Pick a race or just train consistently. We support running and triathlon at all distances."
- Step 2 — "We build your plan" / "12 to 30 weeks of methodology-driven sessions, tuned to your fitness and time available."
- Step 3 — "Train when you can" / "Sessions land in your real schedule. Move them around. Skip what you have to. We adapt."

### 3.5 Beta indicator

Small pill or banner: "Free during beta. Premium features coming late 2026."

---

## Part 4 — Polish + responsiveness

### 4.1 Mobile breakpoints

- Hero stacks on mobile
- Feature cards stack vertically below 640px
- Buttons full-width on mobile
- Type sizes adjust (clamp() or rem-based scaling)

### 4.2 Accessibility

- Semantic HTML (h1, h2, sections)
- Alt text on any images
- Buttons have aria-labels where icons-only
- Keyboard navigation works
- Color contrast meets WCAG AA minimum

### 4.3 Performance

- No unused libraries imported
- Images optimized (use WebP if any)
- No third-party scripts (yet)

### 4.4 Acceptance

- Lighthouse score >85 on Mobile Performance, Accessibility, Best Practices
- No console errors
- Loads fast on slow 3G

---

## Order of operations

1. Part 1 — landing page structure with placeholder copy
2. Part 3 — refine real copy (you, not CC)
3. Part 2 — signup flow refresh
4. Part 4 — polish pass

After Part 4: deploy to a staging URL or share localhost screenshots for review.

---

## Out of scope for WP15

- Newsletter signup
- Pricing page (premium tier doesn't exist yet)
- Blog or content
- Help center / FAQ
- Multi-language support
- A/B testing infrastructure
- Analytics (defer to post-launch)

---

## Open questions

- Custom domain or stay on Vercel/Railway subdomain for v1?
- Do we want a "Watch demo" video CTA? (Adds production cost)
- Any beta testimonials from gf + friends to embed once they've used it for 2-4 weeks?
- Should the landing page have a "We're hiring" link? (Probably no for v1)

---

## Future hooks

- Premium pricing page
- Coach signup flow (separate from athlete signup)
- Affiliate / referral system
- Embedded testimonials with photos
