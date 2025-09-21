// Optional Playwright e2e smoke test (run locally with: npx playwright test)
// Requires Playwright dev dependency; not executed by default in this repo.
import { test, expect } from '@playwright/test';

test.skip('View live opens public page', async ({ page }) => {
  await page.goto('http://localhost:3010/admin');
  await page.getByRole('link', { name: /Chatbot Builder/i }).click();
  // Create new bot route may differ; adjust as needed
  const unique = `smoke-bot-${Date.now()}`;
  await page.getByLabel('Name').fill(unique);
  await page.getByRole('button', { name: /View live chatbot/i }).click();
  await page.waitForURL(/\/c\//);
  await expect(page).toHaveURL(/\/c\//);
});

