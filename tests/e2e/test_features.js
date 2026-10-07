const { chromium } = require('playwright');
const path = require('path');

async function testNewFeaturesInBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  try {
    console.log('1. Registering user...');
    await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);

    const inputs = await page.$$('input');
    await inputs[0].fill('Feature User');
    await inputs[1].fill('feat' + Date.now().toString().slice(-4));
    await inputs[2].fill(`feat_${Date.now()}@example.com`);
    await inputs[3].fill('1998-05-15');
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');

    await page.click('button:has-text("Create New Account")');
    await page.waitForTimeout(3000);

    // 2. View Post Discussion
    console.log('2. Opening Post Discussion page...');
    await page.goto('http://localhost:3000/posts/6ac580510bbe45cf7a065866', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'post_discussion_details.png'), fullPage: true });

    // 3. Toggle Dark Mode
    console.log('3. Toggling Dark Mode...');
    await page.click('button[title*="Switch to"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'dark_mode_discussion.png'), fullPage: true });

    // 4. Notifications Page
    console.log('4. Viewing Notifications Page...');
    await page.goto('http://localhost:3000/notifications', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'notifications_page_dark.png'), fullPage: true });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testNewFeaturesInBrowser();
