import { createGame } from './game.js';
import { createScene } from './render/scene.js';
import { attachInput } from './input.js';
import * as audio from './audio.js';
import * as share from './share.js';
import { createBgm } from './bgm.js';

const bgm = createBgm();
const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { createScene, attachInput, audio, share, bgm });

// 音は最初に触ったときから鳴らせる
addEventListener('pointerdown', () => bgm.unlock(), { capture: true });

// 音楽のオン・オフ
const toggle = document.getElementById('bgm-toggle');
const paint = () => { toggle.classList.toggle('off', bgm.muted); toggle.setAttribute('aria-label', bgm.muted ? '音楽をつける' : '音楽を消す'); };
toggle.addEventListener('click', (e) => { e.stopPropagation(); bgm.unlock(); bgm.setMuted(!bgm.muted); paint(); });
paint();
game.start();
