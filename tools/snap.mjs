import puppeteer from 'puppeteer-core';
const [url, out, w, h] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--no-proxy-server'] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => document.title === 'ready', { timeout: 15000 });
await p.screenshot({ path: out }); await b.close();
