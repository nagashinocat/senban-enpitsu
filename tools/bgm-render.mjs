import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const [url, outDir] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--no-proxy-server'] });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => document.title === 'ready');
const res = await p.evaluate(() => window.renderAll());
for (const [k, v] of Object.entries(res)) { writeFileSync(`${outDir}/${k}.wav`, Buffer.from(v.b64, 'base64')); console.log(k, 'peak', v.peak.toFixed(3)); }
await b.close();
