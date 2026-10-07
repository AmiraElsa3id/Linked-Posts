# Test Files Organization

This directory contains manual testing scripts used during development. They are **not** part of the automated CI/CD pipeline.

## Structure

```
tests/
├── api/           # Node.js fetch scripts for testing Route Posts REST API
│   ├── test_api.js              # Basic signup test
│   ├── test_notifications_api.js # Notifications endpoints test
│   ├── test_post_actions.js     # Post interactions (like, bookmark, comment)
│   └── test_sidebar_api.js      # Sidebar endpoints (my posts, bookmarks, feed)
│
├── e2e/           # Playwright browser automation scripts
│   ├── test_actions_browser.js  # Post actions (like, comment) in browser
│   ├── test_demo_full.js        # Demo site full auth flow
│   ├── test_demo_pages.js       # Demo site pages (profile, notifications)
│   ├── test_features.js         # Feature tests (dark mode, notifications, post discussion)
│   ├── test_flow.js             # User flow (signup → login → profile)
│   └── test_tabs.js             # Sidebar tab navigation
│
└── manual/        # Reserved for ad-hoc scripts
```

## Usage

### API Tests (run with Node.js)
```bash
node tests/api/test_api.js
node tests/api/test_notifications_api.js
node tests/api/test_post_actions.js
node tests/api/test_sidebar_api.js
```

### E2E Tests (require Playwright + running dev server)
```bash
# Start dev server first
npm run dev

# In another terminal, run Playwright tests
npx playwright test tests/e2e/test_flow.js
# or run directly with Node (these are standalone scripts)
node tests/e2e/test_flow.js
```

## Notes

- These are **development/debugging scripts**, not formal unit/integration tests
- They use hardcoded test credentials and hit the **real Route Posts API** (`https://route-posts.routemisr.com`)
- Not integrated into CI/CD — no `npm test` script
- For production testing, consider adding Vitest + Playwright with proper test fixtures
- The `manual/` folder is reserved for one-off debugging scripts

## Artifacts

Screenshots from Playwright tests are saved to:
```
C:\Users\Amera\.gemini\antigravity\brain\c6e6de56-0124-4ee5-a803-b08f32cbd4d2\
```
(This path is hardcoded in the test files)