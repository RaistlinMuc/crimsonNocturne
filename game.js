
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const SAVE_KEY = 'crimson-nocturne-best';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const dom = {
    overlay: document.getElementById('overlay'),
    titleScreen: document.getElementById('titleScreen'),
    levelScreen: document.getElementById('levelScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    titleBtn: document.getElementById('titleBtn'),
    muteBtn: document.getElementById('muteBtn'),
    hpFill: document.getElementById('hpFill'),
    hpText: document.getElementById('hpText'),
    xpFill: document.getElementById('xpFill'),
    xpText: document.getElementById('xpText'),
    levelText: document.getElementById('levelText'),
    scoreText: document.getElementById('scoreText'),
    killsText: document.getElementById('killsText'),
    bestText: document.getElementById('bestText'),
    titleBestText: document.getElementById('titleBestText'),
    weaponsList: document.getElementById('weaponsList'),
    clockText: document.getElementById('clockText'),
    bossPanel: document.getElementById('bossPanel'),
    bossName: document.getElementById('bossName'),
    bossState: document.getElementById('bossState'),
    bossFill: document.getElementById('bossFill'),
    centerMessage: document.getElementById('centerMessage'),
    centerTitle: document.getElementById('centerTitle'),
    centerSub: document.getElementById('centerSub'),
    cardGrid: document.getElementById('cardGrid'),
    sumTime: document.getElementById('sumTime'),
    sumLevel: document.getElementById('sumLevel'),
    sumKills: document.getElementById('sumKills'),
    sumScore: document.getElementById('sumScore'),
    gameOverText: document.getElementById('gameOverText'),
  };

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }
  window.addEventListener('resize', resize);
  resize();

  const rand = (a = 1, b) => {
    if (b === undefined) { b = a; a = 0; }
    return a + Math.random() * (b - a);
  };
  const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const choose = arr => arr[(Math.random() * arr.length) | 0];
  const dist2 = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  };
  const length = (x, y) => Math.hypot(x, y) || 0.0001;
  const norm = (x, y) => {
    const d = Math.hypot(x, y) || 0.0001;
    return { x: x / d, y: y / d };
  };
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const fmtTime = s => {
    const m = (s / 60) | 0;
    const sec = (s % 60) | 0;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };
  const hash2 = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };

  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    dashPressed: false,
  };

  let audioCtx = null;
  let audioEnabled = true;
  let audioPrimed = false;
  const audioGates = { shoot: 0, hit: 0, chain: 0, dash: 0, level: 0, heartbeat: 0, boss: 0 };

  function initAudio() {
    if (!audioEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      audioPrimed = true;
    } catch (_) {}
  }

  function tone(freq, duration = 0.12, type = 'sine', volume = 0.03, time = 0, glide = 1) {
    if (!audioEnabled || !audioCtx || !audioPrimed) return;
    const now = audioCtx.currentTime + time;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function sfx(kind) {
    if (!audioEnabled || !audioCtx || !audioPrimed) return;
    if (audioGates[kind] > 0) return;
    if (kind === 'shoot') {
      audioGates.shoot = 0.05;
      tone(rand(320, 410), 0.08, 'sawtooth', 0.014, 0, 1.35);
      tone(rand(160, 210), 0.06, 'triangle', 0.009, 0.01, 0.5);
    } else if (kind === 'hit') {
      audioGates.hit = 0.05;
      tone(rand(110, 160), 0.08, 'square', 0.018, 0, 0.55);
    } else if (kind === 'chain') {
      audioGates.chain = 0.16;
      tone(480, 0.09, 'sawtooth', 0.018, 0, 1.6);
      tone(760, 0.07, 'triangle', 0.012, 0.03, 0.7);
    } else if (kind === 'dash') {
      audioGates.dash = 0.14;
      tone(220, 0.12, 'sawtooth', 0.018, 0, 3.0);
    } else if (kind === 'level') {
      audioGates.level = 0.4;
      tone(392, 0.2, 'triangle', 0.02, 0, 1.12);
      tone(523.25, 0.22, 'triangle', 0.02, 0.04, 1.1);
      tone(659.25, 0.28, 'triangle', 0.02, 0.08, 1.1);
    } else if (kind === 'boss') {
      audioGates.boss = 0.5;
      tone(98, 0.42, 'sawtooth', 0.03, 0, 0.5);
      tone(196, 0.3, 'triangle', 0.018, 0.12, 0.7);
    } else if (kind === 'heartbeat') {
      audioGates.heartbeat = 0.38;
      tone(62, 0.13, 'sine', 0.013, 0, 0.95);
      tone(42, 0.16, 'triangle', 0.012, 0.05, 0.75);
    }
  }

  window.addEventListener('pointerdown', initAudio);
  window.addEventListener('keydown', initAudio);

  const WEAPON_INFO = {
    bloodBolt: { name: 'Blood Bolts', max: 6 },
    orbitals: { name: 'Orbiting Coffins', max: 5 },
    chain: { name: 'Chain Lightning', max: 5 },
    scythe: { name: 'Reaper Scythes', max: 5 },
    nova: { name: 'Inferno Nova', max: 5 },
    drones: { name: 'Bone Drones', max: 5 },
  };

  const ENEMY_TYPES = {
    bat: { name: 'Nightbat', hp: 22, speed: 88, r: 13, damage: 8, xp: 5, color: '#a23d72' },
    ghoul: { name: 'Ghoul', hp: 42, speed: 54, r: 18, damage: 12, xp: 7, color: '#7c4b5f' },
    specter: { name: 'Specter', hp: 34, speed: 60, r: 16, damage: 10, xp: 8, color: '#82cfff' },
    brute: { name: 'Grave Brute', hp: 126, speed: 28, r: 25, damage: 18, xp: 16, color: '#6d2430' },
    witch: { name: 'Moon Witch', hp: 78, speed: 42, r: 20, damage: 16, xp: 14, color: '#b067ff' },
    charger: { name: 'Hound Charger', hp: 92, speed: 46, r: 21, damage: 18, xp: 13, color: '#ff6e8a' },
    countess: { name: 'Crimson Countess', hp: 2400, speed: 62, r: 36, damage: 22, xp: 90, color: '#ff4e7e', boss: true },
    lich: { name: 'Ashen Lich', hp: 2800, speed: 52, r: 40, damage: 24, xp: 95, color: '#8fb0ff', boss: true },
  };

  let entityId = 1;
  let needsWeaponsUI = true;

  function loadBest() {
    try { return +(localStorage.getItem(SAVE_KEY) || 0); } catch (_) { return 0; }
  }

  function saveBest() {
    try { localStorage.setItem(SAVE_KEY, String(state.best)); } catch (_) {}
  }

  function makeState(mode = 'title') {
    return {
      mode,
      paused: false,
      t: 0,
      runTime: 0,
      score: 0,
      kills: 0,
      best: loadBest(),
      flash: 0,
      damageFlash: 0,
      freeze: 0,
      bannerTitle: '',
      bannerSub: '',
      bannerT: 0,
      pendingLevelUps: 0,
      levelCards: [],
      spawnBudget: 0,
      nextBossAt: 70,
      bossCycle: 0,
      activeBossId: null,
      thunderTimer: rand(8, 15),
      lightning: 0,
      camera: { x: 0, y: 0, zoom: 1, shake: 0, sx: 0, sy: 0 },
      player: {
        x: 0, y: 0, vx: 0, vy: 0, r: 18,
        hp: 120, maxHp: 120,
        xp: 0, xpReq: 30,
        level: 1,
        speed: 258,
        magnet: 110,
        regen: 1.08,
        damageMult: 1,
        fireRateMult: 1,
        projSpeedMult: 1,
        crit: 0.08,
        armor: 0,
        invuln: 0,
        dashCd: 0,
        dashMax: 3.2,
        dashT: 0,
        dashDX: 1,
        dashDY: 0,
        facing: 0,
      },
      weapons: {
        bloodBolt: 1,
        orbitals: 0,
        chain: 0,
        scythe: 0,
        nova: 0,
        drones: 0,
      },
      relics: {
        bloodBloom: false,
        deathEcho: false,
        stormSigil: false,
        ascension: false,
      },
      weaponFx: {
        bloodBolt: 0,
        chain: 0,
        scythe: 0,
        nova: 0,
        drones: 0,
        orbitAngle: 0,
        droneAngle: 0,
        stormSigil: 0,
      },
      orbitalsRender: [],
      dronesRender: [],
      enemies: [],
      projectiles: [],
      enemyBullets: [],
      pickups: [],
      particles: [],
      rings: [],
      beams: [],
      texts: [],
      decals: [],
      hazards: [],
      titleEmbers: [],
    };
  }

  let state = makeState('title');
  dom.bestText.textContent = String(state.best);
  dom.titleBestText.textContent = String(state.best);

  function setScreen(name) {
    dom.overlay.classList.toggle('hidden', name === null);
    dom.titleScreen.classList.toggle('hidden', name !== 'title');
    dom.levelScreen.classList.toggle('hidden', name !== 'level');
    dom.gameOverScreen.classList.toggle('hidden', name !== 'gameover');
  }

  function showBanner(title, sub = '', dur = 2.2) {
    state.bannerTitle = title;
    state.bannerSub = sub;
    state.bannerT = dur;
    dom.centerTitle.textContent = title;
    dom.centerSub.textContent = sub;
    dom.centerMessage.classList.add('show');
  }

  function clearBanner() {
    state.bannerT = 0;
    dom.centerMessage.classList.remove('show');
  }

  function activeWeaponCount() {
    let n = 0;
    for (const k of Object.keys(state.weapons)) if (state.weapons[k] > 0) n++;
    return n;
  }

  function startRun() {
    state = makeState('playing');
    setScreen(null);
    clearBanner();
    showBanner('Begin the Hunt', 'Survive the blood moon', 2.1);
    needsWeaponsUI = true;
    refreshWeaponsUI();
    refreshHUD();
    initAudio();
  }

  function returnToTitle() {
    const best = state.best;
    state = makeState('title');
    state.best = Math.max(state.best, best);
    dom.bestText.textContent = String(state.best);
    dom.titleBestText.textContent = String(state.best);
    clearBanner();
    setScreen('title');
    needsWeaponsUI = true;
    refreshWeaponsUI();
    refreshHUD();
  }

  function openLevelUp() {
    if (state.mode === 'dead' || state.mode === 'title') return;
    state.mode = 'levelup';
    state.paused = false;
    state.levelCards = buildLevelCards();
    renderLevelCards();
    setScreen('level');
  }

  function closeLevelUp() {
    if (state.pendingLevelUps > 0) {
      state.levelCards = buildLevelCards();
      renderLevelCards();
      return;
    }
    state.mode = 'playing';
    setScreen(null);
  }

  function gameOver() {
    state.mode = 'dead';
    state.paused = false;
    clearBanner();
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }
    dom.bestText.textContent = String(state.best);
    dom.titleBestText.textContent = String(state.best);
    dom.sumTime.textContent = fmtTime(state.runTime);
    dom.sumLevel.textContent = String(state.player.level);
    dom.sumKills.textContent = String(state.kills);
    dom.sumScore.textContent = String(state.score);
    dom.gameOverText.textContent = state.score >= state.best
      ? 'A new high score is etched into the crypt.'
      : 'A brutal end under the blood moon.';
    setScreen('gameover');
    shake(1.3);
  }

  dom.startBtn.addEventListener('click', startRun);
  dom.restartBtn.addEventListener('click', startRun);
  dom.titleBtn.addEventListener('click', returnToTitle);
  dom.muteBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    dom.muteBtn.textContent = audioEnabled ? 'Audio: On' : 'Audio: Off';
    if (audioEnabled) initAudio();
  });

  function setKey(code, on) {
    if (code === 'KeyW' || code === 'ArrowUp') input.up = on;
    if (code === 'KeyS' || code === 'ArrowDown') input.down = on;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = on;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = on;
  }

  window.addEventListener('keydown', e => {
    if (e.repeat && e.code !== 'Space') {
      if (state.mode === 'levelup' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) e.preventDefault();
    }
    setKey(e.code, true);
    if (e.code === 'Space') {
      e.preventDefault();
      if (state.mode === 'title') {
        startRun();
        return;
      }
      input.dashPressed = true;
    }
    if (state.mode === 'title' && (e.code === 'Enter')) {
      e.preventDefault();
      startRun();
      return;
    }
    if ((e.code === 'KeyP' || e.code === 'Escape') && state.mode === 'playing') {
      state.paused = !state.paused;
      if (state.paused) showBanner('Paused', 'Press P or Esc to continue', 999);
      else clearBanner();
      e.preventDefault();
    } else if ((e.code === 'KeyP' || e.code === 'Escape') && state.mode === 'levelup') {
      e.preventDefault();
    }
    if (state.mode === 'levelup') {
      if (e.code === 'Digit1') chooseCard(0);
      if (e.code === 'Digit2') chooseCard(1);
      if (e.code === 'Digit3') chooseCard(2);
    }
    if (state.mode === 'dead' && e.code === 'Enter') startRun();
  });

  window.addEventListener('keyup', e => {
    setKey(e.code, false);
    if (e.code === 'Space') input.dashPressed = false;
  });

  function shake(amount) {
    state.camera.shake = Math.min(2.2, state.camera.shake + amount);
  }

  function pushLimited(arr, item, limit) {
    arr.push(item);
    if (arr.length > limit) arr.splice(0, arr.length - limit);
  }

  function addParticle(p) {
    p.maxLife = p.life;
    pushLimited(state.particles, p, 1600);
  }

  function particleBurst(x, y, count, color, opts = {}) {
    const shape = opts.shape || 'circle';
    const speed1 = opts.speed1 ?? 40;
    const speed2 = opts.speed2 ?? 220;
    const size1 = opts.size1 ?? 2;
    const size2 = opts.size2 ?? 5;
    const life1 = opts.life1 ?? 0.18;
    const life2 = opts.life2 ?? 0.75;
    const drag = opts.drag ?? 0.92;
    const gravity = opts.gravity ?? 0;
    for (let i = 0; i < count; i++) {
      const a = rand(TAU);
      const s = rand(speed1, speed2);
      addParticle({
        x, y,
        px: x, py: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: rand(size1, size2),
        life: rand(life1, life2),
        drag,
        gravity,
        color,
        shape,
        glow: opts.glow ?? 0.7,
        spin: rand(-8, 8),
        rot: rand(TAU),
      });
    }
  }

  function addRing(x, y, r0, r1, color, life = 0.42, width = 4, fillAlpha = 0) {
    pushLimited(state.rings, {
      x, y, r: r0, from: r0, to: r1, life, maxLife: life, color, width, fillAlpha
    }, 120);
  }

  function addBeam(points, color, life = 0.16, width = 4) {
    if (points.length < 2) return;
    pushLimited(state.beams, {
      points,
      color,
      life,
      maxLife: life,
      width,
      seed: rand(1000),
    }, 40);
  }

  function addText(x, y, text, color = '#ffffff', size = 14) {
    pushLimited(state.texts, {
      x, y, text, color, size,
      life: 0.8,
      maxLife: 0.8,
      vy: -28,
    }, 200);
  }

  function addDecal(x, y, r, color = '#5e0d1e', life = 18) {
    pushLimited(state.decals, {
      x, y, r, color, life, maxLife: life, rot: rand(TAU), squish: rand(0.55, 1.1)
    }, 140);
  }

  function bestBoss() {
    return state.enemies.find(e => e.id === state.activeBossId) || null;
  }

  function worldBounds() {
    const zoom = state.camera.zoom || 1;
    const halfW = W / (2 * zoom) + 220;
    const halfH = H / (2 * zoom) + 220;
    return {
      minX: state.camera.x - halfW,
      maxX: state.camera.x + halfW,
      minY: state.camera.y - halfH,
      maxY: state.camera.y + halfH,
    };
  }

  function nearestEnemy(x, y, maxDist = Infinity, pred = null) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (pred && !pred(e)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function nearestEnemies(x, y, count = 3, maxDist = Infinity, pred = null) {
    const best = [];
    const maxD2 = maxDist * maxDist;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (pred && !pred(e)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d > maxD2) continue;
      best.push({ e, d });
    }
    best.sort((a, b) => a.d - b.d);
    return best.slice(0, count).map(x => x.e);
  }

  function fireEnemyBullet(x, y, vx, vy, r, damage, life, color, kind = 'orb') {
    pushLimited(state.enemyBullets, {
      x, y, px: x, py: y, vx, vy, r, damage, life, maxLife: life, color, kind
    }, 260);
  }

  function spawnProjectile(p) {
    p.maxLife = p.life;
    p.px = p.x;
    p.py = p.y;
    if (!p.hitSet) p.hitSet = new Set();
    pushLimited(state.projectiles, p, 340);
  }

  function dropPickup(type, x, y, value = 1) {
    const a = rand(TAU);
    const s = rand(40, 160);
    pushLimited(state.pickups, {
      type,
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: type === 'xp' ? 8 : type === 'heart' ? 11 : 14,
      value,
      life: type === 'chest' ? 24 : 18,
      maxLife: type === 'chest' ? 24 : 18,
      t: 0,
      phase: rand(TAU),
    }, 220);
  }

  function splitXp(total) {
    const out = [];
    let remaining = total;
    while (remaining > 0) {
      const take = Math.min(remaining, remaining > 20 ? randi(6, 10) : remaining > 10 ? randi(3, 6) : randi(1, 3));
      out.push(take);
      remaining -= take;
    }
    return out;
  }

  function bloodBoltStats(level = state.weapons.bloodBolt) {
    const p = state.player;
    return {
      damage: (12 + level * 5.5) * p.damageMult,
      cooldown: Math.max(0.12, (0.52 - level * 0.035) / p.fireRateMult),
      count: 1 + Math.floor((level - 1) / 2),
      speed: 560 * p.projSpeedMult,
      pierce: level >= 4 ? 1 + (level >= 6 ? 1 : 0) : 0,
      spread: 0.18,
      size: 4.8 + level * 0.35,
    };
  }

  function orbitalsStats(level = state.weapons.orbitals) {
    const p = state.player;
    const counts = [0, 2, 3, 4, 5, 6];
    return {
      damage: (14 + level * 8.5) * p.damageMult,
      count: counts[level] || 0,
      radius: 80 + level * 11,
      size: 12 + level * 1.4,
      spin: 1.8 + level * 0.38,
    };
  }

  function chainStats(level = state.weapons.chain) {
    const p = state.player;
    return {
      damage: (22 + level * 10.5) * p.damageMult,
      cooldown: Math.max(0.42, (2.2 - level * 0.18) / p.fireRateMult),
      bounces: 2 + level,
      range: 220 + level * 28,
    };
  }

  function scytheStats(level = state.weapons.scythe) {
    const p = state.player;
    return {
      damage: (30 + level * 12) * p.damageMult,
      cooldown: Math.max(0.35, (1.84 - level * 0.12) / p.fireRateMult),
      count: 1 + (level >= 3 ? 1 : 0) + (level >= 5 ? 1 : 0),
      speed: 420 * p.projSpeedMult,
      size: 15 + level * 1.6,
    };
  }

  function novaStats(level = state.weapons.nova) {
    const p = state.player;
    return {
      damage: (24 + level * 16) * p.damageMult,
      cooldown: Math.max(0.9, (5.4 - level * 0.36) / p.fireRateMult),
      radius: 110 + level * 24,
    };
  }

  function droneStats(level = state.weapons.drones) {
    const p = state.player;
    return {
      damage: (10 + level * 6.5) * p.damageMult,
      cooldown: Math.max(0.16, (0.78 - level * 0.06) / p.fireRateMult),
      count: 1 + Math.floor((level - 1) / 2),
      speed: 500 * p.projSpeedMult,
    };
  }

  function weaponCardDesc(key, nextLevel) {
    if (key === 'bloodBolt') {
      const s = bloodBoltStats(nextLevel);
      return `Auto-fire ${s.count} bolt${s.count > 1 ? 's' : ''} for ${Math.round(s.damage)} damage, ${s.pierce ? 'piercing ' + s.pierce + ' foe' + (s.pierce > 1 ? 's' : '') + ', ' : ''}${s.cooldown.toFixed(2)}s cooldown.`;
    }
    if (key === 'orbitals') {
      const s = orbitalsStats(nextLevel);
      return `Summon ${s.count} cursed coffin blade${s.count > 1 ? 's' : ''} orbiting at radius ${Math.round(s.radius)} for ${Math.round(s.damage)} contact damage.`;
    }
    if (key === 'chain') {
      const s = chainStats(nextLevel);
      return `Arc lightning through ${s.bounces} targets for ${Math.round(s.damage)} damage with ${Math.round(s.range)} chain range.`;
    }
    if (key === 'scythe') {
      const s = scytheStats(nextLevel);
      return `Throw ${s.count} spinning reaper scythe${s.count > 1 ? 's' : ''} for ${Math.round(s.damage)} damage each, then reel them back through the horde.`;
    }
    if (key === 'nova') {
      const s = novaStats(nextLevel);
      return `Detonate a flaming nova at radius ${Math.round(s.radius)} for ${Math.round(s.damage)} damage, vaporizing nearby projectiles.`;
    }
    if (key === 'drones') {
      const s = droneStats(nextLevel);
      return `Deploy ${s.count} bone drone${s.count > 1 ? 's' : ''} that orbit and fire for ${Math.round(s.damage)} damage at high speed.`;
    }
    return '';
  }

  function makeWeaponCard(key) {
    const level = state.weapons[key];
    const max = WEAPON_INFO[key].max;
    if (level >= max) return null;
    const next = level + 1;
    const unlock = level === 0;
    const name = unlock ? WEAPON_INFO[key].name : `${WEAPON_INFO[key].name} +${next}`;
    const tier = unlock || next >= max ? 'rare' : 'common';
    const weight = unlock ? (activeWeaponCount() < 3 ? 3.6 : 2.2) : 2.5;
    return {
      id: `${key}-${next}`,
      title: name,
      desc: weaponCardDesc(key, next),
      tier,
      weight,
      apply: () => {
        state.weapons[key] = next;
        needsWeaponsUI = true;
        refreshWeaponsUI();
        showBanner(WEAPON_INFO[key].name, unlock ? 'Unlocked' : `Level ${next}`, 1.8);
      },
    };
  }

  function buildCardPool() {
    const p = state.player;
    const cards = [];

    for (const key of Object.keys(WEAPON_INFO)) {
      const card = makeWeaponCard(key);
      if (card) cards.push(card);
    }

    cards.push({
      id: 'damage',
      title: 'Crimson Pact',
      desc: 'Increase all weapon damage by 14%.',
      tier: 'common',
      weight: 2.3,
      apply: () => { p.damageMult *= 1.14; showBanner('Crimson Pact', 'Damage surges', 1.4); }
    });
    cards.push({
      id: 'tempo',
      title: 'Wicked Tempo',
      desc: 'Increase all attack speed by 13%.',
      tier: 'common',
      weight: 2.3,
      apply: () => { p.fireRateMult *= 1.13; showBanner('Wicked Tempo', 'Cooldowns collapse', 1.4); }
    });
    cards.push({
      id: 'stride',
      title: 'Nightstride',
      desc: 'Move 12% faster through the cemetery.',
      tier: 'common',
      weight: 2.0,
      apply: () => { p.speed *= 1.12; showBanner('Nightstride', 'Footsteps quicken', 1.4); }
    });
    cards.push({
      id: 'magnet',
      title: 'Soul Magnet',
      desc: 'Increase pickup radius by 38.',
      tier: 'common',
      weight: 1.9,
      apply: () => { p.magnet += 38; showBanner('Soul Magnet', 'Souls whip inward', 1.4); }
    });
    cards.push({
      id: 'heart',
      title: 'Black Heart',
      desc: 'Gain +22 max health and heal 22 immediately.',
      tier: 'common',
      weight: 1.8,
      apply: () => { p.maxHp += 22; p.hp = Math.min(p.maxHp, p.hp + 22); showBanner('Black Heart', 'Vitality thickens', 1.4); }
    });
    cards.push({
      id: 'renewal',
      title: 'Dark Renewal',
      desc: 'Regenerate +0.45 health per second.',
      tier: 'common',
      weight: 1.8,
      apply: () => { p.regen += 0.45; showBanner('Dark Renewal', 'Wounds begin to close', 1.4); }
    });
    if (p.crit < 0.42) {
      cards.push({
        id: 'crit',
        title: 'Keen Edge',
        desc: 'Gain +6% critical strike chance.',
        tier: 'rare',
        weight: 1.6,
        apply: () => { p.crit += 0.06; showBanner('Keen Edge', 'Critical chance rises', 1.4); }
      });
    }
    cards.push({
      id: 'shadowstep',
      title: 'Shadowstep',
      desc: 'Reduce dash cooldown by 0.28 seconds and gain +1 armor.',
      tier: 'rare',
      weight: 1.4,
      apply: () => {
        p.dashMax = Math.max(1.4, p.dashMax - 0.28);
        p.armor += 1;
        showBanner('Shadowstep', 'You slip between teeth', 1.5);
      }
    });

    if (!state.relics.bloodBloom && state.weapons.bloodBolt >= 3) {
      cards.push({
        id: 'bloodBloom',
        title: 'Blood Bloom',
        desc: 'Kills have a strong chance to erupt in a crimson explosion that tears through nearby enemies.',
        tier: 'legendary',
        weight: 0.85,
        apply: () => {
          state.relics.bloodBloom = true;
          needsWeaponsUI = true;
          refreshWeaponsUI();
          showBanner('Blood Bloom', 'The dead burst like flowers', 2.1);
        }
      });
    }
    if (!state.relics.deathEcho && (state.weapons.chain >= 2 || state.weapons.scythe >= 2)) {
      cards.push({
        id: 'deathEcho',
        title: 'Death Echo',
        desc: 'Slain enemies release seeking spirits that hunt the next victim.',
        tier: 'legendary',
        weight: 0.82,
        apply: () => {
          state.relics.deathEcho = true;
          needsWeaponsUI = true;
          refreshWeaponsUI();
          showBanner('Death Echo', 'Souls refuse to rest', 2.1);
        }
      });
    }
    if (!state.relics.stormSigil && state.weapons.orbitals >= 2 && state.weapons.chain >= 1) {
      cards.push({
        id: 'stormSigil',
        title: 'Storm Sigil',
        desc: 'Orbiting coffins discharge periodic thunder sparks that lance through nearby enemies.',
        tier: 'legendary',
        weight: 0.8,
        apply: () => {
          state.relics.stormSigil = true;
          needsWeaponsUI = true;
          refreshWeaponsUI();
          showBanner('Storm Sigil', 'The halo learns to thunder', 2.1);
        }
      });
    }
    if (!state.relics.ascension && p.level >= 12) {
      cards.push({
        id: 'ascension',
        title: 'Crimson Ascension',
        desc: 'Apex blessing: full heal, +22% damage, +18% attack speed, +12% movement speed.',
        tier: 'legendary',
        weight: 0.7,
        apply: () => {
          state.relics.ascension = true;
          p.hp = p.maxHp;
          p.damageMult *= 1.22;
          p.fireRateMult *= 1.18;
          p.speed *= 1.12;
          needsWeaponsUI = true;
          refreshWeaponsUI();
          showBanner('Crimson Ascension', 'The blood moon answers you', 2.3);
        }
      });
    }

    return cards;
  }

  function pickWeighted(cards, count) {
    const pool = [...cards];
    const picks = [];
    while (pool.length && picks.length < count) {
      let total = 0;
      for (const c of pool) total += c.weight;
      let roll = Math.random() * total;
      let index = 0;
      for (; index < pool.length; index++) {
        roll -= pool[index].weight;
        if (roll <= 0) break;
      }
      if (index >= pool.length) index = pool.length - 1;
      picks.push(pool.splice(index, 1)[0]);
    }
    return picks;
  }

  function buildLevelCards() {
    const cards = pickWeighted(buildCardPool(), 3);
    cards.forEach((card, i) => card.hotkey = String(i + 1));
    return cards;
  }

  function renderLevelCards() {
    dom.cardGrid.innerHTML = '';
    state.levelCards.forEach((card, idx) => {
      const el = document.createElement('button');
      el.className = `upgradeCard ${card.tier}`;
      el.innerHTML = `
        <div>
          <div class="tier">${card.tier}</div>
          <div class="name">${card.title}</div>
        </div>
        <div class="desc">${card.desc}</div>
        <div class="meta">
          <div class="key">${idx + 1}</div>
          <div class="choose">Choose</div>
        </div>
      `;
      el.addEventListener('click', () => chooseCard(idx));
      dom.cardGrid.appendChild(el);
    });
  }

  function chooseCard(index) {
    if (state.mode !== 'levelup') return;
    const card = state.levelCards[index];
    if (!card) return;
    card.apply();
    state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
    refreshHUD();
    if (state.pendingLevelUps > 0) {
      state.levelCards = buildLevelCards();
      renderLevelCards();
    } else {
      closeLevelUp();
    }
  }

  function refreshWeaponsUI() {
    if (!needsWeaponsUI) return;
    needsWeaponsUI = false;
    const parts = [];
    const keys = ['bloodBolt', 'orbitals', 'chain', 'scythe', 'nova', 'drones'];
    for (const key of keys) {
      const level = state.weapons[key];
      const max = WEAPON_INFO[key].max;
      const dots = Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
      parts.push(`<div class="weaponItem"><div class="wname">${WEAPON_INFO[key].name}</div><div class="lvlDots">${dots}</div></div>`);
    }
    if (state.relics.bloodBloom) parts.push(`<div class="relicTag">Relic · Blood Bloom</div>`);
    if (state.relics.deathEcho) parts.push(`<div class="relicTag">Relic · Death Echo</div>`);
    if (state.relics.stormSigil) parts.push(`<div class="relicTag">Relic · Storm Sigil</div>`);
    if (state.relics.ascension) parts.push(`<div class="relicTag">Relic · Crimson Ascension</div>`);
    dom.weaponsList.innerHTML = parts.join('');
  }

  function refreshHUD() {
    const p = state.player;
    dom.hpFill.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
    dom.xpFill.style.width = `${clamp((p.xp / p.xpReq) * 100, 0, 100)}%`;
    dom.hpText.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
    dom.xpText.textContent = `${Math.floor(p.xp)} / ${p.xpReq}`;
    dom.levelText.textContent = String(p.level);
    dom.scoreText.textContent = String(Math.floor(state.score));
    dom.killsText.textContent = String(state.kills);
    dom.bestText.textContent = String(state.best);
    dom.titleBestText.textContent = String(state.best);
    dom.clockText.textContent = fmtTime(state.runTime);
    const boss = bestBoss();
    if (boss) {
      dom.bossPanel.classList.add('show');
      dom.bossName.textContent = boss.name;
      dom.bossState.textContent = boss.hp > boss.maxHp * 0.5 ? 'Enraged' : 'Bloodied';
      dom.bossFill.style.width = `${clamp((boss.hp / boss.maxHp) * 100, 0, 100)}%`;
    } else {
      dom.bossPanel.classList.remove('show');
    }
  }

  function addXp(value) {
    const p = state.player;
    p.xp += value;
    let leveled = false;
    while (p.xp >= p.xpReq) {
      p.xp -= p.xpReq;
      p.level += 1;
      p.xpReq = Math.floor(p.xpReq * 1.28 + 12);
      state.pendingLevelUps += 1;
      leveled = true;
    }
    if (leveled) {
      sfx('level');
      showBanner(`Level ${p.level}`, 'Choose a blessing', 1.8);
      if (state.mode === 'playing') openLevelUp();
    }
  }

  function healPlayer(amount) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
    addText(state.player.x, state.player.y - 30, `+${Math.round(amount)}`, '#7dffbe', 16);
  }

  function armorFactor() {
    return Math.max(0.35, 1 - state.player.armor * 0.08);
  }

  function damagePlayer(amount, x, y, color = '#ff6f7f') {
    const p = state.player;
    if (p.invuln > 0 || state.mode !== 'playing') return;
    const finalDamage = Math.max(1, amount * armorFactor());
    p.hp -= finalDamage;
    p.invuln = 0.58;
    p.vx += (p.x - x) * 2.2;
    p.vy += (p.y - y) * 2.2;
    state.damageFlash = 0.7;
    state.flash = Math.max(state.flash, 0.12);
    shake(0.7);
    particleBurst(p.x, p.y, 16, color, { speed1: 40, speed2: 200, size1: 2, size2: 4 });
    addText(p.x, p.y - 26, `-${Math.round(finalDamage)}`, '#ff8ea1', 18);
    if (p.hp <= 0) {
      p.hp = 0;
      gameOver();
    }
  }

  function bloodBloom(x, y, radius, damage) {
    addRing(x, y, 10, radius, '#ff4f8b', 0.45, 6, 0.1);
    particleBurst(x, y, 24, '#ff73a6', { speed1: 60, speed2: 260, size1: 2, size2: 7 });
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.x, e.y) <= (radius + e.r) * (radius + e.r)) {
        damageEnemy(e, damage, { x, y, noCrit: true, fromBloom: true });
      }
    }
  }

  function spawnSpirit(x, y, strength = 1) {
    spawnProjectile({
      type: 'spirit',
      x, y,
      vx: rand(-40, 40),
      vy: rand(-40, 40),
      r: 7 + strength,
      damage: (14 + state.player.level * 1.4) * state.player.damageMult,
      life: 2.1,
      penetration: 2,
      color: '#8de0ff',
      glow: '#8de0ff',
      turn: 5 + strength,
    });
  }

  function killEnemy(e, opts = {}) {
    if (e.dead) return;
    e.dead = true;
    state.kills += 1;
    state.score += Math.round(e.maxHp * 10 + state.runTime * 4 + (e.boss ? 800 : e.elite ? 120 : 18));
    addDecal(e.x, e.y + e.r * 0.2, e.r * rand(0.8, 1.35), e.boss ? '#7c102c' : '#4d0b18', e.boss ? 32 : 18);
    particleBurst(e.x, e.y, e.boss ? 70 : e.elite ? 26 : 12, e.color, { speed1: 40, speed2: e.boss ? 340 : 220, size1: 2, size2: e.boss ? 8 : 5, life1: 0.25, life2: 1.1 });
    particleBurst(e.x, e.y, e.boss ? 28 : 10, '#ffd2df', { speed1: 20, speed2: 180, size1: 1, size2: 3, life1: 0.1, life2: 0.45 });
    addText(e.x, e.y - e.r - 16, e.boss ? 'EXECUTED' : 'SLAY', '#ffe0ea', e.boss ? 22 : 14);
    addRing(e.x, e.y, 8, e.boss ? 160 : e.elite ? 80 : 42, e.color, e.boss ? 0.65 : 0.35, e.boss ? 7 : 4);

    const xpTotal = Math.round(e.xp * (e.elite ? 1.8 : 1) * (e.boss ? 3.8 : 1));
    for (const v of splitXp(xpTotal)) dropPickup('xp', e.x, e.y, v);

    if (Math.random() < (e.boss ? 1 : e.elite ? 0.18 : 0.03)) dropPickup('heart', e.x, e.y, e.boss ? 28 : 14);
    if (Math.random() < (e.boss ? 1 : e.elite ? 0.12 : 0.0)) dropPickup('chest', e.x, e.y, e.boss ? 2 : 1);

    if (state.relics.deathEcho) {
      spawnSpirit(e.x, e.y, e.boss ? 2 : 1);
      if (e.boss) spawnSpirit(e.x + 20, e.y - 10, 2);
    }

    if (state.relics.bloodBloom && !opts.fromBloom && Math.random() < (e.boss ? 1 : e.elite ? 0.55 : 0.28)) {
      bloodBloom(e.x, e.y, e.boss ? 140 : 78, (18 + state.player.level * 2.4) * state.player.damageMult);
    }

    if (e.boss) {
      state.activeBossId = null;
      state.freeze = 0.07;
      showBanner(`${e.name} Slain`, 'Treasure spills from the corpse', 2.8);
      sfx('level');
      shake(1.8);
    }
  }

  function damageEnemy(e, amount, opts = {}) {
    if (!e || e.dead) return false;
    const crit = !opts.noCrit && Math.random() < state.player.crit;
    let damage = amount * (crit ? 2.0 : 1);
    e.hp -= damage;
    e.hitFlash = 1;
    if (opts.x !== undefined && opts.y !== undefined) {
      const dx = e.x - opts.x;
      const dy = e.y - opts.y;
      const d = Math.hypot(dx, dy) || 1;
      e.vx += (dx / d) * 20;
      e.vy += (dy / d) * 20;
    }
    addText(e.x + rand(-6, 6), e.y - e.r - 6, `${Math.round(damage)}${crit ? '!' : ''}`, crit ? '#ffe9a8' : '#ffd7e3', crit ? 20 : 14);
    particleBurst(e.x, e.y, e.boss ? 5 : 3, crit ? '#ffe9a8' : '#ffd3e2', { speed1: 20, speed2: 120, size1: 1, size2: 3, life1: 0.08, life2: 0.24 });
    state.score += Math.round(damage * 1.8);
    if (e.hp <= 0) {
      killEnemy(e, opts);
      return true;
    }
    return false;
  }

  function spawnEnemy(kind, extra = {}) {
    const d = ENEMY_TYPES[kind];
    if (!d) return null;
    let x = extra.x;
    let y = extra.y;
    if (x === undefined || y === undefined) {
      const angle = rand(TAU);
      const dist = Math.max(W, H) * 0.62 + rand(80, 180);
      x = state.player.x + Math.cos(angle) * dist;
      y = state.player.y + Math.sin(angle) * dist;
    }
    const t = state.runTime;
    const scale = d.boss ? (1 + t * 0.0014) : (1 + t * 0.0023);
    const elite = !!extra.elite && !d.boss;
    const hpMul = elite ? 2.2 : 1;
    const speedMul = elite ? 1.16 : 1;
    const damageMul = elite ? 1.35 : 1;
    const sizeMul = elite ? 1.22 : 1;
    const enemy = {
      id: entityId++,
      kind,
      name: elite ? `Elite ${d.name}` : d.name,
      x, y,
      vx: 0, vy: 0,
      r: d.r * sizeMul,
      hp: d.hp * scale * hpMul,
      maxHp: d.hp * scale * hpMul,
      speed: d.speed * (1 + t * 0.0009) * speedMul,
      damage: d.damage * damageMul,
      xp: d.xp * (elite ? 2.4 : 1),
      color: d.color,
      elite,
      boss: !!d.boss,
      dead: false,
      t: rand(10),
      phase: rand(TAU),
      hitFlash: 0,
      orbCd: 0,
      shootCd: rand(0.3, 1.5),
      summonCd: rand(3, 5),
      castCd: rand(2, 4),
      dashCd: rand(2, 4),
      windup: 0,
      chargeT: 0,
      lockX: 0,
      lockY: 0,
    };
    if (enemy.boss) {
      enemy.hp = d.hp * (1 + t * 0.0012);
      enemy.maxHp = enemy.hp;
      enemy.damage = d.damage * (1 + t * 0.001);
      state.activeBossId = enemy.id;
      showBanner(enemy.name, 'Apex horror manifests', 2.8);
      sfx('boss');
      shake(1.3);
    }
    state.enemies.push(enemy);
    return enemy;
  }

  function chooseEnemyType(time) {
    const pool = [
      ['bat', 4.2 + time * 0.01],
      ['ghoul', 2.6 + time * 0.012],
    ];
    if (time > 18) pool.push(['specter', 1.6 + time * 0.007]);
    if (time > 35) pool.push(['brute', 1.2 + time * 0.006], ['witch', 1.15 + time * 0.007]);
    if (time > 60) pool.push(['charger', 1.2 + time * 0.006]);
    let total = 0;
    for (const [, w] of pool) total += w;
    let roll = Math.random() * total;
    for (const [kind, w] of pool) {
      roll -= w;
      if (roll <= 0) return kind;
    }
    return pool[0][0];
  }

  function spawnBoss() {
    if (bestBoss()) return;
    const kind = state.bossCycle % 2 === 0 ? 'countess' : 'lich';
    state.bossCycle += 1;
    spawnEnemy(kind, { elite: false });
  }

  function updateSpawns(dt) {
    const intensity = 1 + state.runTime / 85;
    const cap = Math.min(280, Math.floor(28 + state.runTime * 1.18));
    if (state.enemies.length < cap) {
      state.spawnBudget += dt * (4.5 + intensity * 2.2) * (bestBoss() ? 0.75 : 1);
      while (state.spawnBudget >= 1 && state.enemies.length < cap) {
        state.spawnBudget -= 1;
        const kind = chooseEnemyType(state.runTime);
        const eliteChance = clamp(0.03 + state.runTime * 0.00022, 0.03, 0.18);
        spawnEnemy(kind, { elite: Math.random() < eliteChance });
      }
    }
    if (state.runTime >= state.nextBossAt && !bestBoss()) {
      spawnBoss();
      state.nextBossAt += 80;
    }
  }

  function castChainLightning() {
    const stats = chainStats();
    const start = nearestEnemy(state.player.x, state.player.y, 520);
    if (!start) return;
    const hit = new Set();
    const points = [{ x: state.player.x, y: state.player.y }, { x: start.x, y: start.y }];
    let current = start;
    let damage = stats.damage;
    hit.add(current.id);
    damageEnemy(current, damage, { noCrit: false, x: state.player.x, y: state.player.y });
    for (let i = 1; i < stats.bounces; i++) {
      const next = nearestEnemy(current.x, current.y, stats.range, e => !hit.has(e.id));
      if (!next) break;
      hit.add(next.id);
      points.push({ x: next.x, y: next.y });
      damage *= 0.88;
      damageEnemy(next, damage, { noCrit: true, x: current.x, y: current.y });
      current = next;
    }
    addBeam(points, '#ab9eff', 0.16, 4 + state.weapons.chain * 0.45);
    particleBurst(start.x, start.y, 12, '#c5b8ff', { speed1: 20, speed2: 160, size1: 1, size2: 3, life1: 0.08, life2: 0.28 });
    sfx('chain');
    shake(0.35);
  }

  function castNova() {
    const stats = novaStats();
    addRing(state.player.x, state.player.y, 8, stats.radius, '#ff9652', 0.45, 7, 0.08);
    particleBurst(state.player.x, state.player.y, 28, '#ff9c6a', { speed1: 40, speed2: 260, size1: 2, size2: 6, life1: 0.12, life2: 0.45 });
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist2(state.player.x, state.player.y, e.x, e.y) <= (stats.radius + e.r) * (stats.radius + e.r)) {
        damageEnemy(e, stats.damage, { x: state.player.x, y: state.player.y });
      }
    }
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      if (dist2(state.player.x, state.player.y, b.x, b.y) <= stats.radius * stats.radius) {
        particleBurst(b.x, b.y, 8, b.color, { speed1: 30, speed2: 120, size1: 1, size2: 3 });
        state.enemyBullets.splice(i, 1);
      }
    }
    sfx('hit');
    shake(0.5);
  }

  function launchScythes() {
    const s = scytheStats();
    const targets = nearestEnemies(state.player.x, state.player.y, s.count, 900);
    for (let i = 0; i < s.count; i++) {
      const target = targets[i] || targets[0];
      let angle = target ? angleTo(state.player.x, state.player.y, target.x, target.y) : state.player.facing + (i - (s.count - 1) / 2) * 0.42;
      if (!target) angle += rand(-0.2, 0.2);
      spawnProjectile({
        type: 'scythe',
        x: state.player.x + Math.cos(angle) * 14,
        y: state.player.y + Math.sin(angle) * 14,
        vx: Math.cos(angle) * s.speed,
        vy: Math.sin(angle) * s.speed,
        r: s.size,
        damage: s.damage,
        life: 1.4 + state.weapons.scythe * 0.08,
        penetration: 999,
        color: '#d8e4ff',
        glow: '#d8e4ff',
        age: 0,
        returnAt: 0.28 + i * 0.05,
        spinRate: rand(10, 18) * (Math.random() < 0.5 ? -1 : 1),
        hitMap: new Map(),
      });
    }
  }

  function fireBloodBolts() {
    const s = bloodBoltStats();
    const targets = nearestEnemies(state.player.x, state.player.y, s.count, 900);
    const anchor = targets[0];
    const base = anchor ? angleTo(state.player.x, state.player.y, anchor.x, anchor.y) : state.player.facing;
    for (let i = 0; i < s.count; i++) {
      const target = targets[i] || anchor;
      let angle = target ? angleTo(state.player.x, state.player.y, target.x, target.y) : base;
      angle += (i - (s.count - 1) / 2) * s.spread;
      spawnProjectile({
        type: 'bolt',
        x: state.player.x + Math.cos(angle) * 18,
        y: state.player.y + Math.sin(angle) * 18,
        vx: Math.cos(angle) * s.speed,
        vy: Math.sin(angle) * s.speed,
        r: s.size,
        damage: s.damage,
        life: 1.1,
        penetration: 1 + s.pierce,
        color: '#ff84b4',
        glow: '#ff5d94',
      });
    }
    sfx('shoot');
  }

  function fireDroneBolts() {
    const s = droneStats();
    if (!state.dronesRender.length) return;
    let fired = false;
    for (const d of state.dronesRender) {
      const target = nearestEnemy(d.x, d.y, 720);
      if (!target) continue;
      const angle = angleTo(d.x, d.y, target.x, target.y);
      spawnProjectile({
        type: 'droneBolt',
        x: d.x,
        y: d.y,
        vx: Math.cos(angle) * s.speed,
        vy: Math.sin(angle) * s.speed,
        r: 4.8,
        damage: s.damage,
        life: 1.05,
        penetration: 1,
        color: '#a9d2ff',
        glow: '#7db9ff',
      });
      fired = true;
    }
    if (fired) sfx('shoot');
  }

  function castStormSigil() {
    if (!state.orbitalsRender.length) return;
    let zapped = false;
    for (const orb of state.orbitalsRender) {
      const target = nearestEnemy(orb.x, orb.y, 380);
      if (!target) continue;
      const angle = angleTo(orb.x, orb.y, target.x, target.y);
      spawnProjectile({
        type: 'spark',
        x: orb.x,
        y: orb.y,
        vx: Math.cos(angle) * 620,
        vy: Math.sin(angle) * 620,
        r: 4.2,
        damage: (16 + state.player.level * 1.6) * state.player.damageMult,
        life: 0.7,
        penetration: 1,
        color: '#c6b6ff',
        glow: '#c6b6ff',
        homing: 3.5,
      });
      zapped = true;
    }
    if (zapped) {
      addRing(state.player.x, state.player.y, 20, 120, '#c7b7ff', 0.22, 3, 0);
      sfx('chain');
    }
  }

  function updatePlayer(dt) {
    const p = state.player;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const n = norm(mx, my);
      mx = n.x;
      my = n.y;
      p.facing = Math.atan2(my, mx);
    } else {
      const enemy = nearestEnemy(p.x, p.y, 600);
      if (enemy) p.facing = angleTo(p.x, p.y, enemy.x, enemy.y);
    }

    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);

    if (input.dashPressed && p.dashCd <= 0) {
      const dx = moving ? mx : Math.cos(p.facing);
      const dy = moving ? my : Math.sin(p.facing);
      p.dashDX = dx;
      p.dashDY = dy;
      p.dashT = 0.18;
      p.dashCd = p.dashMax;
      p.invuln = Math.max(p.invuln, 0.28);
      addRing(p.x, p.y, 8, 64, '#ffd2eb', 0.26, 5);
      particleBurst(p.x, p.y, 18, '#ffd2eb', { speed1: 60, speed2: 260, size1: 2, size2: 5, life1: 0.08, life2: 0.38 });
      sfx('dash');
      shake(0.45);
      input.dashPressed = false;
    }

    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashDX * p.speed * 4.0;
      p.vy = p.dashDY * p.speed * 4.0;
      if (Math.random() < 0.7) {
        addParticle({
          x: p.x + rand(-4, 4), y: p.y + rand(-4, 4),
          px: p.x, py: p.y,
          vx: -p.vx * 0.15 + rand(-20, 20),
          vy: -p.vy * 0.15 + rand(-20, 20),
          size: rand(2, 5),
          life: rand(0.12, 0.28),
          drag: 0.92,
          gravity: 0,
          color: '#ffd1e6',
          shape: 'circle',
          glow: 1,
          spin: rand(-3, 3),
          rot: rand(TAU),
        });
      }
    } else {
      const targetVX = mx * p.speed;
      const targetVY = my * p.speed;
      const s = 1 - Math.exp(-dt * 11);
      p.vx = lerp(p.vx, targetVX, s);
      p.vy = lerp(p.vy, targetVY, s);
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    if (p.hp < p.maxHp * 0.3) sfx('heartbeat');
  }

  function updateWeapons(dt) {
    const w = state.weapons;
    const fx = state.weaponFx;
    fx.orbitAngle += dt * (state.weapons.orbitals > 0 ? orbitalsStats().spin : 0);
    fx.droneAngle += dt * 1.5;
    state.orbitalsRender = [];
    state.dronesRender = [];

    if (w.bloodBolt > 0) {
      fx.bloodBolt -= dt;
      if (fx.bloodBolt <= 0) {
        fireBloodBolts();
        fx.bloodBolt += bloodBoltStats().cooldown;
      }
    }

    if (w.orbitals > 0) {
      const s = orbitalsStats();
      for (let i = 0; i < s.count; i++) {
        const a = fx.orbitAngle + i * (TAU / s.count);
        const x = state.player.x + Math.cos(a) * s.radius;
        const y = state.player.y + Math.sin(a) * (s.radius * 0.84);
        state.orbitalsRender.push({ x, y, r: s.size, angle: a, damage: s.damage });
        for (const e of state.enemies) {
          if (e.dead || e.orbCd > 0) continue;
          const rr = s.size + e.r;
          if (dist2(x, y, e.x, e.y) <= rr * rr) {
            damageEnemy(e, s.damage, { x, y, noCrit: true });
            e.orbCd = 0.22;
          }
        }
      }
    }

    if (w.chain > 0 && state.enemies.length) {
      fx.chain -= dt;
      if (fx.chain <= 0) {
        castChainLightning();
        fx.chain += chainStats().cooldown;
      }
    }

    if (w.scythe > 0 && state.enemies.length) {
      fx.scythe -= dt;
      if (fx.scythe <= 0) {
        launchScythes();
        fx.scythe += scytheStats().cooldown;
      }
    }

    if (w.nova > 0) {
      fx.nova -= dt;
      if (fx.nova <= 0) {
        castNova();
        fx.nova += novaStats().cooldown;
      }
    }

    if (w.drones > 0) {
      const s = droneStats();
      for (let i = 0; i < s.count; i++) {
        const a = fx.droneAngle + i * (TAU / s.count) + Math.sin(state.t * 2 + i) * 0.06;
        const x = state.player.x + Math.cos(a) * 76;
        const y = state.player.y + Math.sin(a) * 58;
        state.dronesRender.push({ x, y, a });
      }
      fx.drones -= dt;
      if (fx.drones <= 0) {
        fireDroneBolts();
        fx.drones += s.cooldown;
      }
    }

    if (state.relics.stormSigil && w.orbitals > 0) {
      fx.stormSigil -= dt;
      if (fx.stormSigil <= 0) {
        castStormSigil();
        fx.stormSigil = Math.max(0.55, 1.35 / state.player.fireRateMult);
      }
    }
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.dead) {
        state.enemies.splice(i, 1);
        continue;
      }
      e.t += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      e.orbCd = Math.max(0, e.orbCd - dt);

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const dirx = dx / d;
      const diry = dy / d;

      if (e.kind === 'bat') {
        const perpX = -diry;
        const perpY = dirx;
        const wobble = Math.sin(e.t * 12 + e.phase) * 0.85;
        e.vx = lerp(e.vx, (dirx + perpX * wobble) * e.speed, 1 - Math.exp(-dt * 6));
        e.vy = lerp(e.vy, (diry + perpY * wobble) * e.speed, 1 - Math.exp(-dt * 6));
      } else if (e.kind === 'ghoul') {
        e.vx = lerp(e.vx, dirx * e.speed, 1 - Math.exp(-dt * 4.5));
        e.vy = lerp(e.vy, diry * e.speed, 1 - Math.exp(-dt * 4.5));
      } else if (e.kind === 'specter') {
        const perpX = -diry;
        const perpY = dirx;
        const drift = Math.sin(e.t * 5 + e.phase) * 0.45;
        e.vx = lerp(e.vx, (dirx + perpX * drift) * e.speed, 1 - Math.exp(-dt * 3.8));
        e.vy = lerp(e.vy, (diry + perpY * drift) * e.speed, 1 - Math.exp(-dt * 3.8));
      } else if (e.kind === 'brute') {
        e.vx = lerp(e.vx, dirx * e.speed, 1 - Math.exp(-dt * 3));
        e.vy = lerp(e.vy, diry * e.speed, 1 - Math.exp(-dt * 3));
      } else if (e.kind === 'witch') {
        const desired = 250;
        const perpX = -diry;
        const perpY = dirx;
        const push = d > desired ? 1 : -0.6;
        const strafe = Math.sin(e.t * 1.6 + e.phase) > 0 ? 0.7 : -0.7;
        e.vx = lerp(e.vx, (dirx * push + perpX * strafe) * e.speed, 1 - Math.exp(-dt * 3.5));
        e.vy = lerp(e.vy, (diry * push + perpY * strafe) * e.speed, 1 - Math.exp(-dt * 3.5));
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          const a = angleTo(e.x, e.y, p.x, p.y);
          fireEnemyBullet(e.x, e.y - 6, Math.cos(a) * 220, Math.sin(a) * 220, 7, e.damage, 4.2, '#d7a4ff', 'orb');
          e.shootCd = 1.55;
        }
      } else if (e.kind === 'charger') {
        e.dashCd -= dt;
        if (e.windup > 0) {
          e.windup -= dt;
          e.vx *= 0.92;
          e.vy *= 0.92;
          if (e.windup <= 0) {
            e.chargeT = 0.7;
            addRing(e.x, e.y, 14, 66, '#ff8ba9', 0.26, 4);
          }
        } else if (e.chargeT > 0) {
          e.chargeT -= dt;
          e.vx = e.lockX * e.speed * 4.8;
          e.vy = e.lockY * e.speed * 4.8;
        } else {
          e.vx = lerp(e.vx, dirx * e.speed, 1 - Math.exp(-dt * 4.2));
          e.vy = lerp(e.vy, diry * e.speed, 1 - Math.exp(-dt * 4.2));
          if (d < 320 && e.dashCd <= 0) {
            e.dashCd = 4.2;
            e.windup = 0.55;
            e.lockX = dirx;
            e.lockY = diry;
            addRing(e.x, e.y, 10, 48, '#ff8ba9', 0.55, 3);
          }
        }
      } else if (e.kind === 'countess') {
        e.dashCd -= dt;
        e.shootCd -= dt;
        e.summonCd -= dt;
        if (e.windup > 0) {
          e.windup -= dt;
          e.vx *= 0.9;
          e.vy *= 0.9;
          if (e.windup <= 0) {
            e.chargeT = 0.85;
            addRing(e.x, e.y, 18, 84, '#ff85b2', 0.3, 5);
          }
        } else if (e.chargeT > 0) {
          e.chargeT -= dt;
          e.vx = e.lockX * 580;
          e.vy = e.lockY * 580;
          if (Math.random() < 0.75) {
            addParticle({
              x: e.x, y: e.y,
              px: e.x, py: e.y,
              vx: rand(-40, 40), vy: rand(-40, 40),
              size: rand(2, 5), life: rand(0.12, 0.36),
              drag: 0.9, gravity: 0,
              color: '#ff8cb2', shape: 'circle', glow: 1, spin: rand(-3, 3), rot: rand(TAU)
            });
          }
        } else {
          const desired = 180;
          const perpX = -diry;
          const perpY = dirx;
          const push = d > desired ? 1 : -0.45;
          const strafe = Math.sin(e.t * 0.9 + e.phase) > 0 ? 0.45 : -0.45;
          e.vx = lerp(e.vx, (dirx * push + perpX * strafe) * e.speed, 1 - Math.exp(-dt * 3.2));
          e.vy = lerp(e.vy, (diry * push + perpY * strafe) * e.speed, 1 - Math.exp(-dt * 3.2));

          if (e.dashCd <= 0 && d < 380) {
            e.dashCd = e.hp < e.maxHp * 0.45 ? 2.9 : 4.6;
            e.windup = 0.72;
            e.lockX = dirx;
            e.lockY = diry;
            addRing(e.x, e.y, 14, 90, '#ff9bc0', 0.72, 4);
          }
          if (e.shootCd <= 0) {
            const petals = e.hp < e.maxHp * 0.45 ? 22 : 16;
            for (let n = 0; n < petals; n++) {
              const a = (n / petals) * TAU + e.t * 0.5;
              fireEnemyBullet(e.x, e.y, Math.cos(a) * 220, Math.sin(a) * 220, 7, e.damage, 4.8, '#ff98bb', 'petal');
            }
            e.shootCd = e.hp < e.maxHp * 0.45 ? 2.4 : 3.6;
          }
          if (e.summonCd <= 0) {
            for (let n = 0; n < 6; n++) {
              const a = (n / 6) * TAU + rand(-0.18, 0.18);
              spawnEnemy('bat', { x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60 });
            }
            for (let n = 0; n < 2; n++) spawnEnemy('specter', { x: e.x + rand(-40, 40), y: e.y + rand(-40, 40) });
            e.summonCd = 8.4;
          }
        }
      } else if (e.kind === 'lich') {
        e.shootCd -= dt;
        e.castCd -= dt;
        e.summonCd -= dt;
        const desired = 300;
        const perpX = -diry;
        const perpY = dirx;
        const push = d > desired ? 0.8 : -0.9;
        const strafe = Math.sin(e.t * 1.1 + e.phase) > 0 ? 0.55 : -0.55;
        e.vx = lerp(e.vx, (dirx * push + perpX * strafe) * e.speed, 1 - Math.exp(-dt * 2.9));
        e.vy = lerp(e.vy, (diry * push + perpY * strafe) * e.speed, 1 - Math.exp(-dt * 2.9));

        if (e.shootCd <= 0) {
          const base = angleTo(e.x, e.y, p.x, p.y);
          const shots = e.hp < e.maxHp * 0.45 ? 5 : 3;
          for (let n = 0; n < shots; n++) {
            const a = base + (n - (shots - 1) / 2) * 0.18;
            fireEnemyBullet(e.x, e.y - 4, Math.cos(a) * 260, Math.sin(a) * 260, 8, e.damage, 5.2, '#9dc1ff', 'skull');
          }
          e.shootCd = e.hp < e.maxHp * 0.45 ? 1.1 : 1.55;
        }
        if (e.castCd <= 0) {
          pushLimited(state.hazards, {
            type: 'rune',
            x: p.x + p.vx * 0.26,
            y: p.y + p.vy * 0.26,
            r: 115 + rand(-12, 18),
            delay: 1.05,
            maxDelay: 1.05,
            damage: 24,
            color: '#9fb9ff',
          }, 24);
          e.castCd = e.hp < e.maxHp * 0.45 ? 3.2 : 4.8;
        }
        if (e.summonCd <= 0) {
          spawnEnemy('specter', { x: e.x + rand(-60, 60), y: e.y + rand(-60, 60) });
          spawnEnemy('specter', { x: e.x + rand(-60, 60), y: e.y + rand(-60, 60) });
          if (Math.random() < 0.7) spawnEnemy('brute', { x: e.x + rand(-80, 80), y: e.y + rand(-80, 80) });
          e.summonCd = 8.6;
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (dist2(e.x, e.y, p.x, p.y) < (e.r + p.r - 2) * (e.r + p.r - 2)) {
        damagePlayer(e.damage, e.x, e.y, e.color);
      }
    }
  }

  function updateProjectiles(dt) {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.life -= dt;
      p.px = p.x;
      p.py = p.y;
      p.age = (p.age || 0) + dt;
      if (p.type === 'spirit' || p.type === 'spark') {
        const target = nearestEnemy(p.x, p.y, 520);
        if (target) {
          const a = angleTo(p.x, p.y, target.x, target.y);
          const speed = Math.hypot(p.vx, p.vy) || 1;
          const turn = p.turn || p.homing || 3;
          p.vx = lerp(p.vx, Math.cos(a) * speed, 1 - Math.exp(-dt * turn));
          p.vy = lerp(p.vy, Math.sin(a) * speed, 1 - Math.exp(-dt * turn));
        }
      } else if (p.type === 'scythe') {
        p.rot = (p.rot || 0) + (p.spinRate || 10) * dt;
        if (p.age > p.returnAt) {
          const a = angleTo(p.x, p.y, state.player.x, state.player.y);
          const speed = Math.hypot(p.vx, p.vy);
          p.vx = lerp(p.vx, Math.cos(a) * speed, 1 - Math.exp(-dt * 6));
          p.vy = lerp(p.vy, Math.sin(a) * speed, 1 - Math.exp(-dt * 6));
          if (dist2(p.x, p.y, state.player.x, state.player.y) < 28 * 28) {
            state.projectiles.splice(i, 1);
            continue;
          }
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let removed = false;
      for (const e of state.enemies) {
        if (e.dead) continue;
        const rr = p.r + e.r;
        if (dist2(p.x, p.y, e.x, e.y) > rr * rr) continue;
        if (p.type === 'scythe') {
          const hitUntil = p.hitMap.get(e.id) || 0;
          if (p.age < hitUntil) continue;
          p.hitMap.set(e.id, p.age + 0.18);
          damageEnemy(e, p.damage, { x: p.x, y: p.y, noCrit: false });
          particleBurst(p.x, p.y, 4, '#dbe6ff', { speed1: 20, speed2: 90, size1: 1, size2: 2, life1: 0.06, life2: 0.18 });
        } else {
          if (p.hitSet.has(e.id)) continue;
          p.hitSet.add(e.id);
          damageEnemy(e, p.damage, { x: p.x, y: p.y, noCrit: p.type === 'spark' });
          particleBurst(p.x, p.y, 4, p.color, { speed1: 20, speed2: 90, size1: 1, size2: 2, life1: 0.06, life2: 0.18 });
          p.penetration -= 1;
          if (p.penetration <= 0) {
            removed = true;
            break;
          }
        }
      }

      if (removed || p.life <= 0) {
        state.projectiles.splice(i, 1);
      }
    }
  }

  function updateEnemyBullets(dt) {
    const p = state.player;
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      b.life -= dt;
      b.px = b.x;
      b.py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
        damagePlayer(b.damage, b.x, b.y, b.color);
        particleBurst(b.x, b.y, 8, b.color, { speed1: 20, speed2: 120, size1: 1, size2: 3, life1: 0.06, life2: 0.24 });
        state.enemyBullets.splice(i, 1);
        continue;
      }
      if (b.life <= 0) state.enemyBullets.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    const p = state.player;
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const item = state.pickups[i];
      item.life -= dt;
      item.t += dt;
      item.vx *= 0.96;
      item.vy *= 0.96;
      const dx = p.x - item.x;
      const dy = p.y - item.y;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d < p.magnet) {
        item.vx += (dx / d) * (240 + p.magnet * 4.2) * dt;
        item.vy += (dy / d) * (240 + p.magnet * 4.2) * dt;
      }
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      if (d < p.r + item.r + 6) {
        if (item.type === 'xp') {
          addXp(item.value);
          particleBurst(item.x, item.y, 8, '#9ebdff', { speed1: 20, speed2: 110, size1: 1, size2: 3, life1: 0.08, life2: 0.26 });
        } else if (item.type === 'heart') {
          healPlayer(item.value);
          particleBurst(item.x, item.y, 10, '#89ffbc', { speed1: 20, speed2: 120, size1: 1, size2: 4, life1: 0.08, life2: 0.32 });
        } else if (item.type === 'chest') {
          state.pendingLevelUps += item.value;
          showBanner('Treasure Chest', item.value > 1 ? 'A double blessing awaits' : 'Choose another boon', 2.2);
          if (state.mode === 'playing') openLevelUp();
          particleBurst(item.x, item.y, 18, '#ffd67c', { speed1: 40, speed2: 180, size1: 2, size2: 5, life1: 0.12, life2: 0.48 });
          addRing(item.x, item.y, 10, 90, '#ffd67c', 0.35, 5);
        }
        state.pickups.splice(i, 1);
        continue;
      }
      if (item.life <= 0) state.pickups.splice(i, 1);
    }
  }

  function updateHazards(dt) {
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      h.delay -= dt;
      if (h.delay <= 0) {
        addRing(h.x, h.y, 8, h.r, h.color, 0.38, 6, 0.06);
        particleBurst(h.x, h.y, 20, h.color, { speed1: 50, speed2: 240, size1: 2, size2: 5, life1: 0.12, life2: 0.48 });
        if (dist2(h.x, h.y, state.player.x, state.player.y) <= (h.r + state.player.r) * (h.r + state.player.r)) {
          damagePlayer(h.damage, h.x, h.y, h.color);
        }
        state.hazards.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      p.px = p.x;
      p.py = p.y;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += (p.spin || 0) * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function updateRings(dt) {
    for (let i = state.rings.length - 1; i >= 0; i--) {
      const r = state.rings[i];
      r.life -= dt;
      const t = 1 - (r.life / r.maxLife);
      r.r = lerp(r.from, r.to, t);
      if (r.life <= 0) state.rings.splice(i, 1);
    }
  }

  function updateBeams(dt) {
    for (let i = state.beams.length - 1; i >= 0; i--) {
      const b = state.beams[i];
      b.life -= dt;
      if (b.life <= 0) state.beams.splice(i, 1);
    }
  }

  function updateTexts(dt) {
    for (let i = state.texts.length - 1; i >= 0; i--) {
      const t = state.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) state.texts.splice(i, 1);
    }
  }

  function updateDecals(dt) {
    for (let i = state.decals.length - 1; i >= 0; i--) {
      const d = state.decals[i];
      d.life -= dt;
      if (d.life <= 0) state.decals.splice(i, 1);
    }
  }

  function updateCamera(dt) {
    const c = state.camera;
    const targetX = state.player.x + state.player.vx * 0.05;
    const targetY = state.player.y + state.player.vy * 0.05;
    c.x = lerp(c.x, targetX, 1 - Math.exp(-dt * 6));
    c.y = lerp(c.y, targetY, 1 - Math.exp(-dt * 6));
    const targetZoom = 1 + (state.player.dashT > 0 ? 0.035 : 0) + (bestBoss() ? 0.012 : 0);
    c.zoom = lerp(c.zoom, targetZoom, 1 - Math.exp(-dt * 4));
    c.shake = Math.max(0, c.shake - dt * 4.6);
    c.sx = rand(-1, 1) * c.shake * 12;
    c.sy = rand(-1, 1) * c.shake * 12;
  }

  function updateCommon(dt) {
    state.t += dt;
    if (state.mode === 'playing') state.runTime += dt;
    for (const k of Object.keys(audioGates)) audioGates[k] = Math.max(0, audioGates[k] - dt);
    state.flash = Math.max(0, state.flash - dt * 1.8);
    state.damageFlash = Math.max(0, state.damageFlash - dt * 2.4);

    state.thunderTimer -= dt;
    if (state.thunderTimer <= 0) {
      state.thunderTimer = rand(8, 16);
      state.lightning = 1;
      state.flash = Math.max(state.flash, 0.22);
    }
    state.lightning = Math.max(0, state.lightning - dt * 3);

    if (state.bannerT > 0) {
      if (state.bannerT < 998) state.bannerT -= dt;
      if (state.bannerT <= 0) clearBanner();
    }
  }

  function updateTitleAmbient(dt) {
    if (Math.random() < 0.22) {
      addParticle({
        x: state.camera.x + rand(-180, 180),
        y: state.camera.y + rand(-140, 100),
        px: 0, py: 0,
        vx: rand(-8, 8),
        vy: rand(-20, -8),
        size: rand(1, 3),
        life: rand(1.8, 3.2),
        drag: 0.995,
        gravity: 0,
        color: choose(['#ff7ca8', '#b890ff', '#b6d6ff']),
        shape: 'circle',
        glow: 0.75,
        spin: rand(-1, 1),
        rot: rand(TAU),
      });
    }
    updateParticles(dt);
    updateRings(dt);
    updateBeams(dt);
    updateTexts(dt);
    updateDecals(dt);
    updateCamera(dt);
  }

  function update(dt) {
    updateCommon(dt);
    if (state.mode === 'title') {
      updateTitleAmbient(dt);
      refreshHUD();
      return;
    }
    if (state.mode === 'dead') {
      updateParticles(dt);
      updateRings(dt);
      updateBeams(dt);
      updateTexts(dt);
      updateDecals(dt);
      updateCamera(dt);
      refreshHUD();
      return;
    }
    if (state.mode === 'levelup' || state.paused) {
      updateParticles(dt * 0.8);
      updateRings(dt * 0.8);
      updateBeams(dt * 0.8);
      updateTexts(dt * 0.8);
      updateCamera(dt * 0.5);
      refreshHUD();
      return;
    }
    if (state.freeze > 0) {
      state.freeze -= dt;
      updateParticles(dt * 0.75);
      updateRings(dt * 0.75);
      updateBeams(dt * 0.75);
      updateTexts(dt * 0.75);
      updateDecals(dt * 0.75);
      updateCamera(dt);
      refreshHUD();
      return;
    }

    updatePlayer(dt);
    updateSpawns(dt);
    updateWeapons(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateEnemyBullets(dt);
    updatePickups(dt);
    updateHazards(dt);
    updateParticles(dt);
    updateRings(dt);
    updateBeams(dt);
    updateTexts(dt);
    updateDecals(dt);
    updateCamera(dt);
    refreshHUD();
  }

  function drawMoonAndSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#090211');
    g.addColorStop(0.45, '#100218');
    g.addColorStop(1, '#07010d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const stars = 90;
    ctx.save();
    for (let i = 0; i < stars; i++) {
      const sx = (hash2(i + 1, 9) * W + state.t * (i % 3 === 0 ? 1.1 : 0.45)) % W;
      const sy = hash2(i + 7, 21) * H * 0.65;
      const a = 0.15 + hash2(i + 2, 12) * 0.45 + Math.sin(state.t * 2 + i) * 0.06;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(sx, sy, 1.2 + hash2(i, 14) * 1.4, 1.2 + hash2(i, 14) * 1.4);
    }
    ctx.restore();

    const moonX = W * 0.82 - state.camera.x * 0.025;
    const moonY = H * 0.19 - state.camera.y * 0.02;
    const moonR = Math.min(W, H) * 0.12;
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.2, moonX, moonY, moonR * 2.2);
    halo.addColorStop(0, 'rgba(255,233,210,0.22)');
    halo.addColorStop(0.35, 'rgba(255,116,170,0.14)');
    halo.addColorStop(1, 'rgba(255,116,170,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.2, 0, TAU);
    ctx.fill();

    const moon = ctx.createRadialGradient(moonX - moonR * 0.22, moonY - moonR * 0.18, moonR * 0.08, moonX, moonY, moonR);
    moon.addColorStop(0, '#fff8f1');
    moon.addColorStop(0.45, '#ffd7db');
    moon.addColorStop(1, '#ff7da6');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(13,3,10,0.55)';
    ctx.beginPath();
    ctx.arc(moonX + moonR * 0.28, moonY - moonR * 0.08, moonR * 0.92, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = 'rgba(8,2,12,0.9)';
    const hillY = H * 0.66;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, hillY);
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * W;
      const y = hillY + Math.sin(i * 0.7 + state.camera.x * 0.0004) * 22 + (i % 2 ? 26 : -8);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const castleX = W * 0.23 - state.camera.x * 0.04;
    const castleY = H * 0.64;
    ctx.fillStyle = 'rgba(12,2,14,0.95)';
    ctx.beginPath();
    ctx.moveTo(castleX - 80, castleY + 60);
    ctx.lineTo(castleX - 80, castleY);
    ctx.lineTo(castleX - 50, castleY - 50);
    ctx.lineTo(castleX - 35, castleY);
    ctx.lineTo(castleX - 35, castleY + 14);
    ctx.lineTo(castleX - 20, castleY - 16);
    ctx.lineTo(castleX - 6, castleY + 10);
    ctx.lineTo(castleX - 6, castleY - 60);
    ctx.lineTo(castleX + 16, castleY - 100);
    ctx.lineTo(castleX + 30, castleY - 60);
    ctx.lineTo(castleX + 30, castleY + 8);
    ctx.lineTo(castleX + 44, castleY - 20);
    ctx.lineTo(castleX + 60, castleY + 20);
    ctx.lineTo(castleX + 60, castleY - 44);
    ctx.lineTo(castleX + 80, castleY - 76);
    ctx.lineTo(castleX + 94, castleY - 44);
    ctx.lineTo(castleX + 94, castleY + 60);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 5; i++) {
      const cx = (W * (0.2 + i * 0.18) + state.t * (4 + i) - state.camera.x * 0.015) % (W + 220) - 110;
      const cy = H * (0.16 + i * 0.06);
      const rx = 150 + i * 38;
      const ry = 34 + i * 8;
      const cloud = ctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx);
      cloud.addColorStop(0, 'rgba(255,130,180,0.05)');
      cloud.addColorStop(1, 'rgba(255,130,180,0)');
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (state.lightning > 0.02) {
      ctx.save();
      const a = state.lightning * 0.5;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 22;
      ctx.shadowColor = 'rgba(255,255,255,0.7)';
      const x0 = W * 0.12 + Math.sin(state.t * 3.7) * 70;
      let x = x0, y = 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i < 6; i++) {
        x += rand(-25, 25);
        y += H * 0.08;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGroundDecor() {
    const b = worldBounds();
    const cell = 180;
    const gx0 = Math.floor(b.minX / cell) - 1;
    const gx1 = Math.floor(b.maxX / cell) + 1;
    const gy0 = Math.floor(b.minY / cell) - 1;
    const gy1 = Math.floor(b.maxY / cell) + 1;

    ctx.save();
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const h = hash2(gx, gy);
        const x = gx * cell + (hash2(gx + 4, gy + 8) - 0.5) * cell * 0.7;
        const y = gy * cell + (hash2(gx + 12, gy + 2) - 0.5) * cell * 0.7;

        if (h > 0.88) drawDeadTree(x, y, 0.9 + hash2(gx + 1, gy + 5));
        else if (h > 0.76) drawTombstone(x, y, 0.8 + hash2(gx + 7, gy + 3) * 0.8);
        else if (h > 0.58 && h < 0.63) drawRuneStone(x, y, 0.8 + hash2(gx + 2, gy + 9) * 0.7);
        else if (h < 0.045) drawCandles(x, y, 0.75 + hash2(gx + 9, gy + 4) * 0.9);

        const fogRoll = hash2(gx + 17, gy + 21);
        if (fogRoll > 0.94) {
          const fog = ctx.createRadialGradient(x, y, 10, x, y, 120);
          fog.addColorStop(0, 'rgba(255,170,220,0.05)');
          fog.addColorStop(1, 'rgba(255,170,220,0)');
          ctx.fillStyle = fog;
          ctx.beginPath();
          ctx.ellipse(x, y, 120, 42, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawTombstone(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    const w = 18 * s;
    const h = 28 * s;
    ctx.fillStyle = 'rgba(15,8,18,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 4 + h, w * 1.1, 5 * s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#120915';
    ctx.beginPath();
    ctx.moveTo(-w, h);
    ctx.lineTo(-w, 0);
    ctx.quadraticCurveTo(-w, -h * 0.65, 0, -h * 0.65);
    ctx.quadraticCurveTo(w, -h * 0.65, w, 0);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,220,0.06)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function drawDeadTree(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#140914';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(0, 28 * s);
    ctx.lineTo(0, -10 * s);
    ctx.moveTo(0, -2 * s);
    ctx.lineTo(12 * s, -18 * s);
    ctx.moveTo(0, -6 * s);
    ctx.lineTo(-14 * s, -24 * s);
    ctx.moveTo(6 * s, -12 * s);
    ctx.lineTo(18 * s, -28 * s);
    ctx.moveTo(-8 * s, -14 * s);
    ctx.lineTo(-22 * s, -32 * s);
    ctx.stroke();
    ctx.restore();
  }

  function drawRuneStone(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hash2(x, y) * 0.4);
    ctx.fillStyle = '#120815';
    ctx.beginPath();
    ctx.moveTo(0, -18 * s);
    ctx.lineTo(14 * s, 0);
    ctx.lineTo(0, 18 * s);
    ctx.lineTo(-14 * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(173,145,255,0.18)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * s, 0, TAU);
    ctx.moveTo(-8 * s, 0);
    ctx.lineTo(8 * s, 0);
    ctx.moveTo(0, -8 * s);
    ctx.lineTo(0, 8 * s);
    ctx.stroke();
    ctx.restore();
  }

  function drawCandles(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * 8 * s;
      ctx.fillStyle = '#f0dac0';
      ctx.fillRect(ox - 2 * s, 0, 4 * s, 10 * s);
      const glow = ctx.createRadialGradient(ox, -2 * s, 1, ox, -2 * s, 14 * s);
      glow.addColorStop(0, 'rgba(255,215,140,0.45)');
      glow.addColorStop(1, 'rgba(255,215,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ox, -2 * s, 14 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffb86b';
      ctx.beginPath();
      ctx.moveTo(ox, -7 * s);
      ctx.lineTo(ox + 3 * s, -2 * s);
      ctx.lineTo(ox, 1 * s);
      ctx.lineTo(ox - 3 * s, -2 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHazards() {
    ctx.save();
    for (const h of state.hazards) {
      const t = 1 - (h.delay / h.maxDelay);
      const alpha = 0.18 + t * 0.3;
      ctx.strokeStyle = `rgba(159,185,255,${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, state.t * 2, state.t * 2 + TAU * 0.82);
      ctx.stroke();
      ctx.strokeStyle = `rgba(159,185,255,${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 0.55, -state.t * 1.7, -state.t * 1.7 + TAU * 0.72);
      ctx.stroke();
      ctx.fillStyle = `rgba(159,185,255,${0.04 + t * 0.05})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDecals() {
    ctx.save();
    for (const d of state.decals) {
      const a = clamp(d.life / d.maxLife, 0, 1) * 0.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = d.color;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, d.r, d.r * d.squish, 0, 0, TAU);
      ctx.fill();
      ctx.setTransform(state.camera.zoom, 0, 0, state.camera.zoom, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }

  function drawPickups() {
    ctx.save();
    for (const item of state.pickups) {
      const bob = Math.sin(item.t * 4 + item.phase) * 2;
      const x = item.x;
      const y = item.y + bob;
      if (item.type === 'xp') {
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#90a7ff';
        ctx.fillStyle = '#93a7ff';
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x - 6, y);
        ctx.closePath();
        ctx.fill();
      } else if (item.type === 'heart') {
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#7dffbe';
        ctx.fillStyle = '#7dffbe';
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.bezierCurveTo(x - 16, y - 6, x - 10, y - 18, x, y - 8);
        ctx.bezierCurveTo(x + 10, y - 18, x + 16, y - 6, x, y + 6);
        ctx.fill();
      } else {
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffd76e';
        ctx.fillStyle = '#ffd76e';
        ctx.fillRect(x - 10, y - 8, 20, 16);
        ctx.strokeStyle = '#fff2c8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 10, y - 8, 20, 16);
        ctx.fillStyle = '#8c5019';
        ctx.fillRect(x - 10, y - 4, 20, 4);
      }
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const alpha = e.kind === 'specter' ? 0.72 + Math.sin(e.t * 6 + e.phase) * 0.12 : 1;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.85, e.r * 0.9, e.r * 0.35, 0, 0, TAU);
    ctx.fill();

    const facing = Math.atan2(e.vy || 0.01, e.vx || 1);
    ctx.rotate(facing);

    if (e.boss) {
      const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, e.r * 1.8);
      glow.addColorStop(0, e.kind === 'countess' ? 'rgba(255,90,136,0.18)' : 'rgba(149,180,255,0.18)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.8, 0, TAU);
      ctx.fill();
    }

    if (e.kind === 'bat') {
      const flap = Math.sin(e.t * 18) * 0.55;
      ctx.fillStyle = '#210915';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r * 0.38, e.r * 0.58, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(-e.r * 1.6, -e.r * (0.4 + flap));
      ctx.lineTo(-e.r * 0.8, e.r * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -2);
      ctx.lineTo(e.r * 1.6, -e.r * (0.4 - flap));
      ctx.lineTo(e.r * 0.8, e.r * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff8db6';
      ctx.fillRect(-4, -3, 2, 2);
      ctx.fillRect(2, -3, 2, 2);
    } else if (e.kind === 'ghoul') {
      ctx.fillStyle = '#1e0d14';
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.7, e.r * 0.6);
      ctx.lineTo(-e.r * 0.45, -e.r * 0.35);
      ctx.quadraticCurveTo(0, -e.r * 0.9, e.r * 0.45, -e.r * 0.3);
      ctx.lineTo(e.r * 0.7, e.r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f4d4d9';
      ctx.beginPath();
      ctx.arc(0, -e.r * 0.42, e.r * 0.22, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff91b2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.3, e.r * 0.05);
      ctx.lineTo(-e.r * 0.75, e.r * 0.28);
      ctx.moveTo(e.r * 0.3, e.r * 0.05);
      ctx.lineTo(e.r * 0.75, e.r * 0.28);
      ctx.stroke();
    } else if (e.kind === 'specter') {
      const g = ctx.createLinearGradient(0, -e.r, 0, e.r);
      g.addColorStop(0, '#bfe5ff');
      g.addColorStop(1, '#315c7e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.55, e.r * 0.32);
      ctx.quadraticCurveTo(-e.r * 0.8, -e.r * 0.2, 0, -e.r * 0.9);
      ctx.quadraticCurveTo(e.r * 0.8, -e.r * 0.2, e.r * 0.55, e.r * 0.3);
      ctx.quadraticCurveTo(e.r * 0.18, e.r * 1.05, 0, e.r * 0.6);
      ctx.quadraticCurveTo(-e.r * 0.18, e.r * 1.05, -e.r * 0.55, e.r * 0.32);
      ctx.fill();
      ctx.fillStyle = '#0d1520';
      ctx.fillRect(-4, -e.r * 0.35, 2, 4);
      ctx.fillRect(2, -e.r * 0.35, 2, 4);
    } else if (e.kind === 'brute') {
      ctx.fillStyle = '#2a1016';
      ctx.beginPath();
      ctx.rect(-e.r * 0.7, -e.r * 0.45, e.r * 1.4, e.r * 1.4);
      ctx.fill();
      ctx.fillStyle = '#6f2331';
      ctx.fillRect(-e.r * 0.55, -e.r * 0.25, e.r * 1.1, e.r * 0.18);
      ctx.fillStyle = '#ffe3dd';
      ctx.fillRect(-6, -e.r * 0.15, 3, 4);
      ctx.fillRect(3, -e.r * 0.15, 3, 4);
    } else if (e.kind === 'witch') {
      ctx.fillStyle = '#1d0e26';
      ctx.beginPath();
      ctx.moveTo(0, -e.r * 0.9);
      ctx.lineTo(e.r * 0.35, -e.r * 0.2);
      ctx.lineTo(-e.r * 0.3, -e.r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.65, e.r * 0.7);
      ctx.lineTo(0, -e.r * 0.2);
      ctx.lineTo(e.r * 0.65, e.r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f6d3ff';
      ctx.beginPath();
      ctx.arc(0, -e.r * 0.25, e.r * 0.22, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b06bff';
      ctx.beginPath();
      ctx.arc(e.r * 0.58, 0, 4, 0, TAU);
      ctx.fill();
    } else if (e.kind === 'charger') {
      ctx.fillStyle = '#2a1217';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r * 0.9, e.r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff8ea5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.r * 0.2, -e.r * 0.2);
      ctx.lineTo(e.r * 0.65, -e.r * 0.7);
      ctx.moveTo(e.r * 0.2, e.r * 0.2);
      ctx.lineTo(e.r * 0.65, e.r * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#ffe6e7';
      ctx.fillRect(e.r * 0.12, -3, 3, 3);
      ctx.fillRect(e.r * 0.12, 1, 3, 3);
    } else if (e.kind === 'countess') {
      ctx.fillStyle = '#2c0817';
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.9, e.r * 0.7);
      ctx.lineTo(-e.r * 0.2, -e.r * 0.1);
      ctx.lineTo(0, -e.r * 0.95);
      ctx.lineTo(e.r * 0.2, -e.r * 0.1);
      ctx.lineTo(e.r * 0.9, e.r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7d1da';
      ctx.beginPath();
      ctx.arc(0, -e.r * 0.24, e.r * 0.26, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff8baa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.2, -e.r * 0.62);
      ctx.lineTo(-e.r * 0.42, -e.r * 1.02);
      ctx.moveTo(e.r * 0.2, -e.r * 0.62);
      ctx.lineTo(e.r * 0.42, -e.r * 1.02);
      ctx.stroke();
      ctx.fillStyle = '#ff8baa';
      ctx.fillRect(-6, -e.r * 0.25, 3, 4);
      ctx.fillRect(3, -e.r * 0.25, 3, 4);
    } else if (e.kind === 'lich') {
      ctx.fillStyle = '#151624';
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.75, e.r * 0.75);
      ctx.lineTo(0, -e.r);
      ctx.lineTo(e.r * 0.75, e.r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dce7ff';
      ctx.beginPath();
      ctx.arc(0, -e.r * 0.28, e.r * 0.22, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#84b7ff';
      ctx.fillRect(-5, -e.r * 0.28, 3, 4);
      ctx.fillRect(2, -e.r * 0.28, 3, 4);
      ctx.strokeStyle = '#84b7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.r * 0.58, -e.r * 0.15);
      ctx.lineTo(e.r * 0.58, e.r * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(e.r * 0.58, e.r * 0.55, 6, 0, TAU);
      ctx.stroke();
    }

    if (e.hitFlash > 0) {
      ctx.globalAlpha = e.hitFlash * 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.12, 0, TAU);
      ctx.fill();
    }

    if (e.elite) {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#ffd1e6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.25, -state.t, -state.t + TAU * 0.72);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.facing + Math.sin(state.t * 4) * 0.02);

    const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 56);
    aura.addColorStop(0, 'rgba(255,120,170,0.22)');
    aura.addColorStop(1, 'rgba(255,120,170,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 18, 7, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#22091a';
    ctx.beginPath();
    ctx.moveTo(-18, 22);
    ctx.lineTo(-7, -2);
    ctx.lineTo(0, -26);
    ctx.lineTo(7, -2);
    ctx.lineTo(18, 22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f7dde5';
    ctx.beginPath();
    ctx.arc(0, -18, 8, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#ff8aae';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(20, -24);
    ctx.stroke();

    ctx.fillStyle = '#ff8aae';
    ctx.fillRect(-4, -20, 2.2, 2.4);
    ctx.fillRect(1.8, -20, 2.2, 2.4);

    if (p.invuln > 0) {
      ctx.globalAlpha = p.invuln * 0.65;
      ctx.strokeStyle = '#fff4f8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(state.t * 30) * 2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrbitalsAndDrones() {
    ctx.save();
    for (const orb of state.orbitalsRender) {
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ff7eaf';
      const g = ctx.createLinearGradient(orb.x - orb.r, orb.y - orb.r, orb.x + orb.r, orb.y + orb.r);
      g.addColorStop(0, '#ffd5e6');
      g.addColorStop(1, '#ff7eaf');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(orb.x, orb.y, orb.r * 0.92, orb.r * 0.66, orb.angle + state.t * 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#fff7fb';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(orb.x - orb.r * 0.45, orb.y);
      ctx.lineTo(orb.x + orb.r * 0.45, orb.y);
      ctx.stroke();
    }
    for (const d of state.dronesRender) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#8fbaff';
      ctx.fillStyle = '#0b1121';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 10, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#a6c8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x - 8, d.y);
      ctx.lineTo(d.x + 8, d.y);
      ctx.moveTo(d.x, d.y - 8);
      ctx.lineTo(d.x, d.y + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawProjectiles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.projectiles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      if (p.type === 'bolt' || p.type === 'droneBolt' || p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.type === 'spark' ? 2.8 : 3.2;
        ctx.shadowBlur = p.type === 'spark' ? 20 : 14;
        ctx.shadowColor = p.glow || p.color;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.55, 0, TAU);
        ctx.fill();
      } else if (p.type === 'scythe') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.shadowBlur = 18;
        ctx.shadowColor = p.glow || p.color;
        ctx.fillStyle = '#dbe6ff';
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.quadraticCurveTo(p.r * 0.88, -p.r * 0.2, p.r * 0.18, p.r * 0.82);
        ctx.quadraticCurveTo(-p.r * 0.1, p.r * 0.05, 0, -p.r);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'spirit') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.glow || p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ecf8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawEnemyBullets() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.enemyBullets) {
      const alpha = clamp(b.life / b.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 18;
      ctx.shadowColor = b.color;
      if (b.kind === 'petal') {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.r * 1.2, b.r * 0.7, Math.atan2(b.vy, b.vx), 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.28, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of state.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.95;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.shadowBlur = 12 * (p.glow || 0.6);
      ctx.shadowColor = p.color;
      if (p.shape === 'line') {
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawRingsAndBeams() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const r of state.rings) {
      const a = clamp(r.life / r.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.shadowBlur = 18;
      ctx.shadowColor = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
      if (r.fillAlpha > 0) {
        ctx.fillStyle = r.color.replace('rgb', 'rgba');
        ctx.globalAlpha = a * r.fillAlpha;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, TAU);
        ctx.fill();
      }
    }

    for (const b of state.beams) {
      const a = clamp(b.life / b.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.shadowBlur = 20;
      ctx.shadowColor = b.color;
      ctx.beginPath();
      for (let i = 0; i < b.points.length; i++) {
        const p = b.points[i];
        const jitter = i > 0 && i < b.points.length - 1 ? Math.sin(state.t * 60 + i * 9 + b.seed) * 6 : 0;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x + jitter, p.y - jitter * 0.45);
      }
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.2, b.width * 0.38);
      ctx.beginPath();
      for (let i = 0; i < b.points.length; i++) {
        const p = b.points[i];
        const jitter = i > 0 && i < b.points.length - 1 ? Math.sin(state.t * 60 + i * 9 + b.seed) * 4 : 0;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x + jitter, p.y - jitter * 0.28);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTexts() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of state.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `900 ${t.size}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  function renderWorld() {
    drawGroundDecor();

    drawHazards();

    ctx.save();
    for (const d of state.decals) {
      const a = clamp(d.life / d.maxLife, 0, 1) * 0.42;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = d.color;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, d.r, d.r * d.squish, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    drawPickups();

    const sortedEnemies = [...state.enemies].sort((a, b) => (a.y + a.r) - (b.y + b.r));
    for (const e of sortedEnemies) drawEnemy(e);

    drawOrbitalsAndDrones();
    drawPlayer();
    drawEnemyBullets();
    drawProjectiles();
    drawParticles();
    drawRingsAndBeams();
    drawTexts();
  }

  function drawScreenFX() {
    ctx.save();
    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.48, Math.min(W, H) * 0.18, W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    if (state.damageFlash > 0.01) {
      ctx.fillStyle = `rgba(255,64,102,${state.damageFlash * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (state.flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.12})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (state.paused && state.mode === 'playing') {
      ctx.fillStyle = 'rgba(4,2,8,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 54px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#fff3fb';
      ctx.fillText('Paused', W / 2, H * 0.44);
      ctx.font = '700 16px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#efcadf';
      ctx.fillText('Press P or Esc to continue', W / 2, H * 0.5);
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawMoonAndSky();

    ctx.save();
    ctx.translate(W / 2 + state.camera.sx, H / 2 + state.camera.sy);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-state.camera.x, -state.camera.y);
    renderWorld();
    ctx.restore();

    drawScreenFX();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  refreshWeaponsUI();
  refreshHUD();
  const params = new URLSearchParams(location.search);
  if (params.get('autostart') === '1') {
    startRun();
  } else {
    setScreen('title');
  }
  requestAnimationFrame(loop);
})();
