const { chromium } = require('playwright');
const path = require('path');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  const routes = [
    { url: 'http://localhost:3000/', name: 'site_home_feed.png' },
    { url: 'http://localhost:3000/auth/signin', name: 'site_signin.png' },
    { url: 'http://localhost:3000/auth/signup', name: 'site_signup.png' },
    { url: 'http://localhost:3000/profile', name: 'site_profile.png' },
    { url: 'http://localhost:3000/bookmarks', name: 'site_bookmarks.png' },
    { url: 'http://localhost:3000/notifications', name: 'site_notifications.png' },
  ];

  for (const route of routes) {
    try {
      console.log(`Navigating to ${route.url}...`);
      await page.goto(route.url, { waitUntil: 'networkidle' });
      const savePath = path.join(artifactDir, route.name);
      await page.screenshot({ path: savePath, fullPage: true });
      console.log(`Saved screenshot to ${savePath}`);
    } catch (err) {
      console.error(`Failed to capture ${route.url}:`, err);
    }
  }

  await browser.close();
}

captureScreenshots();
