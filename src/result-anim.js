import { drawMasterPhoto } from './master.js';
import masterUrl from './assets/master.jpg';

let masterImg = null;
function loadMaster(cb) {
  if (typeof Image === 'undefined') return;
  if (!masterImg) { masterImg = new Image(); masterImg.src = masterUrl; }
  if (masterImg.complete && masterImg.naturalWidth) cb(masterImg);
  else masterImg.addEventListener('load', () => cb(masterImg), { once: true });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 伝説の鉛筆削り名人のひとこと
export const COMMENTS = {
  S: ['…わしの若い頃より上手い。', '見事じゃ。鉛筆が喜んでおる。', '弟子にしてくれんか。'],
  A: ['悪くない。芯がまっすぐじゃ。', 'あと一削り、心で削れ。', 'ほう、筋がいいのう。'],
  B: ['削りに迷いがあるのう。', '鉛筆の声を聞くのじゃ。', 'まだまだ、木目が泣いとる。'],
  C: ['…それは鉛筆か？', '旋盤が泣いておる。', '鉛筆削りを買いなさい。'],
};
export function pickComment(rank, rng = Math.random) {
  const list = COMMENTS[rank] || COMMENTS.C;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

const ROWS = [
  { key: 'match', label: '一致率', fmt: (v) => `${v.toFixed(1)}%`, max: 100 },
  { key: 'seconds', label: 'タイム', fmt: (v) => `${v.toFixed(1)}秒`, max: 99.9 },
  { key: 'bonus', label: 'ボーナス', fmt: (v) => `+${Math.round(v)}`, max: 200 },
  { key: 'total', label: '合計', fmt: (v) => `${Math.round(v)}点`, max: 1200 },
];

export function resultHtml(r, { stageIndex, last, kicker, nextLabel }) {
  return `<div class="panel center result" data-result>
    <div class="kicker">${esc(kicker || `第${stageIndex + 1}面 ${r.stageName}`)}</div>
    <div class="score-board">
      ${ROWS.map((row) => `<div class="score-row${row.key === 'total' ? ' total' : ''}" data-row="${row.key}"><span>${row.label}</span><b data-val="${row.key}"></b></div>`).join('')}
      <div class="hanko rank-${r.rank}"><span class="hanko-rank">${esc(r.rank)}</span><span class="hanko-sub">判定</span></div>
    </div>
    <div class="result-side">
    <div class="master"><div class="master-pic"><canvas width="680" height="300" data-mood="${esc(r.rank)}" aria-label="伝説の鉛筆削り名人"></canvas></div>
      <div class="master-say"><div class="master-name">伝説の鉛筆削り名人</div><div class="master-bubble" data-comment></div></div></div>
    <div class="result-actions">
      <button class="btn" data-act="share">結果を共有</button><div class="share-msg" data-share-msg></div><div class="share-img" data-share-img></div>
      <div class="row2"><button class="btn ghost" data-act="retry">もう一度</button><button class="btn primary" data-act="next">${esc(nextLabel || (last ? 'エンディングへ' : '次へ'))}</button></div>
    </div>
    </div>
    <div class="skip-hint">タップで飛ばす</div>
  </div>`;
}

// 数字がトゥルルルと回って、パンと止まる。最後にハンコ、名人のひとこと、ボタン
export function playResult(el, r, { audio = {}, setTimer = setTimeout, rng = Math.random, onDone } = {}) {
  const $ = (s) => el.querySelector(s);
  const cv = $('.master-pic canvas');
  let ctx = null; try { ctx = cv?.getContext('2d'); } catch { ctx = null; }
  if (ctx) { drawMasterPhoto(ctx, null, r.rank, cv.width, cv.height); loadMaster((img) => drawMasterPhoto(ctx, img, r.rank, cv.width, cv.height)); }
  const comment = pickComment(r.rank, rng);
  let finished = false;
  const call = (fn, ...a) => { try { fn?.(...a); } catch { /* 音が出なくても続ける */ } };

  const land = (row) => {
    $(`[data-val="${row.key}"]`).textContent = row.fmt(r[row.key]);
    $(`[data-row="${row.key}"]`).classList.add('landed');
  };
  const stamp = () => $('.hanko').classList.add('show');
  const showMaster = () => { $('[data-comment]').textContent = comment; $('.master').classList.add('show'); };
  const finish = () => {
    if (finished) return;
    finished = true;
    for (const row of ROWS) land(row);
    stamp(); showMaster();
    $('.result-actions').classList.add('show');
    $('.skip-hint')?.remove();
    onDone?.();
  };

  const ROLL_STEPS = 12, ROLL_MS = 45;
  function rollRow(i) {
    if (finished) return;
    if (i >= ROWS.length) { setTimer(doStamp, 350); return; }
    const row = ROWS[i];
    const cell = $(`[data-val="${row.key}"]`);
    let k = 0;
    const tick = () => {
      if (finished) return;
      if (k < ROLL_STEPS) {
        cell.textContent = row.fmt(rng() * row.max);
        if (k % 2 === 0) call(audio.playTick);
        k++; setTimer(tick, ROLL_MS);
      } else {
        land(row); call(audio.playPop);
        setTimer(() => rollRow(i + 1), 180);
      }
    };
    tick();
  }
  function doStamp() {
    if (finished) return;
    stamp(); call(audio.playStamp); call(audio.vibrate, 40);
    el.classList.add('thud');
    setTimer(() => { if (finished) return; showMaster(); setTimer(() => { if (!finished) finish(); }, 500); }, 600);
  }
  setTimer(() => rollRow(0), 250);
  return { skip: finish };
}
