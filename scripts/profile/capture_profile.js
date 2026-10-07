// Captures the Route Posts demo profile page and this app's profile page side by side.
// Usage: node capture_profile.js [demo|local|both] [light|dark]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EMAIL = process.env.RP_EMAIL || 'notiftest777529477@example.com';
const PASSWORD = process.env.RP_PASSWORD || 'Password123!';
const OUT_DIR = path.join(__dirname, 'screenshots');
const target = process.argv[2] || 'both';
const theme = process.argv[3] || 'light';

async function signIn() {
  const res = await fetch('https://route-posts.routemisr.com/users/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Sign in failed');
  return data.data;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { token, user } = await signIn();
  const browser = await chromium.launch({ headless: true });

  try {
    if (target === 'demo' || target === 'both') {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto('https://route-posts.routemisr.com/demo/#/auth');
      await page.evaluate((t) => {
        localStorage.setItem('route_posts_token', t);
        location.hash = '#/profile';
      }, token);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('text=Route Posts member');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, 'demo_profile.png'), fullPage: true });
      await page.close();
    }

    if (target === 'local' || target === 'both') {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto('http://localhost:3000/auth');
      await page.evaluate(
        ({ t, u, th }) => {
          localStorage.setItem('auth_token', t);
          localStorage.setItem('auth_user', JSON.stringify(u));
          localStorage.setItem('app_theme', th);
        },
        { t: token, u: user, th: theme }
      );
      await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' });
      await page.waitForSelector('text=Route Posts member');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, `local_profile_${theme}.png`), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('Saved screenshots to', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
