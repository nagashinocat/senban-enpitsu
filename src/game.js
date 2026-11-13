import { createProfile, cutSweep } from './profile.js';
import { isBroken } from './breakage.js';
import { matchRate, scoreResult } from './scoring.js';
import { STAGES, KIWAMI, KIWAMI_INVITE, INTRO, ENDING, buildTarget, tipStartIndex } from './stages.js';
import { MATCH_TOLERANCE } from './config.js';
import { initCat, stepCat } from './cat.js';
import { drawCat } from './cat-draw.js';
import { screenToTool } from './input.js';
import { drawSilhouette } from './silhouette.js';
import { resultHtml, playResult } from './result-anim.js';
import { saveResult, loadRecords, clearedStageIds } from './storage.js';
import { PENCIL_LENGTH, DEPTH_GAIN, TOOL_HALF_WIDTH, TOOL_REST_R } from './config.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function surfaceAt(profile, x, hw) {
  const { radii, dx } = profile;
  const i0 = Math.max(0, Math.ceil((x - hw) / dx)), i1 = Math.min(radii.length - 1, Math.floor((x + hw) / dx));
  let m = 0; for (let i = i0; i <= i1; i++) m = Math.max(m, radii[i]);
  return m;
}

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
  g.mode = 'story';
  g.spinning = false;
  const rng = deps.rng || Math.random;
  const DIFF_KEY = 'senban-enpitsu:difficulty';
  g.difficulty = 'normal';
  try { if (globalThis.localStorage?.getItem(DIFF_KEY) === 'hard') g.difficulty = 'hard'; } catch { /* 保存できなくてもよい */ }
  g.setDifficulty = (d) => {
    g.difficulty = d === 'hard' ? 'hard' : 'normal';
    try { globalThis.localStorage?.setItem(DIFF_KEY, g.difficulty); } catch { /* 保存できなくてもよい */ }
  };
  // ハードの猫
  let catState = null, catHold = false, catPrevSpin = false;
  function showCat(pose, say) {
    const el = root.querySelector('[data-cat]'); if (!el) return;
    el.className = `cat show ${pose}`;
    el.querySelector('.cat-say').textContent = say;
    let c = null; try { c = el.querySelector('canvas').getContext('2d'); } catch { c = null; }
    if (c) drawCat(c, pose, 160, 140);
  }
  function hideCat() { const el = root.querySelector('[data-cat]'); if (el) el.className = 'cat'; }
  function resetCat() { catState = null; catHold = false; hideCat(); }
  g.breakFactorNow = () => (L()[g.state.stage]?.breakFactor ?? 1) * (catHold ? 0.5 : 1);
  g.tickCat = () => {
    if (g.difficulty !== 'hard' || g.state.name !== 'cutting' || !catState) return;
    for (let n = 0; n < 4; n++) {
      const r = stepCat(catState, elapsed(), rng);
      catState = r.cat;
      if (!r.actions.length) break;
      for (const a of r.actions) {
        if (a === 'warn') { showCat('peek', 'にゃ？'); audio.playMeow?.('short'); }
        else if (a === 'holdStart') {
          catPrevSpin = g.spinning; catHold = true;
          setSpinning(true, true);
          showCat('hold', '（ぐいーっ）'); audio.playMeow?.('long'); audio.vibrate([60, 40, 60]);
        } else if (a === 'holdEnd') {
          catHold = false; setSpinning(catPrevSpin, true); hideCat();
        } else if (a === 'nyaStart') { showCat('nya', 'にゃにゃにゃにゃ！'); audio.playMeow?.('nya'); }
        else if (a === 'tap') setSpinning(!g.spinning, true);
        else if (a === 'nyaEnd') hideCat();
      }
    }
  };
  const elapsed = () => (startedAt == null ? 0 : (now() - startedAt) / 1000);
  function setSpinning(on, byCat = false) {
    const turboChanged = byCat;
    if (g.spinning === on && !turboChanged) return;
    const was = g.spinning;
    g.spinning = on;
    if (on && catHold) scene.setSpin(true, true); else scene.setSpin(on);
    audio.setMotorTurbo?.(on && catHold);
    if (on && !was) {
      audio.unlock(); audio.startMotor();
      if (startedAt == null && g.state.name === 'cutting') {
        startedAt = now();
        if (g.difficulty === 'hard') catState = initCat(0, rng);
      }
    } else if (!on && was) audio.stopMotor();
    const b = root.querySelector('[data-act="lathe"]');
    if (b) { b.classList.toggle('on', on); b.querySelector('[data-lathe-label]').textContent = on ? '止める' : '回す'; }
    root.querySelector('.hud-hint')?.classList.toggle('ready', on);
  }
  const L = () => (g.mode === 'kiwami' ? KIWAMI : STAGES);
  const tol = () => L()[g.state.stage]?.tolerance ?? MATCH_TOLERANCE;
  let ref = null, startedAt = null, liveMatch = 0, cutLevel = 0, tipFrom = 0;

  function freshPencil() {
    g.profile = createProfile();
    g.tool = { x: PENCIL_LENGTH / 2, r: TOOL_REST_R };
    scene.setProfile(g.profile); scene.setTool(g.tool);
  }

  // --- 状態の切り替え ---
  g.goto = (name, stage = g.state.stage) => {
    audio.stopCutSound();
    catHold = false; catState = null;
    setSpinning(false);
    if (name === 'title' || name === 'intro' || name === 'select' || name === 'ending') g.mode = 'story';
    if (name === 'kiwami') g.mode = 'kiwami';
    g.state = { name, stage };
    deps.bgm?.play(g.mode === 'kiwami' ? 'kiwami' : 'story');
    scene.setZoom(name === 'cutting');
    const tipX = () => tipStartIndex(L()[stage]) * g.profile.dx;
    if (name === 'cutting') {
      freshPencil();
      tipFrom = tipStartIndex(L()[stage]);
      scene.setFocus(tipX());
      g.target = buildTarget(L()[stage]);
      scene.setTarget(g.target);
      startedAt = null; liveMatch = matchRate(g.profile, g.target, tipFrom, tol()); ref = null;
      g.tool = { x: tipX() + (PENCIL_LENGTH - tipX()) / 2, r: TOOL_REST_R }; scene.setTool(g.tool);
    } else if (name === 'story') {
      freshPencil(); scene.setFocus(tipX()); scene.setTarget(buildTarget(L()[stage]));
    } else if (name === 'title' || name === 'intro' || name === 'select' || name === 'ending' || name === 'kiwami') {
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
    const seconds = elapsed();
    const stage = L()[g.state.stage];
    const s = scoreResult(g.profile, g.target, seconds, stage.parSeconds, tipFrom, stage.tolerance ?? MATCH_TOLERANCE);
    g.lastResult = { ...s, seconds, stageId: stage.id, stageName: stage.name, hard: g.difficulty === 'hard' };
    saveResult(stage.id, { total: s.total, rank: s.rank, seconds });
    audio.playDing(); audio.vibrate(30);
    g.goto('result');
  };
  g.next = () => {
    const i = g.state.stage;
    if (g.mode === 'kiwami') { if (i >= KIWAMI.length - 1) g.goto('kiwami', 0); else g.goto('story', i + 1); return; }
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
  g.toggleLathe = () => { if (g.state.name === 'cutting' && !catHold) setSpinning(!g.spinning); };
  g.kiwamiUnlocked = () => clearedStageIds().has(STAGES[STAGES.length - 1].id);
  g.startKiwami = (i = 0) => { g.mode = 'kiwami'; g.goto('story', i); };
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
    if (!g.spinning) {
      // 止まっている間は削れない：刃は鉛筆の表面で止まる
      g.tool = { x: nx, r: Math.max(nr, surfaceAt(g.profile, nx, TOOL_HALF_WIDTH)) };
      scene.setTool(g.tool);
      return;
    }
    g.tool = { x: nx, r: nr };
    scene.setTool(g.tool);
    const cut = cutSweep(g.profile, from, g.tool, TOOL_HALF_WIDTH);
    if (cut.removed > 0) {
      scene.markDirty(); scene.emitChips(g.tool.x, cut.removed);
      cutLevel = Math.min(1, cutLevel + cut.removed * 3);
      audio.setCutIntensity(cutLevel);
      if (isBroken(g.profile, cut, g.breakFactorNow())) {
        scene.flashBreak(); audio.stopCutSound(); audio.playBreak(); audio.vibrate([80, 40, 120]);
        g.goto('broken');
        return;
      }
      liveMatch = matchRate(g.profile, g.target, tipFrom, tol());
      updateHud();
    }
  };

  // --- 画面（HTML の重ね表示） ---
  let hud = null;
  function updateHud() {
    if (!hud) return;
    hud.querySelector('[data-match]').textContent = `${liveMatch.toFixed(1)}%`;
    hud.querySelector('[data-time]').textContent = `${elapsed().toFixed(1)}秒`;
  }
  function on(sel, fn) { root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); audio.unlock(); fn(e); })); }

  function render() {
    const { name, stage } = g.state;
    const st = L()[stage] || STAGES[0];
    const label = (g.mode === 'kiwami' ? `鉛筆削り道 極み 其の${'一二三四五'[stage]}` : `第${stage + 1}面`) + (g.difficulty === 'hard' ? '【ハード】' : '');
    hud = null;
    let html = '';
    if (name === 'title') {
      const hasSave = Object.keys(loadRecords()).length > 0;
      html = `<div class="panel center">
        <div class="kicker">鉛筆削りを忘れたので</div>
        <h1>旋盤で<br>鉛筆を削る</h1>
        <button class="btn diff ${g.difficulty === 'hard' ? 'hard' : ''}" data-act="difficulty">難易度：${g.difficulty === 'hard' ? 'ハード（猫が来る）' : 'ふつう'}</button>
        <button class="btn primary" data-act="new">はじめから</button>
        ${hasSave ? '<button class="btn" data-act="cont">つづきから</button><button class="btn" data-act="select">面をえらぶ</button>' : ''}
        ${g.kiwamiUnlocked() ? '<button class="btn kiwami-btn" data-act="kiwami">鉛筆削り道 極み</button>' : ''}
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
        <div class="kicker">${label}</div><h2>${esc(st.name)}</h2>
        ${st.story.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
        <div class="pic"><canvas width="300" height="120" data-sil></canvas><div class="bubble">${esc(st.bubble)}</div></div>
        <button class="btn primary" data-act="cut">削る</button></div>`;
    } else if (name === 'cutting') {
      html = `<div class="hud" data-hud>
        <div class="hud-top"><span>${label} ${esc(st.name)}</span><span>一致 <b data-match></b></span><span data-time></span></div>
        <div class="hud-hint">まず左下のボタンで旋盤を回そう。画面をなぞると刃が動き、指を上へ動かすと削れる。ゆっくり！</div>
        <div class="cat" data-cat><canvas width="160" height="140"></canvas><div class="cat-say"></div></div>
        <button class="lathe-btn" data-act="lathe"><span class="lathe-dot"></span><span data-lathe-label>回す</span></button>
        <button class="btn primary done" data-act="finish">完成</button></div>`;
    } else if (name === 'broken') {
      html = `<div class="panel center"><h2 class="boom">ポキッ！</h2><p class="line">折れた…</p>
        <button class="btn primary" data-act="retry">新しい鉛筆で</button></div>`;
    } else if (name === 'result') {
      html = resultHtml(g.lastResult, { stageIndex: stage, kicker: `${label} ${st.name}`, last: g.mode === 'story' && stage >= STAGES.length - 1, nextLabel: g.mode === 'kiwami' && stage >= KIWAMI.length - 1 ? '極みの一覧へ' : undefined });
    } else if (name === 'ending') {
      html = `<div class="panel center">${ENDING.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
        <h2>おしまい</h2>
        ${g.kiwamiUnlocked() ? `<p class="line invite">${esc(KIWAMI_INVITE)}</p><button class="btn kiwami-btn" data-act="kiwami">鉛筆削り道 極みへ</button>` : ''}
        <button class="btn primary" data-act="title">タイトルへ</button></div>`;
    } else if (name === 'kiwami') {
      const rec = loadRecords();
      html = `<div class="panel center"><div class="kicker">ストーリーの先の試練</div><h2>鉛筆削り道 極み</h2><div class="list">${KIWAMI.map((s, i) => {
        const r = rec[s.id];
        return `<button class="btn row" data-kiwami="${i}"><span>其の${'一二三四五'[i]} ${esc(s.name)}</span><b>${r ? r.bestRank : ''}</b></button>`;
      }).join('')}</div><button class="btn ghost" data-act="title">もどる</button></div>`;
    }
    root.innerHTML = html;
    root.querySelectorAll('[data-sil]').forEach((c) => { const ctx = c.getContext?.('2d'); if (ctx) drawSilhouette(ctx, buildTarget(st).slice(Math.max(0, tipStartIndex(st) - 12)), { x: 6, y: 0, w: c.width - 12, h: c.height }); });
    if (name === 'cutting') { hud = root.querySelector('[data-hud]'); updateHud(); }
    on('[data-act="new"]', () => g.newGame());
    on('[data-act="cont"]', () => g.continueGame());
    on('[data-act="select"]', () => g.goto('select'));
    on('[data-act="kiwami"]', () => g.goto('kiwami', 0));
    root.querySelectorAll('[data-kiwami]').forEach((b) => b.addEventListener('click', () => g.startKiwami(+b.dataset.kiwami)));
    on('[data-act="title"]', () => g.goto('title', 0));
    on('[data-act="tap"]', () => g.goto('story', 0));
    on('[data-act="cut"]', () => g.goto('cutting'));
    on('[data-act="finish"]', () => g.finish());
    on('[data-act="lathe"]', () => g.toggleLathe());
    on('[data-act="difficulty"]', () => { g.setDifficulty(g.difficulty === 'hard' ? 'normal' : 'hard'); render(); });
    on('[data-act="retry"]', () => g.retry());
    on('[data-act="next"]', () => g.next());
    on('[data-act="share"]', () => g.onShare?.());
    if (name === 'result') {
      const panel = root.querySelector('[data-result]');
      const ctl = playResult(panel, g.lastResult, { audio, setTimer: deps.setTimer || ((f, ms) => setTimeout(f, ms)) });
      panel.addEventListener('click', () => ctl.skip());
    }
    root.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => g.goto('story', +b.dataset.stage)));
  }

  // --- 入力と描画ループ ---
  attachInput(canvas, (px, py) => screenToTool(px, py, canvas.getBoundingClientRect(), scene.view), { onStart: g.handleStart, onMove: g.handleMove, onEnd: g.handleEnd });

  let last = now();
  function loop() {
    const t = now(); const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (g.state.name === 'cutting') {
      g.tickCat();
      cutLevel *= 0.9; audio.setCutIntensity(cutLevel);
      if (hud) hud.querySelector('[data-time]').textContent = `${elapsed().toFixed(1)}秒`;
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
