import { createProfile, cutSweep } from './profile.js';
import { isBroken } from './breakage.js';
import { matchRate, scoreResult } from './scoring.js';
import { STAGES, INTRO, ENDING, buildTarget, tipStartIndex } from './stages.js';
import { screenToTool } from './input.js';
import { drawSilhouette } from './silhouette.js';
import { saveResult, loadRecords, clearedStageIds } from './storage.js';
import { PENCIL_LENGTH, DEPTH_GAIN, TOOL_HALF_WIDTH, TOOL_REST_R } from './config.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createGame(root, canvas, deps) {
  const { createScene, attachInput, audio, share } = deps;
  const now = deps.now || (() => performance.now());
  const raf = deps.raf || ((f) => requestAnimationFrame(f));
  const scene = createScene(canvas);

  const g = {
    state: { name: 'title', stage: 0 },
    profile: createProfile(),
    target: null,
    tool: { x: PENCIL_LENGTH / 2, r: TOOL_REST_R },
    lastResult: null,
  };
  let ref = null, startedAt = 0, liveMatch = 0, cutLevel = 0, tipFrom = 0;

  function freshPencil() {
    g.profile = createProfile();
    g.tool = { x: PENCIL_LENGTH / 2, r: TOOL_REST_R };
    scene.setProfile(g.profile); scene.setTool(g.tool);
  }

  // --- 状態の切り替え ---
  g.goto = (name, stage = g.state.stage) => {
    audio.stopCutSound();
    g.state = { name, stage };
    scene.setZoom(name === 'cutting');
    const tipX = () => tipStartIndex(STAGES[stage]) * g.profile.dx;
    if (name === 'cutting') {
      freshPencil();
      tipFrom = tipStartIndex(STAGES[stage]);
      scene.setFocus(tipX());
      g.target = buildTarget(STAGES[stage]);
      scene.setTarget(g.target);
      startedAt = now(); liveMatch = matchRate(g.profile, g.target, tipFrom); ref = null;
      g.tool = { x: tipX() + (PENCIL_LENGTH - tipX()) / 2, r: TOOL_REST_R }; scene.setTool(g.tool);
    } else if (name === 'story') {
      freshPencil(); scene.setFocus(tipX()); scene.setTarget(buildTarget(STAGES[stage]));
    } else if (name === 'title' || name === 'intro' || name === 'select' || name === 'ending') {
      freshPencil(); scene.setFocus(0); scene.setTarget(null);
    }
    render();
  };
  g.start = () => g.goto('title', 0);
  g.newGame = () => g.goto('intro', 0);
  g.continueGame = () => {
    const un = g.unlockedStages();
    g.goto('story', un[un.length - 1]);
  };
  g.finish = () => {
    if (g.state.name !== 'cutting') return;
    const seconds = (now() - startedAt) / 1000;
    const stage = STAGES[g.state.stage];
    const s = scoreResult(g.profile, g.target, seconds, stage.parSeconds, tipFrom);
    g.lastResult = { ...s, seconds, stageId: stage.id, stageName: stage.name };
    saveResult(stage.id, { total: s.total, rank: s.rank, seconds });
    audio.playDing(); audio.vibrate(30);
    g.goto('result');
  };
  g.next = () => {
    const i = g.state.stage;
    if (i >= STAGES.length - 1) g.goto('ending', i); else g.goto('story', i + 1);
  };
  g.retry = () => g.goto('cutting', g.state.stage);
  let sharing = false;
  g.onShare = async () => {
    if (!share || !g.lastResult || sharing) return;
    sharing = true;
    const r = g.lastResult;
    const msg = root.querySelector('[data-share-msg]');
    const text = share.buildShareText(r);
    try {
      const blob = await share.makeResultBlob({ image: scene.snapshot(), target: g.target, profile: g.profile, from: Math.max(0, tipFrom - 12), ...r });
      if (!blob) { if (msg) msg.textContent = `画像を作れませんでした。投稿文はこちら：\n${text}`; return; }
      const info = {};
      const res = await share.shareResult(blob, text, info);
      if (res === 'fallback') {
        // ダウンロードが使えない環境もあるので、カードを画面にも出して長押しで保存できるようにする
        const box = root.querySelector('[data-share-img]');
        if (box) {
          box.innerHTML = '';
          const img = document.createElement('img');
          try { img.src = URL.createObjectURL(blob); } catch { /* 表示できなくても続ける */ }
          img.alt = '結果カード'; box.appendChild(img);
        }
        if (msg) msg.textContent = info.copied ? '投稿文をコピーしました。画像は長押しで保存できます。' : `画像は長押しで保存できます。投稿文はこちら：\n${text}`;
      }
    } catch {
      if (msg) msg.textContent = `共有できませんでした。投稿文はこちら：\n${text}`;
    } finally { sharing = false; }
  };
  g.unlockedStages = () => {
    const cleared = clearedStageIds();
    const out = [];
    for (let i = 0; i < STAGES.length; i++) {
      if (i === 0 || cleared.has(STAGES[i - 1].id) || cleared.has(STAGES[i].id)) out.push(i);
    }
    return out;
  };

  // --- 操作：指の動きの差分で刃を動かす（深さは細かく） ---
  g.handleStart = () => {
    ref = null; audio.unlock();
    if (g.state.name === 'cutting') { audio.startCutSound(); root.querySelector('.hud-hint')?.remove(); }
  };
  g.handleEnd = () => { ref = null; cutLevel = 0; audio.setCutIntensity(0); };
  g.handleMove = (p) => {
    if (g.state.name !== 'cutting') return;
    if (!ref) { ref = p; return; }
    const from = { ...g.tool };
    const nx = Math.max(0, Math.min(PENCIL_LENGTH, g.tool.x + (p.x - ref.x)));
    const nr = Math.max(0, Math.min(TOOL_REST_R * 2, g.tool.r + (p.r - ref.r) * DEPTH_GAIN));
    ref = p;
    g.tool = { x: nx, r: nr };
    scene.setTool(g.tool);
    const cut = cutSweep(g.profile, from, g.tool, TOOL_HALF_WIDTH);
    if (cut.removed > 0) {
      scene.markDirty(); scene.emitChips(g.tool.x, cut.removed);
      cutLevel = Math.min(1, cutLevel + cut.removed * 3);
      audio.setCutIntensity(cutLevel);
      if (isBroken(g.profile, cut, STAGES[g.state.stage].breakFactor)) {
        scene.flashBreak(); audio.stopCutSound(); audio.playBreak(); audio.vibrate([80, 40, 120]);
        g.goto('broken');
        return;
      }
      liveMatch = matchRate(g.profile, g.target, tipFrom);
      updateHud();
    }
  };

  // --- 画面（HTML の重ね表示） ---
  let hud = null;
  function updateHud() {
    if (!hud) return;
    hud.querySelector('[data-match]').textContent = `${liveMatch.toFixed(1)}%`;
    hud.querySelector('[data-time]').textContent = `${((now() - startedAt) / 1000).toFixed(1)}秒`;
  }
  function on(sel, fn) { root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); audio.unlock(); fn(e); })); }

  function render() {
    const { name, stage } = g.state;
    const st = STAGES[stage];
    hud = null;
    let html = '';
    if (name === 'title') {
      const hasSave = Object.keys(loadRecords()).length > 0;
      html = `<div class="panel center">
        <div class="kicker">鉛筆削りを忘れたので</div>
        <h1>旋盤で<br>鉛筆を削る</h1>
        <button class="btn primary" data-act="new">はじめから</button>
        ${hasSave ? '<button class="btn" data-act="cont">つづきから</button><button class="btn" data-act="select">面をえらぶ</button>' : ''}
      </div>`;
    } else if (name === 'intro') {
      html = `<div class="panel center tap" data-act="tap">${INTRO.map((l) => `<p class="line">${esc(l)}</p>`).join('')}<div class="hint">タップで進む</div></div>`;
    } else if (name === 'select') {
      const rec = loadRecords(); const un = g.unlockedStages();
      html = `<div class="panel center"><h2>面をえらぶ</h2><div class="list">${STAGES.map((s, i) => {
        const r = rec[s.id]; const ok = un.includes(i);
        return `<button class="btn row" data-stage="${i}" ${ok ? '' : 'disabled'}><span>${i + 1}. ${ok ? esc(s.name) : '？？？'}</span><b>${r ? r.bestRank : ''}</b></button>`;
      }).join('')}</div><button class="btn ghost" data-act="title">もどる</button></div>`;
    } else if (name === 'story') {
      html = `<div class="panel center tap" data-act="cut">
        <div class="kicker">第${stage + 1}面</div><h2>${esc(st.name)}</h2>
        ${st.story.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
        <div class="pic"><canvas width="300" height="120" data-sil></canvas><div class="bubble">${esc(st.bubble)}</div></div>
        <button class="btn primary" data-act="cut">削る</button></div>`;
    } else if (name === 'cutting') {
      html = `<div class="hud" data-hud>
        <div class="hud-top"><span>第${stage + 1}面 ${esc(st.name)}</span><span>一致 <b data-match></b></span><span data-time></span></div>
        <div class="hud-hint">画面のどこでもなぞると刃が動く。指を上へ動かすと削れる。ゆっくり！</div>
        <button class="btn primary done" data-act="finish">完成</button></div>`;
    } else if (name === 'broken') {
      html = `<div class="panel center"><h2 class="boom">ポキッ！</h2><p class="line">折れた…</p>
        <button class="btn primary" data-act="retry">新しい鉛筆で</button></div>`;
    } else if (name === 'result') {
      const r = g.lastResult; const last = stage >= STAGES.length - 1;
      html = `<div class="panel center result">
        <div class="kicker">第${stage + 1}面 ${esc(st.name)}</div>
        <div class="rank rank-${r.rank}">${r.rank}</div>
        <div class="stats"><div>一致率 <b>${r.match.toFixed(1)}%</b></div><div>タイム <b>${r.seconds.toFixed(1)}秒</b></div>
        <div>ボーナス <b>+${Math.round(r.bonus)}</b></div><div>合計 <b>${r.total}点</b></div></div>
        <button class="btn" data-act="share">結果を共有</button><div class="share-msg" data-share-msg></div><div class="share-img" data-share-img></div>
        <div class="row2"><button class="btn ghost" data-act="retry">もう一度</button><button class="btn primary" data-act="next">${last ? 'エンディングへ' : '次へ'}</button></div></div>`;
    } else if (name === 'ending') {
      html = `<div class="panel center">${ENDING.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
        <h2>おしまい</h2><button class="btn primary" data-act="title">タイトルへ</button></div>`;
    }
    root.innerHTML = html;
    root.querySelectorAll('[data-sil]').forEach((c) => { const ctx = c.getContext?.('2d'); if (ctx) drawSilhouette(ctx, buildTarget(st).slice(Math.max(0, tipStartIndex(st) - 12)), { x: 6, y: 0, w: c.width - 12, h: c.height }); });
    if (name === 'cutting') { hud = root.querySelector('[data-hud]'); updateHud(); }
    on('[data-act="new"]', () => g.newGame());
    on('[data-act="cont"]', () => g.continueGame());
    on('[data-act="select"]', () => g.goto('select'));
    on('[data-act="title"]', () => g.goto('title', 0));
    on('[data-act="tap"]', () => g.goto('story', 0));
    on('[data-act="cut"]', () => g.goto('cutting'));
    on('[data-act="finish"]', () => g.finish());
    on('[data-act="retry"]', () => g.retry());
    on('[data-act="next"]', () => g.next());
    on('[data-act="share"]', () => g.onShare?.());
    root.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => g.goto('story', +b.dataset.stage)));
  }

  // --- 入力と描画ループ ---
  attachInput(canvas, (px, py) => screenToTool(px, py, canvas.getBoundingClientRect(), scene.view), { onStart: g.handleStart, onMove: g.handleMove, onEnd: g.handleEnd });

  let last = now();
  function loop() {
    const t = now(); const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (g.state.name === 'cutting') {
      cutLevel *= 0.9; audio.setCutIntensity(cutLevel);
      if (hud) hud.querySelector('[data-time]').textContent = `${((t - startedAt) / 1000).toFixed(1)}秒`;
    }
    scene.render(dt);
    raf(loop);
  }
  raf(loop);
  const onResize = () => scene.resize();
  globalThis.addEventListener?.('resize', onResize);
  globalThis.addEventListener?.('orientationchange', () => setTimeout(onResize, 200));

  return g;
}
