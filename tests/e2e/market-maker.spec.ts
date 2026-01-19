import { test } from '@playwright/test';

test('Market Maker: config enable -> run -> orderbook filled', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Actor ID').fill('mm-1');
  await page.getByLabel('Role').click();
  await page.getByText('ADMIN').click();
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByText('Market Maker Admin').click();
  await page.getByText('Select market').click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Enable' }).click();
  await page.getByLabel('Mid price').fill('1000');
  await page.getByRole('button', { name: 'Set Price' }).click();
  await page.getByRole('button', { name: 'Run' }).click();
});
