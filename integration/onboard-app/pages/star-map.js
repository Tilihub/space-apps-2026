// Star map (dadis2, 15 Nov): a pixel-art view of the Mars transit for the crew app.
// Earth on the left, Mars on the right, joined by a dotted line, and the app's mascot halfway,
// heading for Mars, on a dark sky full of stars. Drawn on a small canvas and scaled up with
// `image-rendering: pixelated`, so every pixel stays crisp. Offline, no libraries.

const W = 192;
const H = 108;

// The mascot's colours (index.html: --mascot-light/body/shade/ring, .m-eye, .m-cheek)
const MASCOT = { light: '#E3FFFF', body: '#27EAFF', shade: '#0B779E', ring: '#F0C56B', ringBack: '#8F7438', eye: '#0A1430', cheek: '#FF9BB0' };
const EARTH = { x: 34, y: 68, r: 17 };
const MARS = { x: 160, y: 40, r: 12 };
const ARC = { x: 98, y: 8 }; // control point of the curved route from Earth to Mars

// ---- small helpers: seeded random numbers and smooth noise, so the picture is the same every time ----

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const s = (t) => t * t * (3 - 2 * t), u = s(fx), v = s(fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, seed) => noise(x, y, seed) * 0.6 + noise(x * 2, y * 2, seed + 1) * 0.28 + noise(x * 4, y * 4, seed + 2) * 0.12;
const dot = (ctx, x, y, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };

// ---- the sky ----

function drawSky(ctx) {
  ctx.fillStyle = '#05060F';
  ctx.fillRect(0, 0, W, H);
  // Faint dithered nebula
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 34, y / 24, 11);
      if (n > 0.64 && (x + y) % 2 === 0) dot(ctx, x, y, n > 0.71 ? '#17123C' : '#0F1631');
      else if (n > 0.59 && (x + y) % 4 === 0) dot(ctx, x, y, '#0B1029');
    }
  }
  const rnd = seeded(42);
  const twinkle = [];
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), b = rnd();
    const color = b > 0.97 ? '#FFFFFF' : b > 0.9 ? '#FFE9B0' : b > 0.75 ? '#CFE0FF' : b > 0.45 ? '#7E8DB5' : '#3F4A6E';
    dot(ctx, x, y, color);
    if (b > 0.8 && twinkle.length < 40) twinkle.push({ x, y, phase: rnd() * Math.PI * 2, speed: 1 + rnd() * 2.5, color });
  }
  // A few bright cross-shaped stars
  for (let i = 0; i < 7; i++) {
    const x = 4 + Math.floor(rnd() * (W - 8)), y = 4 + Math.floor(rnd() * (H - 8));
    dot(ctx, x, y, '#FFFFFF');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(ctx, x + dx, y + dy, '#8FA6D6');
  }
  return twinkle;
}

// ---- planets: shaded in three bands, the way pixel art does it ----

function drawPlanet(ctx, p, paint) {
  for (let y = -p.r; y <= p.r; y++) {
    for (let x = -p.r; x <= p.r; x++) {
      if (x * x + y * y > p.r * p.r + p.r * 0.6) continue;
      const nx = x / p.r, ny = y / p.r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const light = -0.5 * nx - 0.45 * ny + 0.74 * nz; // the sun is up and to the left
      const band = light > 0.62 ? 2 : light > 0.12 ? 1 : 0;
      dot(ctx, p.x + x, p.y + y, paint(nx, ny, band));
    }
  }
}

function drawEarth(ctx) {
  const ocean = ['#0E2C63', '#1B57B4', '#3C8EE4'], land = ['#1F4A22', '#3A8A3A', '#74C766'], cloud = ['#7D93AE', '#D3E2F2', '#FFFFFF'];
  drawPlanet(ctx, EARTH, (nx, ny, band) => {
    if (Math.abs(ny) > 0.86) return cloud[band];
    const c = fbm(nx * 2.4 + 3.1, ny * 2.4 + 1.7, 5);
    if (fbm(nx * 3.2 + 9, ny * 5 + 2, 8) > 0.66) return cloud[band];
    return c > 0.55 ? land[band] : ocean[band];
  });
  // Thin atmosphere on the lit edge
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = EARTH.x + Math.cos(a) * (EARTH.r + 1), y = EARTH.y + Math.sin(a) * (EARTH.r + 1);
    if (Math.cos(a) * -0.5 + Math.sin(a) * -0.45 > 0.1) dot(ctx, x, y, '#5FB8FF');
  }
}

function drawMars(ctx) {
  const rust = ['#5C1F0B', '#B5461C', '#E07546'], dark = ['#3E1508', '#83300F', '#AE4F27'], ice = ['#B9A9A2', '#EDE3DD', '#FFFFFF'];
  drawPlanet(ctx, MARS, (nx, ny, band) => {
    if (ny < -0.78) return ice[band];
    return fbm(nx * 2.6 + 4, ny * 2.6 + 6, 21) > 0.58 ? dark[band] : rust[band];
  });
}

// ---- the route: a dotted curve from Earth to Mars ----

const curve = (t) => ({
  x: (1 - t) ** 2 * EARTH.x + 2 * (1 - t) * t * ARC.x + t * t * MARS.x,
  y: (1 - t) ** 2 * EARTH.y + 2 * (1 - t) * t * ARC.y + t * t * MARS.y,
});

// 2×2 pixel dots with a dark outline, so the route stands out from the stars: cyan for the part
// already travelled, pale blue for the way still ahead.
function drawRoute(ctx, progress) {
  let length = 0, prev = curve(0), next = 0;
  for (let i = 1; i <= 3000; i++) {
    const t = i / 3000, p = curve(t);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
    if (length < next) continue;
    next = length + 5;
    const nearPlanet = Math.hypot(p.x - EARTH.x, p.y - EARTH.y) < EARTH.r + 5 || Math.hypot(p.x - MARS.x, p.y - MARS.y) < MARS.r + 5;
    if (nearPlanet) continue;
    const x = Math.round(p.x) - 1, y = Math.round(p.y) - 1;
    ctx.fillStyle = '#04050C';
    ctx.fillRect(x - 1, y - 1, 4, 4);
    ctx.fillStyle = t <= progress ? '#7FF0F8' : '#A9B6DE';
    ctx.fillRect(x, y, 2, 2);
  }
}

// ---- the mascot: a pixel version of the app's planet with its amber ring ----

function drawMascot(ctx, cx, cy) {
  const ring = (front) => {
    const rot = (-18 * Math.PI) / 180;
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      if ((Math.sin(a) >= 0) !== front) continue;
      const ex = Math.cos(a) * 10, ey = Math.sin(a) * 3.4;
      const x = ex * Math.cos(rot) - ey * Math.sin(rot), y = ex * Math.sin(rot) + ey * Math.cos(rot);
      if (front || x * x + y * y > 30) dot(ctx, cx + x, cy + y + 1, front ? MASCOT.ring : MASCOT.ringBack);
    }
  };
  ring(false);
  for (let y = -6; y <= 6; y++) {
    for (let x = -6; x <= 6; x++) {
      if (x * x + y * y > 40) continue;
      const fromLight = Math.hypot(x + 2.5, y + 2.5);
      dot(ctx, cx + x, cy + y, fromLight < 3 ? MASCOT.light : fromLight < 7.5 ? MASCOT.body : MASCOT.shade);
    }
  }
  // Eyes look ahead, towards Mars
  for (const ex of [-1, 3]) { dot(ctx, cx + ex, cy - 2, MASCOT.eye); dot(ctx, cx + ex, cy - 1, MASCOT.eye); }
  dot(ctx, cx - 3, cy + 1, MASCOT.cheek); dot(ctx, cx + 5, cy + 1, MASCOT.cheek);
  for (const [x, y] of [[0, 2], [1, 3], [2, 2]]) dot(ctx, cx + x, cy + y, MASCOT.eye);
  ring(true);
}

function drawTrail(ctx, t, frame) {
  // Sparkles left behind on the way from Earth
  const colors = ['#E3FFFF', '#9AF4FA', '#62E3EE', '#2C9FB0', '#1D5E6E', '#163D4C'];
  for (let i = 1; i <= 6; i++) {
    const p = curve(t - 0.035 - i * 0.012);
    const flicker = (i + frame) % 3 === 0 ? 1 : 0;
    dot(ctx, p.x, p.y + flicker, colors[i - 1]);
  }
}

// ---- tiny 3×5 pixel font for the labels ----

const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], ' ': ['..', '..', '..', '..', '..'],
};
const textWidth = (text) => [...text].reduce((w, ch) => w + (GLYPHS[ch] ?? GLYPHS[' '])[0].length + 1, -1);
function drawText(ctx, text, cx, y, color) {
  let x = Math.round(cx - textWidth(text) / 2);
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    g.forEach((row, gy) => [...row].forEach((c, gx) => { if (c === '#') dot(ctx, x + gx, y + gy, color); }));
    x += g[0].length + 1;
  }
}

// ---- the page ----

let staticLayer = null;
let twinkles = [];
let running = false;
let currentDay = null;

function buildStatic() {
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const ctx = layer.getContext('2d');
  twinkles = drawSky(ctx);
  drawRoute(ctx, 0.5);
  drawEarth(ctx);
  drawMars(ctx);
  drawText(ctx, 'EARTH', EARTH.x, EARTH.y + EARTH.r + 5, '#BFD4F2');
  drawText(ctx, 'MARS', MARS.x, MARS.y + MARS.r + 5, '#F2B48E');
  return layer;
}

function drawFrame(canvas, missionDay, frame) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(staticLayer, 0, 0);
  const time = frame / 10;
  for (const s of twinkles) {
    const v = Math.sin(time * s.speed + s.phase);
    if (v > 0.7) {
      dot(ctx, s.x, s.y, '#FFFFFF');
      if (v > 0.95) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(ctx, s.x + dx, s.y + dy, '#6D7FAE');
    } else if (v < -0.6) dot(ctx, s.x, s.y, '#26304E');
  }
  const t = 0.5, p = curve(t);
  const bob = Math.round(Math.sin(time * 1.4));
  drawTrail(ctx, t, frame);
  drawMascot(ctx, Math.round(p.x), Math.round(p.y) + bob);
  if (missionDay != null) drawText(ctx, `DAY ${missionDay}`, p.x, Math.round(p.y) - 14 + bob, MASCOT.ring);
}

/** The screen's markup. The picture is drawn by startStarMap() once it's on the page. */
export function starMapScreen({ missionDay } = {}) {
  return `<div class="card starmap-card"><canvas id="star-map" width="${W}" height="${H}" role="img" aria-label="Pixel star map: Earth and Mars joined by a dotted line, with the PULSE mascot halfway, heading for Mars${missionDay != null ? `, mission day ${missionDay}` : ''}."></canvas><p class="subtle starmap-caption">On the way to Mars${missionDay != null ? ` · mission day ${missionDay}` : ''}</p></div>`;
}

/** Draws the star map and keeps the stars twinkling while it's on screen (still if motion is reduced). */
export function startStarMap(missionDay) {
  const canvas = document.getElementById('star-map');
  if (!canvas) return;
  staticLayer ??= buildStatic();
  currentDay = missionDay;
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;
  drawFrame(canvas, currentDay, frame);
  if (still || running) return;
  running = true;
  let last = 0;
  const loop = (now) => {
    const current = document.getElementById('star-map');
    if (!current) { running = false; return; }
    if (now - last > 100) { last = now; frame += 1; drawFrame(current, currentDay, frame); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
