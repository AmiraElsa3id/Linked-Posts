const { chromium } = require('playwright');
const path = require('path');

async function testDemoAuthAndFeed() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  const testEmail = `route_demo_${Date.now()}@example.com`;
  const testUsername = `user${Date.now().toString().slice(-4)}`;

  try {
    console.log('Navigating to Demo site...');
    await page.goto('https://route-posts.routemisr.com/demo/#/auth', { waitUntil: 'networkidle' });

    console.log('Switching to Register tab...');
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);

    console.log('Filling Register fields...');
    const inputs = await page.$$('input');
    await inputs[0].fill('Amira Elsa3id');
    await inputs[1].fill(testUsername);
    await inputs[2].fill(testEmail);
    
    // Select gender
    const select = await page.$('select');
    if (select) {
      await select.selectOption({ index: 1 });
    }

    await inputs[3].fill('1998-05-15');
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');

    await page.click('button:has-text("Create New Account")');
    await page.waitForTimeout(4000);

    console.log('Current URL after submit:', page.url());
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_after_submit.png'), fullPage: true });

    // Try logging in directly with created user if not redirected
    if (page.url().includes('auth')) {
      console.log('Switching to Login tab...');
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(500);

      const loginInputs = await page.$$('input');
      if (loginInputs.length >= 2) {
        await loginInputs[0].fill(testEmail);
        await loginInputs[1].fill('Password123!');
        await page.click('button:has-text("Log In")');
        await page.waitForTimeout(4000);
        console.log('Current URL after Login submit:', page.url());
        await page.screenshot({ path: path.join(artifactDir, 'demo_ref_logged_in_feed.png'), fullPage: true });
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testDemoAuthAndFeed();
