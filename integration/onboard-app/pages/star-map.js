// Star map (dadis2, 15 Nov): a full-page, pixel-art view of the Mars transit for the crew app.
// Earth and Mars joined by a dotted route, the app's mascot halfway, heading for Mars, on a dark sky
// full of twinkling stars. The mission's facts are written into the sky in white, gently pulsing pixel
// letters. Drawn on a small canvas sized to the page and scaled up with `image-rendering: pixelated`,
// so every pixel stays crisp. Offline, no libraries.

// Demo facts. The distance is an assumed average gain per day (sample value, not a trajectory).
const MISSION_NAME = 'FIRST DAWN';
const KM_PER_DAY = 600_000;

// The mascot's colours (index.html: --mascot-light/body/shade/ring, .m-eye, .m-cheek)
const MASCOT = { light: '#E3FFFF', body: '#27EAFF', shade: '#0B779E', ring: '#F0C56B', ringBack: '#8F7438', eye: '#0A1430', cheek: '#FF9BB0' };

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

// ---- the scene, laid out for the canvas size ----

function layout(W, H) {
  const scale = Math.min(W / 1.6, H);
  return {
    W, H,
    earth: { x: Math.round(W * 0.2), y: Math.round(H * 0.62), r: Math.max(10, Math.round(scale * 0.15)) },
    mars: { x: Math.round(W * 0.8), y: Math.round(H * 0.36), r: Math.max(7, Math.round(scale * 0.105)) },
    arc: { x: Math.round(W * 0.5), y: Math.round(H * 0.06) },
  };
}
const curve = (s, t) => ({
  x: (1 - t) ** 2 * s.earth.x + 2 * (1 - t) * t * s.arc.x + t * t * s.mars.x,
  y: (1 - t) ** 2 * s.earth.y + 2 * (1 - t) * t * s.arc.y + t * t * s.mars.y,
});

// ---- the sky ----

function drawSky(ctx, s) {
  ctx.fillStyle = '#05060F';
  ctx.fillRect(0, 0, s.W, s.H);
  for (let y = 0; y < s.H; y++) {
    for (let x = 0; x < s.W; x++) {
      const n = fbm(x / 34, y / 24, 11);
      if (n > 0.64 && (x + y) % 2 === 0) dot(ctx, x, y, n > 0.71 ? '#17123C' : '#0F1631');
      else if (n > 0.59 && (x + y) % 4 === 0) dot(ctx, x, y, '#0B1029');
    }
  }
  const rnd = seeded(42), twinkle = [];
  const count = Math.round((s.W * s.H) / 80);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd() * s.W), y = Math.floor(rnd() * s.H), b = rnd();
    const color = b > 0.97 ? '#FFFFFF' : b > 0.9 ? '#FFE9B0' : b > 0.75 ? '#CFE0FF' : b > 0.45 ? '#7E8DB5' : '#3F4A6E';
    dot(ctx, x, y, color);
    if (b > 0.8 && twinkle.length < count / 6) twinkle.push({ x, y, phase: rnd() * Math.PI * 2, speed: 1 + rnd() * 2.5 });
  }
  for (let i = 0; i < Math.round(count / 35); i++) {
    const x = 4 + Math.floor(rnd() * (s.W - 8)), y = 4 + Math.floor(rnd() * (s.H - 8));
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
      dot(ctx, p.x + x, p.y + y, paint(nx, ny, light > 0.62 ? 2 : light > 0.12 ? 1 : 0));
    }
  }
}
function drawEarth(ctx, e) {
  const ocean = ['#0E2C63', '#1B57B4', '#3C8EE4'], land = ['#1F4A22', '#3A8A3A', '#74C766'], cloud = ['#7D93AE', '#D3E2F2', '#FFFFFF'];
  drawPlanet(ctx, e, (nx, ny, band) => {
    if (Math.abs(ny) > 0.86) return cloud[band];
    if (fbm(nx * 3.2 + 9, ny * 5 + 2, 8) > 0.66) return cloud[band];
    return fbm(nx * 2.4 + 3.1, ny * 2.4 + 1.7, 5) > 0.55 ? land[band] : ocean[band];
  });
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    if (Math.cos(a) * -0.5 + Math.sin(a) * -0.45 > 0.1) dot(ctx, e.x + Math.cos(a) * (e.r + 1), e.y + Math.sin(a) * (e.r + 1), '#5FB8FF');
  }
}
function drawMars(ctx, m) {
  const rust = ['#5C1F0B', '#B5461C', '#E07546'], dark = ['#3E1508', '#83300F', '#AE4F27'], ice = ['#B9A9A2', '#EDE3DD', '#FFFFFF'];
  drawPlanet(ctx, m, (nx, ny, band) => {
    if (ny < -0.78) return ice[band];
    return fbm(nx * 2.6 + 4, ny * 2.6 + 6, 21) > 0.58 ? dark[band] : rust[band];
  });
}

// ---- the route: 2×2 pixel dots with a dark outline, cyan behind the mascot, pale blue ahead ----

function drawRoute(ctx, s, progress) {
  let length = 0, prev = curve(s, 0), next = 0;
  for (let i = 1; i <= 4000; i++) {
    const t = i / 4000, p = curve(s, t);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
    if (length < next) continue;
    next = length + 5;
    if (Math.hypot(p.x - s.earth.x, p.y - s.earth.y) < s.earth.r + 5 || Math.hypot(p.x - s.mars.x, p.y - s.mars.y) < s.mars.r + 5) continue;
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
  for (const ex of [-1, 3]) { dot(ctx, cx + ex, cy - 2, MASCOT.eye); dot(ctx, cx + ex, cy - 1, MASCOT.eye); } // looking ahead, at Mars
  dot(ctx, cx - 3, cy + 1, MASCOT.cheek);
  dot(ctx, cx + 5, cy + 1, MASCOT.cheek);
  for (const [x, y] of [[0, 2], [1, 3], [2, 2]]) dot(ctx, cx + x, cy + y, MASCOT.eye);
  ring(true);
}
function drawTrail(ctx, s, t, frame) {
  const colors = ['#E3FFFF', '#9AF4FA', '#62E3EE', '#2C9FB0', '#1D5E6E', '#163D4C'];
  for (let i = 1; i <= 6; i++) {
    const p = curve(s, t - 0.035 - i * 0.012);
    dot(ctx, p.x, p.y + ((i + frame) % 3 === 0 ? 1 : 0), colors[i - 1]);
  }
}

// ---- a 3×5 pixel font (capitals, digits, a little punctuation) ----

const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '##.', '#..', '##.', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], ':': ['.', '#', '.', '#', '.'], '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#'],
  '-': ['...', '...', '###', '...', '...'], ' ': ['..', '..', '..', '..', '..'],
};
const glyph = (ch) => GLYPHS[ch] ?? GLYPHS[' '];
const textWidth = (text) => [...text].reduce((w, ch) => w + glyph(ch)[0].length + 1, -1);
function drawText(ctx, text, x, y, color) {
  for (const ch of text) {
    const g = glyph(ch);
    g.forEach((row, gy) => [...row].forEach((c, gx) => { if (c === '#') dot(ctx, x + gx, y + gy, color); }));
    x += g[0].length + 1;
  }
}
// White letters that pulse gently, with a soft dark shadow so they read over the stars
function drawPulsingText(ctx, text, x, y, time, phase) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.globalAlpha = 0.55;
  drawText(ctx, text, x + 1, y + 1, '#02030A');
  ctx.globalAlpha = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(time * 1.6 + phase));
  drawText(ctx, text, x, y, '#FFFFFF');
  ctx.globalAlpha = 1;
}

// ---- the page ----

let state = null; // { key, scene, layer, twinkles }
let info = { missionDay: null, crewCount: null };
let running = false;
let resizeHooked = false;

function sceneFor(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  // Screen pixels per picture pixel: about 140 picture pixels tall, but at least 230 wide, so the
  // facts in the corner never run into "YOU ARE HERE"
  const pixel = Math.max(2, Math.min(Math.round(box.height / 140), Math.floor(box.width / 230)));
  const W = Math.max(120, Math.round(box.width / pixel)), H = Math.max(80, Math.round(box.height / pixel));
  const key = `${W}x${H}`;
  if (state?.key === key) return state;
  const scene = layout(W, H);
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const ctx = layer.getContext('2d');
  const twinkles = drawSky(ctx, scene);
  drawRoute(ctx, scene, 0.5);
  drawEarth(ctx, scene.earth);
  drawMars(ctx, scene.mars);
  drawText(ctx, 'EARTH', scene.earth.x - textWidth('EARTH') / 2, scene.earth.y + scene.earth.r + 5, '#BFD4F2');
  drawText(ctx, 'MARS', scene.mars.x - textWidth('MARS') / 2, scene.mars.y + scene.mars.r + 5, '#F2B48E');
  state = { key, scene, layer, twinkles };
  return state;
}

function drawFrame(canvas, frame) {
  const { scene: s, layer, twinkles } = sceneFor(canvas);
  if (canvas.width !== s.W || canvas.height !== s.H) { canvas.width = s.W; canvas.height = s.H; }
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(layer, 0, 0);
  const time = frame / 10;
  for (const st of twinkles) {
    const v = Math.sin(time * st.speed + st.phase);
    if (v > 0.7) {
      dot(ctx, st.x, st.y, '#FFFFFF');
      if (v > 0.95) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(ctx, st.x + dx, st.y + dy, '#6D7FAE');
    } else if (v < -0.6) dot(ctx, st.x, st.y, '#26304E');
  }
  const p = curve(s, 0.5), bob = Math.round(Math.sin(time * 1.4));
  drawTrail(ctx, s, 0.5, frame);
  drawMascot(ctx, Math.round(p.x), Math.round(p.y) + bob);

  // The mission's facts, written into the sky
  const day = info.missionDay;
  const lines = [`MISSION: ${MISSION_NAME}`, day != null ? `DAY ${day} OF MISSION` : null, info.crewCount != null ? `CREW MEMBERS: ${info.crewCount}` : null].filter(Boolean);
  lines.forEach((line, i) => drawPulsingText(ctx, line, 6, 6 + i * 9, time, i * 0.7));
  if (s.W >= 220) drawPulsingText(ctx, 'YOU ARE HERE', p.x - textWidth('YOU ARE HERE') / 2, p.y - 16 + bob, time, 2.1);
  if (day != null) {
    const km = day * KM_PER_DAY;
    const distance = km >= 1e6 ? `YOU ARE ${(km / 1e6).toFixed(1)} MILLION KM FROM EARTH` : `YOU ARE ${km.toLocaleString('en-US')} KM FROM EARTH`;
    drawPulsingText(ctx, distance, (s.W - textWidth(distance)) / 2, s.H - 10, time, 2.8);
  }
}

/** The screen's markup: one canvas filling the page. The picture is drawn by startStarMap(). */
export function starMapScreen({ missionDay, crewCount } = {}) {
  const label = `Star map: Earth and Mars joined by a dotted route, with the PULSE mascot halfway, heading for Mars. Mission ${MISSION_NAME}`
    + `${missionDay != null ? `, day ${missionDay}` : ''}${crewCount != null ? `, ${crewCount} crew members` : ''}.`;
  return `<div class="starmap-full"><canvas id="star-map" role="img" aria-label="${label}"></canvas></div>`;
}

/** Draws the star map and keeps it alive while it's on screen (still if the computer asks for reduced motion). */
export function startStarMap({ missionDay, crewCount } = {}) {
  info = { missionDay: missionDay ?? null, crewCount: crewCount ?? null };
  const canvas = document.getElementById('star-map');
  if (!canvas) return;
  let frame = 0;
  drawFrame(canvas, frame);
  if (!resizeHooked) {
    resizeHooked = true;
    window.addEventListener('resize', () => { const c = document.getElementById('star-map'); if (c) drawFrame(c, frame); });
  }
  if (running || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  running = true;
  let last = 0;
  const loop = (now) => {
    const current = document.getElementById('star-map');
    if (!current) { running = false; return; }
    if (now - last > 100) { last = now; frame += 1; drawFrame(current, frame); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
