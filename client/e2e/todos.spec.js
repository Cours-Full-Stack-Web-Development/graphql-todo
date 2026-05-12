import { expect, test } from '@playwright/test';

test('manages todos from the browser', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('No todos yet.')).toBeVisible();

  await page.getByLabel('Todo name').fill('Write end-to-end tests');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('Write end-to-end tests')).toBeVisible();
  await expect(page.getByText('Open')).toBeVisible();

  await page.getByText('Write end-to-end tests').click();

  await expect(page.getByText('Resolved')).toBeVisible();

  await page.getByLabel('Delete todo').click();

  await expect(page.getByText('No todos yet.')).toBeVisible();
});
