import puppeteer from 'puppeteer-core';
const [url, out] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--no-proxy-server'] });
const p = await b.newPage(); await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => document.title === 'ready', { timeout: 20000 });
await (await p.$('#og')).screenshot({ path: out }); await b.close();
