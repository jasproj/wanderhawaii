#!/usr/bin/env node
/**
 * Prices-only re-scrape — fetches pages, extracts price only (preserves all other fields)
 * - Skips tours that already have priceConfidence === 'high' from a prior run
 * - Cuts runtime dramatically vs. full re-scrape
 *
 * Run from the repo directory (e.g., ~/repos/wanderhawaii/).
 *
 * Usage:
 *   node rescrape-prices-only.js                  # full pass
 *   node rescrape-prices-only.js --limit 50       # test on first 50
 *   node rescrape-prices-only.js --skip-existing  # skip tours that already have high-confidence prices
 */

const fs = require('fs');
const { chromium } = require('playwright');
const { extract_price } = require('./extract-price-v5');

const INPUT_FILE = 'tours-data.json';
const OUTPUT_FILE = 'tours-data-priced.json';

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1], 10)
  : Infinity;
const SKIP_EXISTING = args.includes('--skip-existing');

const currencyArg = args.find((a, i) => args[i-1] === '--currency');
const CURRENCY = currencyArg || 'USD';
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'NZD'];
if (!VALID_CURRENCIES.includes(CURRENCY)) {
  console.error(`Invalid currency: ${CURRENCY}. Must be one of: ${VALID_CURRENCIES.join(', ')}`);
  process.exit(1);
}
console.log(`Currency: ${CURRENCY}`);

async function main() {
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const tours = Array.isArray(data) ? data : (data.tours || []);

  const targets = tours
    .filter(t => t.url || t.fareharborUrl || t.bookingUrl || t.bookingLink)
    .filter(t => !SKIP_EXISTING || t.priceConfidence !== 'high')
    .slice(0, LIMIT);

  console.log(`Re-scraping prices for ${targets.length} tours...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const stats = { high: 0, medium: 0, low: 0, none: 0, errors: 0 };

  for (let i = 0; i < targets.length; i++) {
    const tour = targets[i];
    const url = tour.url || tour.fareharborUrl || tour.bookingUrl || tour.bookingLink;
    try {
      const page = await context.newPage();
      await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
      await page.waitForSelector('text=/Adults?|Pricing/i', { timeout: 5000 }).catch(() => {});
      const pageText = await page.evaluate(() => document.body.innerText);
      await page.close();

      const { price, priceConfidence, priceLabel } = extract_price(pageText, CURRENCY);
      tour.price = price;
      tour.priceConfidence = priceConfidence;
      tour.priceLabel = priceLabel;
      if (price != null) tour.currency = CURRENCY;

      if (process.env.DEBUG_PRICE) {
        const { CURRENCY_CONFIG } = require('./extract-price-v5');
        const cre = CURRENCY_CONFIG[CURRENCY]?.regex || '\\$';
        const priceMatches = [...pageText.matchAll(new RegExp(`${cre}\\d+`, 'g'))].slice(0, 5).map(m => m[0]).join(',') || 'NONE';
        console.log(`  [debug] ${tour.name?.slice(0,40)} | textLen=${pageText.length} prices=[${priceMatches}] -> price=${price} conf=${priceConfidence}`);
      }

      if (priceConfidence) stats[priceConfidence]++;
      else stats.none++;

      if ((i + 1) % 25 === 0) {
        console.log(`  [${i + 1}/${targets.length}] high:${stats.high} med:${stats.medium} low:${stats.low} none:${stats.none}`);
      }
    } catch (err) {
      stats.errors++;
      tour.priceError = err.message.slice(0, 200);
    }
  }

  await browser.close();

  const finalOutput = Array.isArray(data) ? tours : { ...data, tours };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));

  console.log('\n✓ Re-scrape complete');
  console.log(`  High confidence:   ${stats.high}`);
  console.log(`  Medium confidence: ${stats.medium}`);
  console.log(`  Low confidence:    ${stats.low}`);
  console.log(`  No price found:    ${stats.none}`);
  console.log(`  Errors:            ${stats.errors}`);
  console.log(`\nOutput: ${OUTPUT_FILE}`);
  console.log(`\nNext: spot-check 10 tours, then mv ${OUTPUT_FILE} ${INPUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
