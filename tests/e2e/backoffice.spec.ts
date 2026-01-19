import { test } from '@playwright/test';

test('Backoffice: asset create -> approve -> token create -> activate', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Actor ID').fill('issuer-1');
  await page.getByLabel('Role').click();
  await page.getByText('ISSUER').click();
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByText('Asset Management').click();
  await page.getByLabel('Type').click();
  await page.getByText('Bond').click();
  await page.getByLabel('Issuer ID').fill('issuer-1');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.evaluate(() => {
    localStorage.setItem('tokenizasyon.actorRole', 'OPS');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Submit Review' }).first().click();
  await page.getByRole('button', { name: 'Approve' }).first().click();

  await page.evaluate(() => {
    localStorage.setItem('tokenizasyon.actorRole', 'ISSUER');
  });
  await page.getByText('Token Management').click();
  await page.getByLabel('Approved Asset').click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Symbol').fill('BND');
  await page.getByLabel('Name').fill('Bond Token');
  await page.getByRole('button', { name: 'Create Token' }).click();

  await page.evaluate(() => {
    localStorage.setItem('tokenizasyon.actorRole', 'OPS');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Activate' }).first().click();
});
