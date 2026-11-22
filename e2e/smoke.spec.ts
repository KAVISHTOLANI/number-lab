import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('explore bits, practise hex with a hint, check progress', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1000);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');
  await page.getByRole('link', { name: 'Explore the bits' }).click();
  await page.getByLabel('decimal', { exact: true }).fill('255');
  await expect(page.getByLabel('hexadecimal', { exact: true })).toHaveValue('FF');
  await page.getByRole('button', { name: 'Shift right (÷2)' }).click();
  await expect(page.getByLabel('decimal', { exact: true })).toHaveValue('127');
  await snap(page, 'explore');
  await checkMobile(page);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Practice' }).click();
  await page.getByRole('radio', { name: 'Hex → decimal' }).click();
  await page.getByRole('button', { name: /Hint/ }).click();
  const prompt = (await page.getByTestId('prompt').textContent())!.replace('0x', '');
  await page.getByLabel(/Your answer/).fill(String(parseInt(prompt, 16)));
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Correct!')).toBeVisible();
  await snap(page, 'practice');
  await page.reload();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('table')).toContainText('Hex → decimal');
});
