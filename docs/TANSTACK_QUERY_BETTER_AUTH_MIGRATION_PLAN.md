# TanStack Query + Better Auth Migration Plan

**Status**: Planned — not yet implemented  
**Branch**: `feat/tanstack-query-better-auth` (to be created)  
**Base commit**: `1bf7fc2` (refactor: drop server.mjs for Vercel deployment)

---

## 1. Goals

| Goal | Why |
|---|---|
| **TanStack Query (React Query)** | Client-side caching, deduping, background refetch, optimistic updates, devtools. Replaces manual `useEffect` + `useState` data fetching. |
| **Better Auth** | Modern auth library with built-in Next.js integration, secure cookie-based sessions, CSRF protection, built-in JWT handling, email/password + social providers, better TypeScript support. |
| **HttpOnly cookie token storage** | Removes JWT from `localStorage` (XSS-safe), automatic CSRF protection via SameSite cookies. |

---

## 2. Current State (Commit `1bf7fc2`)

| Layer | Implementation |
|---|---|
| **API client** | `src/lib/api.ts` — `apiFetch()` wrapper around `fetch`, reads token from Zustand store |
| **Auth state** | `src/store/authStore.ts` — Zustand + `localStorage` (`auth_token`, `auth_user`) |
| **Data fetching** | Manual `useEffect` + `useState` in each page/component (`page.tsx`, `PostCard.tsx`, `SuggestedFriends.tsx`, `notifications/page.tsx`, `profile/[userId]/page.tsx`) |
| **Server** | Standard Next.js (`next dev` / `next start`) — no custom server |
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
│  Better Auth (with Next.js integration)                     │
│  ├── credentials provider (email/password → Route Posts)    │
│  ├── JWT strategy → HttpOnly cookie (Secure, SameSite=Lax)  │
│  ├── session callback → enrich with user profile            │
│  ├── middleware → protect routes, redirect unauthenticated  │
│  └── client hooks: useSession(), signIn(), signOut()        │
├─────────────────────────────────────────────────────────────┤
│  API Route Handlers (Better Auth generates /api/auth/*)     │
│  └── /api/auth/*  — Better Auth handler (signin, signout,   │
│     session, callback, etc.)                                │
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

### Phase 2 — Better Auth Setup

| # | Task | Files |
|---|---|---|
| 2.1 | Install `better-auth` + `@better-auth/next` (Next.js integration) | `package.json` |
| 2.2 | Create `src/auth.ts` — Better Auth config | New file |
| 2.3 | **Credentials provider** — POST to `https://route-posts.routemisr.com/users/signin`, return `{ user, token }` | `src/auth.ts` |
| 2.4 | **JWT strategy** — store access token in JWT, set `exp` (7 days matching Route Posts) | `src/auth.ts` |
| 2.5 | **Session callback** — return `{ user, accessToken }` | `src/auth.ts` |
| 2.6 | **Cookies** — HttpOnly, Secure, SameSite=Lax, path `/` (Better Auth defaults) | `src/auth.ts` |
| 2.7 | Create `src/app/api/auth/[...better-auth]/route.ts` — Better Auth handler | New file |
| 2.8 | Create `src/lib/auth.ts` — `auth.api` helper for RSC/server-side | New file |
| 2.9 | Add middleware `src/middleware.ts` — protect routes, redirect to `/auth` if no session | New file |
| 2.10 | Remove `src/store/authStore.ts` (Zustand) — replace with `useSession()` hook | Delete + refactor |
| 2.11 | Update `Header.tsx` — use `useSession()` for user avatar, name, sign out | `Header.tsx` |
| 2.12 | Update `notifications/page.tsx`, `profile/page.tsx`, etc. — use `useSession()` | Each page |
| 2.13 | **Replace Socket.IO real-time notifications with client-side polling** (since Vercel doesn't support WebSockets) | `useNotificationSocket.ts` → `useEffect` polling |

### Phase 3 — Cookie-Based Token Flow

| # | Task | Notes |
|---|---|---|
| 3.1 | Better Auth sets HttpOnly cookie (Secure, SameSite=Lax) on login | Automatic via Better Auth |
| 3.2 | Client-side `apiFetch` reads token from **Better Auth session** (`useSession().data.accessToken`) instead of localStorage | `src/lib/api.ts` |
| 3.3 | Server-side `apiFetch` (in RSC) reads token from cookie via `auth.api.getSession()` | `src/lib/api.ts` |
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
| `package.json` | Add `@tanstack/react-query`, `@tanstack/react-query-devtools`, `better-auth`, `@better-auth/next`, `axios` |
| `src/lib/queryClient.ts` | **New** — QueryClient factory |
| `src/lib/queryKeys.ts` | **New** — Query key factory |
| `src/lib/api.ts` | **Rewrite** — axios instance with interceptors, session-aware |
| `src/lib/auth.ts` | **New** — `auth.api` helper for RSC/server-side |
| `src/auth.ts` | **New** — Better Auth config (credentials, JWT, cookies) |
| `src/app/api/auth/[...better-auth]/route.ts` | **New** — Better Auth handler |
| `src/middleware.ts` | **New** — Route protection |
| `src/app/layout.tsx` | Add `QueryClientProvider`, Better Auth `SessionProvider` |
| `src/app/page.tsx` | Replace `useEffect` with `useQuery`/`useInfiniteQuery` |
| `src/app/notifications/page.tsx` | `useQuery` + `useMutation` |
| `src/app/profile/[userId]/page.tsx` | `useQuery` + `useMutation` |
| `src/app/suggestions/page.tsx` | `useQuery` + `useMutation` |
| `src/components/PostCard.tsx` | `useMutation` for like/bookmark/comment |
| `src/components/SuggestedFriends.tsx` | `useQuery` + `useMutation` |
| `src/components/Header.tsx` | Use `useSession()` |
| `src/hooks/useNotificationSocket.ts` | **Replace Socket.IO with client-side polling** (15-30s interval) |
| `src/store/authStore.ts` | **Delete** |
| `src/store/themeStore.ts` | **Delete** (or migrate to `next-themes`) |
| `src/lib/socket.ts` | **Delete** (Socket.IO removed) |

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
| **Better Auth cookie handling on Vercel** | Better Auth works natively on Vercel; uses standard cookie APIs. |
| **TanStack Query SSR hydration** | Use `HydrationBoundary` + `dehydrate`/`hydrate` for initial data on RSC pages. |
| **Cookie size** | JWT ~1KB, well under 4KB cookie limit. |
| **CSRF** | Better Auth uses SameSite=Lax + CSRF token in credentials flow. |
| **Better Auth maturity** | Newer library; verify Route Posts integration works before committing. |

---

## 8. Estimated Effort

| Phase | Est. Days |
|---|---|
| Phase 1 — TanStack Query | 2–3 |
| Phase 2 — Better Auth | 2–3 |
| Phase 3 — Cookie flow | 1 |
| Phase 4 — Cleanup | 1 |
| **Total** | **6–8 days** |

---

## 9. Next Steps

1. Create branch: `git checkout -b feat/tanstack-query-better-auth`
2. Start Phase 1 (install deps, QueryClient, Provider)
3. Commit incrementally per task
4. Open PR for review

---

## 10. Better Auth Resources

- **Docs**: https://better-auth.com/docs
- **Next.js Integration**: https://better-auth.com/docs/integrations/next
- **Credentials Provider**: https://better-auth.com/docs/authentication/credentials
- **JWT Strategy**: https://better-auth.com/docs/authentication/jwt
- **Middleware**: https://better-auth.com/docs/integrations/next#middleware

---

*Plan created at commit `1bf7fc2`. Ready for implementation when approved.*