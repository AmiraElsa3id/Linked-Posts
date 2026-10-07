const { chromium } = require('playwright');
const path = require('path');

async function testPostActionsInBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  try {
    console.log('1. Registering user session...');
    await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);

    const inputs = await page.$$('input');
    await inputs[0].fill('Action Tester');
    await inputs[1].fill('action' + Date.now().toString().slice(-4));
    await inputs[2].fill(`action_${Date.now()}@example.com`);
    await inputs[3].fill('1998-05-15');
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');

    await page.click('button:has-text("Create New Account")');
    await page.waitForTimeout(3000);

    console.log('2. Switching to Community tab to see public posts...');
    await page.click('button:has-text("Community")');
    await page.waitForTimeout(2000);

    // Click Like on first post card
    console.log('3. Liking a post...');
    const likeBtn = await page.$('button:has-text("0"), button:has-text("1")');
    if (likeBtn) await likeBtn.click();
    await page.waitForTimeout(1000);

    // Click Comment expander
    console.log('4. Expanding comments...');
    const commentBtns = await page.$$('button:has-text("0")');
    if (commentBtns.length > 1) await commentBtns[1].click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactDir, 'post_actions_verified.png'), fullPage: true });

  } catch (err) {
    console.error('Error:', err);
  } fontally: {
    await browser.close();
  }
}

testPostActionsInBrowser();
