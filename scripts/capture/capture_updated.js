const { chromium } = require('playwright');
const path = require('path');

async function captureUpdatedAppScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  try {
    // Auth Page
    await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'updated_app_auth.png'), fullPage: true });

    // Click Register tab
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'updated_app_register.png'), fullPage: true });

    // Home Feed
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'updated_app_feed.png'), fullPage: true });

    // Profile Page
    await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'updated_app_profile.png'), fullPage: true });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

captureUpdatedAppScreenshots();
