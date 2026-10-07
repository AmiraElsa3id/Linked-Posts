# Side-Task Scripts

Development/debugging scripts for capturing screenshots, exploring the demo site, and inspecting page structures. **Not part of the application codebase.**

## Structure

```
scripts/
├── capture/       # Local app screenshot capture
│   ├── capture.js           # Basic route screenshots (home, auth, profile, bookmarks, notifications)
│   └── capture_updated.js   # Updated app screenshots (auth, register, feed, profile)
│
├── explore/       # Demo site exploration
│   └── explore_demo.js      # Navigate demo site, fill forms, capture auth/register flows
│
├── inspect/       # Demo site inspection
│   └── inspect_demo.js      # Inspect demo page links, structure, navigate routes
│
└── profile/       # Profile page comparison
    └── capture_profile.js   # Side-by-side demo vs local profile captures (light/dark)
```

## Usage

### Capture local app screenshots
```bash
# Basic routes
node scripts/capture/capture.js

# Updated app (auth, register, feed, profile)
node scripts/capture/capture_updated.js
```

### Explore/inspect demo site
```bash
# Explore demo auth flow
node scripts/explore/explore_demo.js

# Inspect demo page structure
node scripts/inspect/inspect_demo.js
```

### Profile comparison (demo vs local)
```bash
# Both demo and local, light theme
node scripts/profile/capture_profile.js both light

# Only demo
node scripts/profile/capture_profile.js demo

# Only local, dark theme
node scripts/profile/capture_profile.js local dark
```

## Requirements

- Playwright: `npm install playwright` (already in devDependencies)
- Running dev server for local captures: `npm run dev`
- Environment variables for profile capture:
  - `RP_EMAIL` (default: test account)
  - `RP_PASSWORD` (default: Password123!)

## Output

Screenshots saved to:
- Local captures: `C:\Users\Amera\.gemini\antigravity\brain\c6e6de56-0124-4ee5-a803-b08f32cbd4d2\`
- Profile captures: `scripts/profile/screenshots/` (created automatically)

## Notes

- These are **one-off debugging scripts**, not part of CI/CD
- Hardcoded artifact directory paths may need adjustment for your environment
- Run from project root: `node scripts/capture/capture.js`