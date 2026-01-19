import { test } from '@playwright/test';

test('Trader: market order place -> open orders/trades visible', async ({ page }) => {
  await page.goto('http://localhost:5174/login');
  await page.getByLabel('Actor ID').fill('trader-1');
  await page.getByLabel('Role').click();
  await page.getByText('TRADER').click();
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByText('Market Selector');
  await page.getByRole('combobox').first().click();
  await page.getByRole('option').first().click();

  await page.getByLabel('Trader ID').fill('trader-1');
  await page.getByLabel('Side').click();
  await page.getByText('BUY').click();
  await page.getByLabel('Type').click();
  await page.getByText('MARKET').click();
  await page.getByLabel('Quantity').fill('10');
  await page.getByLabel('TIF').click();
  await page.getByText('IOC').click();
  await page.getByRole('button', { name: 'Submit' }).click();
});
