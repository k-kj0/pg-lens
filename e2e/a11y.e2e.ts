import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const scheme of ['light', 'dark'] as const) {
  for (const state of ['empty', 'with results'] as const) {
    test(`no WCAG 2.2 AA violations: ${state}, ${scheme} theme`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme });
      const page = await context.newPage();
      await page.goto('/');
      if (state === 'with results') {
        await page.getByRole('button', { name: 'Load sample data' }).click();
        await expect(page.getByRole('table')).toBeVisible();
      }
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(results.violations).toEqual([]);
      await context.close();
    });
  }
}

test('keyboard: can load the sample and reach the results table without a mouse', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load sample data' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Show').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Show')).toBeFocused();
});
