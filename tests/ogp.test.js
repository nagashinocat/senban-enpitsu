import { test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const meta = (attr, key) => new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`).exec(html)?.[1];

test('ページの題名が新しい名前', () => expect(html).toContain('<title>鉛筆削りがなかった僕は、旋盤で削ることにした。</title>'));
test('リンクを貼ると画像つきで出る（OGP・X のカード）', () => {
  expect(meta('property', 'og:title')).toBe('鉛筆削りがなかった僕は、旋盤で削ることにした。');
  expect(meta('property', 'og:image')).toBe('https://nagashinocat.github.io/senban-enpitsu/ogp.png');
  expect(meta('property', 'og:url')).toBe('https://nagashinocat.github.io/senban-enpitsu/');
  expect(meta('property', 'og:description')).toBeTruthy();
  expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  expect(existsSync(new URL('../public/ogp.png', import.meta.url))).toBe(true);
});
test('GitHub Pages に公開する手順がある', () => {
  const wf = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  expect(wf).toContain('actions/deploy-pages'); expect(wf).toContain('npm test'); expect(wf).toContain('path: dist');
});
