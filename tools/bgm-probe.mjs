// スマホ（タッチ）で開いたとき、BGM の AudioContext が動いて音を出しているかを調べる
import puppeteer, { KnownDevices } from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-proxy-server','--autoplay-policy=user-gesture-required'] });
const p = await b.newPage(); await p.emulate(KnownDevices['iPhone 13']);
await p.evaluateOnNewDocument(() => {
  window.__ac = []; const AC = window.AudioContext;
  window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ac.push(this); this.__starts = 0;
    const co = this.createOscillator.bind(this); this.createOscillator = () => { const o = co(); const s = o.start.bind(o); o.start = (...x) => { this.__starts++; return s(...x); }; return o; }; } };
});
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
const report = (label) => p.evaluate((l) => l + ': ' + JSON.stringify(window.__ac.map((c) => ({ state: c.state, starts: c.__starts, t: +c.currentTime.toFixed(2) }))), label);
await new Promise((r) => setTimeout(r, 500)); console.log(await report('before tap'));
await p.tap('[data-act="new"]'); await new Promise((r) => setTimeout(r, 1500)); console.log(await report('after 1st tap'));
await p.tap('[data-act="tap"]'); await new Promise((r) => setTimeout(r, 1500)); console.log(await report('after 2nd tap'));
await b.close();
