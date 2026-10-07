const { chromium } = require('playwright');
const path = require('path');

async function captureDemoPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';
  const testEmail = `route_demo_${Date.now()}@example.com`;
  const testUsername = `user${Date.now().toString().slice(-4)}`;

  try {
    await page.goto('https://route-posts.routemisr.com/demo/#/auth', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);

    const inputs = await page.$$('input');
    await inputs[0].fill('Amira Elsa3id');
    await inputs[1].fill(testUsername);
    await inputs[2].fill(testEmail);
    
    const select = await page.$('select');
    if (select) await select.selectOption({ index: 1 });

    await inputs[3].fill('1998-05-15');
    await page.fill('input[type="password"] >> nth=0', 'Password123!');
    await page.fill('input[type="password"] >> nth=1', 'Password123!');

    await page.click('button:has-text("Create New Account")');
    await page.waitForTimeout(3000);

    // Profile Page
    console.log('Navigating to Demo Profile...');
    await page.click('a:has-text("Profile"), button:has-text("Profile")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_profile_logged.png'), fullPage: true });

    // Notifications Page
    console.log('Navigating to Demo Notifications...');
    await page.click('a:has-text("Notifications"), button:has-text("Notifications")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_notifications.png'), fullPage: true });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

captureDemoPages();
