// HEDGEHOME - Cozy Pixel-Art Hedgehog Life Simulator for R1

const W = 240, H = 282;
const TICK_MS = 1000;
const DAY_TICKS = 1440; // ageTicks are real-world minutes
const ACTIVE_MINUTES_PER_TICK = 1 / 60; // one live second advances one simulated second
const OFFLINE_TICK_MS = 60000; // offline progression advances once per elapsed minute
const PX = 2; // pixel grid size for retro feel
const PREVIEW_FREEZE = new URLSearchParams(window.location.search).has('freeze');

const STATES = { ADOPT: 0, NAMING: 1, LIVING: 2, DEATH: 3, MEMORIAL: 4 };

const FOOD_TYPES = [
  { name: 'Pellets',   nutrition: 8, hydration: 1, fiber: 6, sugar: 1, spriteW: 5, spriteH: 4, worldScale: 1.2, decayMinutes: 4320 },
  { name: 'Millet',    nutrition: 5, hydration: 0, fiber: 4, sugar: 2, spriteW: 4, spriteH: 3, worldScale: 1.0, decayMinutes: 5040 },
  { name: 'Sunflower', nutrition: 7, hydration: 0, fiber: 2, sugar: 1, spriteW: 4, spriteH: 6, worldScale: 0.9, decayMinutes: 4320 },
  { name: 'Broccoli',  nutrition: 4, hydration: 5, fiber: 8, sugar: 1, spriteW: 10, spriteH: 12, worldScale: 2.7, decayMinutes: 2160 },
  { name: 'Carrot',    nutrition: 3, hydration: 4, fiber: 5, sugar: 4, spriteW: 6, spriteH: 12, worldScale: 2.2, decayMinutes: 2880 },
  { name: 'Banana',    nutrition: 4, hydration: 3, fiber: 2, sugar: 8, spriteW: 12, spriteH: 6, worldScale: 1.95, decayMinutes: 2160 },
  { name: 'Egg',       nutrition: 10, hydration: 2, fiber: 0, sugar: 0, spriteW: 8, spriteH: 10, worldScale: 2.2, decayMinutes: 1440 },
];
const CLEAN_CAGE_SELECTION = FOOD_TYPES.length;
const SELECTOR_COUNT = FOOD_TYPES.length + 1;

const LIFE_STAGES = { JUVENILE: 0, ADULT: 1, SENIOR: 2 };
const STAGE_NAMES = ['Baby', 'Adult', 'Elder'];
const ACTIVITIES = { IDLE: 0, EATING: 1, RUNNING: 2, SLEEPING: 3, HIDING: 4, DRINKING: 5, GROOMING: 6 };
const HABITAT = {
  floorMinX: 38, floorMaxX: 204,
  hideoutX: 47, wheelEntryX: 87, wheelCenterX: 119,
  foodMinX: 145, foodMaxX: 201, waterX: 204,
};
const HABITAT_VIEW = { scale: 1.12, focusX: 120, focusY: 218 };
const BOTTLE_NOZZLE = { x: 193, y: 162 };

// Warm cozy palette inspired by retro pet games
const C = {
  bgWall: '#c7a777',
  bgWallLight: '#e2c89f',
  bgWallDark: '#9b7954',
  floor: '#c49660',
  floorLight: '#dab888',
  bedding: '#d6b277',
  beddingDark: '#ad824c',
  beddingLight: '#efd39c',
  beddingAccent: '#c69857',
  teal: '#668f7d',
  tealLight: '#91b5a3',
  tealDark: '#3f6557',
  wood: '#8a5830',
  woodLight: '#a87040',
  woodDark: '#5a3820',
  wheel: '#a8b0b8',
  wheelDark: '#707880',
  wheelLight: '#d0d8e0',
  wheelRim: '#606870',
  water: '#70c8f0',
  waterLight: '#a0e0ff',
  waterDark: '#4090b0',
  bottle: '#d8f0ff',
  bottleCap: '#668f7d',
  hideBody: '#6f9280',
  hideRoof: '#547665',
  hideRoofLight: '#8a5030',
  hideDoor: '#2a1810',
  uiBg: '#4a3528',
  uiBgLight: '#6a4a38',
  uiText: '#fff8ee',
  uiAccent: '#b64c35',
  uiDim: '#c8a888',
  uiWarm: '#ffa850',
  hedgeCoat: '#c97832',
  hedgeQuillLight: '#aa5e29',
  hedgeQuillDark: '#754322',
  hedgeFace: '#fff8e0',
  hedgeEar: '#ffb0b8',
  hedgeToe: '#e08090',
  hedgeMuzzle: '#ffe0b0',
  hedgeEye: '#183040',
  hedgeEyeGlint: '#308898',
  hedgeNose: '#d06868',
  hedgePaw: '#f8d8b0',
};

const HEDGEHOG_LOOKS = [
  { coat: '#c97832', light: '#e2964c', dark: '#754322', belly: '#fff1d2', cheek: '#ffe0b0', pattern: 'stripe' },
  { coat: '#e4c79e', light: '#f3dfbd', dark: '#9b7659', belly: '#fff7e8', cheek: '#f5d4bd', pattern: 'band' },
  { coat: '#a77b58', light: '#c8a47e', dark: '#554238', belly: '#f3dfc6', cheek: '#dfbfa3', pattern: 'sable' },
  { coat: '#4c4038', light: '#75645a', dark: '#261f1c', belly: '#f1e3cd', cheek: '#d9bca6', pattern: 'bib' },
  { coat: '#b76b50', light: '#d58d6c', dark: '#6d3d32', belly: '#f8e4ca', cheek: '#edc4ad', pattern: 'patches' },
  { coat: '#eee0c4', light: '#fff3dc', dark: '#b38a5d', belly: '#fffaf0', cheek: '#f5d9c1', pattern: 'hood' },
];

const NAMING_OPTIONS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ ', 'DELETE', 'DONE'];

// ============================================================
// GAME STATE
// ============================================================

let state = STATES.ADOPT;
let hedgehog = null;
let foodOnGround = []; // {type, x, y, remaining, maxAmount}
let fallingFood = [];
let selectedFoodIndex = 0;
let memorial = { legends: { oldest: null, heaviest: null, longestRunner: null }, lastFive: [] };
let lastTimestamp = Date.now();
let lastFrameTime = Date.now();
let tickAccumulator = 0;
let animFrame = 0;
let namingName = '';
let namingCharIndex = 0;
let deathCause = '';
let deathTimer = 0;
let wheelAngle = 0;
let walkPhase = 0;
let eatingAnim = 0;
let groomAnim = 0;
let messageTimer = 0;
let messageText = '';
let offlineMsg = '';
let offlineMsgTimer = 0;

// ============================================================
// CANVAS SETUP
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const hedgehogSprite = new Image();
hedgehogSprite.src = './hedgehog-character.png';
const habitatBackground = new Image(); habitatBackground.src = './habitat-background.png';
const habitatWheel = new Image(); habitatWheel.src = './habitat-wheel.png';
const habitatHideout = new Image(); habitatHideout.src = './habitat-hideout.png';
const habitatBottle = new Image(); habitatBottle.src = './habitat-bottle.png';

// ============================================================
// STORAGE
// ============================================================

async function saveGame() {
  const data = {
    version: 4,
    state, hedgehog, foodOnGround, memorial,
    lastTimestamp: Date.now(),
    selectedFoodIndex, wheelAngle,
  };
  try { localStorage.setItem('hedgehome', JSON.stringify(data)); }
  catch (e) { console.error('Local save error:', e); }
  if (window.creationStorage) {
    try { await window.creationStorage.plain.setItem('hedgehome', btoa(JSON.stringify(data))); }
    catch (e) { console.error('Save error:', e); }
  }
}

async function loadGame() {
  let data = null;
  if (window.creationStorage) {
    try {
      const stored = await window.creationStorage.plain.getItem('hedgehome') ||
        await window.creationStorage.plain.getItem('hamstory');
      if (stored) data = JSON.parse(atob(stored));
    } catch (e) { console.error('Load error:', e); }
  }
  if (!data) {
    try {
      const stored = localStorage.getItem('hedgehome') || localStorage.getItem('hamstory');
      if (stored) data = JSON.parse(stored);
    } catch (e) { console.error('Local save error:', e); }
  }
  if (data) {
    state = Object.values(STATES).includes(data.state) ? data.state : STATES.ADOPT;
    hedgehog = data.hedgehog || data.hamster;
    foodOnGround = (data.foodOnGround || data.foodQueue || []).map(food => ({ ageMinutes: 0, ...food }));
    memorial = data.memorial || { legends: { oldest: null, heaviest: null, longestRunner: null }, lastFive: [] };
    selectedFoodIndex = Number.isInteger(data.selectedFoodIndex)
      ? Math.max(0, Math.min(CLEAN_CAGE_SELECTION, data.selectedFoodIndex))
      : 0;
    lastTimestamp = data.lastTimestamp || Date.now();
    wheelAngle = data.wheelAngle || 0;
    if (hedgehog) {
      // v3 measured age in accelerated 60-tick days. Preserve the same age in days.
      if ((data.version || 3) < 4) hedgehog.metrics.ageTicks *= 24;
      hedgehog.posX = clampFloorX(Number.isFinite(hedgehog.posX) ? hedgehog.posX : 120);
      hedgehog.targetX = clampFloorX(Number.isFinite(hedgehog.targetX) ? hedgehog.targetX : hedgehog.posX);
      hedgehog.wheelPhase ||= null;
      hedgehog.appearance ||= stableAppearanceFor(hedgehog);
      if (!Number.isInteger(memorial.lastLookIndex)) memorial.lastLookIndex = hedgehog.appearance.lookIndex;
    }
    if (state === STATES.LIVING && hedgehog && hedgehog.alive) simulateOffline();
    else if (state === STATES.LIVING && (!hedgehog || !hedgehog.alive)) state = STATES.ADOPT;
  }
}

// ============================================================
// HEDGEHOG CREATION
// ============================================================

function createHedgehog(name) {
  const previousLook = Number.isInteger(memorial.lastLookIndex) ? memorial.lastLookIndex : -1;
  const lookIndex = (previousLook + 1) % HEDGEHOG_LOOKS.length;
  memorial.lastLookIndex = lookIndex;
  return {
    name,
    traits: {
      lifespan: 300 + Math.floor(Math.random() * 200),
      resilience: 0.3 + Math.random() * 0.5,
      metabolism: 0.7 + Math.random() * 0.6,
      wheelEnthusiasm: 0.3 + Math.random() * 0.7,
    },
    metrics: {
      ageTicks: 0, bodyMass: 25, health: 100,
      wheelDistance: 0, hunger: 30, thirst: 20,
    },
    activity: ACTIVITIES.IDLE,
    activityTimer: 0,
    posX: 120, targetX: 120,
    lifeStage: LIFE_STAGES.JUVENILE,
    born: Date.now(),
    alive: true,
    facing: 1, // 1=right, -1=left
    wheelPhase: null,
    appearance: { ...HEDGEHOG_LOOKS[lookIndex], lookIndex },
  };
}

function stableAppearanceFor(h) {
  if (h?.appearance) return h.appearance;
  const source = `${h?.name || 'HEDGEHOG'}:${h?.born || 0}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  const lookIndex = Math.abs(hash) % HEDGEHOG_LOOKS.length;
  return { ...HEDGEHOG_LOOKS[lookIndex], lookIndex };
}

function clampFloorX(x) {
  return Math.max(HABITAT.floorMinX, Math.min(HABITAT.floorMaxX, x));
}

function getLifeStage(h) {
  const pct = (h.metrics.ageTicks / DAY_TICKS) / h.traits.lifespan;
  if (pct < 0.2) return LIFE_STAGES.JUVENILE;
  if (pct < 0.7) return LIFE_STAGES.ADULT;
  return LIFE_STAGES.SENIOR;
}

// ============================================================
// SIMULATION
// ============================================================

function simulateTick(timeScaleMinutes = ACTIVE_MINUTES_PER_TICK, offline = false) {
  if (!hedgehog || !hedgehog.alive) return;

  hedgehog.metrics.ageTicks += timeScaleMinutes;
  const ageDays = hedgehog.metrics.ageTicks / DAY_TICKS;
  hedgehog.lifeStage = getLifeStage(hedgehog);

  hedgehog.metrics.hunger += 0.03 * hedgehog.traits.metabolism * timeScaleMinutes;
  hedgehog.metrics.thirst += 0.035 * timeScaleMinutes;

  // Food ages in real-world minutes. Older pieces visibly dull before disappearing.
  for (let i = foodOnGround.length - 1; i >= 0; i--) {
    const food = foodOnGround[i];
    food.ageMinutes = (food.ageMinutes || 0) + timeScaleMinutes;
    if (food.ageMinutes >= FOOD_TYPES[food.type].decayMinutes) {
      foodOnGround.splice(i, 1);
      if (i === 0 && hedgehog.activity === ACTIVITIES.EATING) {
        hedgehog.activity = ACTIVITIES.IDLE;
        hedgehog.activityTimer = 4;
        hedgehog.targetX = clampFloorX(hedgehog.posX);
      }
    }
  }

  // FIFO eating: approach the oldest piece, settle, then visibly nibble it.
  if (hedgehog.metrics.hunger > 25 && foodOnGround.length > 0 &&
      hedgehog.activity !== ACTIVITIES.RUNNING && hedgehog.activity !== ACTIVITIES.DRINKING) {
    if (hedgehog.activity !== ACTIVITIES.EATING) {
      hedgehog.activity = ACTIVITIES.EATING;
      hedgehog.activityTimer = 18;
      hedgehog.wheelPhase = null;
      hedgehog.targetX = clampFloorX(foodOnGround[0].x);
    }
  }

  if (hedgehog.activity === ACTIVITIES.EATING && foodOnGround.length > 0 &&
      Math.abs(hedgehog.posX - foodOnGround[0].x) < 9) {
    const food = foodOnGround[0];
    food.remaining -= 0.22;
    hedgehog.metrics.hunger = Math.max(0, hedgehog.metrics.hunger - FOOD_TYPES[food.type].nutrition * 0.16);
    hedgehog.metrics.thirst = Math.max(0, hedgehog.metrics.thirst - FOOD_TYPES[food.type].hydration * 0.12);
    const massGain = FOOD_TYPES[food.type].nutrition * 0.02;
    hedgehog.metrics.bodyMass += massGain * (hedgehog.lifeStage === LIFE_STAGES.JUVENILE ? 1.5 : 0.5);
    if (food.remaining <= 0) {
      foodOnGround.shift();
      hedgehog.activity = ACTIVITIES.IDLE;
      hedgehog.activityTimer = 6;
      hedgehog.targetX = clampFloorX(hedgehog.posX);
    }
    eatingAnim++;
  }

  if (hedgehog.metrics.thirst > 50 && hedgehog.activity !== ACTIVITIES.EATING && hedgehog.activity !== ACTIVITIES.RUNNING) {
    if (hedgehog.activity !== ACTIVITIES.DRINKING) {
      hedgehog.activity = ACTIVITIES.DRINKING;
      hedgehog.activityTimer = 10;
      hedgehog.wheelPhase = null;
      hedgehog.targetX = HABITAT.waterX;
    }
    if (Math.abs(hedgehog.posX - HABITAT.waterX) < 7) hedgehog.metrics.thirst = Math.max(0, hedgehog.metrics.thirst - 3);
  }

  const atTarget = Math.abs(hedgehog.posX - hedgehog.targetX) < 8;
  if (hedgehog.activity === ACTIVITIES.RUNNING) {
    if (!hedgehog.wheelPhase) hedgehog.wheelPhase = 'approach';
    if (hedgehog.wheelPhase === 'approach' && Math.abs(hedgehog.posX - HABITAT.wheelEntryX) < 4) {
      hedgehog.wheelPhase = 'climb';
      hedgehog.targetX = HABITAT.wheelCenterX;
    } else if (hedgehog.wheelPhase === 'climb' && Math.abs(hedgehog.posX - HABITAT.wheelCenterX) < 4) {
      hedgehog.wheelPhase = 'run';
      hedgehog.activityTimer = 22 + Math.floor(Math.random() * 28);
    } else if (hedgehog.wheelPhase === 'run') {
      const speed = 0.5 + hedgehog.traits.wheelEnthusiasm * 0.5;
      hedgehog.metrics.wheelDistance += speed;
      hedgehog.metrics.bodyMass = Math.max(15, hedgehog.metrics.bodyMass - 0.002 * timeScaleMinutes);
      hedgehog.metrics.hunger += 0.012 * timeScaleMinutes;
      hedgehog.activityTimer--;
      if (hedgehog.activityTimer <= 0) {
        hedgehog.wheelPhase = 'exit';
        hedgehog.targetX = HABITAT.wheelEntryX;
      }
    } else if (hedgehog.wheelPhase === 'exit' && Math.abs(hedgehog.posX - HABITAT.wheelEntryX) < 4) {
      hedgehog.wheelPhase = null;
      hedgehog.activity = ACTIVITIES.IDLE;
      hedgehog.activityTimer = 8;
      hedgehog.targetX = clampFloorX(66 + Math.random() * 42);
    }
  } else {
    // Non-wheel activity time begins only after physical arrival.
    if (atTarget || hedgehog.activity === ACTIVITIES.IDLE || hedgehog.activity === ACTIVITIES.GROOMING) hedgehog.activityTimer--;
    if (hedgehog.activityTimer <= 0) chooseNextActivity();
  }

  if (hedgehog.activity === ACTIVITIES.GROOMING) {
    groomAnim++;
  }

  // Update facing direction
  if (hedgehog.targetX > hedgehog.posX + 3) hedgehog.facing = 1;
  else if (hedgehog.targetX < hedgehog.posX - 3) hedgehog.facing = -1;

  let healthDelta = 0;
  if (hedgehog.metrics.hunger > 80) healthDelta -= 0.018 * timeScaleMinutes;
  if (hedgehog.metrics.hunger > 95) healthDelta -= 0.025 * timeScaleMinutes;
  if (hedgehog.metrics.thirst > 80) healthDelta -= 0.02 * timeScaleMinutes;
  if (hedgehog.metrics.hunger < 40 && hedgehog.metrics.thirst < 40) healthDelta += 0.012 * hedgehog.traits.resilience * timeScaleMinutes;
  if (hedgehog.metrics.bodyMass < 18) healthDelta -= 0.012 * timeScaleMinutes;
  if (hedgehog.metrics.bodyMass > 60) healthDelta -= 0.008 * timeScaleMinutes;
  const lifePercent = ageDays / hedgehog.traits.lifespan;
  if (lifePercent > 0.8) healthDelta -= 0.004 * (lifePercent - 0.8) * 10 * timeScaleMinutes;

  hedgehog.metrics.health = Math.max(0, Math.min(100, hedgehog.metrics.health + healthDelta));
  hedgehog.metrics.hunger = Math.min(100, hedgehog.metrics.hunger);
  hedgehog.metrics.thirst = Math.min(100, hedgehog.metrics.thirst);
  hedgehog.metrics.bodyMass = Math.max(10, Math.min(80, hedgehog.metrics.bodyMass));

  if (hedgehog.metrics.health <= 0) triggerDeath(ageDays);
  else if (ageDays >= hedgehog.traits.lifespan) { hedgehog.metrics.health = 0; triggerDeath(ageDays); }

  // Offline simulation still resolves travel; live travel is frame-synchronized.
  if (offline && Math.abs(hedgehog.posX - hedgehog.targetX) > 2) {
    const direction = Math.sign(hedgehog.targetX - hedgehog.posX);
    hedgehog.posX += direction * Math.min(8, Math.abs(hedgehog.targetX - hedgehog.posX));
  }
  hedgehog.posX = clampFloorX(hedgehog.posX);
  hedgehog.targetX = clampFloorX(hedgehog.targetX);

  if (!offline && Math.floor(hedgehog.metrics.ageTicks * 60) % 30 === 0) saveGame();
}

function chooseNextActivity() {
  const r = Math.random();
  const wc = hedgehog.traits.wheelEnthusiasm * 0.3;
  if (hedgehog.metrics.hunger > 25 && foodOnGround.length > 0) {
    hedgehog.activity = ACTIVITIES.EATING;
    hedgehog.activityTimer = 18;
    hedgehog.wheelPhase = null;
    hedgehog.targetX = clampFloorX(foodOnGround[0].x);
  } else if (r < wc && hedgehog.lifeStage !== LIFE_STAGES.SENIOR) {
    hedgehog.activity = ACTIVITIES.RUNNING;
    hedgehog.activityTimer = 0;
    hedgehog.wheelPhase = 'approach';
    hedgehog.targetX = HABITAT.wheelEntryX;
  } else if (r < wc + 0.15) {
    hedgehog.activity = ACTIVITIES.SLEEPING;
    hedgehog.activityTimer = 30 + Math.floor(Math.random() * 30);
    hedgehog.wheelPhase = null;
    hedgehog.targetX = HABITAT.hideoutX;
  } else if (r < wc + 0.25) {
    hedgehog.activity = ACTIVITIES.HIDING;
    hedgehog.activityTimer = 15 + Math.floor(Math.random() * 20);
    hedgehog.wheelPhase = null;
    hedgehog.targetX = HABITAT.hideoutX;
  } else if (r < wc + 0.35) {
    hedgehog.activity = ACTIVITIES.GROOMING;
    hedgehog.activityTimer = 8 + Math.floor(Math.random() * 12);
    groomAnim = 0;
  } else {
    hedgehog.activity = ACTIVITIES.IDLE;
    hedgehog.activityTimer = 10 + Math.floor(Math.random() * 20);
    hedgehog.wheelPhase = null;
    hedgehog.targetX = clampFloorX(62 + Math.floor(Math.random() * 106));
  }
}

function triggerDeath(ageDays) {
  hedgehog.alive = false;
  if (ageDays >= hedgehog.traits.lifespan * 0.9) deathCause = 'Passed peacefully of old age';
  else if (hedgehog.metrics.hunger >= 95) deathCause = 'Passed away from malnutrition';
  else if (hedgehog.metrics.thirst >= 95) deathCause = 'Passed away from dehydration';
  else if (hedgehog.metrics.bodyMass < 15) deathCause = 'Too frail to continue';
  else deathCause = 'Crossed the rainbow bridge';

  const record = { name: hedgehog.name, ageDays: Math.floor(ageDays), maxMass: hedgehog.metrics.bodyMass, wheelDist: Math.floor(hedgehog.metrics.wheelDistance) };
  if (!memorial.legends.oldest || record.ageDays > memorial.legends.oldest.ageDays) memorial.legends.oldest = record;
  if (!memorial.legends.heaviest || record.maxMass > memorial.legends.heaviest.maxMass) memorial.legends.heaviest = record;
  if (!memorial.legends.longestRunner || record.wheelDist > memorial.legends.longestRunner.wheelDist) memorial.legends.longestRunner = record;
  memorial.lastFive.push(record.name);
  if (memorial.lastFive.length > 5) memorial.lastFive.shift();
  state = STATES.DEATH;
  deathTimer = 0;
  saveGame();
}

function simulateOffline() {
  const now = Date.now();
  const elapsedMs = now - lastTimestamp;
  const elapsedTicks = Math.min(Math.floor(elapsedMs / OFFLINE_TICK_MS), 10080);
  if (elapsedTicks > 0) {
    const hoursPassed = Math.floor(elapsedMs / 3600000);
    const minsPassed = Math.floor((elapsedMs % 3600000) / 60000);
    for (let i = 0; i < elapsedTicks; i++) {
      simulateTick(1, true);
      if (!hedgehog.alive) break;
    }
    if (hedgehog.alive) {
      offlineMsg = hoursPassed > 0
        ? `${hedgehog.name} lived ${hoursPassed}h ${minsPassed}m while away`
        : `${hedgehog.name} lived ${minsPassed}m while away`;
      offlineMsgTimer = 150;
    }
  }
  lastTimestamp = now;
}

// ============================================================
// PIXEL DRAWING HELPERS
// ============================================================

function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function ellipse(cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// ============================================================
// FOOD SPRITES - Detailed pixel art
// ============================================================

function drawFoodSprite(type, fx, fy, scale) {
  const s = scale || 1;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(s, s);
  
  switch (type) {
    case 0: // Pellets - small brown nuggets
      ellipse(0, 1, 3.5, 2.4, '#4f381c');
      ellipse(0, 0, 3, 2, '#8B6914');
      px(-2, -1, 1, 1, '#a08020');
      ellipse(2, 1, 2, 1.5, '#7a5810');
      px(0, -1, 2, 1, '#c39a42'); px(-2, 1, 1, 1, '#5d431c');
      break;
    case 1: // Millet - tiny golden spray
      px(-2, -2, 1, 1, '#DAA520');
      px(0, -1, 1, 1, '#e8b830');
      px(-1, 0, 1, 1, '#DAA520');
      px(1, 1, 1, 1, '#c89018');
      px(-1, -3, 1, 2, '#90a040');
      px(2, -1, 1, 1, '#f0d269'); px(-3, 0, 1, 1, '#8b6a18');
      break;
    case 2: // Sunflower seed - black striped teardrop
      px(-2, -4, 4, 7, '#2a2a2a');
      px(-1, -3, 2, 5, '#404040');
      px(-1, -4, 1, 1, '#1a1a1a');
      px(0, -2, 1, 3, '#606060');
      px(-2, 3, 4, 1, '#1a1a1a');
      px(-1, -5, 2, 1, '#f0f0e0');
      px(-1, -2, 1, 4, '#d7d1ba'); px(1, 1, 1, 1, '#77705f');
      break;
    case 3: // Broccoli - big green floret
      ellipse(0, -4, 6, 5, '#47753a');
      ellipse(-3, -3, 3, 3, '#345f31');
      ellipse(3, -3, 3, 3, '#3d6935');
      ellipse(0, -6, 3, 3, '#668b49');
      px(-1, -1, 1, 1, '#294d2a');
      px(2, -2, 1, 1, '#86a65d');
      px(-1, 1, 2, 5, '#789150');
      px(0, 3, 1, 2, '#596f3d');
      px(-4, -5, 1, 1, '#9bb56b'); px(3, -4, 1, 1, '#243f25');
      px(0, -7, 1, 1, '#b2c77c'); px(-1, 3, 1, 2, '#9eae69');
      break;
    case 4: // Carrot - orange with green top
      px(-1, -2, 3, 3, '#c9682f');
      px(-1, 1, 2, 3, '#ad4f28');
      px(0, 4, 1, 3, '#843b24');
      px(0, -1, 1, 2, '#e38a48');
      // green top
      px(-2, -4, 1, 3, '#3a8a3a');
      px(0, -5, 1, 3, '#2a7a2a');
      px(1, -4, 1, 2, '#4a9a4a');
      px(-1, 1, 2, 1, '#e39a59'); px(0, 3, 1, 1, '#72331e');
      px(-2, -1, 1, 1, '#8e3f23');
      break;
    case 5: // Banana - curved yellow
      px(-5, 0, 10, 3, '#d9b93f');
      px(-4, -1, 8, 1, '#edd56a');
      px(-4, 3, 6, 1, '#b9982f');
      px(4, -1, 1, 2, '#8B6914');
      px(-5, 2, 1, 1, '#a08020');
      px(-3, 0, 2, 1, '#fff880');
      px(0, 2, 1, 1, '#8f7625'); px(3, 1, 1, 1, '#f3df78');
      break;
    case 6: // Egg - smooth white oval
      ellipse(0, 1, 4.6, 5.6, '#a99373');
      ellipse(0, 0, 4, 5, '#e8dfc9');
      ellipse(-.5, 1, 3.2, 4, '#f8f1df');
      px(-1, -3, 2, 1, '#fff');
      ellipse(0, 3, 3, 2, '#f0e8d0');
      px(2, -1, 1, 1, '#c8b999'); px(-2, 2, 1, 1, '#fffaf0');
      break;
  }
  ctx.restore();
}

// ============================================================
// HABITAT RENDERING - Warm cozy cage filling the screen
// ============================================================

function drawHabitat(drawWallRecords = true) {
  if (habitatBackground.complete && habitatBackground.naturalWidth) {
    ctx.drawImage(habitatBackground, 0, 0, W, H);
    if (drawWallRecords) drawMemorialMarks();
    drawHideout();
    drawWheel();
    drawWaterBottle();
    drawGroundFood();
    drawFallingFood();
    return;
  }
  // The enclosure is the interface: dark cabinet, inset parchment back wall.
  ctx.fillStyle = '#211c18'; ctx.fillRect(0, 0, W, H);
  roundRect(3, 3, W - 6, 247, 8, '#493321');
  roundRect(6, 6, W - 12, 241, 6, '#79583a');
  roundRect(10, 10, W - 20, 233, 3, '#c39d6c');
  // Aged cabinet grain and inset highlights.
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = i % 2 ? 'rgba(39,24,15,.25)' : 'rgba(238,194,132,.12)';
    ctx.beginPath(); ctx.moveTo(7, 8 + i * 2); ctx.lineTo(233, 8 + i * 2 + Math.sin(i) * .5); ctx.stroke();
  }
  const wall = ctx.createLinearGradient(0, 12, 0, 205);
  wall.addColorStop(0, '#d6b984'); wall.addColorStop(.55, '#caa673'); wall.addColorStop(1, '#a77d50');
  ctx.fillStyle = wall; ctx.fillRect(12, 12, W - 24, 194);
  // Worn plaster seams, hairline cracks, and scuffs.
  ctx.strokeStyle = 'rgba(104,75,45,.13)'; ctx.lineWidth = 1;
  for (let y = 34; y < 195; y += 24) {
    ctx.beginPath(); ctx.moveTo(13, y);
    for (let x = 13; x < 228; x += 8) ctx.lineTo(x, y + Math.sin(x * .13 + y) * 1.4);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(85,58,36,.18)';
  for (let i = 0; i < 7; i++) {
    const sx = 28 + i * 29, sy = 78 + (i * 37) % 82;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 7, sy + 4); ctx.lineTo(sx + 4, sy + 10); ctx.stroke();
  }
  // Stable stipple and worn patches create illustrated pixel texture without shimmer.
  for (let i = 0; i < 55; i++) {
    const x = 14 + (i * 47) % 212, y = 16 + (i * 31) % 177;
    ctx.globalAlpha = i % 3 === 0 ? .10 : .055;
    px(x, y, 1 + i % 3, 1, i % 2 ? '#fff0cf' : '#795d41');
  }
  ctx.globalAlpha = 1;
  if (drawWallRecords) drawMemorialMarks();
  // Deep, uneven bedding.
  ctx.fillStyle = '#8e653b'; ctx.fillRect(10, 198, W - 20, 44);
  ctx.fillStyle = '#cda66b'; ctx.beginPath(); ctx.moveTo(10, 242);
  for (let x = 10; x <= 230; x += 2) ctx.lineTo(x, 198 + Math.sin(x * .31) * 3 + Math.sin(x * .09) * 2);
  ctx.lineTo(230, 242); ctx.closePath(); ctx.fill();
  // High-contrast top layer makes the paw contact plane readable at r1 scale.
  ctx.strokeStyle = '#8b6338'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(11, 202);
  for (let x = 11; x <= 229; x += 3) ctx.lineTo(x, 202 + Math.sin(x * .47) * 2);
  ctx.stroke();
  for (let i = 0; i < 210; i++) {
    const x = 12 + (i * 37) % 216, y = 201 + (i * 17) % 39;
    const col = ['#f5dca5','#8d6137','#c28d49','#fff0c5','#aa7440','#e4bd7d'][i % 6];
    const chipW = 2 + i % 5, chipH = 1 + (i % 4 === 0);
    px(x, y, chipW, chipH, col);
    if (i % 9 === 0) px(x + 2, y - 1, 1, 1, '#755333');
    if (i % 11 === 0) px(x + 1, y + chipH, Math.max(2, chipW - 1), 1, 'rgba(91,61,35,.35)');
  }
  drawHideout();
  drawWheel();
  drawWaterBottle();
  drawGroundFood();
  drawFallingFood();
}

function drawMemorialMarks() {
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#4d3d2d'; ctx.fillText('LEGENDS', 18, 19);
  const records = [memorial.legends.oldest, memorial.legends.heaviest, memorial.legends.longestRunner];
  const labels = ['OLDEST','HEAVY','RUNNER'];
  for (let i = 0; i < 3; i++) {
    const x = 16 + i * 31;
    px(x + 3, 34, 2, 5, '#5b4638'); px(x + 5, 32, 2, 7, '#6d5441'); px(x + 7, 31, 2, 8, '#4d3a30');
    ellipse(x + 9, 38, 6, 5, '#7b624e'); ellipse(x + 13, 39, 4, 3, '#e4c9a5');
    px(x + 14, 37, 1, 1, '#241b15'); px(x + 17, 39, 1, 1, '#241b15');
    ctx.font = '5px monospace'; ctx.fillStyle = '#66503b'; ctx.fillText(labels[i], x, 48);
    ctx.fillStyle = '#3e3025'; ctx.fillText(records[i]?.name || '—', x, 55);
  }
  // Reserved left of the enlarged bottle so names never sit beneath it.
  const familyX = 148;
  ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#4d3d2d'; ctx.fillText('FAMILY', familyX, 19);
  ctx.font = '5px monospace';
  const family = memorial.lastFive.slice(-5);
  family.forEach((fullName, i) => {
    const name = fullName.slice(0, 9);
    const y = 31 + i * 8;
    ctx.fillStyle = '#765c44'; ctx.fillText(name, familyX, y);
    ctx.strokeStyle = '#9b4f3c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(familyX, y + 3); ctx.lineTo(familyX + ctx.measureText(name).width, y + 3); ctx.stroke();
  });
  if (hedgehog?.alive) {
    ctx.font = 'bold 5px monospace'; ctx.fillStyle = '#2f241c';
    ctx.fillText(hedgehog.name.slice(0, 9), familyX, 74);
  }
}

function drawHideout() {
  if (habitatHideout.complete && habitatHideout.naturalWidth) {
    ctx.drawImage(habitatHideout, 10, 6, 76, 78, 0, 140, 88, 80);
    return;
  }
  const x = 15, y = 165;
  ctx.fillStyle = '#294a41'; ctx.beginPath(); ctx.moveTo(x - 3, y + 18); ctx.lineTo(x + 25, y); ctx.lineTo(x + 55, y + 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#56776a'; ctx.beginPath(); ctx.moveTo(x, y + 17); ctx.lineTo(x + 25, y + 3); ctx.lineTo(x + 43, y + 13); ctx.closePath(); ctx.fill();
  roundRect(x, y + 16, 52, 42, 3, '#8a5a32');
  px(x + 3, y + 19, 46, 3, '#b77b45');
  ctx.fillStyle = '#211b16'; ctx.beginPath(); ctx.arc(x + 27, y + 43, 12, Math.PI, 0); ctx.lineTo(x + 39, y + 58); ctx.lineTo(x + 15, y + 58); ctx.fill();
  ctx.strokeStyle = 'rgba(63,35,19,.42)';
  for (let yy = y + 25; yy < y + 55; yy += 7) { ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + 49, yy); ctx.stroke(); }
  px(x + 7, y + 22, 8, 2, '#c58b50'); px(x + 44, y + 29, 3, 9, '#674020');
  px(x + 2, y + 34, 3, 2, '#5a351c'); px(x + 34, y + 19, 8, 2, '#d09a60');
  px(x + 18, y + 6, 5, 2, '#789081'); px(x + 10, y + 52, 3, 3, '#a66b37');
  ellipse(x + 7, y + 25, 1.5, 1.5, '#b9b1a1'); ellipse(x + 46, y + 25, 1.5, 1.5, '#6f6b62');
}

function drawWheel() {
  const cx = 119, cy = 142, r = 51;
  if (habitatWheel.complete && habitatWheel.naturalWidth) {
    ctx.drawImage(habitatWheel, 64, 87, 110, 117);
    // Rotating tread markers remain dynamic while the photoreal pixel rim and
    // stand stay fixed. This keeps exercise readable without rotating the feet.
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 43, 0, Math.PI * 2); ctx.clip();
    for (let i = 0; i < 10; i++) {
      const angle = wheelAngle * Math.PI / 180 + i * Math.PI / 5;
      const ix = cx + Math.cos(angle) * 37, iy = cy + Math.sin(angle) * 37;
      const ox = cx + Math.cos(angle) * 43, oy = cy + Math.sin(angle) * 43;
      ctx.strokeStyle = 'rgba(210,231,216,.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  px(83, 190, 10, 17, '#38594e'); px(145, 190, 10, 17, '#38594e');
  ctx.fillStyle = '#3e6659'; ctx.beginPath(); ctx.moveTo(78,207);ctx.lineTo(93,180);ctx.lineTo(101,207);ctx.fill();
  ctx.beginPath();ctx.moveTo(138,207);ctx.lineTo(147,180);ctx.lineTo(162,207);ctx.fill();
  ctx.strokeStyle = '#294a41'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle = '#1e3631'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx,cy,r+5,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle = '#709481'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx,cy,r-6,0,Math.PI*2);ctx.stroke();
  // Warm wooden running tread inside the aged teal frame.
  ctx.strokeStyle = '#8e6842'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx,cy,r-11,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle = '#91a78b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx,cy,r-12,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle = 'rgba(221,219,170,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx-1,cy-1,r-4,3.5,5.55);ctx.stroke();
  ctx.strokeStyle = 'rgba(24,52,46,.32)'; ctx.beginPath(); ctx.arc(cx+1,cy+2,r-3,.25,2.35);ctx.stroke();
  
  // Rungs/bars across the running surface (rotating)
  for (let i = 0; i < 10; i++) {
    const angle = (wheelAngle * Math.PI / 180) + (i * Math.PI / 5);
    const ix = cx + Math.cos(angle) * (r - 9);
    const iy = cy + Math.sin(angle) * (r - 9);
    const ox = cx + Math.cos(angle) * (r - 2);
    const oy = cy + Math.sin(angle) * (r - 2);
    ctx.strokeStyle = C.wheelDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.stroke();
  }
  
  // Spokes
  for (let i = 0; i < 6; i++) {
    const angle = (wheelAngle * Math.PI / 180) + (i * Math.PI / 3);
    const x1 = cx + Math.cos(angle) * 6;
    const y1 = cy + Math.sin(angle) * 6;
    const x2 = cx + Math.cos(angle) * (r - 11);
    const y2 = cy + Math.sin(angle) * (r - 11);
    ctx.strokeStyle = C.wheelDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  // Center hub
  ellipse(cx, cy, 8, 8, '#789382');
  ellipse(cx, cy, 3, 3, '#344f47');
  px(cx - 1, cy - 1, 2, 2, C.wheelLight);
}

function drawWaterBottle() {
  if (habitatBottle.complete && habitatBottle.naturalWidth) {
    ctx.drawImage(habitatBottle, 12, 0, 61, 128, 177, 18, 64, 151);
    const dripPhase = animFrame % 180;
    if (dripPhase < 30) {
      const dropY = BOTTLE_NOZZLE.y + 2 + dripPhase * .28;
      ellipse(BOTTLE_NOZZLE.x, dropY, 1.3, 1.8, C.water);
    }
    return;
  }
  const bx = 203, by = 51;
  
  // Metal bracket/holder
  roundRect(bx - 2, by - 8, 28, 8, 3, '#3f5b51');
  px(bx + 2, by - 10, 4, 4, '#909090');
  px(bx + 18, by - 10, 4, 4, '#909090');
  
  // Bottle body (large)
  roundRect(bx, by, 24, 65, 8, 'rgba(221,235,226,.72)');
  ctx.strokeStyle = '#365f59'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx, by, 24, 65, 8); ctx.stroke();
  
  // Water fill
  const waterLevel = 43;
  roundRect(bx + 3, by + 65 - waterLevel, 18, waterLevel - 5, 6, C.water);
  
  // Water highlight/shine
  px(bx + 5, by + 20, 3, 25, C.waterLight);
  px(bx + 8, by + 5, 2, 13, 'rgba(255,255,255,.72)');
  px(bx + 18, by + 42, 2, 15, C.waterDark);
  px(bx + 4, by + 18, 2, 4, 'rgba(255,255,255,0.5)');
  
  // Oxidized teal cap and collar match the wheel hardware.
  roundRect(bx + 4, by - 2, 16, 6, 3, '#456d61');
  px(bx + 7, by - 1, 9, 1, '#86a997');
  
  // Measurement lines
  ctx.strokeStyle = 'rgba(80,150,200,0.3)';
  ctx.lineWidth = 0.5;
  for (let ly = by + 20; ly < by + 60; ly += 10) {
    ctx.beginPath();
    ctx.moveTo(bx + 14, ly);
    ctx.lineTo(bx + 20, ly);
    ctx.stroke();
  }
  
  // Angled metal nozzle leaves a clear Family column and meets the drink pose.
  ctx.strokeStyle = '#676a64'; ctx.lineWidth = 6; ctx.lineCap = 'square';
  ctx.beginPath(); ctx.moveTo(bx + 12, by + 65); ctx.lineTo(HABITAT.waterX, by + 113); ctx.stroke();
  ctx.strokeStyle = '#c7c1ae'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx + 10, by + 66); ctx.lineTo(HABITAT.waterX - 1, by + 111); ctx.stroke();
  ellipse(HABITAT.waterX, by + 113, 2, 2, '#d0d0d0');
  
  // Drip animation
  const dripPhase = animFrame % 180;
  if (dripPhase < 30) {
    const dropY = by + 115 + dripPhase * 0.35;
    ellipse(HABITAT.waterX, dropY, 1.5, 2, C.water);
  }
}

function drawGroundFood() {
  // Every dropped item remains visible. Older pieces settle lower, producing a pile.
  for (let i = 0; i < foodOnGround.length; i++) {
    const food = foodOnGround[i];
    if (hedgehog?.activity === ACTIVITIES.EATING && i === 0 && Math.abs(hedgehog.posX - food.x) < 9) continue;
    const scale = FOOD_TYPES[food.type].worldScale * (0.8 + food.remaining / food.maxAmount * 0.2);
    const y = food.y - Math.floor(i / 7) * 2;
    const ageRatio = Math.min(1, (food.ageMinutes || 0) / FOOD_TYPES[food.type].decayMinutes);
    ctx.globalAlpha = 1 - ageRatio * .32;
    drawFoodSprite(food.type, food.x, y, scale);
    ctx.globalAlpha = 1;
    if (ageRatio > .68) {
      px(food.x - 2, y - 1, 2, 1, '#6f7140');
      if (scale > 1.4) px(food.x + 2, y + 2, 2, 2, '#8a7443');
    }
  }
}

function drawFallingFood() {
  for (let i = fallingFood.length - 1; i >= 0; i--) {
    const f = fallingFood[i];
    f.vy += 0.6;
    f.y += f.vy;
    f.x += f.vx || 0;
    f.x = Math.max(HABITAT.foodMinX, Math.min(HABITAT.foodMaxX, f.x));
    f.rotation = (f.rotation || 0) + 0.1;
    
    const groundY = 219 - Math.min(13, Math.floor(foodOnGround.length / 6) * 2);
    if (f.y >= groundY) {
      if (f.bounces < 2) {
        f.y = groundY;
        f.vy = -f.vy * 0.35;
        f.vx *= 0.5;
        f.bounces++;
      } else {
        foodOnGround.push({ type: f.type, x: f.x, y: groundY, remaining: 3, maxAmount: 3, ageMinutes: 0 });
        fallingFood.splice(i, 1);
        saveGame();
        continue;
      }
    }
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.sin(f.rotation) * 0.2);
    ctx.translate(-f.x, -f.y);
    drawFoodSprite(f.type, f.x, f.y, FOOD_TYPES[f.type].worldScale);
    ctx.restore();
  }
}

// ============================================================
// HEDGEHOG CHARACTER - Detailed, expressive, recognizable
// ============================================================

function drawQuillBody(x, y, r, a) {
  // Rounded pear-shaped coat with a crisp quill crown and layered highlights.
  ctx.fillStyle = a.dark;
  ctx.beginPath();
  ctx.moveTo(x - r * .82, y + r * .34);
  // Alternating radii make a bold but compact halo of individual quills.
  for (let i = 0; i <= 16; i++) {
    const angle = Math.PI + i * Math.PI / 16;
    const spike = i % 2 ? 1.13 : .96;
    ctx.lineTo(
      x + Math.cos(angle) * r * .78 * spike,
      y + Math.sin(angle) * r * .76 * spike
    );
  }
  ctx.lineTo(x + r * .76, y + r * .4);
  ctx.bezierCurveTo(x + r * .29, y + r * .65, x - r * .39, y + r * .64, x - r * .82, y + r * .34);
  ctx.closePath(); ctx.fill();

  // Pale tips around the crown echo the natural banding of real quills.
  ctx.lineCap = 'round';
  for (let i = 1; i < 16; i += 2) {
    const angle = Math.PI + i * Math.PI / 16;
    const innerX = x + Math.cos(angle) * r * .68;
    const innerY = y + Math.sin(angle) * r * .66;
    const tipX = x + Math.cos(angle) * r * .88;
    const tipY = y + Math.sin(angle) * r * .86;
    ctx.strokeStyle = '#f3dfb0'; ctx.lineWidth = 1.35;
    ctx.beginPath(); ctx.moveTo(innerX, innerY); ctx.lineTo(tipX, tipY); ctx.stroke();
  }
  ellipse(x - r * .05, y + r * .04, r * .69, r * .53, a.coat);

  // Each visible quill uses a dark shaft, a warm band, and a cream tip.
  // The staggered rows create texture without becoming visual noise at 240px.
  for (let row = 0; row < 3; row++) {
    for (let i = -4; i <= 4; i++) {
      const qx = x + i * r * .135 + (row % 2) * r * .055;
      const qy = y - r * .42 + row * r * .25 + Math.abs(i) * r * .018;
      const sx = qx - r * .09, sy = qy + r * .11;
      const mx = qx + r * .025, my = qy - r * .015;
      const tx = qx + r * .105, ty = qy - r * .105;
      ctx.strokeStyle = (i + row) % 2 ? a.dark : '#4b3529'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = (i + row) % 2 ? a.light : '#c99b59'; ctx.lineWidth = 1.55;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx - r * .025, ty + r * .025); ctx.stroke();
      ctx.strokeStyle = '#f4e2b8'; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(tx - r * .03, ty + r * .035); ctx.lineTo(tx, ty); ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

function drawSpriteHedgehog(x, groundY, r, f, a, wheelPhase) {
  const running = wheelPhase === 'run';
  const climbing = wheelPhase === 'climb' || wheelPhase === 'exit';
  const walking = Math.abs(hedgehog.posX - hedgehog.targetX) > 2 || running;
  const eating = hedgehog.activity === ACTIVITIES.EATING && foodOnGround[0] &&
    Math.abs(hedgehog.posX - foodOnGround[0].x) < 9;
  const sleeping = hedgehog.activity === ACTIVITIES.SLEEPING;
  const drinking = hedgehog.activity === ACTIVITIES.DRINKING;
  const phase = running ? animFrame * .82 : walkPhase;
  const width = r * 2.32;
  let height = width * 111 / 128;
  let bob = walking ? Math.sin(phase * 2) * .08 : Math.sin(animFrame * .045) * .2;
  let angle = 0;
  let scaleX = 1;
  let scaleY = 1;
  let drawX = x;
  let drawGround = groundY + bob;

  if (walking) {
    const stride = Math.sin(phase * 2);
    const energy = running ? 1 : .55;
    angle += Math.sin(phase) * .025 * energy;
    scaleX = 1 + Math.abs(stride) * .025 * energy;
    scaleY = 1 - Math.abs(stride) * .035 * energy;
    bob += Math.abs(stride) * (running ? .42 : .14);
    drawGround = groundY + bob;
  } else {
    // Gentle breathing keeps the master artwork from feeling pasted in place.
    scaleX = 1 - Math.sin(animFrame * .045) * .006;
    scaleY = 1 + Math.sin(animFrame * .045) * .012;
  }

  if (climbing) {
    // Lean into the wheel while alternating front-paw grip and hind-leg push.
    const climbStep = Math.sin(walkPhase * 1.35);
    angle += f * (-.1 + climbStep * .025);
    scaleX *= .97;
    scaleY *= 1.03;
  }

  if (eating) {
    const nibble = Math.sin(animFrame * .55);
    angle += f * nibble * .018;
    scaleX *= 1 + Math.max(0, nibble) * .012;
    scaleY *= 1 - Math.max(0, nibble) * .018;
    drawGround += Math.abs(nibble) * .35;
  }

  if (sleeping) {
    height *= .78;
    angle = f * .08;
    bob = Math.sin(animFrame * .045) * .2;
    drawGround = groundY + bob;
    scaleX = 1 + Math.sin(animFrame * .045) * .012;
    scaleY = 1 - Math.sin(animFrame * .045) * .018;
  } else if (drinking) {
    const sip = Math.sin(animFrame * .34);
    angle = -f * (.32 + sip * .018);
    drawX -= f * 7;
    drawGround -= 5 + Math.max(0, sip) * .7;
  }

  ctx.globalAlpha = .24;
  ellipse(drawX, groundY, width * .4, 1.8, '#342319');
  ctx.globalAlpha = 1;

  // Four tiny planted feet animate beneath the master artwork. The body sprite
  // is cropped just above its painted feet while moving so the gait stays clear.
  if (walking) {
    const feet = [
      { x: -.25, p: 0, far: false }, { x: .25, p: Math.PI / 2, far: false },
      { x: -.2, p: Math.PI, far: true }, { x: .2, p: Math.PI * 1.5, far: true },
    ];
    for (const foot of feet) {
      const cycle = ((phase + foot.p) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
      const swing = cycle < .34;
      const t = swing ? cycle / .34 : (cycle - .34) / .66;
      const reach = swing ? -2.2 + t * 4.4 : 2.2 - t * 4.4;
      const lift = swing ? Math.sin(t * Math.PI) * (running ? 3 : 1.8) : 0;
      const footX = drawX + f * (width * foot.x + reach);
      // During a climb the same two front legs reach upward; no additional
      // "grip" limbs are layered over the character artwork.
      const climbReach = climbing && foot.x > 0 ? 5 + Math.max(0, Math.sin(walkPhase * 1.35 + foot.p)) * 2 : 0;
      const footY = groundY - 1 - lift - climbReach;
      const legTopY = groundY - (running ? 7 : 6);
      const legTopX = drawX + f * width * foot.x;
      ctx.strokeStyle = foot.far ? '#82584b' : '#c88270';
      ctx.lineWidth = foot.far ? 1.7 : 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(legTopX, legTopY); ctx.lineTo(footX, footY - .5); ctx.stroke();
      ctx.lineCap = 'butt';
      ellipse(footX + f * 2, footY, foot.far ? 3.1 : 3.8, foot.far ? 1.45 : 1.8,
        foot.far ? '#a9755d' : '#df9d86');
      px(footX + f * 4.6 - (f < 0 ? 1 : 0), footY - 1, 1, 1, '#f6c9b5');
      px(footX + f * 4.9 - (f < 0 ? 1 : 0), footY + 1, 1, 1, '#f6c9b5');
      if (!swing && (cycle < .42 || cycle > .93)) {
        px(footX - f * 2, groundY + 1, 2, 1, C.beddingLight);
      }
    }
  }
  ctx.save();
  ctx.translate(drawX, drawGround);
  ctx.rotate(angle * f);
  ctx.scale(f * scaleX, scaleY);
  const lookIndex = Number(a.lookIndex || 0);
  const hue = [-4, 7, -10, 4, -7, 10][lookIndex] || 0;
  ctx.filter = `hue-rotate(${hue}deg) saturate(${lookIndex === 2 ? .82 : 1})`;
  if (walking) {
    const croppedHeight = height * 99 / 111;
    // Position from the cropped height, not the full source height: the visible
    // belly now meets the exact same contact plane as the animated feet.
    ctx.drawImage(hedgehogSprite, 0, 0, 128, 99, -width / 2, -croppedHeight + 1, width, croppedHeight);
  } else {
    ctx.drawImage(hedgehogSprite, -width / 2, -height + 2, width, height);
  }
  ctx.restore();

  const faceX = drawX + f * width * .3;
  const eyeY = drawGround - height * .48;
  if (sleeping) {
    ctx.strokeStyle = '#3b281e'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.arc(faceX, eyeY + 2, 2.3, .15, Math.PI - .15); ctx.stroke();
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = C.teal; ctx.globalAlpha = .65;
    ctx.fillText('z', drawX + width * .52, drawGround - height - 2); ctx.globalAlpha = 1;
  }
  if (drinking && animFrame % 22 < 8) ellipse(x, 163, 1, 2, '#8ccbd0');
  if (eating) {
    const biteType = foodOnGround[0].type;
    drawFoodSprite(biteType, drawX + f * width * .48, drawGround - height * .2 + Math.sin(animFrame * .55),
      Math.min(1.05, FOOD_TYPES[biteType].worldScale * .6));
  }
}

function drawHedgehogCreature(x, groundY, r, f, a, wheelPhase) {
  if (hedgehogSprite.complete && hedgehogSprite.naturalWidth) {
    drawSpriteHedgehog(x, groundY, r, f, a, wheelPhase);
    return;
  }
  const inWheel = wheelPhase === 'run';
  const moving = Math.abs(hedgehog.posX - hedgehog.targetX) > 2;
  const eating = hedgehog.activity === ACTIVITIES.EATING && foodOnGround[0] &&
    Math.abs(hedgehog.posX - foodOnGround[0].x) < 9;

  if (hedgehog.activity === ACTIVITIES.HIDING && hedgehog.posX < 50) {
    drawQuillBody(47, groundY - 8, r * .52, a);
    ellipse(52, groundY - 8, 7, 6, a.light); ellipse(57, groundY - 7, 4, 2.5, a.belly);
    ellipse(60, groundY - 7, 1.8, 1.5, '#241812'); ellipse(54, groundY - 10, 1.8, 2.2, C.hedgeEye);
    return;
  }

  if (hedgehog.activity === ACTIVITIES.SLEEPING && Math.abs(hedgehog.posX - HABITAT.hideoutX) < 6) {
    const breathe = Math.sin(animFrame * .055) * .8;
    drawQuillBody(x, groundY - 10, r * .88 + breathe, a);
    ellipse(x + f * 8, groundY - 7, 9, 7, a.light);
    ellipse(x + f * 13, groundY - 6, 4, 2.5, a.belly);
    ellipse(x + f * 16, groundY - 6, 1.7, 1.4, '#241812');
    ctx.strokeStyle = '#33251d'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.arc(x + f * 9, groundY - 9, 2, .2, Math.PI - .2); ctx.stroke();
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = C.teal; ctx.globalAlpha = .65;
    ctx.fillText('z', x + r, groundY - r - 3); ctx.globalAlpha = 1;
    return;
  }

  if (hedgehog.activity === ACTIVITIES.DRINKING && Math.abs(hedgehog.posX - HABITAT.waterX) < 7) {
    const sip = Math.sin(animFrame * .3) * .8;
    drawQuillBody(x - 12, groundY - 11, r * .82, a);
    ctx.fillStyle = a.light; ctx.beginPath();
    ctx.moveTo(x - 7, groundY - 16); ctx.lineTo(x - 3, 177 + sip); ctx.lineTo(x + 4, 184 + sip); ctx.lineTo(x + 2, groundY - 8); ctx.closePath(); ctx.fill();
    ellipse(x, 176 + sip, 8, 7, a.light); ellipse(x, 166 + sip, 2, 1.6, '#241812');
    ellipse(x - 3, 175 + sip, 2, 2.4, C.hedgeEye); ellipse(x - 7, 171 + sip, 3, 4, C.hedgeEar);
    ellipse(x - 8, groundY - 2, 4, 2, a.belly); ellipse(x + 1, groundY - 2, 4, 2, a.belly);
    if (animFrame % 22 < 8) ellipse(x, 163, 1, 2, '#8ccbd0');
    return;
  }

  const running = inWheel;
  const phase = running ? animFrame * .72 : walkPhase;
  const bodyY = groundY - r * (running ? .78 : .67) + (moving || running ? Math.sin(phase * 2) * .22 : Math.sin(animFrame * .05) * .3);
  ctx.globalAlpha = .2; ellipse(x, groundY + 1, r * .72, 2.2, '#3e2c20'); ctx.globalAlpha = 1;

  function hedgeLeg(hipX, legPhase, far) {
    let reach;
    let lift;
    if (running) {
      reach = -Math.cos(legPhase) * 5;
      lift = Math.max(0, Math.sin(legPhase)) * 3.2;
    } else {
      // A real step has a short airborne reach followed by a longer planted
      // phase. This removes the continuous paddle/flipper sweep.
      const cycle = ((legPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
      if (cycle < .34) {
        const swing = cycle / .34;
        reach = -2.5 + swing * 5;
        lift = Math.sin(swing * Math.PI) * 2;
      } else {
        const planted = (cycle - .34) / .66;
        reach = 2.5 - planted * 5;
        lift = 0;
      }
    }
    const toeX = hipX + f * reach, toeY = groundY - 1 - lift;
    const color = far ? a.dark : a.belly;
    ctx.strokeStyle = color; ctx.lineWidth = far ? 1.7 : 2.2; ctx.lineCap = 'round'; ctx.beginPath();
    // Most of the limb stays hidden beneath the low quill coat.
    const ankleX = hipX + f * reach * .22;
    const ankleY = groundY - 3 - lift * .45;
    ctx.moveTo(hipX, bodyY + r * .46); ctx.lineTo(ankleX, ankleY); ctx.lineTo(toeX, toeY); ctx.stroke();
    ctx.lineCap = 'butt';
    // Compact forward-pointing foot; only the toe advances during swing.
    ellipse(toeX + f * 1.6, toeY, 2.7, 1.35, color);
    px(toeX + f * 3.7 - (f < 0 ? 1 : 0), toeY, 1, 1, C.hedgeToe);
  }

  const rear = x - f * r * .34, front = x + f * r * .29;
  hedgeLeg(rear + f * 2, phase + Math.PI, true);
  hedgeLeg(front - f * 2, phase + Math.PI * 1.5, true);
  drawQuillBody(x - f * 2, bodyY, r, a);

  const headX = x + f * r * .46;
  const headY = bodyY + (eating ? 4 + Math.sin(animFrame * .5) : 1);
  // A generous warm face is the emotional focal point; the forehead overlaps
  // the quill coat so the head feels attached to the body.
  ellipse(headX - f * r * .07, headY - r * .02, r * .49, r * .52, a.light);
  ellipse(headX + f * r * .07, headY + r * .14, r * .4, r * .3, a.belly);
  ctx.fillStyle = a.light; ctx.beginPath();
  ctx.moveTo(headX + f * r * .12, headY - r * .14);
  ctx.quadraticCurveTo(headX + f * r * .48, headY - r * .04, headX + f * r * .68, headY + r * .05);
  ctx.quadraticCurveTo(headX + f * r * .5, headY + r * .25, headX + f * r * .1, headY + r * .27);
  ctx.closePath(); ctx.fill();
  ellipse(headX + f * r * .68, headY + r * .05, 2.35, 1.9, '#2a1c18');
  ellipse(headX + f * 1, headY - 4, 2.7, 3.1, '#231913'); px(headX + f * 1, headY - 6, 1, 1, '#fff7e5');
  ellipse(headX - f * 4, headY - r * .36, 4.1, 4.6, a.light); ellipse(headX - f * 4, headY - r * .36, 2.2, 2.7, '#d99788');
  // Tiny contented mouth below the nose.
  ctx.strokeStyle = '#704434'; ctx.lineWidth = .8; ctx.beginPath();
  ctx.moveTo(headX + f * r * .52, headY + r * .16); ctx.quadraticCurveTo(headX + f * r * .45, headY + r * .22, headX + f * r * .37, headY + r * .18); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,55,45,.55)'; ctx.lineWidth = .6; ctx.beginPath();
  ctx.moveTo(headX + f * 7, headY + 3); ctx.lineTo(headX + f * 15, headY);
  ctx.moveTo(headX + f * 7, headY + 5); ctx.lineTo(headX + f * 15, headY + 6); ctx.stroke();

  hedgeLeg(rear, phase, false);
  hedgeLeg(front, phase + Math.PI * .5, false);

  if (eating) {
    const biteType = foodOnGround[0].type;
    drawFoodSprite(biteType, headX + f * r * .66, headY + 5,
      Math.min(1.1, FOOD_TYPES[biteType].worldScale * .62));
    ellipse(headX + f * r * .45, headY + 6 + Math.sin(animFrame * .55), 2.5, 2, a.belly);
  }
}

function drawHedgehog() {
  if (!hedgehog || !hedgehog.alive) return;
  const a = stableAppearanceFor(hedgehog);
  const wheelPhase = hedgehog.activity === ACTIVITIES.RUNNING ? hedgehog.wheelPhase : null;
  const inWheel = wheelPhase === 'run';
  const x = inWheel ? HABITAT.wheelCenterX : Math.floor(clampFloorX(hedgehog.posX));
  let groundY = inWheel ? 177 : 218;
  if (wheelPhase === 'climb') {
    const p = Math.max(0, Math.min(1, (hedgehog.posX - HABITAT.wheelEntryX) / (HABITAT.wheelCenterX - HABITAT.wheelEntryX)));
    const grip = Math.max(0, Math.min(1, (p - .18) / .82));
    const eased = grip * grip * (3 - 2 * grip);
    groundY = 218 - eased * 41;
  } else if (wheelPhase === 'exit') {
    const p = Math.max(0, Math.min(1, (HABITAT.wheelCenterX - hedgehog.posX) / (HABITAT.wheelCenterX - HABITAT.wheelEntryX)));
    const release = p < .82 ? p / .82 : 1;
    const eased = release * release * (3 - 2 * release);
    groundY = 177 + eased * 41;
  }
  
  // Size scaling
  // Slightly oversized for the r1 display so the face, quills, and four-foot
  // gait remain readable without changing interaction or collision zones.
  let baseR = 18;
  if (hedgehog.lifeStage === LIFE_STAGES.ADULT) baseR = 22;
  if (hedgehog.lifeStage === LIFE_STAGES.SENIOR) baseR = 21;
  const massScale = 0.8 + (hedgehog.metrics.bodyMass / 60) * 0.4;
  const r = Math.floor(baseR * massScale);
  const f = hedgehog.facing;

  drawHedgehogCreature(x, groundY, r, f, a, wheelPhase);
  return;

  // Hiding - peek from hideout
  if (hedgehog.activity === ACTIVITIES.HIDING && hedgehog.posX < 50) {
    const peekX = 52;
    ellipse(peekX, groundY - r * 0.4, r * 0.4, r * 0.5, a.coat);
    // One eye peeking
    ellipse(peekX + 3, groundY - r * 0.5, 2, 2.5, C.hedgeEye);
    px(peekX + 3, groundY - r * 0.55, 1, 1, '#fff');
    // Ear
    ellipse(peekX + 1, groundY - r * 0.8, 3, 4, C.hedgeEar);
    return;
  }
  
  // Sleeping - curled ball
  if (hedgehog.activity === ACTIVITIES.SLEEPING && Math.abs(hedgehog.posX - HABITAT.hideoutX) < 6) {
    const breathe = Math.sin(animFrame * 0.06) * 1.5;
    ellipse(x, groundY - r * 0.4, r * 1.1 + breathe, r * 0.6, a.coat);
    ellipse(x, groundY - r * 0.3, r * 0.7, r * 0.35, a.belly);
    // Closed eyes (curved lines)
    ctx.strokeStyle = C.hedgeEye;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 4, groundY - r * 0.5, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 4, groundY - r * 0.5, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Tiny ear
    ellipse(x - r * 0.5, groundY - r * 0.7, 3, 4, C.hedgeEar);
    // Zzz
    const zzOff = Math.sin(animFrame * 0.07) * 3;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = C.teal;
    ctx.globalAlpha = 0.6;
    ctx.fillText('z', x + r + 3, groundY - r - 2 + zzOff);
    ctx.font = '7px monospace';
    ctx.fillText('z', x + r + 9, groundY - r - 8 + zzOff * 0.6);
    ctx.globalAlpha = 1;
    return;
  }

  if (hedgehog.activity === ACTIVITIES.DRINKING && Math.abs(hedgehog.posX - HABITAT.waterX) < 7) {
    drawDrinkingPose(HABITAT.waterX, r, a);
    return;
  }

  // Floor locomotion uses a dedicated side-profile quadruped silhouette. Keeping
  // this separate prevents the round front-facing idle pose from reading as a shell.
  const floorWalking = !inWheel && (!wheelPhase || wheelPhase === 'approach') &&
    Math.abs(hedgehog.posX - hedgehog.targetX) > 2;
  if (floorWalking) {
    drawWalkingPose(x, groundY, r, f, a);
    return;
  }

  // Position adjustments for running
  const walking = Math.abs(hedgehog.posX - hedgehog.targetX) > 2 && !inWheel;
  // Keep the torso planted. A tiny shoulder sway replaces the old swimming bounce.
  let dy = Math.sin(animFrame * 0.055) * 0.45;
  if (walking) dy += Math.sin(animFrame * 0.34) * 0.35;
  if (inWheel) dy = Math.sin(animFrame * 0.72) * 0.35;
  
  // Walking/running torso sits just above the feet so the legs support its weight.
  const supportHeight = walking ? 0.88 : (inWheel ? 0.78 : 0.62);
  const bodyY = groundY - r * supportHeight + dy;

  // Shadow
  ctx.globalAlpha = 0.1;
  ellipse(x, groundY + 3, r * 0.8, 3, '#000');
  ctx.globalAlpha = 1;

  // Draw weight-bearing walking legs behind the body. Feet land below and wider
  // than the belly instead of protruding sideways like flippers.
  if (walking) {
    const gait = Math.sin(animFrame * .36);
    const nearReach = gait * 3.2;
    const farReach = -gait * 3.2;
    const nearLift = Math.max(0, gait) * 1.2;
    const farLift = Math.max(0, -gait) * 1.2;
    const hipY = bodyY + r * .42;
    const footY = groundY - 1;
    const legs = [
      { hip: x - f * r * .55, foot: x - f * r * .78 + nearReach, lift: nearLift, color: C.hedgePaw },
      { hip: x + f * r * .48, foot: x + f * r * .88 - nearReach, lift: farLift, color: C.hedgePaw },
      { hip: x - f * r * .38, foot: x - f * r * .66 + farReach, lift: farLift, color: '#d7aa82' },
      { hip: x + f * r * .34, foot: x + f * r * .72 - farReach, lift: nearLift, color: '#d7aa82' },
    ];
    // Far pair first, near pair last for readable depth.
    for (const leg of [legs[2], legs[3], legs[0], legs[1]]) {
      ctx.strokeStyle = leg.color; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(leg.hip, hipY); ctx.lineTo(leg.foot, footY - leg.lift); ctx.stroke();
      ellipse(leg.foot + f * 1.5, footY - leg.lift, 3.8, 1.9, leg.color);
    }
  }

  // TAIL (behind body)
  ellipse(x - f * r * 1.08, bodyY + r * 0.08, 4, 3, a.light);

  // BODY - round and chunky
  ellipse(x, bodyY, r * 1.18, r * 0.68, a.coat);
  ellipse(x - f * r * 0.44, bodyY - r * 0.05, r * 0.6, r * 0.48, a.light);
  px(x - f * 8, bodyY - 7, 3, 2, a.light);
  px(x - f * 11, bodyY + 2, 2, 3, a.dark);
  px(x + f * 9, bodyY + 8, 2, 2, a.light);
  
  if (a.pattern === 'stripe' || a.pattern === 'sable') {
    ctx.fillStyle = a.dark; ctx.beginPath();
    ctx.ellipse(x - f * 2, bodyY - r * 0.32, r * 0.62, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  } else if (a.pattern === 'band') {
    ellipse(x - f * r * .08, bodyY, r * .25, r * .64, a.belly);
  } else if (a.pattern === 'patches') {
    ellipse(x - f * r * .3, bodyY - 4, r * .28, r * .22, a.dark);
    ellipse(x + f * r * .2, bodyY + 3, r * .22, r * .18, a.light);
  } else if (a.pattern === 'hood') {
    ellipse(x + f * r * .48, bodyY - 1, r * .45, r * .58, a.dark);
  }

  // BELLY - cream white
  ellipse(x + f * r * .2, bodyY + r * 0.26, r * 0.72, r * 0.32, a.belly);

  // HEAD (slightly forward)
  const headX = x + f * r * 0.76;
  const engagedEating = hedgehog.activity === ACTIVITIES.EATING && foodOnGround[0] && Math.abs(hedgehog.posX - foodOnGround[0].x) < 9;
  let headY = bodyY - r * 0.12;
  if (engagedEating) headY += 4 + Math.sin(animFrame * .55) * 1.5;
  const headR = r * 0.58;
  ellipse(headX, headY, headR * 1.08, headR * 0.98, a.coat);
  px(headX - 7, headY - 7, 3, 2, '#e09249');
  px(headX + 6, headY + 7, 2, 2, '#9f5126');
  
  if (a.pattern === 'stripe' || a.pattern === 'sable' || a.pattern === 'hood') {
    ctx.fillStyle = a.dark; ctx.beginPath();
    ctx.ellipse(headX, headY - headR * 0.5, headR * 0.3, headR * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    px(headX - 2, headY - headR * 0.6, 4, 4, a.dark);
  }

  // EARS (round, pink inside)
  const earY = headY - headR * 0.6;
  // Left ear
  ellipse(headX - headR * 0.6, earY, 5, 6, a.coat);
  ellipse(headX - headR * 0.6, earY, 3, 4, C.hedgeEar);
  ellipse(headX - headR * 0.6, earY, 1.5, 2.5, C.hedgeToe);
  // Right ear
  ellipse(headX + headR * 0.6, earY, 5, 6, a.coat);
  ellipse(headX + headR * 0.6, earY, 3, 4, C.hedgeEar);
  ellipse(headX + headR * 0.6, earY, 1.5, 2.5, C.hedgeToe);

  // CHEEK POUCHES (puffy)
  const cheekPuff = hedgehog.activity === ACTIVITIES.EATING ? 1.3 : 1;
  ellipse(headX - headR * 0.55, headY + 2, 5 * cheekPuff, 4 * cheekPuff, a.cheek);
  ellipse(headX + headR * 0.55, headY + 2, 5 * cheekPuff, 4 * cheekPuff, a.cheek);

  // EYES - large, expressive with colored iris
  const eyeSpacing = 5;
  const eyeY = headY - 1;
  
  const blink = animFrame % 190 > 181;
  const glance = Math.sin(animFrame * 0.018) > 0.55 ? f : 0;
  if (blink) {
    px(headX - eyeSpacing - 2, eyeY, 4, 1, '#2d1d15');
    px(headX + eyeSpacing - 2, eyeY, 4, 1, '#2d1d15');
  } else {
    ellipse(headX - eyeSpacing + glance, eyeY, 2.7, 3.3, '#241812');
    ellipse(headX + eyeSpacing + glance, eyeY, 2.7, 3.3, '#241812');
    px(headX - eyeSpacing + glance, eyeY - 2, 1, 1, '#fff7e5');
    px(headX + eyeSpacing + glance, eyeY - 2, 1, 1, '#fff7e5');
  }

  // Projecting cream muzzle gives the face a recognizable hedgehog silhouette.
  ellipse(headX + f * headR * 0.38, headY + headR * 0.28, 5, 4, a.belly);
  ellipse(headX + f * headR * 0.65, headY + headR * 0.28, 2.2, 1.8, C.hedgeNose);
  
  // MOUTH - tiny smile
  ctx.strokeStyle = a.dark;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(headX + f * headR * 0.48, headY + headR * 0.42, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // WHISKERS
  ctx.strokeStyle = 'rgba(120,80,40,0.4)';
  ctx.lineWidth = 0.5;
  const wBase = headY + headR * 0.2;
  // Left whiskers
  ctx.beginPath();
  ctx.moveTo(headX - headR * 0.4, wBase);
  ctx.lineTo(headX - headR * 0.4 - 10, wBase - 3);
  ctx.moveTo(headX - headR * 0.4, wBase + 2);
  ctx.lineTo(headX - headR * 0.4 - 10, wBase + 2);
  ctx.moveTo(headX - headR * 0.4, wBase + 4);
  ctx.lineTo(headX - headR * 0.4 - 8, wBase + 6);
  ctx.stroke();
  // Right whiskers
  ctx.beginPath();
  ctx.moveTo(headX + headR * 0.4, wBase);
  ctx.lineTo(headX + headR * 0.4 + 10, wBase - 3);
  ctx.moveTo(headX + headR * 0.4, wBase + 2);
  ctx.lineTo(headX + headR * 0.4 + 10, wBase + 2);
  ctx.moveTo(headX + headR * 0.4, wBase + 4);
  ctx.lineTo(headX + headR * 0.4 + 8, wBase + 6);
  ctx.stroke();

  // PAWS
  const pawY = groundY - 3 + dy;
  // Front paws (visible when idle/eating)
  if (hedgehog.activity === ACTIVITIES.EATING || hedgehog.activity === ACTIVITIES.GROOMING) {
    const pawUp = Math.sin(animFrame * 0.4) * 2;
    ellipse(headX - f * 5, bodyY + r * 0.42 + pawUp, 3, 3, C.hedgePaw);
    ellipse(headX - f * 10, bodyY + r * 0.42 - pawUp, 3, 3, C.hedgePaw);
    // Tiny toes
    px(x - 6, bodyY + r * 0.4 + pawUp + 1, 1, 1, C.hedgeToe);
    px(x + 5, bodyY + r * 0.4 - pawUp + 1, 1, 1, C.hedgeToe);
  }
  // Stationary paws stay tucked beneath the body without pretending to walk.
  if (!walking && hedgehog.activity !== ACTIVITIES.EATING && hedgehog.activity !== ACTIVITIES.GROOMING && !inWheel) {
    ellipse(x - f * r * .62, pawY, 4, 2.2, C.hedgePaw);
    ellipse(x + f * r * .66, pawY, 4, 2.2, C.hedgePaw);
  }

  // ACTIVITY-SPECIFIC ANIMATIONS
  if (hedgehog.activity === ACTIVITIES.EATING && foodOnGround.length > 0) {
    // Holding food near mouth
    const bobble = Math.sin(animFrame * 0.6) * 1;
    const biteType = foodOnGround[0].type;
    drawFoodSprite(biteType, headX + f * 6, headY + headR * 0.52 + bobble,
      Math.min(1, FOOD_TYPES[biteType].worldScale * 0.65));
    if (animFrame % 18 < 3) {
      px(headX + f * 11, headY + 8, 1, 1, '#7f5b31');
      px(headX + f * 13, headY + 11, 1, 1, '#b7894c');
    }
  }
  
  if (hedgehog.activity === ACTIVITIES.GROOMING) {
    // Licking paw animation - sparkle
    if (groomAnim % 20 < 10) {
      ctx.fillStyle = '#fff';
      const sparkX = x + Math.sin(groomAnim * 0.3) * 5;
      const sparkY = bodyY + Math.cos(groomAnim * 0.3) * 3;
      px(sparkX, sparkY, 2, 2, '#fff');
      px(sparkX + 3, sparkY - 2, 1, 1, '#fff');
    }
  }

  if (inWheel) {
    // Fast, readable four-leg cycle: paws reach, plant, and sweep back.
    const run = animFrame * .78;
    const legY = groundY - 1;
    for (let i = 0; i < 4; i++) {
      const phase = run + i * Math.PI / 2;
      const fore = i >= 2;
      const anchor = x + f * (fore ? 8 : -8) + (i % 2 ? 2 : -2);
      const reach = Math.cos(phase) * 5;
      const lift = Math.max(0, Math.sin(phase)) * 3.5;
      const color = i % 2 ? '#d7aa82' : C.hedgePaw;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(anchor, bodyY + r * .35);
      ctx.lineTo(anchor + f * reach, legY - lift);
      ctx.stroke();
      ellipse(anchor + f * reach, legY - lift, 2.8, 1.7, color);
    }
  }
}

function drawWalkingPose(x, groundY, r, f, a) {
  // Phase advances from actual distance travelled, keeping footsteps synchronized.
  const phase = walkPhase;
  const bodyY = groundY - r * .9 + Math.abs(Math.sin(phase * 2)) * .45;
  const hipY = bodyY + r * .38;
  const footY = groundY - 1;
  const rearHip = x - f * r * .48;
  const frontHip = x + f * r * .48;

  ctx.globalAlpha = .22; ellipse(x, groundY + 1, r * .72, 2.2, '#4b321f'); ctx.globalAlpha = 1;

  function leg(hipX, legPhase, color, far = false) {
    // Lifted paws swing rear-to-front; planted paws then push front-to-rear.
    const reach = -Math.cos(legPhase) * 4.2;
    const lift = Math.max(0, Math.sin(legPhase)) * 2.8;
    const kneeX = hipX + f * reach * .25;
    const kneeY = hipY + 4 - lift * .35;
    const toeX = hipX + f * reach;
    const toeY = footY - lift;
    ctx.strokeStyle = color; ctx.lineWidth = far ? 2.3 : 3;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(toeX, toeY); ctx.stroke();
    // Long axis and toe pixels always face the direction of travel.
    ellipse(toeX + f * 2, toeY, far ? 3.2 : 4, far ? 1.4 : 1.8, color);
    px(toeX + f * 4.6 - (f < 0 ? 1 : 0), toeY - 1, 1, 1, C.hedgeToe);
    px(toeX + f * 5.5 - (f < 0 ? 1 : 0), toeY + 1, 1, 1, C.hedgeToe);
  }

  // Four-beat walk: each foot enters swing one quarter-cycle after the last.
  leg(rearHip + f * 3, phase + Math.PI, '#d2a178', true);
  leg(frontHip - f * 3, phase + Math.PI * 1.5, '#d2a178', true);

  // Compact furred torso with clear daylight between belly and bedding.
  ellipse(x, bodyY, r * .92, r * .57, a.coat);
  ellipse(x - f * r * .3, bodyY - 1, r * .48, r * .42, a.light);
  ellipse(x + f * r * .18, bodyY + r * .25, r * .5, r * .22, a.belly);
  ellipse(x - f * r * .88, bodyY + 1, 3.5, 2.8, a.light);
  if (a.pattern === 'stripe' || a.pattern === 'sable') {
    ctx.fillStyle = a.dark; ctx.beginPath();
    ctx.ellipse(x - f * 2, bodyY - r * .3, r * .45, r * .1, 0, 0, Math.PI * 2); ctx.fill();
  } else if (a.pattern === 'band') {
    ellipse(x - f * r * .08, bodyY, r * .22, r * .55, a.belly);
  } else if (a.pattern === 'patches') {
    ellipse(x - f * r * .28, bodyY - 3, r * .25, r * .22, a.dark);
    ellipse(x + f * r * .2, bodyY + 2, r * .2, r * .18, a.light);
  } else if (a.pattern === 'hood') {
    ellipse(x + f * r * .48, bodyY - 1, r * .38, r * .48, a.dark);
  } else if (a.pattern === 'bib') {
    ellipse(x + f * r * .38, bodyY + r * .22, r * .3, r * .28, a.belly);
  }

  // Side-profile head points in the direction of travel.
  const headX = x + f * r * .72, headY = bodyY - r * .12;
  const headR = r * .48;
  ellipse(headX, headY, headR, headR * .9, a.pattern === 'hood' ? a.dark : a.coat);
  ellipse(headX - f * 2, headY - headR * .75, 4.5, 5.2, a.coat);
  ellipse(headX - f * 2, headY - headR * .75, 2.5, 3.2, C.hedgeEar);
  ellipse(headX + f * headR * .58, headY + 2, 5, 4, a.belly);
  ellipse(headX + f * headR * .93, headY + 2, 2, 1.7, C.hedgeNose);
  ellipse(headX + f * 2, headY - 2, 2.5, 3, C.hedgeEye);
  px(headX + f * 2, headY - 4, 1, 1, '#fff7e5');
  ctx.strokeStyle = 'rgba(100,65,40,.55)'; ctx.lineWidth = .6; ctx.beginPath();
  ctx.moveTo(headX + f * 7, headY + 3); ctx.lineTo(headX + f * 17, headY);
  ctx.moveTo(headX + f * 7, headY + 5); ctx.lineTo(headX + f * 17, headY + 6); ctx.stroke();

  // Near pair drawn last so all four alternating legs remain readable.
  leg(rearHip, phase, C.hedgePaw);
  leg(frontHip, phase + Math.PI * .5, C.hedgePaw);
  // A few foreground chips overlap the contact line so planted paws feel embedded.
  px(x - 13, groundY, 5, 1, '#8d6137'); px(x - 10, groundY - 1, 2, 1, '#f5dca5');
  px(x + 8, groundY + 1, 6, 1, '#aa7440'); px(x + 11, groundY, 3, 1, '#fff0c5');
}

function drawDrinkingPose(x, r, a) {
  const sip = Math.sin(animFrame * 0.34) * 1.2;
  const bodyX = x - 12, bodyY = 207;
  ctx.globalAlpha = .14; ellipse(bodyX, 220, 19, 3, '#20170f'); ctx.globalAlpha = 1;
  // Hindquarters stay low while the spine stretches toward the nozzle.
  ellipse(bodyX - 2, bodyY, r * .9, r * .54, a.coat);
  ellipse(bodyX - 5, bodyY + 4, r * .55, r * .3, a.belly);
  ctx.fillStyle = a.light; ctx.beginPath();
  ctx.moveTo(bodyX + 5, bodyY - 6); ctx.lineTo(x - 4, 179 + sip); ctx.lineTo(x + 3, 185 + sip); ctx.lineTo(bodyX + 12, bodyY + 5); ctx.closePath(); ctx.fill();
  ellipse(x - 1, 177 + sip, r * .55, r * .5, a.coat);
  ellipse(x - 8, 171 + sip, 4, 5, '#9d4e29'); ellipse(x - 8, 171 + sip, 2, 3, '#df8b84');
  ellipse(x + 5, 171 + sip, 4, 5, '#9d4e29'); ellipse(x + 5, 171 + sip, 2, 3, '#df8b84');
  ellipse(x - 4, 177 + sip, 2.3, 3, '#241812'); ellipse(x + 3, 177 + sip, 2.3, 3, '#241812');
  px(x - 4, 175 + sip, 1, 1, '#fff4dd'); px(x + 3, 175 + sip, 1, 1, '#fff4dd');
  ellipse(x, 166 + sip, 2, 1.5, '#c56f70');
  ellipse(x - 7, 192, 3, 3, '#efd0a6'); ellipse(x + 1, 190, 3, 3, '#efd0a6');
  ellipse(bodyX - 12, 216, 5, 2.5, '#efd0a6'); ellipse(bodyX + 1, 217, 5, 2.5, '#efd0a6');
  ctx.strokeStyle = '#67412c'; ctx.lineWidth = .7; ctx.beginPath();
  ctx.moveTo(x - 4, 181); ctx.lineTo(x - 13, 178); ctx.moveTo(x + 3, 181); ctx.lineTo(x + 10, 178); ctx.stroke();
  if (animFrame % 22 < 8) ellipse(x, 163, 1, 2, '#8ccbd0');
}

// ============================================================
// UI ELEMENTS
// ============================================================

function drawUI() {
  // The food selector fills the lower control ledge for maximum r1 legibility.
  roundRect(0, 248, W, 34, 0, '#3d342a');
  px(0, 248, W, 3, '#8f7658');
  const cleaning = selectedFoodIndex === CLEAN_CAGE_SELECTION;
  const food = cleaning ? null : FOOD_TYPES[selectedFoodIndex];
  roundRect(3, 251, 234, 30, 4, '#b99a70');
  px(5, 253, 230, 2, '#e3c99f');
  px(5, 278, 230, 1, '#765b41');
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#fff0d4'; ctx.fillText('‹', 10, 266); ctx.fillText('›', 220, 266);
  if (cleaning) {
    // Small broom icon, drawn in the same warm pixel language as the habitat.
    ctx.save();
    ctx.translate(43, 265);
    ctx.rotate(-0.45);
    px(-1, -10, 3, 14, '#6b4327');
    px(-5, 3, 11, 4, '#d39a45');
    px(-6, 7, 13, 2, '#9c672e');
    ctx.restore();
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#2b2119'; ctx.fillText('CLEAN CAGE', 63, 260);
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#4e3a29'; ctx.fillText('PRESS TO REMOVE ALL FOOD', 63, 272);
  } else {
    drawFoodSprite(selectedFoodIndex, 43, 266, 1.9);
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#2b2119'; ctx.fillText(food.name.toUpperCase(), 63, 260);
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = '#4e3a29'; ctx.fillText('SCROLL  •  PRESS TO DROP', 63, 272);
  }
}

// ============================================================
// SCREENS
// ============================================================

function drawAdoptScreen() {
  // Warm gradient bg
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#fff5e0');
  grad.addColorStop(0.5, '#ffe8c0');
  grad.addColorStop(1, C.bgWall);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  
  // Teal decorative bar
  roundRect(0, 0, W, 4, 0, C.teal);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Title
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = C.uiAccent;
  ctx.fillText('HEDGEHOME', W / 2, 32);
  
  ctx.font = '8px monospace';
  ctx.fillStyle = C.tealDark;
  ctx.fillText('A tiny life in your hands.', W / 2, 48);
  
  // Draw a big cute hedgehog in center
  const hx = W / 2, hy = 120;
  const bob = Math.sin(animFrame * 0.05) * 2;
  
  // Low, side-profile hedgehog with a spined back and pointed snout.
  const previewLook = HEDGEHOG_LOOKS[0];
  drawQuillBody(hx - 4, hy + bob, 28, previewLook);
  ellipse(hx + 16, hy + 4 + bob, 13, 11, previewLook.light);
  ctx.fillStyle = previewLook.light; ctx.beginPath();
  ctx.moveTo(hx + 20, hy - 2 + bob); ctx.lineTo(hx + 40, hy + 5 + bob);
  ctx.lineTo(hx + 20, hy + 11 + bob); ctx.closePath(); ctx.fill();
  ellipse(hx + 40, hy + 5 + bob, 3, 2.5, '#241812');
  ellipse(hx + 19, hy + bob, 3, 3.5, C.hedgeEye); px(hx + 19, hy - 2 + bob, 1, 1, '#fff');
  ellipse(hx + 10, hy - 8 + bob, 5, 6, previewLook.light); ellipse(hx + 10, hy - 8 + bob, 3, 4, C.hedgeEar);
  ellipse(hx - 14, hy + 19 + bob, 5, 2.5, previewLook.belly);
  ellipse(hx + 12, hy + 19 + bob, 5, 2.5, previewLook.belly);
  
  ctx.font = '10px monospace';
  ctx.fillStyle = '#5a4030';
  ctx.fillText('A hedgehog is waiting', W / 2, 170);
  ctx.fillText('for a home...', W / 2, 184);
  
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = C.uiAccent;
  const blink = Math.floor(animFrame / 25) % 2;
  if (blink) ctx.fillText('[ PRESS TO ADOPT ]', W / 2, 215);
  
  if (memorial.lastFive.length > 0) {
    ctx.font = '8px monospace';
    ctx.fillStyle = C.uiDim;
    ctx.fillText('scroll for memorial', W / 2, 258);
  }
  ctx.textAlign = 'left';
}

function drawNamingScreen() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#fff8e8');
  grad.addColorStop(1, '#ffe0b0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  roundRect(0, 0, W, 4, 0, C.teal);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = C.uiAccent;
  ctx.fillText('NAME YOUR HEDGEHOG', W / 2, 24);
  
  // Name box
  roundRect(24, 44, 192, 30, 10, '#fff');
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 44, 192, 30, 10);
  ctx.stroke();
  
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#3a2a1a';
  const cursor = Math.floor(animFrame / 18) % 2 ? '|' : '';
  ctx.fillText(namingName + cursor, W / 2, 59);
  
  // Scrollable alphabet includes correction and explicit confirmation.
  roundRect(12, 90, 216, 48, 5, '#c5a477');
  px(15, 93, 210, 3, '#ead3ab');
  for (let i = -2; i <= 2; i++) {
    const ci = (namingCharIndex + i + NAMING_OPTIONS.length) % NAMING_OPTIONS.length;
    const raw = NAMING_OPTIONS[ci];
    const ch = raw === ' ' ? 'SPACE' : raw;
    const isCenter = i === 0;
    ctx.font = `${isCenter ? 'bold ' : ''}${ch.length > 2 ? 8 : isCenter ? 16 : 11}px monospace`;
    ctx.globalAlpha = isCenter ? 1 : 0.28;
    ctx.fillStyle = isCenter ? '#3d3024' : '#735c45';
    ctx.fillText(ch, W / 2 + i * 45, 113);
  }
  ctx.globalAlpha = 1;
  
  // Selection marker
  roundRect(W / 2 - 20, 130, 40, 3, 2, C.tealDark);
  
  ctx.font = '8px monospace';
  ctx.fillStyle = '#8a7060';
  ctx.fillText('SCROLL: choose letter', W / 2, 150);
  ctx.fillText('PRESS: SELECT', W / 2, 164);
  ctx.font = '7px monospace'; ctx.fillStyle = '#6d5742';
  ctx.fillText('DELETE fixes mistakes • DONE adopts', W / 2, 194);
  ctx.textAlign = 'left';
}

function drawDeathScreen() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#f0e8f8');
  grad.addColorStop(1, '#e0d8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const alpha = Math.min(1, deathTimer / 60);
  ctx.globalAlpha = alpha;
  
  const floatY = Math.sin(animFrame * 0.025) * 5;
  const px2 = W / 2, py = 70 + floatY;
  
  ctx.globalAlpha = alpha * (0.7 + Math.sin(animFrame * 0.04) * 0.15);
  
  // Wings
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(px2 - 22, py, 10, 14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px2 + 22, py, 10, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  const memorialLook = stableAppearanceFor(hedgehog);
  drawQuillBody(px2 - 3, py, 15, memorialLook);
  ellipse(px2 + 8, py + 3, 8, 7, memorialLook.light);
  ctx.fillStyle = memorialLook.light; ctx.beginPath();
  ctx.moveTo(px2 + 10, py); ctx.lineTo(px2 + 20, py + 4); ctx.lineTo(px2 + 10, py + 7); ctx.closePath(); ctx.fill();
  ellipse(px2 + 20, py + 4, 2, 1.6, '#241812');
  // Peaceful closed eye
  ctx.strokeStyle = C.hedgeEye;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px2 + 9, py + 1, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  
  // Halo
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(px2, py - 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.globalAlpha = alpha;
  
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#4a3a2a';
  ctx.fillText(hedgehog.name, W / 2, 120);
  
  ctx.font = '9px monospace';
  ctx.fillStyle = '#7a6a5a';
  const ageDays = Math.floor(hedgehog.metrics.ageTicks / DAY_TICKS);
  ctx.fillText(`Lived ${ageDays} days`, W / 2, 142);
  ctx.fillText(`Ran ${Math.floor(hedgehog.metrics.wheelDistance)}m`, W / 2, 158);
  
  ctx.font = '8px monospace';
  ctx.fillStyle = '#a08060';
  ctx.fillText(deathCause, W / 2, 186);
  
  if (deathTimer > 90) {
    const blink = Math.floor(animFrame / 28) % 2;
    ctx.fillStyle = C.uiAccent;
    if (blink) ctx.fillText('[ PRESS to continue ]', W / 2, 245);
  }
  
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawMemorialScreen() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#fdf8e8');
  grad.addColorStop(1, '#f0e0c8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  roundRect(0, 0, W, 4, 0, C.teal);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = C.uiAccent;
  ctx.fillText('~ Memorial Wall ~', W / 2, 18);
  
  let y = 42;
  ctx.font = '8px monospace';
  
  if (memorial.legends.oldest) {
    ctx.fillStyle = '#c89020';
    ctx.fillText('★ Oldest', W / 2, y);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillText(`${memorial.legends.oldest.name} — ${memorial.legends.oldest.ageDays} days`, W / 2, y + 14);
    y += 34;
  }
  if (memorial.legends.heaviest) {
    ctx.fillStyle = '#c89020';
    ctx.fillText('★ Heaviest', W / 2, y);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillText(`${memorial.legends.heaviest.name} — ${Math.floor(memorial.legends.heaviest.maxMass)}g`, W / 2, y + 14);
    y += 34;
  }
  if (memorial.legends.longestRunner) {
    ctx.fillStyle = '#c89020';
    ctx.fillText('★ Runner', W / 2, y);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillText(`${memorial.legends.longestRunner.name} — ${memorial.legends.longestRunner.wheelDist}m`, W / 2, y + 14);
    y += 34;
  }
  
  if (memorial.lastFive.length > 0) {
    y += 6;
    ctx.fillStyle = C.uiDim;
    ctx.fillText('— Remembered —', W / 2, y);
    y += 16;
    for (const name of memorial.lastFive) {
      ctx.fillStyle = '#4a3a2a';
      ctx.fillText(name, W / 2, y);
      y += 14;
    }
  }
  
  ctx.fillStyle = C.uiAccent;
  const blink = Math.floor(animFrame / 28) % 2;
  if (blink) ctx.fillText('[ PRESS to adopt again ]', W / 2, 262);
  ctx.textAlign = 'left';
}

function drawMessage() {
  if (messageTimer > 0) {
    const alpha = Math.min(1, messageTimer / 20);
    ctx.globalAlpha = alpha;
    roundRect(16, 126, 208, 22, 8, 'rgba(50,30,15,0.88)');
    ctx.font = '8px monospace';
    ctx.fillStyle = C.uiWarm;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(messageText, W / 2, 137);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    messageTimer--;
  }
  if (offlineMsgTimer > 0) {
    const alpha = Math.min(1, offlineMsgTimer / 30);
    ctx.globalAlpha = alpha;
    roundRect(8, 20, 224, 20, 6, 'rgba(50,30,15,0.85)');
    ctx.font = '7px monospace';
    ctx.fillStyle = C.tealLight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(offlineMsg, W / 2, 30);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    offlineMsgTimer--;
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

function render() {
  ctx.clearRect(0, 0, W, H);
  switch (state) {
    case STATES.ADOPT: drawAdoptScreen(); break;
    case STATES.NAMING: drawNamingScreen(); break;
    case STATES.LIVING:
      ctx.save();
      ctx.translate(HABITAT_VIEW.focusX, HABITAT_VIEW.focusY);
      ctx.scale(HABITAT_VIEW.scale, HABITAT_VIEW.scale);
      ctx.translate(-HABITAT_VIEW.focusX, -HABITAT_VIEW.focusY);
      drawHabitat(false);
      drawHedgehog();
      ctx.restore();
      // Keep the history legible at native canvas scale while the habitat is
      // zoomed toward the hedgehog and bedding.
      drawMemorialMarks();
      drawUI();
      drawMessage();
      break;
    case STATES.DEATH: drawDeathScreen(); deathTimer++; break;
    case STATES.MEMORIAL: drawMemorialScreen(); break;
  }
  animFrame++;
}

function updateLiveMovement(deltaMs) {
  const distance = hedgehog.targetX - hedgehog.posX;
  if (Math.abs(distance) <= 2) return;
  const direction = Math.sign(distance);
  const climbing = hedgehog.activity === ACTIVITIES.RUNNING &&
    (hedgehog.wheelPhase === 'climb' || hedgehog.wheelPhase === 'exit');
  const speed = climbing ? 8 : 9; // deliberate climbing is slower than floor travel
  const step = Math.min(Math.abs(distance), speed * Math.min(deltaMs, 50) / 1000);
  hedgehog.posX = clampFloorX(hedgehog.posX + direction * step);
  hedgehog.facing = direction;
  walkPhase = (walkPhase + step * (climbing ? 1.05 : .58)) % (Math.PI * 2);
}

function gameLoop() {
  const now = Date.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  if (state === STATES.LIVING && hedgehog && hedgehog.alive) {
    if (!PREVIEW_FREEZE) updateLiveMovement(delta);
    // Only a visibly running hedgehog drives the wheel; frame timing keeps it fluid.
    if (hedgehog.activity === ACTIVITIES.RUNNING && hedgehog.wheelPhase === 'run') {
      wheelAngle = (wheelAngle + delta * 0.34) % 360;
    }
    tickAccumulator += delta;
    while (tickAccumulator >= TICK_MS) {
      simulateTick();
      tickAccumulator -= TICK_MS;
    }
  }
  render();
  requestAnimationFrame(gameLoop);
}

// ============================================================
// INPUT HANDLING
// ============================================================

window.addEventListener('scrollUp', () => {
  switch (state) {
    case STATES.ADOPT: if (memorial.lastFive.length > 0) state = STATES.MEMORIAL; break;
    case STATES.NAMING: namingCharIndex = (namingCharIndex - 1 + NAMING_OPTIONS.length) % NAMING_OPTIONS.length; break;
    case STATES.LIVING: selectedFoodIndex = (selectedFoodIndex - 1 + SELECTOR_COUNT) % SELECTOR_COUNT; break;
  }
});

window.addEventListener('scrollDown', () => {
  switch (state) {
    case STATES.ADOPT: if (memorial.lastFive.length > 0) state = STATES.MEMORIAL; break;
    case STATES.NAMING: namingCharIndex = (namingCharIndex + 1) % NAMING_OPTIONS.length; break;
    case STATES.LIVING: selectedFoodIndex = (selectedFoodIndex + 1) % SELECTOR_COUNT; break;
  }
});

window.addEventListener('sideClick', () => {
  switch (state) {
    case STATES.ADOPT: state = STATES.NAMING; namingName = ''; namingCharIndex = 0; break;
    case STATES.NAMING: {
      const option = NAMING_OPTIONS[namingCharIndex];
      if (option === 'DELETE') namingName = namingName.slice(0, -1);
      else if (option === 'DONE') finishNaming();
      else if (namingName.length < 10) namingName += option;
      break;
    }
    case STATES.LIVING: dropFood(); break;
    case STATES.DEATH: if (deathTimer > 90) state = STATES.MEMORIAL; break;
    case STATES.MEMORIAL: state = STATES.ADOPT; break;
  }
});

window.addEventListener('longPressStart', () => {
  if (state === STATES.NAMING) finishNaming();
});

function finishNaming() {
  if (namingName.trim().length === 0) return;
  hedgehog = createHedgehog(namingName.trim());
  foodOnGround = [];
  fallingFood = [];
  state = STATES.LIVING;
  showMessage(`Welcome home, ${hedgehog.name}!`);
  saveGame();
}

function dropFood() {
  if (!hedgehog || !hedgehog.alive) return;
  if (selectedFoodIndex === CLEAN_CAGE_SELECTION) {
    const removed = foodOnGround.length + fallingFood.length;
    foodOnGround = [];
    fallingFood = [];
    showMessage(removed > 0 ? 'Cage cleaned!' : 'The cage is already clean');
    saveGame();
    return;
  }
  fallingFood.push({
    type: selectedFoodIndex,
    x: HABITAT.foodMinX + Math.random() * (HABITAT.foodMaxX - HABITAT.foodMinX),
    y: 20,
    vy: 0,
    vx: (Math.random() - 0.5) * 2.5,
    bounces: 0,
    rotation: 0,
  });
  showMessage(`Dropped ${FOOD_TYPES[selectedFoodIndex].name}`);
  saveGame();
}

function showMessage(text) {
  messageText = text;
  messageTimer = 60;
}

// ============================================================
// KEYBOARD FALLBACK (dev)
// ============================================================

if (typeof PluginMessageHandler === 'undefined') {
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Space': e.preventDefault(); window.dispatchEvent(new CustomEvent('sideClick')); break;
      case 'ArrowUp': e.preventDefault(); window.dispatchEvent(new CustomEvent('scrollUp')); break;
      case 'ArrowDown': e.preventDefault(); window.dispatchEvent(new CustomEvent('scrollDown')); break;
      case 'KeyL': window.dispatchEvent(new CustomEvent('longPressStart')); break;
    }
  });
}

// ============================================================
// INIT
// ============================================================

async function init() {
  await loadGame();
  if (new URLSearchParams(window.location.search).has('preview')) {
    const previewParams = new URLSearchParams(window.location.search);
    if (previewParams.has('phase')) walkPhase = Number(previewParams.get('phase')) || 0;
    hedgehog = createHedgehog('WAFFLE');
    if (previewParams.has('look')) {
      const lookIndex = Math.max(0, Math.min(HEDGEHOG_LOOKS.length - 1, Number(previewParams.get('look')) || 0));
      hedgehog.appearance = { ...HEDGEHOG_LOOKS[lookIndex], lookIndex };
    }
    hedgehog.lifeStage = LIFE_STAGES.ADULT;
    hedgehog.metrics.ageTicks = DAY_TICKS * 120;
    hedgehog.metrics.bodyMass = 38;
    hedgehog.activity = ACTIVITIES.IDLE;
    hedgehog.activityTimer = 999;
    hedgehog.posX = 132;
    hedgehog.targetX = 132;
    foodOnGround = [
      { type: 3, x: 181, y: 207, remaining: 3, maxAmount: 3 },
      { type: 5, x: 181, y: 207, remaining: 3, maxAmount: 3 },
      { type: 2, x: 181, y: 207, remaining: 3, maxAmount: 3 },
    ];
    const activityPreview = previewParams.get('activity');
    if (activityPreview === 'walking') { hedgehog.activity = ACTIVITIES.IDLE; hedgehog.posX = 92; hedgehog.targetX = 172; }
    if (activityPreview === 'eating') { hedgehog.activity = ACTIVITIES.EATING; hedgehog.posX = 181; hedgehog.targetX = 181; }
    if (activityPreview === 'running') { hedgehog.activity = ACTIVITIES.RUNNING; hedgehog.wheelPhase = 'run'; hedgehog.activityTimer = 999; hedgehog.posX = HABITAT.wheelCenterX; hedgehog.targetX = HABITAT.wheelCenterX; }
    if (activityPreview === 'sleeping') { hedgehog.activity = ACTIVITIES.SLEEPING; hedgehog.posX = HABITAT.hideoutX; hedgehog.targetX = HABITAT.hideoutX; }
    if (activityPreview === 'drinking') { hedgehog.activity = ACTIVITIES.DRINKING; hedgehog.posX = HABITAT.waterX; hedgehog.targetX = HABITAT.waterX; }
    if (activityPreview === 'foodscale') {
      hedgehog.posX = 82; hedgehog.targetX = 82;
      foodOnGround = FOOD_TYPES.map((_, type) => ({ type, x: 145 + type * 9, y: 207, remaining: 3, maxAmount: 3 }));
    }
    if (activityPreview === 'decay') {
      hedgehog.posX = 82; hedgehog.targetX = 82;
      foodOnGround = FOOD_TYPES.map((food, type) => ({
        type, x: 145 + type * 9, y: 207, remaining: 3, maxAmount: 3,
        ageMinutes: food.decayMinutes * (.7 + type * .04),
      }));
    }
    state = STATES.LIVING;
  }
  lastFrameTime = Date.now();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});

init();
