import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-proxy-server'] });
const p = await b.newPage(); await p.setViewport({ width: 844, height: 390 });
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await p.click('[data-act="new"]'); await p.click('[data-act="tap"]'); await p.click('button[data-act="cut"]'); await p.click('[data-act="finish"]');
await p.click('.score-board'); await new Promise((r) => setTimeout(r, 1500));
await p.screenshot({ path: '/tmp/land-result.png' }); await b.close();
