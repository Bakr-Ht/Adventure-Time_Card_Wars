import { FACTION, INK, STROKE, THIN, circle, ellipse, g, path, poly, rect, sparkle, svg } from './common.mjs';

/** Wide landscape tile used as a lane backdrop (one per side of each lane). */
export function landscapeTile(faction) {
  const c = FACTION[faction];
  let b = `<rect width="320" height="200" fill="${c.sky}"/>`;
  switch (faction) {
    case 'BLUE_PLAINS':
      b += path('M-10 110 Q80 60 170 100 T330 90 V210 H-10Z', c.far, THIN);
      b += path('M-10 140 Q100 110 190 138 T330 130 V210 H-10Z', c.near, THIN);
      for (const [x, y] of [[30, 160], [110, 176], [220, 166], [290, 184], [160, 150]]) {
        b += path(`M${x - 6} ${y} l4 -12 l3 12 l4 -14 l3 14`, 'none', `stroke="${c.tuft}" stroke-width="3" stroke-linecap="round"`);
      }
      b += circle(262, 40, 18, '#FFF6B8', THIN);
      break;
    case 'CORN_FIELDS':
      b += path('M-10 100 H330 V210 H-10Z', c.far, THIN);
      for (let x = 10; x < 320; x += 26) {
        b += path(`M${x} 100 V70`, 'none', `stroke="${c.tuft}" stroke-width="4" stroke-linecap="round"`);
        b += ellipse(x + 4, 76, 4, 9, '#FFE066', THIN);
        b += path(`M${x} 88 q-10 -4 -12 -12`, 'none', `stroke="${c.tuft}" stroke-width="3" stroke-linecap="round"`);
      }
      for (let y = 118; y < 210; y += 18) b += path(`M-10 ${y} Q160 ${y - 8} 330 ${y}`, 'none', `stroke="${c.accent}" stroke-width="4"`);
      break;
    case 'USELESS_SWAMP':
      b += path('M-10 100 Q80 88 160 102 T330 96 V210 H-10Z', c.far, THIN);
      b += path('M-10 128 Q90 116 180 130 T330 124 V210 H-10Z', c.near, THIN);
      for (const [x, y, r] of [[60, 160, 20], [230, 172, 16], [150, 186, 12]]) b += ellipse(x, y, r, r * 0.3, '#86A845', THIN);
      for (const [x, y] of [[120, 70], [132, 54], [40, 60], [250, 64]]) b += circle(x, y, 4, '#E6F2C2', THIN);
      b += path('M290 100 V40 M290 52 q-12 -6 -16 -16 M290 66 q12 -4 16 -14', 'none', `stroke="${c.accent}" stroke-width="4" stroke-linecap="round"`);
      break;
    case 'NICE_LANDS':
      for (const [x, y, s] of [[60, 44, 1.2], [230, 34, 1]]) {
        b += g(`translate(${x} ${y}) scale(${s})`, path('M-26 8 q-6 -16 12 -16 q6 -14 22 -6 q16 -8 20 10 q12 2 6 12Z', '#FFFFFF', THIN));
      }
      b += path('M-10 116 Q90 80 180 108 T330 100 V210 H-10Z', c.far, THIN);
      b += path('M-10 146 Q110 124 210 144 T330 138 V210 H-10Z', c.near, THIN);
      for (const [x, y] of [[80, 170], [240, 160]]) b += path(`M${x} ${y} C${x - 8} ${y - 8} ${x - 6} ${y - 14} ${x} ${y - 10} C${x + 6} ${y - 14} ${x + 8} ${y - 8} ${x} ${y}Z`, '#FFFFFF', THIN);
      break;
  }
  return svg(320, 200, b, 1.5);
}

/** Faction glyphs: shapes differ per faction so colour is never the only cue. */
export const GLYPHS = {
  BLUE_PLAINS: (c) => path('M14 50 l8 -30 l6 30 l8 -38 l6 38 l8 -26 l6 26Z', c, STROKE),
  CORN_FIELDS: (c) => ellipse(32, 30, 12, 22, c) + path('M20 44 Q14 56 32 58 Q50 56 44 44', '#7BB33A', STROKE) + path('M26 22 h12 M26 32 h12', 'none', THIN),
  USELESS_SWAMP: (c) => path('M32 8 C20 26 14 36 14 42 A18 18 0 0 0 50 42 C50 36 44 26 32 8Z', c) + circle(26, 42, 4, '#FFFFFF', ''),
  NICE_LANDS: (c) => path('M32 54 C10 40 8 24 20 18 Q30 14 32 26 Q34 14 44 18 C56 24 54 40 32 54Z', c),
  RAINBOW: () =>
    ['#FF6B6B', '#FFE066', '#7ED957', '#5BC0EB'].map((col, i) => path(`M${8 + i * 5} 50 A${24 - i * 5} ${24 - i * 5} 0 0 1 ${56 - i * 5} 50`, 'none', `stroke="${INK}" stroke-width="7"`) + path(`M${8 + i * 5} 50 A${24 - i * 5} ${24 - i * 5} 0 0 1 ${56 - i * 5} 50`, 'none', `stroke="${col}" stroke-width="3.5"`)).join(''),
};

export const GLYPH_COLORS = {
  BLUE_PLAINS: '#4C7FE6',
  CORN_FIELDS: '#FFD64A',
  USELESS_SWAMP: '#7A9A3A',
  NICE_LANDS: '#F58FBA',
  RAINBOW: '#FFFFFF',
};

export function glyph(faction) {
  return svg(64, 64, GLYPHS[faction](GLYPH_COLORS[faction]), 2);
}

export function cardBack() {
  let b = `<rect x="4" y="4" width="192" height="272" rx="18" fill="#5B3FA0" stroke="${INK}" stroke-width="6"/>`;
  b += `<rect x="18" y="18" width="164" height="244" rx="12" fill="none" stroke="#FFD64A" stroke-width="4" stroke-dasharray="10 8"/>`;
  b += circle(100, 140, 48, '#FFD64A') + path('M72 140 q28 -40 56 0 q-28 40 -56 0Z', '#FF7FB0', STROKE);
  b += circle(100, 140, 10, INK, '') + sparkle(56, 60, 10, '#FFFFFF') + sparkle(146, 222, 10, '#FFFFFF') + sparkle(150, 58, 6, '#FFD64A');
  return svg(200, 280, b, 1.5);
}

export function menuBackground() {
  let b = '<rect width="1600" height="900" fill="#8ED8E8"/>';
  b += circle(1300, 170, 80, '#FFF3A8', STROKE);
  for (const [x, y, s] of [[260, 150, 2.2], [760, 90, 1.6], [1080, 260, 1.8]]) {
    b += g(`translate(${x} ${y}) scale(${s})`, path('M-26 8 q-6 -16 12 -16 q6 -14 22 -6 q16 -8 20 10 q12 2 6 12Z', '#FFFFFF', THIN));
  }
  b += path('M-20 600 Q300 420 640 560 T1300 520 T1640 560 V920 H-20Z', '#7FA8F5', STROKE);
  b += path('M-20 700 Q400 590 800 690 T1640 650 V920 H-20Z', '#F5C94A', STROKE);
  b += path('M-20 800 Q500 720 1000 800 T1640 780 V920 H-20Z', '#7ED957', STROKE);
  // A distant candy castle and a tree fort silhouette.
  b += rect(1180, 420, 60, 140, 6, '#FF9EC7', STROKE) + rect(1240, 380, 70, 180, 6, '#FFC2DD', STROKE) + poly('1236,384 1275,320 1314,384', '#FF7FB0', STROKE) + poly('1176,424 1210,370 1244,424', '#FF7FB0', STROKE);
  b += path('M300 640 V520', 'none', `stroke="${INK}" stroke-width="22"`) + path('M300 640 V520', 'none', 'stroke="#8A5A33" stroke-width="14"');
  b += circle(260, 480, 70, '#6FC27A', STROKE) + circle(350, 470, 66, '#6FC27A', STROKE) + circle(300, 420, 72, '#7ED957', STROKE);
  b += rect(262, 470, 80, 44, 4, '#C98B52', STROKE) + poly('254,472 302,440 350,472', '#F2545B', STROKE);
  return svg(1600, 900, b, 1);
}

/** Tileable kraft-cardboard texture for the play mat. */
export function tableTexture() {
  let b = '<rect width="256" height="256" fill="#D9A866"/>';
  const specks = [[20, 30], [80, 12], [140, 60], [200, 40], [40, 120], [110, 150], [180, 130], [230, 200], [60, 210], [150, 230], [240, 100], [10, 180]];
  for (const [x, y] of specks) b += `<circle cx="${x}" cy="${y}" r="2" fill="#B9834A" opacity="0.6"/>`;
  for (let y = 0; y < 256; y += 16) b += `<path d="M0 ${y} H256" stroke="#C9955A" stroke-width="1" opacity="0.35"/>`;
  return svg(256, 256, b, 1);
}

export const FX = {
  spark: () => svg(32, 32, sparkle(16, 16, 14, '#FFFFFF'), 1),
  star: () => svg(32, 32, poly('16,2 20,12 30,12 22,19 25,30 16,23 7,30 10,19 2,12 12,12', '#FFE066', THIN), 1),
  puff: () => svg(32, 32, circle(16, 16, 12, '#FFFFFF', THIN), 1),
};
