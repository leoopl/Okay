# Okay Mental Health — Claude.ai Project Instructions

## Project Description

**Okay** is a Progressive Web App (PWA) designed to support individuals managing mental health disorders, targeting Brazilian Portuguese users. The goal is a user-friendly, accessible platform that empowers people to take control of their well-being through self-reflection tools, wellness tracking, professional connections, and crisis support — all with an approachable, non-clinical feel.

The app is built as a monorepo (Next.js 16 frontend + NestJS 11 backend) and prioritizes offline-first reliability, data privacy (LGPD/HIPAA considerations), and mobile-first responsive design.

### Implemented Features
- **Personal Journal** — Rich-text journaling with TipTap editor, mood tagging, full-text search, and offline sync
- **Medication Monitoring** — Medication regimen tracking with scheduled/PRN dose logging, adherence statistics, and offline support
- **Psychological Inventories** — PHQ-9, GAD-7, and DASS-21 assessments dynamically rendered from the database, with client-side scoring and interpretation
- **Breathing & Meditation Exercises** — Guided breathing techniques with animated timing sequences
- **Healthcare Professional Directory** — Search for psychologists and psychiatrists via Brazilian SUS (Sistema Único de Saúde) data, filterable by CBO, municipality, and SUS attendance
- **Crisis Support (CVV)** — Dedicated support page with direct access to the Centro de Valorização da Vida for immediate help
- **Public Blog** — MDX-powered mental health articles with tag filtering, full-text search, and table of contents
- **User Profiles** — Birthdate, gender, consent preferences (LGPD), profile pictures, Google OAuth linking
- **Admin Panel** — Testimonial moderation workflow

### Planned / In Progress Features
- **Patient–Professional Connections** — Allow users to connect with healthcare professionals, share health data, and schedule appointments
- **Routine Management** — Sleep, diet, exercise, and general wellness tracking with reminders and recommendations
- **Analytical Reports** — Personalized insights into sleep patterns, medication adherence, mood trends, screen time, and mental health progress over time
- **Trend Analysis** — Visual dashboards for health vitals, questionnaire score history, and goal tracking
- **Mental Health Resources** — Educational materials on conditions, therapies, treatments, and self-care practices
- **Push Notifications** — Medication reminders and appointment alerts (infrastructure partially in place)
- **Field-level Encryption** — Journal content and medication data encrypted at rest on the frontend (backend encryption is live; frontend gated on RFC)
- **LGPD Art. 16 Compliance** — "Delete all my data" flow with 30-day grace period

### Tech Stack
**Frontend:** Next.js 16.1 / React 19 / TypeScript 5.9 / Supabase / Serwist PWA / Zustand / TipTap / Radix UI / Tailwind 4 — port 3000
**Backend:** NestJS 11 / TypeORM / PostgreSQL / JWT + Google OAuth / CASL permissions / Argon2 / AES-256-GCM — port 3001

### Brand & Design
- **Logo:** Simple smiley face emoticon made with lines — friendly, approachable
- **Primary font:** Varela Round (warm, rounded); secondary: Inter
- **Color palette:** Yellow primary (#F4B400, #F8D77C, #FBE5A8), blue secondary (#039BE5, #78C7EE, #A5DCF6), green accent (#7F9463, #ABB899, #D1DBC3), neutral tones (#91857A, #C2B2A3, #F2DECC), dark (#797D89, #A3A6B0, #CBCFD7)
- **Tone:** Warm, non-alarming, non-clinical — designed to reduce anxiety, not add to it

---

## Frontend Architecture

### Critical Constraints
- **NEVER remove `--webpack` flags** from dev/build commands — Unicode in project path breaks Turbopack; Serwist is unsupported on Turbopack
- **Middleware file is `proxy.ts`**, not `middleware.ts` (Next.js 16 convention in this repo)
- **Async params** — In Next.js 16, params are Promises: `const { slug } = await params` (server) or `const { slug } = use(params)` (client)
- **`redirect()` inside try/catch is forbidden** in server actions — NEXT_REDIRECT throws and catch swallows it; return `{ success: true }` and let client navigate

### Auth Helpers
- Server: `getUserWithRolesAndPermissions()` (full profile + roles + permissions) or `getAuthenticatedUser()` (quick check) — from `lib/supabase/server.ts`
- Client: `createClient()` from `lib/supabase/client.ts`
- **Always use `supabase.auth.getUser()` server-side**, never trust `getSession()`

### Supabase (Frontend Data Layer)

Supabase provides **Auth + PostgreSQL database** for the frontend. The backend (NestJS) has its own separate JWT auth — they are independent systems.

#### Packages
- `@supabase/supabase-js@2.95.3` — core client
- `@supabase/ssr@0.8.0` — SSR-compatible cookie handling for Next.js

#### Two Client Factories

**Server** (`lib/supabase/server.ts`) — for Server Components, Server Actions, Route Handlers:
```ts
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient(); // async — reads cookies()
```

**Browser** (`lib/supabase/client.ts`) — for Client Components only:
```ts
import { createClient } from '@/lib/supabase/client'; // or getClientInstance() for singleton
const supabase = createClient();
```

#### Server-Side Auth Helpers

| Function | When to use |
|----------|-------------|
| `getUserWithRolesAndPermissions()` | Full profile + roles + permissions in one query (use for protected pages) |
| `getAuthenticatedUser()` | Quick JWT check only (no profile fetch) |
| `userHasPermission(resource, action)` | One-off permission check |
| `userHasRole(roleName)` | One-off role check |
| `logAuditTrail({action, resource, ...})` | Non-blocking audit log write |

**Security rule:** ALWAYS call `supabase.auth.getUser()` server-side. Never trust `getSession()` — it reads from cookies without revalidating the JWT.

#### Database Schema

All tables are in the `public` schema, fully typed via `Database` in `lib/supabase/database.types.ts`.

| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | `id` (= auth.users.id), `name`, `surname`, `email`, `gender`, `birthdate`, `profile_picture_url`, consent fields | Central user table; `id` is FK everywhere |
| `journal_entries` | `id`, `user_id`, `title`, `content` (JSONB TipTap), `mood`, `tags` (text[]), `is_content_encrypted`, `search_vector` | Full-text search via `search_vector` column |
| `medications` | `id`, `user_id`, `name`, `dosage`, `form`, `start_date`, `end_date`, `instructions`, `notes` | Has related `schedule_times` |
| `schedule_times` | `id`, `medication_id`, `time`, `days` (day_of_week[]) | Eager-loaded with medications |
| `dose_logs` | `id`, `user_id`, `medication_id`, `status`, `dose_type`, `timestamp`, `scheduled_time`, `notes` | Append-only for PRN; upsert on `(medication_id, scheduled_time, date)` for scheduled |
| `inventories` | `id`, `name`, `title`, `description`, `questions` (JSONB), `scoring` (JSONB), `source`, `subscale`, `version` | Assessment definitions (PHQ-9, GAD-7, DASS-21) |
| `inventory_responses` | `id`, `user_id`, `inventory_id`, `responses` (JSONB), `calculated_scores` (JSONB), `interpretation_results` (JSONB), `consent_given`, `deleted_at` | Soft-delete via `deleted_at` |
| `audit_logs` | `id`, `user_id`, `action`, `resource`, `resource_id`, `details` (JSONB), `ip_address`, `user_agent`, `timestamp` | Write via `logAuditTrail()` only |
| `roles` | `id`, `name`, `is_default`, `is_system` | |
| `permissions` | `id`, `name`, `resource`, `action` | Format: `resource:action` |
| `role_permissions` | `role_id`, `permission_id` | Join table |
| `user_roles` | `user_id`, `role_id`, `assigned_at`, `assigned_by` | |
| `breathing_techniques` | `id`, `name`, `description`, `duration` (int[]), `bgcolor` | |
| `professionals` | `id`, `municipio`, `profissional_nome`, `profissional_cbo`, `profissional_atende_sus`, … | Brazilian SUS healthcare data |
| `testimonials` | `id`, `email`, `message`, `location`, `status`, `newsletter`, `approved_by_id` | Moderation workflow |

#### Database Enums

```
audit_action    — create | read | update | delete | login | logout | failed_login |
                  profile_access | data_export | consent_updated | sensitive_data_access |
                  password_updated | account_deletion | account_linked | oauth_revoked |
                  token_refreshed | token_refresh_failed | session_terminated |
                  password_reset_request | password_reset_success |
                  email_verification_request | email_verified | role_assigned |
                  role_removed | permission_granted | permission_revoked |
                  settings_updated | account_merge_requested | access_denied
day_of_week     — monday | tuesday | wednesday | thursday | friday | saturday | sunday
dose_status     — taken | skipped | delayed
dose_type       — scheduled | prn
gender_type     — male | female | non_binary | prefer_not_to_say | other
journal_mood    — happy | sad | excited | anxious | calm | angry | grateful |
                  confused | proud | tired | neutral
medication_form — capsule | tablet | drops | injectable | ointment | other
testimonial_status — pending | approved | rejected
```

#### PostgreSQL Functions (RPC)
Call via `supabase.rpc(...)`:

| Function | Args | Returns |
|----------|------|---------|
| `get_user_roles` | — | `string[]` |
| `is_admin_or_owner` | `owner_id: string` | `boolean` |
| `is_admin_user` | `user_id?: string` | `boolean` |
| `user_has_role` | `role_name: string` | `boolean` |
| `user_has_any_role` | `role_names: string[]` | `boolean` |
| `search_journal_entries` | `p_user_id, p_query?, p_mood?, p_tags?, p_start_date?, p_end_date?, p_limit?, p_offset?` | journal rows + `rank` (float) |

Full-text search uses the `search_vector` tsvector column on `journal_entries` — always call `search_journal_entries` RPC rather than filtering manually.

#### Type Usage
```ts
import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '@/lib/supabase/database.types';

type JournalRow    = Tables<'journal_entries'>;        // Row type
type JournalInsert = TablesInsert<'journal_entries'>;  // Insert type
type JournalUpdate = TablesUpdate<'journal_entries'>;  // Update type
type JournalMood   = Enums<'journal_mood'>;            // Enum type
```

#### Server Action Query Patterns

Every server action follows this structure:
1. `const supabase = await createClient()`
2. `const { data: { user }, error } = await supabase.auth.getUser()` — always first
3. Filter all queries by `.eq('user_id', user.id)` — belt-and-suspenders alongside RLS
4. `upsert(data, { onConflict: 'id' })` for creates that may be retried (offline sync idempotency)
5. `await logAuditTrail({...})` after every CRUD operation
6. `revalidatePath('/route')` after mutations

#### RLS (Row Level Security)
All tables have RLS enabled at the database level. Server actions **also** filter by `user_id` explicitly as a defense-in-depth pattern — never rely solely on RLS from application code.

#### Table Relationships (for `.select()` with joins)
```
profiles ← user_roles → roles → role_permissions → permissions
profiles ← journal_entries
profiles ← medications → schedule_times
profiles ← medications → dose_logs
profiles ← inventory_responses → inventories
profiles ← audit_logs
testimonials → profiles (approved_by_id)
```

Use explicit FK names when disambiguating joins (e.g., `user_roles!user_roles_user_id_fkey`). See `getUserWithRolesAndPermissions()` in `lib/supabase/server.ts` for the canonical multi-level join pattern.

### State & Offline Stack
4-layer offline architecture (in order):
1. **Zustand** (`store/`) — optimistic UI
2. **IndexedDB** (`store/offline-storage.ts`, DB_VERSION=3) — offline persistence, `if (oldVersion < N)` migration blocks
3. **SyncService** (`service/sync-service.ts`) — Web Locks (`okay-sync-lock`, 30s timeout), auth refresh, sync orchestration
4. **Service Worker** (`app/sw.ts`, Serwist) — delegates to SyncService via MessageChannel; never syncs independently

Idempotency rule: ALL creates use `crypto.randomUUID()` as client ID; server does `upsert(..., { onConflict: 'id' })`, never `insert()` for retryable records.

Reachability: HEAD to `$NEXT_PUBLIC_SUPABASE_URL/rest/v1/`. Any HTTP response = online; only TypeError/DNS error = offline. Backoff: [5s, 15s, 30s, 60s, 5min].

### Logout Flow (9-step sequential, in `providers/auth-provider.tsx`)
1. Clear React state
2. BroadcastChannel LOGOUT to other tabs
3. `supabase.auth.signOut()` client-side
4. Server action `signOut()` (primary httpOnly cookie clear)
5. Clear `sb-*` document.cookie
6. `offlineStorage.clearAll()`
7. Clear `sb-*` localStorage keys only (preserve theme/a11y prefs)
8. Post `CLEAR_CACHE` to SW
9. `window.location.replace('/')` in finally block

### Key Libraries
TipTap 3.19 (rich text, ProseMirror), `@radix-ui/*` (15+ headless primitives), Zustand 5 + immer, Serwist 9.5, date-fns 4, react-hook-form 7 + Zod 4, lucide-react, sonner (toasts), next-mdx-remote 6

### Scoring — NEVER Duplicate
All questionnaire scoring lives in `lib/scoring-utils.ts`. Never re-implement `calculateScores()` or `generateInterpretation()` elsewhere.

### Pending / Not Implemented
- **Encryption** (`lib/encryption-utils.ts` exists but unused) — gated on RFC for key management + recovery UX
- **Push notifications** — `/api/push-subscriptions` and `/api/notification-preferences` routes do NOT exist; `web-push` not installed
- **LGPD Art. 16** — No "delete all my data" flow yet
- **Periodic background sync** — SW handles `periodicsync` but client never registers it
- **E2E tests** — No Playwright; manual verification only

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_FRONTEND_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
```

---

## Backend Architecture

### Modules & Routes

| Module | Base Route | Notes |
|--------|-----------|-------|
| Auth | `/auth` | JWT 15m + refresh 7d, Google OAuth, device fingerprinting, CSRF tokens |
| User | `/users` | Profiles, roles, consent, profile pictures, password change |
| Journal | `/journals` | TipTap JSONB, mood, tags, optional AES-256-GCM encryption |
| Inventory | `/inventories` | Assessment definitions + `/responses` for submissions |
| Medication | `/medications` | Schedule times (eager), dose logs, `/doses` endpoint |
| Testimonial | `/testimonials` | Submit + moderation workflow |
| Professionals | `/professionals/search` | SUS healthcare provider lookup |
| Breathing | `/breathing-techniques` | Guided techniques with timing arrays |

### Auth System
- **Local** (Argon2 password hash) + **Google OAuth2** (account linking supported)
- JWT payload: `{ userId, email, roles, deviceFingerprint, sessionId }`
- Refresh tokens encrypted at rest in `refresh_tokens` table; max 5 sessions per user
- Token blacklist table for invalidation
- Rate limiting on auth: 5 req / 300s (brute force protection)
- Guards: `JwtAuthGuard` (global APP_GUARD), `@Public()` decorator exempts routes

### Authorization (CASL)
Permissions format: `resource:action` — e.g., `journal:create`, `medication:read`

Default **PATIENT** role permissions: own user profile (read/update), own journals (CRUD), own medications (CRUD), own inventory responses (create/read), testimonials (create/read own), OAuth (link/unlink)

**ADMIN** role: `all:manage`

Row-level isolation: CASL conditions enforce `{ userId: user.id }` for journals, medications, inventory responses.

### API Endpoints

**Authentication (`/auth`):**
- `POST /auth/login` — email/password (rate-limited: 5/300s)
- `POST /auth/refresh` — refresh access token
- `POST /auth/logout` — invalidate tokens
- `GET /auth/google` — redirect to Google OAuth
- `GET /auth/google/callback` — OAuth callback
- `POST /auth/link-account` — link OAuth to existing account
- `POST /auth/revoke-oauth` — revoke OAuth provider

**Users (`/users`):**
- `POST /users` — create account (public)
- `GET /users/me` — own profile
- `GET|PATCH /users/:id` — get/update user (own or admin)
- `POST /users/:id/profile-picture` — upload avatar
- `POST /users/update-password` — change password
- `PATCH /users/:id/consent` — update GDPR consent
- `PATCH|DELETE /users/:id/roles/:roleName` — manage roles (admin only)

**Journal (`/journals`):** Full CRUD + `GET /journals/statistics`

**Inventories (`/inventories`):** List/get inventories + `POST /inventories/:id/responses` to submit assessments

**Medications (`/medications`):** Full CRUD + `POST /medications/:id/doses` to log a dose

**Testimonials (`/testimonials`):** `POST` submit + `GET /testimonials/approved` (both public)

**Professionals (`/professionals`):** `GET /professionals/search` (public, filters: CBO, SUS, municipality, text)

**Breathing (`/breathing-techniques`):** `GET` list + `GET /:id` (both public)

### Security Stack
- AES-256-GCM encryption (scrypt key derivation) for journal content (optional) and OAuth tokens
- CSRF tokens (generated on login, validated on state-changing endpoints via `X-CSRF-Token`)
- `DataIsolationMiddleware` — enforces user isolation on all requests
- `AuditMiddleware` → `audit_logs` table (userId, action, resource, ip, userAgent, timestamp)
- Helmet (CSP, HSTS, X-Frame-Options, referrer policy)
- TypeORM SnakeNamingStrategy — all DB columns are snake_case

### Key Backend Entities
`users`, `roles`, `permissions`, `journal_entries` (JSONB content), `medications` + `schedule_times` + `dose_logs`, `inventories` (JSONB questions/scoring) + `inventory_responses` (JSONB answers + scores), `auth_sessions`, `refresh_tokens`, `token_blacklist`, `audit_logs`, `breathing_techniques`, `professionals`, `testimonials`

Dose log dedup rules:
- `scheduled` type: server upsert on `(medication_id, scheduled_time, date)` + audit row before overwrite
- `prn` type: append-only; client UUID is sole dedup key

### Commands
```bash
cd backend
docker-compose up -d postgres   # required first
pnpm start:dev                  # dev server :3001
pnpm test                       # unit tests
pnpm migration:run              # apply migrations
pnpm seed:all                   # seed roles, users, inventories
# Swagger: http://localhost:3001/api/docs
```

---

## Cross-Cutting Concerns

**Data privacy:** RLS on Supabase (frontend), CASL conditions (backend), field encryption (AES-256-GCM on backend, planned for frontend). Sensitive fields wiped from IndexedDB and localStorage on logout.

**Offline-first:** Frontend works offline for journal, medications, inventory. Sync queued in IndexedDB, replayed by SyncService on reconnect. Service worker precaches critical pages and falls back to `/offline`.

**LGPD/GDPR:** Consent fields on `profiles` table (`consent_to_data_processing`, `consent_to_research`, `consent_to_marketing`). Audit trail on all actions. User data deletion flow is pending.

**Mobile-first:** Tailwind 4 with custom breakpoints, Varela Round + Inter fonts, soft color palette (yellow primary, blue secondary, green accent, beige/sage backgrounds), dark mode via class strategy.

**Monorepo coordination:** When features span both repos — plan first, implement backend (test via Swagger at `:3001/api/docs`), then frontend, verify integration end-to-end.

**Error messages:** All user-facing strings are in Brazilian Portuguese.
