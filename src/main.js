import { createGame } from './game.js';
import { createScene } from './render/scene.js';
import { attachInput } from './input.js';
import * as audio from './audio.js';
import * as share from './share.js';

const game = createGame(document.getElementById('ui'), document.getElementById('stage'), { createScene, attachInput, audio, share });
game.start();
