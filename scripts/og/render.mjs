#!/usr/bin/env node
/**
 * Renders the social image (1200×630) from scripts/og/og.html with the
 * Chromium that Playwright installed for the Desk's end-to-end tests.
 *
 *   node scripts/og/render.mjs            → apps/web/public/og.png
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../apps/desk/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const root = new URL('../..', import.meta.url).pathname;
const out = path.join(root, 'apps/web/public/og.png');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${path.join(root, 'scripts/og/og.html')}`);
await page.waitForTimeout(300);
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`wrote ${path.relative(root, out)}`);
