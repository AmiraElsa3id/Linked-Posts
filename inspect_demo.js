const { chromium } = require('playwright');
const path = require('path');

async function inspectDemoSite() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  try {
    console.log('1. Navigating to Demo Auth Page...');
    await page.goto('https://route-posts.routemisr.com/demo/#/auth', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_auth.png'), fullPage: true });

    console.log('2. Inspecting demo page links & structure...');
    const content = await page.content();
    console.log('Page title:', await page.title());

    // Try navigating to home/feed or other routes on demo site
    console.log('3. Navigating to Demo Feed...');
    await page.goto('https://route-posts.routemisr.com/demo/#/home', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_home.png'), fullPage: true });

    console.log('4. Navigating to Demo Profile...');
    await page.goto('https://route-posts.routemisr.com/demo/#/profile', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(artifactDir, 'demo_ref_profile.png'), fullPage: true });

  } catch (err) {
    console.error('Demo inspection error:', err);
  } finally {
    await browser.close();
  }
}

inspectDemoSite();
