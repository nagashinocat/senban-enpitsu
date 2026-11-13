# 旋盤で鉛筆を削るゲーム 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホのブラウザで遊べる、回る鉛筆を点線の形に合わせて削る5面構成の3Dゲームを作る。結果カードを共有できるようにする。

**Architecture:** 削りの判定・採点・折れ・面データは、描画に依存しない純粋な JS モジュールにして、vitest でテストする。描画は Three.js の `LatheGeometry` で、輪郭（半径の配列）から毎フレーム形を作り直す。画面の切り替えは `game.js` の状態機械にまとめ、HTML の重ね表示で UI を出す。

**Tech Stack:** Vite、素の JavaScript（ES modules）、Three.js、vitest、Web Audio API、Web Share API

**Spec:** `docs/superpowers/specs/2026-11-13-senban-enpitsu-design.md`（作業者は必ずこれも読むこと）

## Global Constraints
- スマホのブラウザ向け。インストール不要。サーバーなし
- 話は1面あたり1〜2行＋簡単な絵まで
- 削った分は戻らない。削りすぎは削り残しより重く減点
- 削り終わりは「完成」ボタン。制限時間はなし（タイムは点数にだけ効く）
- 折れたらその面はやり直し。先へ進めなくなるのは折れたときだけ（C でも進める）
- 鉛筆は面ごとに新しい1本
- 最終面の顔は、横から見た輪郭が顔に見える回転体
- 結果カード：削った形、目標の点線、ランク、タイム、面の名前、ゲーム名
- 共有は Web Share API（画像付き）。使えない端末では、画像の保存と投稿文のコピー
- 記録は端末内（localStorage）に保存。保存できなくても遊べる
- UI の文言はすべて日本語
- 調整用の数値はすべて `src/config.js` に集める

## Review Focus
1. Web Share が使えない、または `canShare({files})` が false の端末 → 画像の保存と投稿文のコピーに切り替わる（Task 7）
2. localStorage が使えない、または例外を投げる（プライベートモードなど）→ 記録なしで最後まで遊べる（Task 4）
3. 指が画面外に出る、`pointercancel`、2本指で触る → 刃が止まり、削り続けたままにならない（Task 5）
4. 1フレームの間に指が大きく動く → 間の範囲も削れていて飛びがない。折れの判定もその分を数える（Task 1, 2）
5. 何も削らずに「完成」、画面の回転やリサイズ → 点数が NaN にならず低い点が出る。キャンバスが正しく合わせ直される（Task 2, 5）

---

## ファイル構成
```
index.html
package.json / vite.config.js
src/config.js        調整用の定数
src/profile.js       鉛筆の輪郭と削り
src/breakage.js      折れの判定
src/scoring.js       一致率・タイムボーナス・ランク
src/stages.js        5面の目標形と話
src/storage.js       記録の保存（失敗しても落ちない）
src/render/scene.js  Three.js の場面・鉛筆・点線・削りくず
src/input.js         指の操作 → 刃の位置
src/audio.js         削る音・振動
src/share.js         結果カード画像と共有
src/game.js          画面の流れ（状態機械）と UI
src/main.js          起動
src/style.css
tests/*.test.js
```

### Task 1: 下準備と、鉛筆の輪郭・削り

**Files:** Create `package.json`, `vite.config.js`, `index.html`, `src/config.js`, `src/profile.js`, `tests/profile.test.js`

**Interfaces:**
- Produces:
  - `config.js`: `SAMPLES = 200`, `PENCIL_LENGTH = 6`, `PENCIL_RADIUS = 0.4`, `CORE_RADIUS = 0.1`（ほかの定数は後の Task で追加）
  - `createProfile(samples = SAMPLES, length = PENCIL_LENGTH, radius = PENCIL_RADIUS) -> { radii: Float32Array, length, dx }`
  - `xToIndex(profile, x) -> number`（x は 0..length。範囲外は端に丸める）
  - `cutSweep(profile, from: {x, r}, to: {x, r}, halfWidth: number) -> { maxBite: number, biteAt: number, removed: number }`
    - 刃先を from から to へ直線で動かし、その帯にかかる各 i で `radii[i] = min(radii[i], 刃のその位置での半径)` にする。maxBite は1か所で一度に減った最大量、biteAt はその場所。radii は 0 未満にならない

- [ ] **Step 1:** `git init`。`npm i three` と `npm i -D vite vitest` を実行し、`"test": "vitest run"`, `"dev": "vite"`, `"build": "vite build"` を設定する
- [ ] **Step 2: 失敗するテストを書く**（`tests/profile.test.js`）
```js
test('新しい鉛筆はどこも同じ太さ', () => { const p = createProfile(); expect(p.radii.every(r => r === PENCIL_RADIUS)).toBe(true); });
test('刃より内側だけが細くなり、外側は変わらない', () => {
  const p = createProfile(); cutSweep(p, {x:1,r:0.3}, {x:1,r:0.3}, 0.05);
  expect(p.radii[xToIndex(p,1)]).toBeCloseTo(0.3); expect(p.radii[xToIndex(p,3)]).toBe(PENCIL_RADIUS);
});
test('削った分は戻らない', () => {
  const p = createProfile(); cutSweep(p,{x:1,r:0.2},{x:1,r:0.2},0.05); cutSweep(p,{x:1,r:0.35},{x:1,r:0.35},0.05);
  expect(p.radii[xToIndex(p,1)]).toBeCloseTo(0.2);
});
test('大きく動いても間が飛ばない', () => {
  const p = createProfile(); cutSweep(p,{x:0.5,r:0.3},{x:5.5,r:0.3},0.02);
  for (let x = 0.6; x < 5.4; x += 0.05) expect(p.radii[xToIndex(p,x)]).toBeLessThanOrEqual(0.3001);
});
test('半径は0未満にならない、maxBite を返す', () => {
  const p = createProfile(); const r = cutSweep(p,{x:2,r:-1},{x:2,r:-1},0.05);
  expect(Math.min(...p.radii)).toBe(0); expect(r.maxBite).toBeCloseTo(PENCIL_RADIUS);
});
```
- [ ] **Step 3:** `npm test` → FAIL（モジュールがない）
- [ ] **Step 4:** `config.js` と `profile.js` を実装する
- [ ] **Step 5:** `npm test` → PASS
- [ ] **Step 6:** commit `feat: pencil profile and lathe cutting`

### Task 2: 折れ・採点・ランク

**Files:** Create `src/breakage.js`, `src/scoring.js`, `tests/breakage.test.js`, `tests/scoring.test.js`; Modify `src/config.js`

**Interfaces:**
- Consumes: `createProfile`, `cutSweep` の戻り値 `{maxBite, biteAt}`
- Produces:
  - config に追加：`BITE_LIMIT = 0.12`, `OVERCUT_WEIGHT = 2`, `MATCH_TOLERANCE = 0.1`（PENCIL_RADIUS に対する割合）, `TIME_BONUS_MAX = 200`, `RANKS = [['S',1000],['A',850],['B',700],['C',0]]`
  - `isBroken(profile, cut: {maxBite, biteAt}, breakFactor = 1) -> boolean`：削ったあとの `radii[biteAt]` を r とする。`maxBite > BITE_LIMIT * (r / PENCIL_RADIUS) * breakFactor` で折れ。r が 0 なら、削った量が 0 より大きいとき常に折れ（芯を断ち切った）
  - `matchRate(profile, target: Float32Array) -> number`（0..100）：各 i で `e = (radii[i] - target[i]) / PENCIL_RADIUS`。e < 0 なら `|e| * OVERCUT_WEIGHT`、それ以外は `e`。全体の平均を m とし、`100 * clamp(1 - m / MATCH_TOLERANCE, 0, 1)`
  - `timeBonus(seconds, parSeconds) -> number`：`TIME_BONUS_MAX * clamp(1 - seconds / (2 * parSeconds), 0, 1)`
  - `scoreResult(profile, target, seconds, parSeconds) -> { match, bonus, total, rank }`：`total = round(match * 10 + bonus)`

- [ ] **Step 1: 失敗するテストを書く**
```js
// breakage
test('太い所の浅い削りでは折れない', () => { const p=createProfile(); const c=cutSweep(p,{x:2,r:0.35},{x:2,r:0.35},0.05); expect(isBroken(p,c)).toBe(false); });
test('細い所に深く当てると折れる', () => { const p=createProfile(); cutSweep(p,{x:2,r:0.12},{x:2,r:0.12},0.05); const c=cutSweep(p,{x:2,r:0.02},{x:2,r:0.02},0.05); expect(isBroken(p,c)).toBe(true); });
test('同じ削りでも breakFactor が小さいと折れる', () => { /* 同じ削りで breakFactor 1 → false、0.3 → true */ });
// scoring
test('目標とぴったりなら一致率100', () => { const p=createProfile(); expect(matchRate(p, p.radii.slice())).toBe(100); });
test('削りすぎは削り残しより低い', () => { /* 目標0.3に対して 0.25 と 0.35 の一様な輪郭を比べ、0.25 のほうが低い */ });
test('何も削らずに完成しても NaN にならない', () => { const p=createProfile(); const t=new Float32Array(SAMPLES).fill(0.15); const s=scoreResult(p,t,3,30); expect(Number.isFinite(s.total)).toBe(true); expect(s.rank).toBe('C'); });
test('ランクの境目', () => { /* total 1000→S, 999→A, 850→A, 700→B, 699→C を rankOf で確認 */ });
test('タイムボーナスは0..TIME_BONUS_MAX', () => { expect(timeBonus(0,30)).toBe(200); expect(timeBonus(999,30)).toBe(0); });
```
（`rankOf(total) -> 'S'|'A'|'B'|'C'` も `scoring.js` から export する）
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: breakage, scoring and ranks`

### Task 3: 5面の目標形と話

**Files:** Create `src/stages.js`, `tests/stages.test.js`

**Interfaces:**
- Produces: `STAGES: Array<{ id, name, story: string[], shape: (u:number)=>number, parSeconds, breakFactor }>`。`shape(u)` は u = 0..1（鉛筆の左端→右端）を受け取り、PENCIL_RADIUS に対する半径の割合（0..1）を返す。`buildTarget(stage, samples = SAMPLES) -> Float32Array`（実際の半径の配列）
- 面（設計書 §4 の表のとおり）：
  1. `point`「鉛筆の先」：右端 30% が円すいの先、残りはそのまま。parSeconds 20、breakFactor 1.0
  2. `steps`「段つき」：段が2つ。25、1.0
  3. `kokeshi`「こけし」：丸い頭と胴、首のくびれ。35、0.9
  4. `chess`「チェスの駒」：台座・深いくびれ・頭。40、0.7
  5. `face`「試験官の顔」：横から見た輪郭が額・鼻・唇・あごに見える。45、0.5
- 話（`story` の1〜2行。文言は作業者が整えてよい）：
  1. 「試験の朝。鉛筆削りを忘れた。」「…家に旋盤があってよかった。」
  2. 「削りすぎて短くなった。」「段をつけて長く見せよう。」
  3. 「先生に見つかった。」「『工作の課題です』と言い張るしかない。」
  4. 「工作にしては尖りすぎだと言われた。」「『美術部の作品です』」
  5. 「試験会場。試験官がこちらを見ている。」「…試験官を彫るしかない。」
- 導入とエンディングの文言は `INTRO: string[]`, `ENDING: string[]` として同じファイルに置く

- [ ] **Step 1: 失敗するテストを書く**
```js
test('5面ある', () => expect(STAGES).toHaveLength(5));
test('どの目標も芯より太く、元の鉛筆より細い', () => { for (const s of STAGES) { const t=buildTarget(s); for (const r of t) { expect(r).toBeGreaterThanOrEqual(CORE_RADIUS*0.5); expect(r).toBeLessThanOrEqual(PENCIL_RADIUS); } } });
test('後の面ほど折れやすい', () => { for (let i=1;i<5;i++) expect(STAGES[i].breakFactor).toBeLessThanOrEqual(STAGES[i-1].breakFactor); });
test('顔の面には凹凸が3つ以上ある', () => { /* buildTarget(STAGES[4]) の極小値の数 >= 3 */ });
test('どの面の話も1〜2行', () => { for (const s of STAGES) { expect(s.story.length).toBeGreaterThanOrEqual(1); expect(s.story.length).toBeLessThanOrEqual(2); } });
```
（1面目の円すいの先だけは、先端で CORE_RADIUS*0.5 まで細くなってよい）
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する（形はなめらかな区分関数で作る）
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** commit `feat: five stages with targets and story`

### Task 4: 記録の保存

**Files:** Create `src/storage.js`, `tests/storage.test.js`

**Interfaces:**
- Produces: `loadRecords() -> { [stageId]: { bestRank, bestTotal, bestSeconds } }`, `saveResult(stageId, { total, rank, seconds }) -> records`（最高点と最速タイムをそれぞれ更新）, `clearedStageIds() -> Set<string>`。キーは `'senban-enpitsu:v1'`。読み書きはすべて try/catch で囲み、失敗したらメモリ上の値で続ける

- [ ] **Step 1: 失敗するテストを書く**（vitest の環境は `jsdom`）
```js
test('保存して読める', ...); test('良い方だけ残る', /* 低い点や遅いタイムでは更新しない */);
test('localStorage が例外を投げても落ちない', () => { vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')}); expect(()=>saveResult('point',{total:900,rank:'A',seconds:10})).not.toThrow(); expect(loadRecords().point.bestTotal).toBe(900); });
test('壊れた JSON が入っていても空として読む', ...);
```
- [ ] **Step 2:** FAIL → **Step 3:** 実装（`npm i -D jsdom`）→ **Step 4:** PASS → **Step 5:** commit `feat: local records`

### Task 5: 3D表示と指の操作

**Files:** Create `src/render/scene.js`, `src/input.js`, `tests/input.test.js`

**Interfaces:**
- Consumes: profile、`buildTarget` の配列
- Produces:
  - `createScene(canvas) -> { setProfile(profile), setTarget(target), setTool({x, r}), emitChips(x, amount), flashBreak(), resize(), render(dt), snapshot(): HTMLCanvasElement, dispose() }`
    - 鉛筆：`LatheGeometry`。木の色。半径が CORE_RADIUS 以下の所は芯の黒。毎フレーム回転させる（見た目だけ）
    - 点線：鉛筆の上下の輪郭線を `LineDashedMaterial` で表示
    - 削りくず：簡単な粒子。`emitChips` の量に比例して出す
    - カメラは真横から、鉛筆全体が画面幅に収まるように合わせる。`resize()` は `window.resize` と `orientationchange` で呼ぶ
  - `screenToTool(px, py, rect, view) -> {x, r}`（純粋関数。画面の座標を鉛筆の x と刃先の半径に変える。view = カメラが映している範囲 `{xMin, xMax, yMin, yMax}`）
  - `attachInput(canvas, mapFn, { onMove({x, r}), onStart(), onEnd() }) -> detach()`：Pointer Events。最初の1本の指だけを使う。`pointerup`、`pointercancel`、`pointerleave`、2本目の指で onEnd。`touch-action: none`

- [ ] **Step 1: 失敗するテストを書く**
```js
test('画面中央は鉛筆の中央・軸の高さ', () => { const v={xMin:0,xMax:6,yMin:-1,yMax:1}; const t=screenToTool(50,50,{left:0,top:0,width:100,height:100},v); expect(t.x).toBeCloseTo(3); expect(t.r).toBeCloseTo(0); });
test('下に行くほど r は大きく（刃は外側）なる', ...);
test('pointercancel で onEnd が呼ばれる', /* jsdom で PointerEvent を dispatch */);
test('2本目の指で onEnd が呼ばれ、以後 onMove しない', ...);
```
（刃は鉛筆の下側にある。刃の y = -r）
- [ ] **Step 2:** FAIL → **Step 3:** 実装 → **Step 4:** PASS
- [ ] **Step 5:** 動作確認：`src/main.js` の仮の画面で鉛筆・点線・刃を出し、`npm run dev` で開く。指（マウス）でなぞると削れる。Playwright（`npx playwright screenshot --viewport-size=390,844`）でスクリーンショットを撮り、鉛筆と点線が画面に収まっていることを見る
- [ ] **Step 6:** commit `feat: three.js lathe scene and touch input`

### Task 6: 画面の流れ・UI・音

**Files:** Create `src/game.js`, `src/audio.js`, `src/style.css`; Modify `src/main.js`, `index.html`

**Interfaces:**
- Consumes: Task 1〜5 のすべて
- Produces:
  - `createGame(root) -> { start() }`。状態：`title → intro → story(i) → cutting(i) → result(i) → story(i+1) … → ending`、`title → select → story(i)`、`cutting(i) --折れ--> broken(i) → cutting(i)`（新しい鉛筆で、タイムも最初から）
  - cutting 中：入力の onMove ごとに、前の刃の位置から今の位置まで `cutSweep` → `isBroken(..., stage.breakFactor)` → 折れたら broken。削った量があれば `emitChips` と音。画面に一致率（今の値）と経過時間を出し、「完成」ボタンを置く
  - 「完成」で `scoreResult` → `saveResult` → result 画面（ランク・一致率・タイム・ボーナス、「共有」「次へ」「もう一度」）。C でも「次へ」を出す
  - story 画面：話の1〜2行と、簡単な絵を出す。絵はその面の目標形のシルエットに、一言の吹き出しを添える程度にする。タップで cutting へ進む
  - タイトルに「つづきから / 面をえらぶ」。選べるのは `clearedStageIds()` の面と、その次の面
  - `audio.js`：`startCutSound()`, `setCutIntensity(0..1)`, `stopCutSound()`, `playBreak()`, `vibrate(ms)`。Web Audio のノイズ＋バンドパスで削る音を作る。最初のタップで AudioContext を作り直す。`navigator.vibrate` がなければ何もしない
- [ ] **Step 1:** 実装する（この Task は画面のつながりが中心なので、自動テストは状態の遷移だけにする）
- [ ] **Step 2: テストを書く**（`tests/game.test.js`。描画・音はモックにする）：「C ランクでも次の面へ進める」「折れたら同じ面の cutting に戻り、輪郭が新品になる」「最終面の result の次は ending」
- [ ] **Step 3:** `npm test` → PASS
- [ ] **Step 4:** 動作確認：`npm run dev` で、タイトルからエンディングまで通して遊ぶ。Playwright で各画面のスクリーンショットを撮って見る（390×844 の縦向きと、844×390 の横向き）
- [ ] **Step 5:** commit `feat: game flow, UI and sound`

### Task 7: 結果カードと共有

**Files:** Create `src/share.js`, `tests/share.test.js`; Modify `src/game.js`

**Interfaces:**
- Consumes: `scene.snapshot()`、`scoreResult` の結果、stage
- Produces:
  - `buildShareText({ stageName, rank, total, seconds }) -> string`：例「【旋盤で鉛筆を削る】こけし ランクA（912点・28.4秒）」＋ハッシュタグ `#旋盤で鉛筆を削る`
  - `drawResultCard(canvas2d, { image, target, profile, stageName, rank, total, seconds }) -> void`：1080×1080。削った形の絵、目標の点線、ランク（大きく）、タイム、面の名前、ゲーム名
  - `shareResult(blob, text) -> Promise<'shared'|'fallback'|'cancelled'>`：`navigator.canShare?.({files:[file]})` が true なら `navigator.share({files, text})`。AbortError なら 'cancelled'。それ以外の場合、または share が失敗した場合は、画像をダウンロード（`<a download>`）し、`navigator.clipboard?.writeText(text)` を試して 'fallback' を返す。fallback のときは画面に「画像を保存しました。投稿文をコピーしました」と出す（コピーに失敗したら投稿文を選べる形で表示する）
- [ ] **Step 1: 失敗するテストを書く**
```js
test('投稿文に面の名前・ランク・タイムが入る', ...);
test('canShare がない端末では fallback', async () => { /* navigator.share/canShare を undefined にして 'fallback'、ダウンロードが呼ばれる */ });
test('canShare が false なら fallback', ...);
test('ユーザーが取り消したら cancelled で、ダウンロードしない', ...);
test('clipboard がなくても落ちない', ...);
```
- [ ] **Step 2:** FAIL → **Step 3:** 実装し、result 画面の「共有」につなぐ → **Step 4:** PASS
- [ ] **Step 5:** commit `feat: result card and share with fallback`

### Task 8: 仕上げの確認

- [ ] **Step 1:** `npm test` → すべて PASS
- [ ] **Step 2:** `npm run build` → エラーなし。`dist/` の JS が gzip で 300KB 未満（`gzip -c dist/assets/*.js | wc -c`）
- [ ] **Step 3:** `npx vite preview` を開き、Playwright のスマホ表示（iPhone 相当）で最後まで遊ぶ。Review Focus の1〜5を手で確かめる（share を消した状態、localStorage を例外にした状態、指を画面外へ出す、速くなぞる、何も削らずに完成・回転）
- [ ] **Step 4:** commit `chore: final verification`
