const { chromium } = require('playwright');
const path = require('path');

async function exploreDemoSite() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  try {
    console.log('Navigating to Demo site...');
    await page.goto('https://route-posts.routemisr.com/demo/#/auth', { waitUntil: 'networkidle' });

    // Capture Register tab
    console.log('Clicking Register tab...');
    await page.click('button:has-text("Register"), [role="tab"]:has-text("Register"), a:has-text("Register")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_register.png'), fullPage: true });

    // Perform Login with demo credentials or newly created user
    console.log('Switching back to Login tab...');
    await page.click('button:has-text("Login"), [role="tab"]:has-text("Login"), a:has-text("Login")');
    await page.waitForTimeout(1000);

    // Try logging in with a known user or creating one first
    console.log('Filling login form...');
    const testEmail = `demo_${Date.now()}@example.com`;
    const testUsername = `demo${Date.now().toString().slice(-4)}`;

    // Click Register first to create user
    await page.click('button:has-text("Register"), [role="tab"]:has-text("Register")');
    await page.waitForTimeout(500);

    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} inputs on register tab`);

    if (inputs.length >= 5) {
      await inputs[0].fill('Demo User');
      await inputs[1].fill(testUsername);
      await inputs[2].fill(testEmail);
      await inputs[3].fill('1998-05-15');
      // password fields
      await page.fill('input[type="password"] >> nth=0', 'Password123!');
      await page.fill('input[type="password"] >> nth=1', 'Password123!');
      await page.screenshot({ path: path.join(artifactDir, 'demo_ref_register_filled.png'), fullPage: true });

      await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(artifactDir, 'demo_ref_after_register.png'), fullPage: true });
    }

    console.log('Current URL after auth action:', page.url());

  } catch (err) {
    console.error('Error exploring demo site:', err);
  } finally {
    await browser.close();
  }
}

exploreDemoSite();
