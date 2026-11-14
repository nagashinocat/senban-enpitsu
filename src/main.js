import { createGame } from './game.js';
import { createScene } from './render/scene.js';
import { createTrophyView } from './render/trophy.js';
import { attachInput } from './input.js';
import * as audio from './audio.js';
import * as share from './share.js';
import { createBgm } from './bgm.js';
import { installAudioUnlock } from './unlock.js';
import { createCounter } from './counter.js';
import { firebaseConfig } from './firebase-config.js';

const bgm = createBgm();
const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { createScene, attachInput, audio, share, bgm, createTrophyView, counter: createCounter(firebaseConfig) });

// 音は、ブラウザが認める操作（指を離す・クリックなど）の中で開始する
installAudioUnlock(window, [() => bgm.unlock(), () => audio.unlock()]);

// 音楽のオン・オフ
const toggle = document.getElementById('bgm-toggle');
const paint = () => { toggle.classList.toggle('off', bgm.muted); toggle.setAttribute('aria-label', bgm.muted ? '音楽をつける' : '音楽を消す'); };
toggle.addEventListener('click', (e) => { e.stopPropagation(); bgm.unlock(); bgm.setMuted(!bgm.muted); paint(); });
paint();
game.start();
