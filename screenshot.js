#!/usr/bin/env node
// Usage: node screenshot.js <html-file> [output.png] [width] [height]
// Example: node screenshot.js sozcel.html /tmp/sozcel.png 1440 900

const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

async function screenshot(htmlFile, outputFile, width = 1440, height = 900) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize
    ? page.setViewportSize({ width, height })
    : page.setViewport({ width, height });

  const filePath = path.resolve(htmlFile);
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
    // networkidle0 may timeout if supabase SDK keeps connections; fall back
    return page.goto(`file://${filePath}`, { waitUntil: 'load' });
  });

  // Wait a moment for any JS rendering
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: outputFile, fullPage: false });
  await browser.close();

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
