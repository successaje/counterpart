import { expect, type Page, test } from '@playwright/test';
import { E2E_TOKEN } from '../playwright.config.js';

/**
 * One owner's session: a request is waiting, they allow it, the release
 * appears with its redactions, the ledger and the case tell the story.
 * The seeded server is fresh per run (see playwright.config.ts).
 */

async function open(page: Page, path = '/') {
  await page.goto(`${path}#token=${E2E_TOKEN}`);
  // The sidebar pill on desktop, the header pill on a phone; one of them is visible.
  await expect(
    page.getByText('live', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
}

test('a request waits, is allowed, and the release shows what was removed', async ({
  page,
  isMobile,
}) => {
  // Every project shares one seeded server, and this test consumes the request.
  test.skip(isMobile, 'the request is allowed once, on desktop');
  await open(page);
  await expect(page.getByRole('heading', { name: '1 request waiting for you' })).toBeVisible();
  await expect(page).toHaveTitle('(1) Counterpart Desk');

  // The card says exactly what will run.
  const card = page.locator('text=sh test.sh --verbose').first();
  await expect(card).toBeVisible();
  await expect(page.getByText('Your decision')).toBeVisible();

  await page.getByRole('button', { name: /Allow once/ }).click();

  // It leaves the inbox and lands in the ledger as released, with redactions.
  await expect(page.getByRole('heading', { name: 'Nothing is waiting for you' })).toBeVisible();
  await expect(page).toHaveTitle('Counterpart Desk');
  await page.goto('/ledger');
  const released = page.getByRole('button', { name: /Command test/ }).first();
  await expect(released).toBeVisible();
  await expect(released.getByText('Released')).toBeVisible();
  if (!isMobile) await expect(released.getByText(/1 secret/)).toBeVisible();

  // Inside the record, the owner can see what stayed on this machine, in place.
  await released.click();
  await page.getByRole('button', { name: 'Show what was removed' }).click();
  await expect(page.getByText('«redacted:secret»').first()).toBeVisible();
  await expect(page.getByText('«redacted:email»').first()).toBeVisible();
});

test('the ledger opens with where every request ended up', async ({ page }) => {
  await open(page, '/ledger');
  await expect(page.getByText('Requests', { exact: true })).toBeVisible();
  await expect(page.getByText('left this machine', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('outside the menu', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Redactions', { exact: true })).toBeVisible();
  // The hostile request was refused and recorded verbatim.
  await page.getByRole('tab', { name: 'Refused' }).click();
  await expect(page.getByText('Outside the menu').first()).toBeVisible();
});

test('a case shows its path and timeline', async ({ page }) => {
  await open(page, '/cases');
  await page.getByRole('link', { name: /cachekit-s3 cannot find/ }).click();
  await expect(page.getByRole('list', { name: 'Case progress' })).toBeVisible();
  await expect(page.getByText('waiting for you').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
  await expect(page.getByText('Case opened')).toBeVisible();
  await expect(page.getByText('Refused something outside the menu').first()).toBeVisible();
});

test('keyboard: ? opens the sheet and g l goes to the ledger', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no keyboard on a phone');
  await open(page);
  await page.keyboard.press('Shift+?');
  await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('g');
  await page.keyboard.press('l');
  await expect(page).toHaveURL(/\/ledger$/);
});

test('a wrong token lands on the Connect screen, not a blank page', async ({ page }) => {
  await page.goto('/#token=not-the-token');
  await expect(page.getByRole('heading', { name: 'Connect to your runner' })).toBeVisible();
});
