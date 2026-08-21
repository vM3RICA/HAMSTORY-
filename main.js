// HAMSTORY - Cozy Pixel-Art Hamster Life Simulator for R1

const W = 240, H = 282;
const TICK_MS = 1000;
const DAY_TICKS = 60;
const PX = 2; // pixel grid size for retro feel

const STATES = { ADOPT: 0, NAMING: 1, LIVING: 2, DEATH: 3, MEMORIAL: 4 };

const FOOD_TYPES = [
  { name: 'Pellets',   nutrition: 8, hydration: 1, fiber: 6, sugar: 1, spriteW: 5, spriteH: 4 },
  { name: 'Millet',    nutrition: 5, hydration: 0, fiber: 4, sugar: 2, spriteW: 4, spriteH: 3 },
  { name: 'Sunflower', nutrition: 7, hydration: 0, fiber: 2, sugar: 1, spriteW: 4, spriteH: 6 },
  { name: 'Broccoli',  nutrition: 4, hydration: 5, fiber: 8, sugar: 1, spriteW: 10, spriteH: 12 },
  { name: 'Carrot',    nutrition: 3, hydration: 4, fiber: 5, sugar: 4, spriteW: 6, spriteH: 12 },
  { name: 'Banana',    nutrition: 4, hydration: 3, fiber: 2, sugar: 8, spriteW: 12, spriteH: 6 },
  { name: 'Egg',       nutrition: 10, hydration: 2, fiber: 0, sugar: 0, spriteW: 8, spriteH: 10 },
];

const LIFE_STAGES = { JUVENILE: 0, ADULT: 1, SENIOR: 2 };
const STAGE_NAMES = ['Baby', 'Adult', 'Elder'];
const ACTIVITIES = { IDLE: 0, EATING: 1, RUNNING: 2, SLEEPING: 3, HIDING: 4, DRINKING: 5, GROOMING: 6 };

// Warm cozy palette inspired by retro pet games
const C = {
  bgWall: '#c7a777',
  bgWallLight: '#e2c89f',
  bgWallDark: '#9b7954',
  floor: '#c49660',
  floorLight: '#dab888',
  bedding: '#f0d898',
  beddingDark: '#d4b870',
  beddingLight: '#fff0c8',
  beddingAccent: '#e8c470',
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
  hamOrange: '#c97832',
  hamGold: '#aa5e29',
  hamDarkStripe: '#754322',
  hamBelly: '#fff8e0',
  hamPink: '#ffb0b8',
  hamPinkDark: '#e08090',
  hamCheek: '#ffe0b0',
  hamEye: '#183040',
  hamEyeColor: '#308898',
  hamNose: '#d06868',
  hamPaw: '#f8d8b0',
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

// ============================================================
// GAME STATE
// ============================================================

let state = STATES.ADOPT;
let hamster = null;
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

// ============================================================
// STORAGE
// ============================================================

async function saveGame() {
  const data = {
    version: 3,
    state, hamster, foodOnGround, memorial,
    lastTimestamp: Date.now(),
    selectedFoodIndex, wheelAngle,
  };
  try { localStorage.setItem('hamstory', JSON.stringify(data)); }
  catch (e) { console.error('Local save error:', e); }
  if (window.creationStorage) {
    try { await window.creationStorage.plain.setItem('hamstory', btoa(JSON.stringify(data))); }
    catch (e) { console.error('Save error:', e); }
  }
}

async function loadGame() {
  let data = null;
  if (window.creationStorage) {
    try {
      const stored = await window.creationStorage.plain.getItem('hamstory');
      if (stored) data = JSON.parse(atob(stored));
    } catch (e) { console.error('Load error:', e); }
  }
  if (!data) {
    try {
      const stored = localStorage.getItem('hamstory');
      if (stored) data = JSON.parse(stored);
    } catch (e) { console.error('Local save error:', e); }
  }
  if (data) {
    state = Object.values(STATES).includes(data.state) ? data.state : STATES.ADOPT;
    hamster = data.hamster;
    foodOnGround = data.foodOnGround || data.foodQueue || [];
    memorial = data.memorial || { legends: { oldest: null, heaviest: null, longestRunner: null }, lastFive: [] };
    selectedFoodIndex = data.selectedFoodIndex || 0;
    lastTimestamp = data.lastTimestamp || Date.now();
    wheelAngle = data.wheelAngle || 0;
    if (state === STATES.LIVING && hamster && hamster.alive) simulateOffline();
    else if (state === STATES.LIVING && (!hamster || !hamster.alive)) state = STATES.ADOPT;
  }
}

// ============================================================
// HAMSTER CREATION
// ============================================================

function createHamster(name) {
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
  };
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

function simulateTick() {
  if (!hamster || !hamster.alive) return;

  hamster.metrics.ageTicks++;
  const ageDays = hamster.metrics.ageTicks / DAY_TICKS;
  hamster.lifeStage = getLifeStage(hamster);

  hamster.metrics.hunger += 0.15 * hamster.traits.metabolism;
  hamster.metrics.thirst += 0.2;

  // Eating from ground food
  if (hamster.metrics.hunger > 40 && foodOnGround.length > 0) {
    if (hamster.activity !== ACTIVITIES.EATING) {
      hamster.activity = ACTIVITIES.EATING;
      hamster.activityTimer = 15;
      const nearestFood = foodOnGround[0];
      hamster.targetX = nearestFood.x;
    }
  }

  if (hamster.activity === ACTIVITIES.EATING && foodOnGround.length > 0 &&
      Math.abs(hamster.posX - foodOnGround[0].x) < 9) {
    const food = foodOnGround[0];
    food.remaining -= 0.5;
    hamster.metrics.hunger = Math.max(0, hamster.metrics.hunger - FOOD_TYPES[food.type].nutrition * 0.3);
    hamster.metrics.thirst = Math.max(0, hamster.metrics.thirst - FOOD_TYPES[food.type].hydration * 0.2);
    const massGain = FOOD_TYPES[food.type].nutrition * 0.02;
    hamster.metrics.bodyMass += massGain * (hamster.lifeStage === LIFE_STAGES.JUVENILE ? 1.5 : 0.5);
    if (food.remaining <= 0) foodOnGround.shift();
    eatingAnim++;
  }

  if (hamster.metrics.thirst > 50 && hamster.activity !== ACTIVITIES.EATING) {
    if (hamster.activity !== ACTIVITIES.DRINKING) {
      hamster.activity = ACTIVITIES.DRINKING;
      hamster.activityTimer = 8;
      hamster.targetX = 210;
    }
    if (Math.abs(hamster.posX - 210) < 9) hamster.metrics.thirst = Math.max(0, hamster.metrics.thirst - 15);
  }

  hamster.activityTimer--;
  if (hamster.activityTimer <= 0) chooseNextActivity();

  if (hamster.activity === ACTIVITIES.RUNNING) {
    const speed = 0.5 + hamster.traits.wheelEnthusiasm * 0.5;
    hamster.metrics.wheelDistance += speed;
    wheelAngle += speed * 12;
    hamster.metrics.bodyMass = Math.max(15, hamster.metrics.bodyMass - 0.01);
    hamster.metrics.hunger += 0.1;
  }

  if (hamster.activity === ACTIVITIES.GROOMING) {
    groomAnim++;
  }

  // Update facing direction
  if (hamster.targetX > hamster.posX + 3) hamster.facing = 1;
  else if (hamster.targetX < hamster.posX - 3) hamster.facing = -1;

  let healthDelta = 0;
  if (hamster.metrics.hunger > 80) healthDelta -= 0.5;
  if (hamster.metrics.hunger > 95) healthDelta -= 1.0;
  if (hamster.metrics.thirst > 80) healthDelta -= 0.3;
  if (hamster.metrics.hunger < 40 && hamster.metrics.thirst < 40) healthDelta += 0.2 * hamster.traits.resilience;
  if (hamster.metrics.bodyMass < 18) healthDelta -= 0.3;
  if (hamster.metrics.bodyMass > 60) healthDelta -= 0.2;
  const lifePercent = ageDays / hamster.traits.lifespan;
  if (lifePercent > 0.8) healthDelta -= 0.1 * (lifePercent - 0.8) * 10;

  hamster.metrics.health = Math.max(0, Math.min(100, hamster.metrics.health + healthDelta));
  hamster.metrics.hunger = Math.min(100, hamster.metrics.hunger);
  hamster.metrics.thirst = Math.min(100, hamster.metrics.thirst);
  hamster.metrics.bodyMass = Math.max(10, Math.min(80, hamster.metrics.bodyMass));

  if (hamster.metrics.health <= 0) triggerDeath(ageDays);
  else if (ageDays >= hamster.traits.lifespan) { hamster.metrics.health = 0; triggerDeath(ageDays); }

  if (Math.abs(hamster.posX - hamster.targetX) > 2) {
    const direction = Math.sign(hamster.targetX - hamster.posX);
    hamster.posX += direction * Math.min(1.35, Math.abs(hamster.targetX - hamster.posX));
  }

  if (hamster.metrics.ageTicks % 30 === 0) saveGame();
}

function chooseNextActivity() {
  const r = Math.random();
  const wc = hamster.traits.wheelEnthusiasm * 0.3;
  if (hamster.metrics.hunger > 40 && foodOnGround.length > 0) {
    hamster.activity = ACTIVITIES.EATING;
    hamster.activityTimer = 10 + Math.floor(Math.random() * 10);
    hamster.targetX = foodOnGround[0].x;
  } else if (r < wc && hamster.lifeStage !== LIFE_STAGES.SENIOR) {
    hamster.activity = ACTIVITIES.RUNNING;
    hamster.activityTimer = 20 + Math.floor(Math.random() * 40);
    hamster.targetX = 115;
  } else if (r < wc + 0.15) {
    hamster.activity = ACTIVITIES.SLEEPING;
    hamster.activityTimer = 30 + Math.floor(Math.random() * 30);
    hamster.targetX = 36;
  } else if (r < wc + 0.25) {
    hamster.activity = ACTIVITIES.HIDING;
    hamster.activityTimer = 15 + Math.floor(Math.random() * 20);
    hamster.targetX = 36;
  } else if (r < wc + 0.35) {
    hamster.activity = ACTIVITIES.GROOMING;
    hamster.activityTimer = 8 + Math.floor(Math.random() * 12);
    groomAnim = 0;
  } else {
    hamster.activity = ACTIVITIES.IDLE;
    hamster.activityTimer = 10 + Math.floor(Math.random() * 20);
    hamster.targetX = 60 + Math.floor(Math.random() * 100);
  }
}

function triggerDeath(ageDays) {
  hamster.alive = false;
  if (ageDays >= hamster.traits.lifespan * 0.9) deathCause = 'Passed peacefully of old age';
  else if (hamster.metrics.hunger >= 95) deathCause = 'Passed away from malnutrition';
  else if (hamster.metrics.thirst >= 95) deathCause = 'Passed away from dehydration';
  else if (hamster.metrics.bodyMass < 15) deathCause = 'Too frail to continue';
  else deathCause = 'Crossed the rainbow bridge';

  const record = { name: hamster.name, ageDays: Math.floor(ageDays), maxMass: hamster.metrics.bodyMass, wheelDist: Math.floor(hamster.metrics.wheelDistance) };
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
  const elapsedTicks = Math.min(Math.floor(elapsedMs / TICK_MS), 7200);
  if (elapsedTicks > 5) {
    const hoursPassed = Math.floor(elapsedMs / 3600000);
    const minsPassed = Math.floor((elapsedMs % 3600000) / 60000);
    for (let i = 0; i < elapsedTicks; i++) {
      simulateTick();
      if (!hamster.alive) break;
    }
    if (hamster.alive) {
      offlineMsg = hoursPassed > 0
        ? `${hamster.name} lived ${hoursPassed}h ${minsPassed}m while away`
        : `${hamster.name} lived ${minsPassed}m while away`;
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
      ellipse(0, 0, 3, 2, '#8B6914');
      px(-2, -1, 1, 1, '#a08020');
      ellipse(2, 1, 2, 1.5, '#7a5810');
      break;
    case 1: // Millet - tiny golden spray
      px(-2, -2, 1, 1, '#DAA520');
      px(0, -1, 1, 1, '#e8b830');
      px(-1, 0, 1, 1, '#DAA520');
      px(1, 1, 1, 1, '#c89018');
      px(-1, -3, 1, 2, '#90a040');
      break;
    case 2: // Sunflower seed - black striped teardrop
      px(-2, -4, 4, 7, '#2a2a2a');
      px(-1, -3, 2, 5, '#404040');
      px(-1, -4, 1, 1, '#1a1a1a');
      px(0, -2, 1, 3, '#606060');
      px(-2, 3, 4, 1, '#1a1a1a');
      px(-1, -5, 2, 1, '#f0f0e0');
      break;
    case 3: // Broccoli - big green floret
      ellipse(0, -4, 6, 5, '#2a8a2a');
      ellipse(-3, -3, 3, 3, '#1a7a1a');
      ellipse(3, -3, 3, 3, '#1a7a1a');
      ellipse(0, -6, 3, 3, '#38a838');
      px(-1, -1, 1, 1, '#208020');
      px(2, -2, 1, 1, '#48b848');
      px(-1, 1, 2, 5, '#6a9030');
      px(0, 3, 1, 2, '#5a8020');
      break;
    case 4: // Carrot - orange with green top
      px(-1, -2, 3, 3, '#ff8c00');
      px(-1, 1, 2, 3, '#e87800');
      px(0, 4, 1, 3, '#d06800');
      px(0, -1, 1, 2, '#ffa030');
      // green top
      px(-2, -4, 1, 3, '#3a8a3a');
      px(0, -5, 1, 3, '#2a7a2a');
      px(1, -4, 1, 2, '#4a9a4a');
      break;
    case 5: // Banana - curved yellow
      px(-5, 0, 10, 3, '#ffe135');
      px(-4, -1, 8, 1, '#ffe850');
      px(-4, 3, 6, 1, '#e8c820');
      px(4, -1, 1, 2, '#8B6914');
      px(-5, 2, 1, 1, '#a08020');
      px(-3, 0, 2, 1, '#fff880');
      break;
    case 6: // Egg - smooth white oval
      ellipse(0, 0, 4, 5, '#fffde0');
      ellipse(0, 1, 3.5, 4, '#fff');
      px(-1, -3, 2, 1, '#fff');
      ellipse(0, 3, 3, 2, '#f0e8d0');
      break;
  }
  ctx.restore();
}

// ============================================================
// HABITAT RENDERING - Warm cozy cage filling the screen
// ============================================================

function drawHabitat() {
  // Back wall - warm tan wood paneling
  const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
  wallGrad.addColorStop(0, C.bgWallLight);
  wallGrad.addColorStop(0.6, C.bgWall);
  wallGrad.addColorStop(1, C.bgWallDark);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, H);
  px(0, 18, W, 5, '#49382a');
  px(3, 23, W - 6, 3, '#8f7658');
  
  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(100,60,30,0.08)';
  ctx.lineWidth = 1;
  for (let wy = 10; wy < 200; wy += 18) {
    ctx.beginPath();
    ctx.moveTo(0, wy);
    for (let wx = 0; wx < W; wx += 8) {
      ctx.lineTo(wx, wy + Math.sin(wx * 0.05 + wy) * 2);
    }
    ctx.stroke();
  }

  // Floor area (lower portion)
  const floorY = 195;
  roundRect(0, floorY, W, H - floorY, 0, C.floor);
  
  // Bedding layer - thick, cozy, textured
  const bedTop = 200;
  ctx.fillStyle = C.bedding;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let bx = 0; bx <= W; bx += 3) {
    const by = bedTop + Math.sin(bx * 0.1) * 3 + Math.sin(bx * 0.2 + 1) * 2;
    ctx.lineTo(bx, by);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  
  // Bedding texture - scattered bits
  for (let i = 0; i < 30; i++) {
    const bx = (i * 8.3) % W;
    const by = bedTop + 4 + (i * 7.1) % 30;
    const c = i % 3 === 0 ? C.beddingLight : i % 3 === 1 ? C.beddingDark : C.beddingAccent;
    px(bx, by, 3 + (i % 2), 2, c);
  }

  // Draw habitat elements (back to front)
  drawHideout();
  drawWheel();
  drawWaterBottle();
  drawFoodBowl();
  drawGroundFood();
  drawFallingFood();
}

function drawFoodBowl() {
  const x = 181, y = 211;
  ellipse(x, y + 5, 18, 5, '#5a4535');
  roundRect(x - 16, y - 1, 32, 8, 3, '#b8aa91');
  ellipse(x, y, 15, 4, '#746754');
  const shown = Math.min(foodOnGround.length, 5);
  for (let i = 0; i < shown; i++) {
    drawFoodSprite(foodOnGround[i].type, x - 8 + i * 4, y - 3 - (i % 2) * 2, 0.65);
  }
  px(x - 11, y + 5, 20, 1, '#d8cbb2');
}

function drawHideout() {
  const hx = 8, hy = 160;
  
  // House body
  roundRect(hx, hy + 18, 56, 42, 4, C.hideBody);
  roundRect(hx + 3, hy + 21, 50, 36, 3, '#9a6030');
  
  // Wood plank lines
  ctx.strokeStyle = 'rgba(60,30,10,0.2)';
  ctx.lineWidth = 1;
  for (let ly = hy + 24; ly < hy + 55; ly += 7) {
    ctx.beginPath();
    ctx.moveTo(hx + 4, ly);
    ctx.lineTo(hx + 52, ly);
    ctx.stroke();
  }
  
  // Roof - cozy peaked
  ctx.fillStyle = C.hideRoof;
  ctx.beginPath();
  ctx.moveTo(hx - 4, hy + 20);
  ctx.lineTo(hx + 28, hy);
  ctx.lineTo(hx + 60, hy + 20);
  ctx.closePath();
  ctx.fill();
  
  // Roof shading
  ctx.fillStyle = C.hideRoofLight;
  ctx.beginPath();
  ctx.moveTo(hx + 2, hy + 18);
  ctx.lineTo(hx + 28, hy + 4);
  ctx.lineTo(hx + 40, hy + 12);
  ctx.lineTo(hx + 2, hy + 18);
  ctx.closePath();
  ctx.fill();
  
  // Roof ridge
  px(hx + 24, hy - 1, 8, 3, C.woodDark);
  
  // Door opening (arch)
  ctx.fillStyle = C.hideDoor;
  ctx.beginPath();
  ctx.arc(hx + 28, hy + 42, 11, Math.PI, 0, true);
  ctx.lineTo(hx + 39, hy + 58);
  ctx.lineTo(hx + 17, hy + 58);
  ctx.closePath();
  ctx.fill();
  
  // Door inner shadow
  ctx.fillStyle = '#1a0c06';
  ctx.beginPath();
  ctx.arc(hx + 28, hy + 44, 8, Math.PI, 0, true);
  ctx.lineTo(hx + 36, hy + 56);
  ctx.lineTo(hx + 20, hy + 56);
  ctx.closePath();
  ctx.fill();
}

function drawWheel() {
  const cx = 120, cy = 155, r = 42;
  
  // Stand/support
  px(115, 195, 10, 10, C.wheelDark);
  px(117, 190, 6, 8, C.wheel);
  
  // Support arm to center
  ctx.strokeStyle = C.wheelDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(120, 195);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  
  // Outer rim (thick)
  ctx.strokeStyle = C.wheelRim;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  
  // Running surface
  ctx.strokeStyle = C.wheel;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.stroke();
  
  // Inner ring
  ctx.strokeStyle = C.wheelLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
  ctx.stroke();
  
  // Rungs/bars across the running surface (rotating)
  for (let i = 0; i < 12; i++) {
    const angle = (wheelAngle * Math.PI / 180) + (i * Math.PI / 6);
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
  ellipse(cx, cy, 6, 6, C.wheelLight);
  ellipse(cx, cy, 3, 3, C.wheelDark);
  px(cx - 1, cy - 1, 2, 2, C.wheelLight);
}

function drawWaterBottle() {
  const bx = 200, by = 38;
  
  // Metal bracket/holder
  roundRect(bx - 2, by - 8, 28, 8, 3, '#808080');
  px(bx + 2, by - 10, 4, 4, '#909090');
  px(bx + 18, by - 10, 4, 4, '#909090');
  
  // Bottle body (large)
  roundRect(bx, by, 24, 65, 8, C.bottle);
  
  // Water fill
  const waterLevel = 50;
  roundRect(bx + 3, by + 65 - waterLevel, 18, waterLevel - 5, 6, C.water);
  
  // Water highlight/shine
  px(bx + 5, by + 20, 3, 25, C.waterLight);
  px(bx + 4, by + 18, 2, 4, 'rgba(255,255,255,0.5)');
  
  // Bottle cap (red)
  roundRect(bx + 4, by - 2, 16, 6, 3, C.bottleCap);
  
  // Measurement lines
  ctx.strokeStyle = 'rgba(80,150,200,0.3)';
  ctx.lineWidth = 0.5;
  for (let ly = by + 20; ly < by + 60; ly += 10) {
    ctx.beginPath();
    ctx.moveTo(bx + 14, ly);
    ctx.lineTo(bx + 20, ly);
    ctx.stroke();
  }
  
  // Metal nozzle/spout
  px(bx + 9, by + 65, 6, 16, '#a0a0a0');
  px(bx + 10, by + 65, 4, 14, '#b8b8b8');
  px(bx + 11, by + 79, 3, 4, '#808080');
  
  // Ball bearing
  ellipse(bx + 12, by + 82, 2, 2, '#d0d0d0');
  
  // Drip animation
  const dripPhase = animFrame % 180;
  if (dripPhase < 30) {
    const dropY = by + 84 + dripPhase * 0.8;
    ellipse(bx + 12, dropY, 1.5, 2, C.water);
  }
}

function drawGroundFood() {
  if (hamster && hamster.activity === ACTIVITIES.EATING && foodOnGround[0]) {
    const food = foodOnGround[0];
    drawFoodSprite(food.type, hamster.posX + hamster.facing * 12, 203, 0.65);
  }
}

function drawFallingFood() {
  for (let i = fallingFood.length - 1; i >= 0; i--) {
    const f = fallingFood[i];
    f.vy += 0.6;
    f.y += f.vy;
    f.x += f.vx || 0;
    f.rotation = (f.rotation || 0) + 0.1;
    
    const groundY = 207;
    if (f.y >= groundY) {
      if (f.bounces < 2) {
        f.y = groundY;
        f.vy = -f.vy * 0.35;
        f.vx *= 0.5;
        f.bounces++;
      } else {
        foodOnGround.push({ type: f.type, x: 181, y: 207, remaining: 3, maxAmount: 3 });
        fallingFood.splice(i, 1);
        saveGame();
        continue;
      }
    }
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.sin(f.rotation) * 0.2);
    ctx.translate(-f.x, -f.y);
    drawFoodSprite(f.type, f.x, f.y, 1);
    ctx.restore();
  }
}

// ============================================================
// HAMSTER CHARACTER - Detailed, expressive, recognizable
// ============================================================

function drawHamster() {
  if (!hamster || !hamster.alive) return;
  
  const x = Math.floor(hamster.posX);
  const groundY = 210;
  
  // Size scaling
  let baseR = 14;
  if (hamster.lifeStage === LIFE_STAGES.ADULT) baseR = 18;
  if (hamster.lifeStage === LIFE_STAGES.SENIOR) baseR = 17;
  const massScale = 0.8 + (hamster.metrics.bodyMass / 60) * 0.4;
  const r = Math.floor(baseR * massScale);
  const f = hamster.facing;

  // Hiding - peek from hideout
  if (hamster.activity === ACTIVITIES.HIDING && hamster.posX < 50) {
    const peekX = 52;
    ellipse(peekX, groundY - r * 0.4, r * 0.4, r * 0.5, C.hamOrange);
    // One eye peeking
    ellipse(peekX + 3, groundY - r * 0.5, 2, 2.5, C.hamEye);
    px(peekX + 3, groundY - r * 0.55, 1, 1, '#fff');
    // Ear
    ellipse(peekX + 1, groundY - r * 0.8, 3, 4, C.hamPink);
    return;
  }
  
  // Sleeping - curled ball
  if (hamster.activity === ACTIVITIES.SLEEPING) {
    const breathe = Math.sin(animFrame * 0.06) * 1.5;
    ellipse(x, groundY - r * 0.4, r * 1.1 + breathe, r * 0.6, C.hamOrange);
    ellipse(x, groundY - r * 0.3, r * 0.7, r * 0.35, C.hamBelly);
    // Closed eyes (curved lines)
    ctx.strokeStyle = C.hamEye;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 4, groundY - r * 0.5, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 4, groundY - r * 0.5, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Tiny ear
    ellipse(x - r * 0.5, groundY - r * 0.7, 3, 4, C.hamPink);
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

  // Position adjustments for running
  let dy = Math.sin(animFrame * 0.055) * 0.7;
  if (Math.abs(hamster.posX - hamster.targetX) > 2 && hamster.activity !== ACTIVITIES.RUNNING) {
    dy -= Math.abs(Math.sin(animFrame * 0.28)) * 2;
  }
  if (hamster.activity === ACTIVITIES.RUNNING) {
    dy = Math.sin(animFrame * 0.5) * 3;
  }
  
  const bodyY = groundY - r + dy;

  // Shadow
  ctx.globalAlpha = 0.1;
  ellipse(x, groundY + 3, r * 0.8, 3, '#000');
  ctx.globalAlpha = 1;

  // TAIL (behind body)
  ellipse(x - f * r * 0.9, bodyY + r * 0.3, 4, 3, C.hamGold);

  // BODY - round and chunky
  ellipse(x, bodyY, r, r * 0.95, C.hamOrange);
  ellipse(x - f * r * 0.42, bodyY - r * 0.08, r * 0.48, r * 0.68, C.hamGold);
  
  // Body dark edge (top stripe)
  ctx.fillStyle = C.hamDarkStripe;
  ctx.beginPath();
  ctx.ellipse(x, bodyY - r * 0.4, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // BELLY - cream white
  ellipse(x, bodyY + r * 0.2, r * 0.65, r * 0.6, C.hamBelly);

  // HEAD (slightly forward)
  const headX = x + f * r * 0.34;
  const headY = bodyY - r * 0.6;
  const headR = r * 0.7;
  ellipse(headX, headY, headR, headR * 0.85, C.hamOrange);
  
  // Head stripe (brown marking on top)
  ctx.fillStyle = C.hamDarkStripe;
  ctx.beginPath();
  ctx.ellipse(headX, headY - headR * 0.5, headR * 0.3, headR * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stripe extends down
  px(headX - 2, headY - headR * 0.6, 4, 4, C.hamDarkStripe);

  // EARS (round, pink inside)
  const earY = headY - headR * 0.6;
  // Left ear
  ellipse(headX - headR * 0.6, earY, 5, 6, C.hamOrange);
  ellipse(headX - headR * 0.6, earY, 3, 4, C.hamPink);
  ellipse(headX - headR * 0.6, earY, 1.5, 2.5, C.hamPinkDark);
  // Right ear
  ellipse(headX + headR * 0.6, earY, 5, 6, C.hamOrange);
  ellipse(headX + headR * 0.6, earY, 3, 4, C.hamPink);
  ellipse(headX + headR * 0.6, earY, 1.5, 2.5, C.hamPinkDark);

  // CHEEK POUCHES (puffy)
  const cheekPuff = hamster.activity === ACTIVITIES.EATING ? 1.3 : 1;
  ellipse(headX - headR * 0.55, headY + 2, 5 * cheekPuff, 4 * cheekPuff, C.hamCheek);
  ellipse(headX + headR * 0.55, headY + 2, 5 * cheekPuff, 4 * cheekPuff, C.hamCheek);

  // EYES - large, expressive with colored iris
  const eyeSpacing = 5;
  const eyeY = headY - 1;
  
  // Eye whites
  ellipse(headX - eyeSpacing, eyeY, 3.5, 4, '#fff');
  ellipse(headX + eyeSpacing, eyeY, 3.5, 4, '#fff');
  
  // Iris (teal/dark)
  ellipse(headX - eyeSpacing + f * 0.5, eyeY + 0.5, 2.5, 3, C.hamEye);
  ellipse(headX + eyeSpacing + f * 0.5, eyeY + 0.5, 2.5, 3, C.hamEye);
  
  // Eye color highlight
  px(headX - eyeSpacing - 1 + f, eyeY - 1, 2, 2, C.hamEyeColor);
  px(headX + eyeSpacing - 1 + f, eyeY - 1, 2, 2, C.hamEyeColor);
  
  // Eye shine (white dot)
  px(headX - eyeSpacing + 1, eyeY - 2, 2, 2, '#fff');
  px(headX + eyeSpacing + 1, eyeY - 2, 2, 2, '#fff');

  // Projecting cream muzzle gives the face a recognizable hamster silhouette.
  ellipse(headX + f * headR * 0.38, headY + headR * 0.28, 5, 4, C.hamBelly);
  ellipse(headX + f * headR * 0.65, headY + headR * 0.28, 2.2, 1.8, C.hamNose);
  
  // MOUTH - tiny smile
  ctx.strokeStyle = C.hamDarkStripe;
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
  if (hamster.activity === ACTIVITIES.EATING || hamster.activity === ACTIVITIES.GROOMING) {
    const pawUp = Math.sin(animFrame * 0.4) * 2;
    ellipse(x - 5, bodyY + r * 0.4 + pawUp, 3, 3, C.hamPaw);
    ellipse(x + 5, bodyY + r * 0.4 - pawUp, 3, 3, C.hamPaw);
    // Tiny toes
    px(x - 6, bodyY + r * 0.4 + pawUp + 1, 1, 1, C.hamPinkDark);
    px(x + 5, bodyY + r * 0.4 - pawUp + 1, 1, 1, C.hamPinkDark);
  }
  // Back feet always visible
  ellipse(x - r * 0.3, pawY, 4, 2.5, C.hamPaw);
  ellipse(x + r * 0.3, pawY, 4, 2.5, C.hamPaw);

  // ACTIVITY-SPECIFIC ANIMATIONS
  if (hamster.activity === ACTIVITIES.EATING && foodOnGround.length > 0) {
    // Holding food near mouth
    const bobble = Math.sin(animFrame * 0.6) * 1;
    drawFoodSprite(foodOnGround[0].type, headX + f * 5, headY + headR * 0.5 + bobble, 0.5);
  }
  
  if (hamster.activity === ACTIVITIES.GROOMING) {
    // Licking paw animation - sparkle
    if (groomAnim % 20 < 10) {
      ctx.fillStyle = '#fff';
      const sparkX = x + Math.sin(groomAnim * 0.3) * 5;
      const sparkY = bodyY + Math.cos(groomAnim * 0.3) * 3;
      px(sparkX, sparkY, 2, 2, '#fff');
      px(sparkX + 3, sparkY - 2, 1, 1, '#fff');
    }
  }

  if (hamster.activity === ACTIVITIES.RUNNING) {
    // Legs motion blur
    const legPhase = animFrame * 0.6;
    const legY = pawY - 2;
    ctx.globalAlpha = 0.5;
    ellipse(x - 4 + Math.sin(legPhase) * 3, legY, 2, 2, C.hamPaw);
    ellipse(x + 4 + Math.sin(legPhase + 2) * 3, legY, 2, 2, C.hamPaw);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// UI ELEMENTS
// ============================================================

function drawUI() {
  // Top bar - dark wood
  roundRect(0, 0, W, 18, 0, C.uiBg);
  // Teal accent line
  px(0, 17, W, 1, C.teal);
  
  ctx.textBaseline = 'top';
  
  if (hamster && hamster.alive) {
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = C.uiWarm;
    ctx.fillText(hamster.name, 5, 4);
    
    const ageDays = Math.floor(hamster.metrics.ageTicks / DAY_TICKS);
    ctx.font = '8px monospace';
    ctx.fillStyle = C.uiText;
    ctx.fillText(`D${ageDays}`, 85, 5);
    
    ctx.fillStyle = C.uiDim;
    ctx.fillText(STAGE_NAMES[hamster.lifeStage], 115, 5);
    
    // Health bar
    const hPct = hamster.metrics.health / 100;
    const hColor = hPct > 0.6 ? C.teal : hPct > 0.3 ? '#e8a030' : '#e04040';
    px(170, 6, 30, 6, '#2a1a10');
    px(171, 7, Math.floor(28 * hPct), 4, hColor);
    
    // Heart icon
    ctx.fillStyle = hColor;
    ctx.font = '8px sans-serif';
    ctx.fillText('♥', 162, 4);
    
    // Wheel distance
    ctx.fillStyle = C.uiDim;
    ctx.font = '7px monospace';
    ctx.fillText(`${Math.floor(hamster.metrics.wheelDistance)}m`, 205, 5);
  }

  // Bottom bar - food selector
  roundRect(0, 252, W, 30, 0, C.uiBg);
  px(0, 252, W, 1, C.teal);
  
  const food = FOOD_TYPES[selectedFoodIndex];
  
  // Arrow indicators
  ctx.font = '12px monospace';
  ctx.fillStyle = C.teal;
  ctx.textBaseline = 'middle';
  ctx.fillText('◂', 4, 267);
  ctx.fillText('▸', 228, 267);
  
  // Food preview area
  roundRect(22, 255, 196, 22, 6, C.uiBgLight);
  
  // Food sprite preview
  drawFoodSprite(selectedFoodIndex, 40, 266, 1.3);
  
  // Food name
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = C.uiText;
  ctx.textBaseline = 'middle';
  ctx.fillText(food.name, 58, 262);
  
  // Instruction
  ctx.font = '7px monospace';
  ctx.fillStyle = C.uiDim;
  ctx.fillText('press button to drop', 58, 272);
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
  ctx.fillText('HAMSTORY', W / 2, 32);
  
  ctx.font = '8px monospace';
  ctx.fillStyle = C.tealDark;
  ctx.fillText('a tiny life simulator', W / 2, 48);
  
  // Draw a big cute hamster in center
  const hx = W / 2, hy = 120;
  const bob = Math.sin(animFrame * 0.05) * 2;
  
  // Body
  ellipse(hx, hy + bob, 28, 26, C.hamOrange);
  ellipse(hx, hy + 6 + bob, 18, 16, C.hamBelly);
  
  // Head
  ellipse(hx, hy - 18 + bob, 20, 18, C.hamOrange);
  
  // Head stripe
  ellipse(hx, hy - 28 + bob, 6, 5, C.hamDarkStripe);
  
  // Ears
  ellipse(hx - 14, hy - 30 + bob, 6, 8, C.hamOrange);
  ellipse(hx - 14, hy - 30 + bob, 4, 5, C.hamPink);
  ellipse(hx + 14, hy - 30 + bob, 6, 8, C.hamOrange);
  ellipse(hx + 14, hy - 30 + bob, 4, 5, C.hamPink);
  
  // Eyes (big and cute)
  ellipse(hx - 7, hy - 20 + bob, 4.5, 5.5, '#fff');
  ellipse(hx + 7, hy - 20 + bob, 4.5, 5.5, '#fff');
  ellipse(hx - 7, hy - 19 + bob, 3, 4, C.hamEye);
  ellipse(hx + 7, hy - 19 + bob, 3, 4, C.hamEye);
  px(hx - 6, hy - 22 + bob, 2, 2, C.hamEyeColor);
  px(hx + 7, hy - 22 + bob, 2, 2, C.hamEyeColor);
  px(hx - 5, hy - 23 + bob, 2, 2, '#fff');
  px(hx + 8, hy - 23 + bob, 2, 2, '#fff');
  
  // Cheeks
  ellipse(hx - 13, hy - 14 + bob, 6, 5, C.hamCheek);
  ellipse(hx + 13, hy - 14 + bob, 6, 5, C.hamCheek);
  
  // Nose
  ellipse(hx, hy - 12 + bob, 3, 2.5, C.hamNose);
  
  // Mouth
  ctx.strokeStyle = C.hamDarkStripe;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(hx, hy - 9 + bob, 2.5, 0.3, Math.PI - 0.3);
  ctx.stroke();
  
  // Paws
  ellipse(hx - 8, hy + 20 + bob, 5, 3, C.hamPaw);
  ellipse(hx + 8, hy + 20 + bob, 5, 3, C.hamPaw);
  
  // Whiskers
  ctx.strokeStyle = 'rgba(120,80,40,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(hx - 10, hy - 14 + bob); ctx.lineTo(hx - 22, hy - 17 + bob);
  ctx.moveTo(hx - 10, hy - 12 + bob); ctx.lineTo(hx - 22, hy - 11 + bob);
  ctx.moveTo(hx + 10, hy - 14 + bob); ctx.lineTo(hx + 22, hy - 17 + bob);
  ctx.moveTo(hx + 10, hy - 12 + bob); ctx.lineTo(hx + 22, hy - 11 + bob);
  ctx.stroke();
  
  ctx.font = '10px monospace';
  ctx.fillStyle = '#5a4030';
  ctx.fillText('A hamster is waiting', W / 2, 170);
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
  ctx.fillText('NAME YOUR HAMSTER', W / 2, 24);
  
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
  
  // Character wheel
  roundRect(15, 92, 210, 40, 12, 'rgba(255,255,255,0.8)');
  
  for (let i = -3; i <= 3; i++) {
    const ci = (namingCharIndex + i + ALPHABET.length) % ALPHABET.length;
    const ch = ALPHABET[ci] === ' ' ? '·' : ALPHABET[ci];
    const isCenter = i === 0;
    ctx.font = `${isCenter ? 'bold ' : ''}${isCenter ? 16 : 12}px monospace`;
    ctx.globalAlpha = isCenter ? 1 : Math.max(0.15, 0.4 - Math.abs(i) * 0.1);
    ctx.fillStyle = isCenter ? C.uiAccent : '#8a7a6a';
    ctx.fillText(ch, W / 2 + i * 26, 112);
  }
  ctx.globalAlpha = 1;
  
  // Selection marker
  roundRect(W / 2 - 10, 124, 20, 3, 2, C.teal);
  
  ctx.font = '8px monospace';
  ctx.fillStyle = '#8a7060';
  ctx.fillText('SCROLL: choose letter', W / 2, 150);
  ctx.fillText('PRESS: add letter', W / 2, 164);
  
  if (namingName.length > 0) {
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = C.teal;
    ctx.fillText('LONG PRESS to confirm', W / 2, 200);
  }
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
  
  // Body
  ellipse(px2, py, 16, 14, C.hamOrange);
  ellipse(px2, py + 4, 10, 8, C.hamBelly);
  
  // Peaceful face
  ctx.strokeStyle = C.hamEye;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px2 - 4, py - 3, 2.5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px2 + 4, py - 3, 2.5, 0.2, Math.PI - 0.2);
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
  ctx.fillText(hamster.name, W / 2, 120);
  
  ctx.font = '9px monospace';
  ctx.fillStyle = '#7a6a5a';
  const ageDays = Math.floor(hamster.metrics.ageTicks / DAY_TICKS);
  ctx.fillText(`Lived ${ageDays} days`, W / 2, 142);
  ctx.fillText(`Ran ${Math.floor(hamster.metrics.wheelDistance)}m`, W / 2, 158);
  
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
      drawHabitat();
      drawHamster();
      drawUI();
      drawMessage();
      break;
    case STATES.DEATH: drawDeathScreen(); deathTimer++; break;
    case STATES.MEMORIAL: drawMemorialScreen(); break;
  }
  animFrame++;
}

function gameLoop() {
  const now = Date.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  if (state === STATES.LIVING && hamster && hamster.alive) {
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
    case STATES.NAMING: namingCharIndex = (namingCharIndex - 1 + ALPHABET.length) % ALPHABET.length; break;
    case STATES.LIVING: selectedFoodIndex = (selectedFoodIndex - 1 + FOOD_TYPES.length) % FOOD_TYPES.length; break;
  }
});

window.addEventListener('scrollDown', () => {
  switch (state) {
    case STATES.ADOPT: if (memorial.lastFive.length > 0) state = STATES.MEMORIAL; break;
    case STATES.NAMING: namingCharIndex = (namingCharIndex + 1) % ALPHABET.length; break;
    case STATES.LIVING: selectedFoodIndex = (selectedFoodIndex + 1) % FOOD_TYPES.length; break;
  }
});

window.addEventListener('sideClick', () => {
  switch (state) {
    case STATES.ADOPT: state = STATES.NAMING; namingName = ''; namingCharIndex = 0; break;
    case STATES.NAMING: if (namingName.length < 10) namingName += ALPHABET[namingCharIndex]; break;
    case STATES.LIVING: dropFood(); break;
    case STATES.DEATH: if (deathTimer > 90) state = STATES.MEMORIAL; break;
    case STATES.MEMORIAL: state = STATES.ADOPT; break;
  }
});

window.addEventListener('longPressStart', () => {
  if (state === STATES.NAMING && namingName.trim().length > 0) {
    hamster = createHamster(namingName.trim());
    foodOnGround = [];
    fallingFood = [];
    state = STATES.LIVING;
    showMessage(`Welcome home, ${hamster.name}!`);
    saveGame();
  }
});

function dropFood() {
  if (!hamster || !hamster.alive) return;
  if (foodOnGround.length + fallingFood.length >= 10) {
    showMessage('Too much food!');
    return;
  }
  fallingFood.push({
    type: selectedFoodIndex,
    x: 177 + Math.random() * 8,
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
    hamster = createHamster('WAFFLE');
    hamster.lifeStage = LIFE_STAGES.ADULT;
    hamster.metrics.ageTicks = DAY_TICKS * 42;
    hamster.metrics.bodyMass = 38;
    hamster.activity = ACTIVITIES.IDLE;
    hamster.activityTimer = 999;
    hamster.posX = 132;
    hamster.targetX = 132;
    foodOnGround = [
      { type: 3, x: 181, y: 207, remaining: 3, maxAmount: 3 },
      { type: 5, x: 181, y: 207, remaining: 3, maxAmount: 3 },
      { type: 2, x: 181, y: 207, remaining: 3, maxAmount: 3 },
    ];
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
