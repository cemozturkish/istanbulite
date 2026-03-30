#!/usr/bin/env node
// Usage: node screenshot.js <html-file> [output.png] [width] [height]

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

async function screenshot(htmlFile, outputFile, width = 1440, height = 900) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height });

  // Read the HTML, strip auth and external scripts for screenshot
  let html = fs.readFileSync(path.resolve(htmlFile), 'utf-8');

  // Remove Supabase SDK script tag (causes timeout when network unavailable)
  html = html.replace(/<script\s+src="https:\/\/cdn\.jsdelivr\.net[^"]*"><\/script>/g, '');

  // Remove entire <script> blocks that contain auth/redirect logic
  // but keep ones that build UI (games, etc)
  html = html.replace(/window\.location\.href\s*=\s*['"]index\.html['"]/g, '/* redirect disabled */');
  html = html.replace(/window\.location\.href\s*=\s*['"][^'"]*['"]/g, '/* redirect disabled */');

  // Hide login overlays
  html = html.replace(/id="login-overlay"/, 'id="login-overlay" style="display:none !important"');
  html = html.replace(/id="access-screen"/, 'id="access-screen" style="display:none !important"');

  // Show main site / admin panel
  html = html.replace(/id="main-site"/, 'id="main-site" class="active"');
  html = html.replace(/id="admin-panel"/, 'id="admin-panel" style="display:flex !important"');

  const tmpFile = path.join(os.tmpdir(), `screenshot-${path.basename(htmlFile)}`);
  fs.writeFileSync(tmpFile, html);

  try {
    await page.goto(`file://${tmpFile}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
  } catch(e) {
    // Still take screenshot even if timeout
  }

  // Wait for rendering
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: outputFile, fullPage: false });
  await browser.close();

  // Clean up
  try { fs.unlinkSync(tmpFile); } catch(e) {}

  console.log(`Screenshot saved: ${outputFile} (${width}x${height})`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node screenshot.js <html-file> [output.png] [width] [height]');
  process.exit(1);
}

const htmlFile = args[0];
const outputFile = args[1] || '/tmp/screenshot.png';
const width = parseInt(args[2]) || 1440;
const height = parseInt(args[3]) || 900;

screenshot(htmlFile, outputFile, width, height).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
