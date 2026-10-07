const { chromium } = require('playwright');
const path = require('path');

async function testSidebarTabClicks() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  try {
    await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);

    const inputs = await page.$$('input');
    await inputs[0].fill('Sidebar User');
    await inputs[1].fill('side' + Date.now().toString().slice(-4));
    await inputs[2].fill(`sidebar_${Date.now()}@example.com`);
    await inputs[3].fill('1998-05-15');
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');

    await page.click('button:has-text("Create New Account")');
    await page.waitForTimeout(3000);

    // 1. Feed Tab Screenshot
    await page.screenshot({ path: path.join(artifactDir, 'tab_1_feed.png'), fullPage: true });

    // 2. Click My Posts
    console.log('Clicking My Posts tab...');
    await page.click('button:has-text("My Posts")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'tab_2_myposts.png'), fullPage: true });

    // 3. Click Community
    console.log('Clicking Community tab...');
    await page.click('button:has-text("Community")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'tab_3_community.png'), fullPage: true });

    // 4. Click Saved
    console.log('Clicking Saved tab...');
    await page.click('button:has-text("Saved")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'tab_4_saved.png'), fullPage: true });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testSidebarTabClicks();
