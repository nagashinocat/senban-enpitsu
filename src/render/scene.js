import * as THREE from 'three';
import { PENCIL_LENGTH, PENCIL_RADIUS, CORE_RADIUS } from '../config.js';

const SEG = 40;          // 周方向の分割
const MARGIN = 0.5;      // 鉛筆の左右の余白（ワールド単位）
const TILT = 0.35;       // 少し上から見下ろす角度（回転体なので輪郭は変わらない）
const PAINT = new THREE.Color('#f2b632');
const WOOD = new THREE.Color('#e8c99a');
const LEAD = new THREE.Color('#2b2b2e');

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#20242b');

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  const center = new THREE.Vector3(PENCIL_LENGTH / 2, 0, 0);
  camera.position.set(center.x, Math.sin(TILT) * 10, Math.cos(TILT) * 10);
  camera.lookAt(center);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight('#ffffff', '#445', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(2, 5, 6); scene.add(sun);

  // 旋盤（チャック・心押し台・ベッド）
  const metal = new THREE.MeshStandardMaterial({ color: '#8a929c', metalness: 0.6, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3c434d', metalness: 0.3, roughness: 0.7 });
  const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 32), metal);
  chuck.rotation.z = Math.PI / 2; chuck.position.set(-0.3, 0, 0); scene.add(chuck);
  const jaws = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.2), dark);
    j.position.set(0.1, Math.cos(k * 2.094) * 0.55, Math.sin(k * 2.094) * 0.55); jaws.add(j);
  }
  scene.add(jaws);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16), metal);
  tail.rotation.z = -Math.PI / 2; tail.position.set(PENCIL_LENGTH + 0.35, 0, 0); scene.add(tail);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(PENCIL_LENGTH + 3, 0.3, 1.6), dark);
  bed.position.set(center.x, -1.4, 0); scene.add(bed);

  // 鉛筆（自前の回転体。x 軸まわり）
  const spin = new THREE.Group(); scene.add(spin);
  let geom = null, mesh = null, profileRef = null, dirty = false;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });

  function buildGeom(n) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * (SEG + 1) * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * (SEG + 1) * 3), 3));
    const idx = [];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < SEG; j++) {
      const a = i * (SEG + 1) + j, b = a + SEG + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    g.setIndex(idx);
    return g;
  }
  function updateGeom() {
    const { radii, dx } = profileRef;
    const pos = geom.attributes.position.array, col = geom.attributes.color.array;
    let k = 0;
    for (let i = 0; i < radii.length; i++) {
      const r = radii[i];
      const c = r <= CORE_RADIUS + 1e-4 ? LEAD : r >= PENCIL_RADIUS - 1e-4 ? PAINT : WOOD;
      for (let j = 0; j <= SEG; j++) {
        const t = (j / SEG) * Math.PI * 2;
        pos[k] = i * dx; pos[k + 1] = Math.cos(t) * r; pos[k + 2] = Math.sin(t) * r;
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; k += 3;
      }
    }
    geom.attributes.position.needsUpdate = true; geom.attributes.color.needsUpdate = true;
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
  }

  // 画面に正対する平面（カメラの子）：点線と刃。y=0 が鉛筆の軸
  const overlay = new THREE.Group(); overlay.position.set(0, 0, -1); camera.add(overlay);
  const dashMat = new THREE.LineDashedMaterial({ color: '#7fe3ff', dashSize: 0.08, gapSize: 0.06, depthTest: false, transparent: true });
  let lines = [];
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 3),
    new THREE.MeshBasicMaterial({ color: '#d9e1ea', depthTest: false, transparent: true }));
  blade.geometry.translate(0, -0.175, 0); // 先端が原点
  blade.renderOrder = 10; overlay.add(blade);
  const toX = (x) => x - center.x; // ワールド x → 平面の x

  // 削りくず
  const MAXP = 400;
  const pPos = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP);
  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pts = new THREE.Points(pGeom, new THREE.PointsMaterial({ color: '#d8b07a', size: 0.06 }));
  pts.frustumCulled = false; scene.add(pts);
  let pNext = 0;

  let view = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  let shake = 0;

  const api = {
    get view() { return view; },
    setProfile(profile) {
      if (!geom || geom.attributes.position.count !== profile.radii.length * (SEG + 1)) {
        if (mesh) { spin.remove(mesh); geom.dispose(); }
        geom = buildGeom(profile.radii.length); mesh = new THREE.Mesh(geom, mat); spin.add(mesh);
      }
      profileRef = profile; dirty = true;
    },
    markDirty() { dirty = true; },
    setTarget(target) {
      for (const l of lines) { overlay.remove(l); l.geometry.dispose(); }
      lines = [];
      if (!target) return;
      const dx = PENCIL_LENGTH / (target.length - 1);
      for (const sgn of [1, -1]) {
        const pts3 = [];
        for (let i = 0; i < target.length; i++) pts3.push(new THREE.Vector3(toX(i * dx), sgn * target[i], 0));
        const g = new THREE.BufferGeometry().setFromPoints(pts3);
        const l = new THREE.Line(g, dashMat); l.computeLineDistances(); l.renderOrder = 9;
        overlay.add(l); lines.push(l);
      }
    },
    setTool({ x, r }) { blade.position.set(toX(x), -r, 0.01); },
    emitChips(x, amount) {
      const n = Math.min(30, Math.ceil(amount * 400));
      for (let k = 0; k < n; k++) {
        const i = pNext; pNext = (pNext + 1) % MAXP;
        pPos[i * 3] = x; pPos[i * 3 + 1] = -0.3; pPos[i * 3 + 2] = 0.3;
        pVel[i * 3] = (Math.random() - 0.5) * 2; pVel[i * 3 + 1] = Math.random() * 2.5 + 0.5; pVel[i * 3 + 2] = Math.random() * 2;
        pLife[i] = 0.8 + Math.random() * 0.5;
      }
    },
    flashBreak() { shake = 0.4; },
    resize() {
      const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      const halfW = PENCIL_LENGTH / 2 + MARGIN;
      const halfH = halfW * (h / w);
      // 横長の画面では高さに合わせる
      const minHalfH = 1.4;
      const hh = Math.max(halfH, minHalfH), hw = hh === halfH ? halfW : minHalfH * (w / h);
      camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
      camera.updateProjectionMatrix();
      view = { xMin: center.x - hw, xMax: center.x + hw, yMin: -hh, yMax: hh };
    },
    render(dt) {
      spin.rotation.x += dt * 12; jaws.rotation.x += dt * 12;
      if (dirty && profileRef) { updateGeom(); dirty = false; }
      for (let i = 0; i < MAXP; i++) {
        if (pLife[i] <= 0) { pPos[i * 3 + 1] = -99; continue; }
        pLife[i] -= dt; pVel[i * 3 + 1] -= 6 * dt;
        pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      }
      pGeom.attributes.position.needsUpdate = true;
      if (shake > 0) { shake -= dt; spin.position.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0); }
      else spin.position.set(0, 0, 0);
      renderer.render(scene, camera);
    },
    snapshot() { return renderer.domElement; },
    dispose() { renderer.dispose(); },
  };
  api.resize();
  return api;
}
