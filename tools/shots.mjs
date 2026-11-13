// 画面を通して遊び、各画面のスクリーンショットを撮る： node tools/shots.mjs URL OUTDIR WIDTH HEIGHT
import puppeteer from 'puppeteer-core';
const [url, out, W = '390', H = '844'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-proxy-server', '--disable-background-networking'] });
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'load' });
const shot = async (n) => { await new Promise((r) => setTimeout(r, 300)); await page.screenshot({ path: `${out}/${n}.png` }); };
const click = async (sel) => { await page.click(sel); await new Promise((r) => setTimeout(r, 150)); };
await shot('01-title');
await click('[data-act="new"]'); await shot('02-intro');
await click('[data-act="tap"]'); await shot('03-story');
await click('button[data-act="cut"]');
// 刃を動かして削る：右へ寄せてから少しずつ上へ
const w = +W, h = +H;
await page.mouse.move(w * 0.5, h * 0.7); await page.mouse.down();
await page.mouse.move(w * 0.85, h * 0.7, { steps: 10 });
let y = h * 0.7, x = w * 0.85;
for (let pass = 0; pass < 3; pass++) {
  for (let k = 0; k < 8; k++) { y -= 2; await page.mouse.move(x, y, { steps: 2 }); }
  for (let k = 0; k < 40; k++) { x += pass % 2 ? 2 : -2; await page.mouse.move(x, y, { steps: 2 }); }
}
await page.mouse.up();
await shot('04-cutting');
await click('[data-act="finish"]'); await new Promise((r) => setTimeout(r, 600)); await shot('05a-rolling'); await new Promise((r) => setTimeout(r, 5000)); await shot('05-result');
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: out });
await click('[data-act="share"]'); await new Promise((r) => setTimeout(r, 1500));
console.log('share msg:', await page.$eval('[data-share-msg]', (e) => e.textContent));
// 折れ：一気に深く
await click('[data-act="next"]'); await click('button[data-act="cut"]');
await page.mouse.move(w * 0.5, h * 0.9); await page.mouse.down(); await page.mouse.move(w * 0.5, h * 0.89); await page.mouse.move(w * 0.5, 0); await page.mouse.up();
await shot('06-broken');
const state = await page.evaluate(() => document.querySelector('.boom') ? 'broken' : 'not-broken');
console.log('break:', state, 'errors:', JSON.stringify(errors));
await browser.close();
