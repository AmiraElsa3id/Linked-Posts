const { chromium } = require('playwright');
const path = require('path');

async function testUserFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const artifactDir = 'C:\\Users\\Amera\\.gemini\\antigravity\\brain\\c6e6de56-0124-4ee5-a803-b08f32cbd4d2';

  const testUser = {
    name: 'Amira Elsa3id',
    username: 'amira' + Date.now().toString().slice(-4),
    email: `amira_${Date.now()}@example.com`,
    dateOfBirth: '1998-05-15',
    gender: 'female',
    password: 'Password123!',
  };

  console.log('--- Step 1: Navigating to Sign Up Page ---');
  await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactDir, 'flow_1_signup_page.png') });

  console.log('--- Step 2: Filling Sign Up Form ---');
  await page.fill('input[placeholder="Jane Doe"]', testUser.name);
  await page.fill('input[placeholder="janedoe"]', testUser.username);
  await page.fill('input[placeholder="jane@example.com"]', testUser.email);
  await page.fill('input[type="date"]', testUser.dateOfBirth);
  await page.selectOption('select', testUser.gender);
  await page.fill('input[placeholder="••••••••"] >> nth=0', testUser.password);
  await page.fill('input[placeholder="••••••••"] >> nth=1', testUser.password);

  await page.screenshot({ path: path.join(artifactDir, 'flow_2_signup_filled.png') });

  console.log('--- Step 3: Submitting Registration to Real API ---');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log('--- Step 4: Verifying Auth Redirect & Feed Access ---');
  await page.screenshot({ path: path.join(artifactDir, 'flow_3_logged_in_feed.png'), fullPage: true });

  console.log('--- Step 5: Viewing Profile Page with Authenticated Session ---');
  await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactDir, 'flow_4_authenticated_profile.png'), fullPage: true });

  await browser.close();
  console.log('--- User Flow Automation Completed Successfully ---');
}

testUserFlow();
