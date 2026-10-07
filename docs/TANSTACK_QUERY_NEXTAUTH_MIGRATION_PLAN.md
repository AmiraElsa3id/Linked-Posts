# TanStack Query + NextAuth.js Migration Plan

**Status**: Planned — not yet implemented  
**Branch**: `feat/tanstack-query-nextauth` (to be created)  
**Base commit**: `1f63339` (feat: real-time notifications, profile visit page, 404, suggested friends)

---

## 1. Goals

| Goal | Why |
|---|---|
| **TanStack Query (React Query)** | Client-side caching, deduping, background refetch, optimistic updates, devtools. Replaces manual `useEffect` + `useState` data fetching. |
| **NextAuth.js (v5 / Auth.js)** | Standardized auth flows, secure cookie-based sessions, CSRF protection, built-in JWT handling, easy provider expansion later. |
| **HttpOnly cookie token storage** | Removes JWT from `localStorage` (XSS-safe), automatic CSRF protection via SameSite cookies. |

---

## 2. Current State (Commit `1f63339`)

| Layer | Implementation |
|---|---|
| **API client** | `src/lib/api.ts` — `apiFetch()` wrapper around `fetch`, reads token from Zustand store |
| **Auth state** | `src/store/authStore.ts` — Zustand + `localStorage` (`auth_token`, `auth_user`) |
| **Data fetching** | Manual `useEffect` + `useState` in each page/component (`page.tsx`, `PostCard.tsx`, `SuggestedFriends.tsx`, `notifications/page.tsx`, `profile/[userId]/page.tsx`) |
| **Server** | `server.mjs` — custom Node + Socket.IO, polls Route Posts REST API **(to be removed for Vercel deployment)** |
| **Token** | JWT in `localStorage`, sent as `Authorization: Bearer <token>` + `token: <token>` headers |

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App Router                      │
├─────────────────────────────────────────────────────────────┤
│  TanStack Query (Provider at root layout)                   │
│  ├── useQuery  — GET  (/users/profile, /posts/feed, ...)    │
│  ├── useMutation — POST/PUT/DELETE (like, follow, create)   │
│  └── QueryClient — cache, deduping, background refetch      │
├─────────────────────────────────────────────────────────────┤
│  NextAuth.js (Auth.js v5)                                   │
│  ├── credentials provider (email/password → Route Posts)    │
│  ├── JWT strategy → HttpOnly cookie (Secure, SameSite=Lax)  │
│  ├── session callback → enrich with user profile            │
│  └── middleware → protect routes, redirect unauthenticated  │
├─────────────────────────────────────────────────────────────┤
│  API Route Handlers (optional, for BFF pattern)             │
│  ├── /api/auth/[...nextauth]  — NextAuth handler            │
│  └── /api/proxy/*             — forward to Route Posts API  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Tasks

### Phase 1 — TanStack Query Setup

| # | Task | Files |
|---|---|---|
| 1.1 | Install `@tanstack/react-query` + `@tanstack/react-query-devtools` | `package.json` |
| 1.2 | Create `src/lib/queryClient.ts` — `QueryClient` with defaults (`staleTime: 30_000`, `refetchOnWindowFocus: true`) | New file |
| 1.3 | Wrap app in `<QueryClientProvider>` + `<ReactQueryDevtools>` in `src/app/layout.tsx` | `layout.tsx` |
| 1.4 | Create typed `api` object using `axios` or enhanced `fetch` with interceptors (for 401 handling) | `src/lib/api.ts` (rewrite) |
| 1.5 | Define query keys factory (`src/lib/queryKeys.ts`) | New file |
| 1.6 | Replace `useEffect` + `useState` in `page.tsx` (feed) with `useQuery` + `useInfiniteQuery` | `page.tsx` |
| 1.7 | Replace in `notifications/page.tsx` | `notifications/page.tsx` |
| 1.8 | Replace in `SuggestedFriends.tsx` | `SuggestedFriends.tsx` |
| 1.9 | Replace in `profile/[userId]/page.tsx` | `profile/[userId]/page.tsx` |
| 1.10 | Replace in `PostCard.tsx` (comments, like, bookmark) | `PostCard.tsx` |
| 1.11 | Add `useMutation` for like, follow, bookmark, create post, create comment | Each component |
| 1.12 | Configure `onMutate` / `onError` / `onSettled` for optimistic updates | Each mutation |

### Phase 2 — NextAuth.js (Auth.js v5)

| # | Task | Files |
|---|---|---|
| 2.1 | Install `next-auth@beta` (v5) + `@auth/prisma-adapter` (if DB later) | `package.json` |
| 2.2 | Create `src/auth.ts` — NextAuth config | New file |
| 2.3 | **Credentials provider** — POST to `https://route-posts.routemisr.com/users/signin`, return `{ user, token }` | `src/auth.ts` |
| 2.4 | **JWT callback** — store access token in JWT, set `exp` | `src/auth.ts` |
| 2.5 | **Session callback** — return `{ user, accessToken }` | `src/auth.ts` |
| 2.6 | **Cookies** — `cookies: { sessionToken: { name: 'auth.js.session-token', options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } } }` | `src/auth.ts` |
| 2.7 | Create `src/app/api/auth/[...nextauth]/route.ts` — `NextAuth(authConfig).handler()` | New file |
| 2.8 | Create `src/lib/auth.ts` — `getServerSession()` helper for RSC | New file |
| 2.9 | Add middleware `src/middleware.ts` — protect routes, redirect to `/auth` if no session | New file |
| 2.10 | Remove `src/store/authStore.ts` (Zustand) — replace with `useSession()` hook | Delete + refactor |
| 2.11 | Update `Header.tsx` — use `useSession()` for user avatar, name, sign out | `Header.tsx` |
| 2.12 | Update `notifications/page.tsx`, `profile/page.tsx`, etc. — use `useSession()` | Each page |
| 2.13 | **Replace Socket.IO real-time notifications with client-side polling** (since Vercel doesn't support WebSockets) | `useNotificationSocket.ts` → `useEffect` polling |

### Phase 3 — Cookie-Based Token Flow

| # | Task | Notes |
|---|---|---|
| 3.1 | NextAuth sets `auth.js.session-token` (HttpOnly, Secure, SameSite=Lax) on login | Automatic |
| 3.2 | Client-side `apiFetch` reads token from **NextAuth session** (`useSession().data.accessToken`) instead of localStorage | `src/lib/api.ts` |
| 3.3 | Server-side `apiFetch` (in RSC) reads token from `cookies().get('auth.js.session-token')` via `getServerSession()` | `src/lib/api.ts` |
| 3.4 | **Replace Socket.IO with client-side polling** for notifications (15-30s interval) | `useNotificationSocket.ts` → `useEffect` + `setInterval` |
| 3.5 | 401 handling — if Route Posts returns 401, call `signOut()` (clears cookie) and redirect to `/auth` | `src/lib/api.ts` interceptor |

### Phase 4 — Cleanup & Polish

| # | Task |
|---|---|
| 4.1 | Remove `localStorage` reads/writes from entire codebase |
| 4.2 | Remove `src/store/authStore.ts`, `src/store/themeStore.ts` (move theme to `next-themes` or keep simple cookie) |
| 4.3 | Add `next-themes` for dark/light mode (cookie-based, no flash) |
| 4.4 | Run full test suite: login, feed, profile, notifications, follow, like, comment, share |
| 4.5 | Verify SSR: profile page, suggestions page render with session on server |
| 4.6 | Update `docs/ARCHITECTURE.md` with new data flow diagram |

---

## 5. File Map (New / Modified)

| File | Change |
|---|---|
| `package.json` | Add `@tanstack/react-query`, `@tanstack/react-query-devtools`, `next-auth@beta`, `axios` |
| `src/lib/queryClient.ts` | **New** — QueryClient factory |
| `src/lib/queryKeys.ts` | **New** — Query key factory |
| `src/lib/api.ts` | **Rewrite** — axios instance with interceptors, session-aware |
| `src/lib/auth.ts` | **New** — `getServerSession` helper |
| `src/auth.ts` | **New** — NextAuth config (credentials, JWT, cookies) |
| `src/app/api/auth/[...nextauth]/route.ts` | **New** — NextAuth handler |
| `src/middleware.ts` | **New** — Route protection |
| `src/app/layout.tsx` | Add `QueryClientProvider`, `SessionProvider` (NextAuth) |
| `src/app/page.tsx` | Replace `useEffect` with `useQuery`/`useInfiniteQuery` |
| `src/app/notifications/page.tsx` | `useQuery` + `useMutation` |
| `src/app/profile/[userId]/page.tsx` | `useQuery` + `useMutation` |
| `src/app/suggestions/page.tsx` | `useQuery` + `useMutation` |
| `src/components/PostCard.tsx` | `useMutation` for like/bookmark/comment |
| `src/components/SuggestedFriends.tsx` | `useQuery` + `useMutation` |
| `src/components/Header.tsx` | Use `useSession()` |
| `src/hooks/useNotificationSocket.ts` | **Replace Socket.IO with client-side polling** (15-30s interval) |
| `server.mjs` | **Delete** (Vercel doesn't support custom Node servers) |
| `src/store/authStore.ts` | **Delete** |
| `src/store/themeStore.ts` | **Delete** (or migrate to `next-themes`) |

---

## 6. Acceptance Criteria

| Criterion | Verification |
|---|---|
| **Login** | Email/password → sets HttpOnly cookie, redirects to `/` |
| **Session persists** | Refresh page → still logged in (cookie sent automatically) |
| **Feed loads via TanStack Query** | Devtools shows query cache, deduped requests |
| **Optimistic like** | Heart fills instantly, rolls back on error |
| **Follow button** | Toggles instantly, syncs with server |
| **Notifications** | Polling-based (15-30s interval, Vercel-compatible) |
| **SSR profile** | `/profile/:id` renders user data on server (no client flash) |
| **Sign out** | Clears cookie, redirects to `/auth` |
| **401 handling** | Expired token → auto sign-out + redirect |
| **Dark mode** | Persisted in cookie, no flash |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Route Posts API doesn't support refresh token** | Keep 7-day JWT expiry; on 401 → `signOut()` + redirect. Document limitation. |
| **Socket.IO auth with cookies** | NextAuth sets cookie on same origin; Socket.IO handshake includes cookies automatically. If cross-origin, pass token via `auth: { token: session.accessToken }`. |
| **TanStack Query SSR hydration** | Use `HydrationBoundary` + `dehydrate`/`hydrate` for initial data on RSC pages. |
| **Cookie size** | JWT ~1KB, well under 4KB cookie limit. |
| **CSRF** | NextAuth v5 uses SameSite=Lax + CSRF token in credentials flow. |

---

## 8. Estimated Effort

| Phase | Est. Days |
|---|---|
| Phase 1 — TanStack Query | 2–3 |
| Phase 2 — NextAuth.js | 2–3 |
| Phase 3 — Cookie flow | 1 |
| Phase 4 — Cleanup | 1 |
| **Total** | **6–8 days** |

---

## 9. Next Steps

1. Create branch: `git checkout -b feat/tanstack-query-nextauth`
2. Start Phase 1 (install deps, QueryClient, Provider)
3. Commit incrementally per task
4. Open PR for review

---

*Plan created at commit `1f63339`. Ready for implementation when approved.*