import puppeteer from 'puppeteer-core';
const [url, out, h] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--no-proxy-server','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 840, height: +h || 680 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => document.title === 'ready', { timeout: 30000 });
await p.screenshot({ path: out }); console.log(errs); await b.close();
