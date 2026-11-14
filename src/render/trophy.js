// リザルトの左で、削った鉛筆を立体で回して見せる。指でなぞると回せる
import * as THREE from 'three';
import { createLatheGeometry, updateLatheGeometry, SEG } from './lathe.js';
import { trophyRadii, paintColor, decorations } from './trophy-model.js';
import { PENCIL_RADIUS } from '../config.js';

const MATERIAL = {
  S: { roughness: 0.28, metalness: 0.25 }, A: { roughness: 0.35, metalness: 0.05 },
  B: { roughness: 0.75, metalness: 0 }, C: { roughness: 0.95, metalness: 0 },
};

export function createTrophyView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#ffffff', '#3a3326', 1.1));
  const key = new THREE.DirectionalLight('#fff4e0', 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.0); rim.position.set(-4, 1, -3); scene.add(rim);

  const tilt = new THREE.Group(); scene.add(tilt);       // なぞって傾ける
  const upright = new THREE.Group(); tilt.add(upright);  // 先を上に向ける
  upright.rotation.z = Math.PI / 2;
  const spin = new THREE.Group(); upright.add(spin);     // 軸まわりに回す
  let sparkles = null, raf = 0, disposed = false, auto = 0.6, dragging = null, spinVel = 0;

  function show({ profile, target, tipFrom, stageId, rank }) {
    const radii = trophyRadii(profile, target, tipFrom, rank);
    const s0 = Math.max(0, tipFrom - 25);
    const view = { radii: radii.slice(s0), dx: profile.dx };
    const geom = createLatheGeometry(view.radii.length);
    updateLatheGeometry(geom, view);
    // 削った所を、ランクに合わせて塗る
    const col = geom.attributes.color.array;
    const span = Math.max(1, target.length - 1 - tipFrom);
    for (let i = tipFrom - s0; i < view.radii.length; i++) {
      const gi = i + s0, u = (gi - tipFrom) / span, ratio = target[gi] / PENCIL_RADIUS;
      for (let j = 0; j <= SEG; j++) {
        const c = paintColor(stageId, rank, u, (j / SEG) * Math.PI * 2, ratio);
        const k = (i * (SEG + 1) + j) * 3; col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
      }
    }
    geom.attributes.color.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, ...MATERIAL[rank] });
    const len = (view.radii.length - 1) * view.dx;
    const mesh = new THREE.Mesh(geom, mat); mesh.position.x = -len / 2; spin.add(mesh);

    // 飾り（S）
    const gold = new THREE.MeshStandardMaterial({ color: '#ffcf4a', metalness: 0.9, roughness: 0.2, emissive: '#5a3a00', emissiveIntensity: 0.4 });
    const pts = [];
    for (const d of decorations(stageId, rank, target, tipFrom)) {
      const x = d.x - s0 * view.dx - len / 2;
      if (d.kind === 'ring') {
        const m = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.007, 8, 24), gold); m.rotation.y = Math.PI / 2; m.position.x = x; spin.add(m);
      } else if (d.kind === 'jewel') {
        const m = new THREE.Mesh(new THREE.SphereGeometry(d.r, 16, 12), gold); m.position.x = x; spin.add(m);
      } else if (d.kind === 'bell') {
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, 10), gold);
        m.rotation.z = -Math.PI / 2; // 根元側（下）へ垂らす
        m.position.set(x - 0.03, Math.cos(d.a) * d.r, Math.sin(d.a) * d.r); spin.add(m);
      } else if (d.kind === 'sparkle') pts.push(x, Math.cos(d.a) * d.r, Math.sin(d.a) * d.r);
    }
    if (pts.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      sparkles = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffe27a', size: 0.035, transparent: true, depthWrite: false }));
      upright.add(sparkles); sparkles.position.copy(spin.position);
    }
    if (rank === 'C') { upright.rotation.z = Math.PI / 2 + 0.08; } // ぼろぼろは少し傾く

    // 全体が収まる距離
    const h = len + (stageId === 'k-tou' && rank === 'S' ? 0.4 : 0.1);
    camera.position.set(0, 0, (h / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.15 + 0.6);
    camera.lookAt(0, 0, 0);
    resize(); loop();
  }

  function resize() {
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  let last = performance.now();
  function loop() {
    if (disposed) return;
    const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!dragging) { spinVel *= 0.95; spin.rotation.x += dt * auto + spinVel; tilt.rotation.x *= 0.98; }
    if (sparkles) { sparkles.rotation.x = spin.rotation.x * 0.6; sparkles.material.opacity = 0.55 + 0.45 * Math.sin(t / 180); }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  // 指でなぞって回す・傾ける
  canvas.style.touchAction = 'none';
  const down = (e) => { dragging = { x: e.clientX, y: e.clientY }; spinVel = 0; try { canvas.setPointerCapture(e.pointerId); } catch { /* なくてもよい */ } e.stopPropagation(); };
  const move = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y; dragging = { x: e.clientX, y: e.clientY };
    spin.rotation.x += dx * 0.02; spinVel = dx * 0.002;
    tilt.rotation.x = Math.max(-0.7, Math.min(0.7, tilt.rotation.x + dy * 0.01));
  };
  const up = () => { dragging = null; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('click', (e) => e.stopPropagation()); // 演出の「タップで飛ばす」と区別

  return {
    show,
    dispose() { disposed = true; cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
