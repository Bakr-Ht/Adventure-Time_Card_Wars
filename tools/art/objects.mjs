import {
  INK, STROKE, THIN, circle, ellipse, eyes, frown, g, path, poly, rect, shadow, shine, sparkle,
} from './common.mjs';

export const BUILDINGS = {
  'blue-bastion': () =>
    shadow(100, 138, 70) +
    rect(42, 70, 30, 66, 3, '#C9D3E3') + rect(128, 70, 30, 66, 3, '#C9D3E3') + rect(66, 84, 68, 52, 3, '#DDE5F2') +
    [42, 52, 62, 128, 138, 148].map((x) => rect(x, 60, 10, 12, 1, '#C9D3E3')).join('') +
    path('M88 136 V110 Q100 96 112 110 V136Z', INK, '') +
    path('M100 84 V40', 'none', STROKE) + poly('100,40 130,48 100,56', '#4C7FE6') +
    path('M78 96 h8 M114 96 h8', 'none', STROKE) + shine(56, 84, 4, 10),
  'sword-rack': () =>
    shadow(100, 138, 60) +
    rect(46, 118, 108, 14, 4, '#9C6B3F') + rect(50, 60, 10, 62, 3, '#9C6B3F') + rect(140, 60, 10, 62, 3, '#9C6B3F') + rect(46, 56, 108, 10, 3, '#B9834A') +
    [72, 100, 128].map((x) => rect(x - 4, 36, 8, 66, 2, '#EEF3FA') + rect(x - 12, 96, 24, 6, 2, '#FFD64A', THIN) + rect(x - 3, 102, 6, 14, 2, '#6B4A2C', THIN)).join(''),
  'lookout-tower': () =>
    shadow(100, 140, 40) +
    path('M78 140 L86 60 H114 L122 140Z', '#B9834A') + path('M82 110 L118 80 M82 80 L118 110', 'none', STROKE) +
    rect(70, 40, 60, 24, 4, '#DDE5F2') + poly('64,42 100,14 136,42', '#F2545B') +
    circle(100, 52, 7, '#FFE0C2', THIN) + path('M92 50 h16', 'none', THIN) +
    circle(150, 30, 7, '#8A8FA0', THIN) + path('M150 40 v8 m-4 -4 l4 4 l4 -4', 'none', THIN),
  'tree-fort': () =>
    shadow(100, 142, 50) +
    path('M92 142 L96 70 H106 L110 142Z', '#8A5A33') +
    circle(70, 50, 30, '#6FC27A') + circle(130, 50, 30, '#6FC27A') + circle(100, 34, 32, '#7ED957') +
    rect(72, 70, 56, 30, 3, '#C98B52') + poly('66,72 100,52 134,72', '#F2545B') + rect(92, 80, 16, 20, 2, INK, '') +
    path('M122 100 V140 M132 100 V140 M122 112 h10 M122 124 h10', 'none', STROKE),
  'swamp-shrine': () =>
    shadow(100, 142, 40) +
    rect(76, 40, 48, 100, 10, '#6B8F3A') + rect(70, 32, 60, 16, 6, '#4B6224') +
    path('M84 62 l10 6 M116 62 l-10 6', 'none', STROKE) + circle(90, 74, 5, '#E6F2C2', THIN) + circle(110, 74, 5, '#E6F2C2', THIN) +
    frown(100, 92, 10) + path('M84 112 h32 M84 122 h32', 'none', `stroke="#4B6224" stroke-width="4"`) +
    circle(150, 60, 5, '#E6F2C2', THIN) + circle(46, 80, 4, '#E6F2C2', THIN),
  'corn-silo': () =>
    shadow(100, 142, 50) +
    rect(70, 50, 60, 90, 6, '#E9EEF5') + path('M70 52 Q100 14 130 52Z', '#F2545B') +
    path('M70 76 h60 M70 100 h60 M70 124 h60', 'none', THIN) +
    rect(132, 90, 30, 50, 3, '#C98B52') + poly('128,92 147,76 166,92', '#F2545B') +
    ellipse(100, 64, 6, 10, '#FFD64A', THIN),
  'cob-catapult': () =>
    shadow(100, 140, 60) +
    rect(50, 110, 100, 16, 4, '#9C6B3F') + circle(62, 130, 10, '#6B4A2C') + circle(138, 130, 10, '#6B4A2C') +
    path('M80 112 L130 50', 'none', `stroke="${INK}" stroke-width="10" stroke-linecap="round"`) + path('M80 112 L130 50', 'none', 'stroke="#C98B52" stroke-width="5" stroke-linecap="round"') +
    ellipse(136, 42, 16, 8, '#8A5A33') + ellipse(150, 26, 7, 14, '#FFD64A', THIN) +
    path('M30 60 q10 -6 20 0 M26 76 q10 -6 20 0', 'none', 'stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"'),
  'barn-of-plenty': () =>
    shadow(100, 142, 70) +
    rect(46, 70, 108, 70, 3, '#E0484F') + poly('38,74 100,28 162,74', '#B8323A') +
    path('M76 140 V100 H124 V140 M76 100 L124 140 M124 100 L76 140', 'none', STROKE) +
    rect(88, 56, 24, 18, 3, '#FFFFFF') + path('M40 138 q10 -20 22 0 M140 138 q10 -20 22 0', '#FFD64A', THIN),
  'nice-gazebo': () =>
    shadow(100, 140, 60) +
    rect(52, 126, 96, 12, 4, '#FFFFFF') + [62, 100, 138].map((x) => rect(x - 4, 74, 8, 54, 3, '#FFFFFF')).join('') +
    path('M44 78 Q100 20 156 78Z', '#F58FBA') + path('M44 78 q14 10 28 0 q14 10 28 0 q14 10 28 0 q14 10 28 0', '#FFD9EA', THIN) +
    circle(100, 36, 6, '#FFD64A', THIN) +
    path('M80 110 C70 100 72 90 80 92 Q84 92 84 98 Q84 92 88 92 C96 90 98 100 88 110Z', '#F2545B', THIN),
};

export const SPELLS = {
  'hero-strike': () =>
    path('M30 130 L150 30', 'none', `stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" opacity="0.7"`) +
    g('rotate(-40 100 80)', rect(92, 10, 16, 100, 4, '#7ED957') + rect(78, 106, 44, 10, 4, '#FFD64A') + rect(94, 116, 12, 26, 4, '#8A5A33')) +
    sparkle(150, 32, 14, '#FFE066') + sparkle(40, 110, 8),
  'rally-cry': () =>
    path('M40 100 L120 60 Q150 44 160 80 Q150 116 120 104Z', '#FFD64A') + ellipse(155, 80, 10, 24, '#E9A92B') +
    path('M40 100 l-8 12 h14', 'none', STROKE) +
    path('M60 40 q6 -10 14 -2 v20 M168 32 q6 -8 12 0 v18', 'none', STROKE) + circle(60, 58, 5, INK, '') + circle(168, 50, 5, INK, ''),
  'rousing-tale': () =>
    shadow(100, 132, 60) +
    path('M40 120 L40 60 Q70 50 100 64 Q130 50 160 60 V120 Q130 110 100 124 Q70 110 40 120Z', '#FFFFFF') +
    path('M100 64 V124', 'none', STROKE) + path('M52 74 h36 M52 86 h36 M52 98 h28 M112 74 h36 M112 86 h36', 'none', THIN) +
    sparkle(100, 36, 12, '#FFE066') + sparkle(60, 40, 7) + sparkle(144, 40, 7, '#9B7BEA'),
  landslide: () =>
    path('M10 150 L90 40 L200 150Z', '#9C6B3F') + path('M60 96 l20 10 M110 70 l-14 18', 'none', STROKE) +
    circle(146, 110, 18, '#A89F92') + circle(118, 128, 14, '#8A8274') + circle(170, 134, 12, '#8A8274') +
    path('M126 80 q10 -4 16 4 M150 88 q8 0 10 8', 'none', 'stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"'),
  'frost-snap': () =>
    [0, 60, 120].map((a) => g(`rotate(${a} 100 76)`, path('M100 22 V130 M100 40 l-12 -10 M100 40 l12 -10 M100 112 l-12 10 M100 112 l12 10', 'none', `stroke="${INK}" stroke-width="9" stroke-linecap="round"`) +
      path('M100 22 V130 M100 40 l-12 -10 M100 40 l12 -10 M100 112 l-12 10 M100 112 l12 10', 'none', 'stroke="#C8F1FF" stroke-width="4" stroke-linecap="round"'))).join('') +
    circle(100, 76, 12, '#FFFFFF') + sparkle(160, 30, 7),
  demolish: () =>
    path('M36 140 V96 H96 V140', '#C9D3E3') + path('M52 96 l8 20 l-10 14 M80 96 l-6 16', 'none', STROKE) +
    g('rotate(-30 130 70)', rect(124, 40, 12, 80, 3, '#8A5A33') + rect(100, 24, 60, 30, 6, '#8A8FA0')) +
    sparkle(92, 70, 10, '#FFE066') + path('M102 90 l12 -6 M100 80 l14 0', 'none', STROKE),
  'bacon-pancakes': () =>
    shadow(100, 132, 60) + ellipse(100, 124, 64, 12, '#DDE5F2') +
    [0, 1, 2, 3].map((i) => ellipse(100, 112 - i * 14, 48, 12, '#E9A95B')).join('') +
    path('M60 64 q10 -10 20 0 t20 0 t20 0 t20 0', 'none', `stroke="${INK}" stroke-width="10" stroke-linecap="round"`) +
    path('M60 64 q10 -10 20 0 t20 0 t20 0 t20 0', 'none', 'stroke="#E0484F" stroke-width="5" stroke-linecap="round"') +
    rect(92, 44, 16, 10, 3, '#FFE066') + path('M82 64 q-4 20 4 30', 'none', 'stroke="#C9861A" stroke-width="4"'),
  'stretch-slam': () =>
    path('M10 120 C60 120 50 60 110 70', 'none', `stroke="${INK}" stroke-width="26" stroke-linecap="round"`) +
    path('M10 120 C60 120 50 60 110 70', 'none', 'stroke="#FFB84D" stroke-width="18" stroke-linecap="round"') +
    circle(128, 70, 26, '#FFB84D') + path('M118 56 v28 M128 54 v32 M138 56 v28', 'none', THIN) +
    path('M160 44 l14 -10 M166 70 h18 M160 96 l14 10', 'none', `stroke="${INK}" stroke-width="4" stroke-linecap="round"`),
  'corn-storm': () =>
    path('M60 30 H150 L130 60 H80 L100 90 H120 L104 130', 'none', `stroke="${INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"`) +
    path('M60 30 H150 L130 60 H80 L100 90 H120 L104 130', 'none', 'stroke="#D6F3FF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"') +
    [[40, 60], [160, 90], [70, 110], [150, 30]].map(([x, y]) => ellipse(x, y, 6, 12, '#FFD64A', THIN)).join(''),
  'sandwich-time': () =>
    shadow(100, 130, 64) +
    path('M40 110 Q100 128 160 110 L156 120 Q100 138 44 120Z', '#E9A95B') +
    path('M36 104 q16 -10 32 0 t32 0 t32 0 t32 0', '#7ED957', THIN) + rect(44, 92, 112, 10, 4, '#F2545B', THIN) + rect(42, 84, 116, 8, 4, '#FFD64A', THIN) +
    path('M40 84 Q100 30 160 84Z', '#F5B96B') + path('M100 40 V20', 'none', STROKE) + path('M100 20 l10 4 l-10 4', '#F2545B', THIN),
  'stretchy-shuffle': () =>
    path('M30 100 C60 40 140 40 170 100', 'none', `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) +
    path('M30 100 C60 40 140 40 170 100', 'none', 'stroke="#FFB84D" stroke-width="14" stroke-linecap="round"') +
    poly('160,110 184,102 172,82', INK, '') + circle(30, 104, 12, '#FFB84D') +
    rect(20, 120, 40, 20, 4, '#FFFFFF', THIN) + rect(140, 120, 40, 20, 4, '#FFFFFF', THIN) + path('M70 130 h60', 'none', `stroke="${INK}" stroke-width="3" stroke-dasharray="6 6"`),
  'sour-candy': () =>
    shadow(100, 128, 40) +
    path('M40 76 l-24 -16 v32Z M160 76 l24 -16 v32Z', '#B6F04A') + circle(100, 76, 40, '#B6F04A') +
    path('M84 66 l10 4 M116 66 l-10 4', 'none', STROKE) + circle(88, 76, 4, INK, '') + circle(112, 76, 4, INK, '') + frown(100, 94, 12) +
    [[70, 50], [130, 54], [100, 110]].map(([x, y]) => circle(x, y, 3, '#FFFFFF', '')).join(''),
};

export function heroPortrait(id) {
  const bg = id === 'finn' ? '#8ED8E8' : '#FFD27A';
  let body = circle(128, 128, 120, bg) + path('M20 170 Q128 120 236 170 V256 H20Z', id === 'finn' ? '#7ED957' : '#E9A92B', '');
  if (id === 'finn') {
    body +=
      path('M60 256 Q60 200 128 196 Q196 200 196 256Z', '#5BA7F0') +
      circle(128, 128, 64, '#FFFFFF') + circle(78, 76, 14, '#FFFFFF') + circle(178, 76, 14, '#FFFFFF') +
      path('M84 124 Q84 104 128 104 Q172 104 172 124 Q172 170 128 172 Q84 170 84 124Z', '#FFE0C2') +
      circle(112, 132, 5, INK, '') + circle(144, 132, 5, INK, '') + path('M108 150 Q128 166 148 150', INK, THIN) +
      path('M92 184 L100 220 M164 184 L156 220', 'none', STROKE) + shine(96, 84, 16, 6);
  } else {
    body +=
      path('M50 256 Q50 190 128 186 Q206 190 206 256Z', '#F5A623') +
      path('M72 110 Q56 150 84 170 M184 110 Q200 150 172 170', 'none', STROKE) +
      circle(128, 126, 66, '#F5B041') +
      path('M70 96 Q34 120 52 176 Q76 170 82 118Z', '#D98E1F') + path('M186 96 Q222 120 204 176 Q180 170 174 118Z', '#D98E1F') +
      eyes(108, 148, 108, 12) + path('M96 150 Q100 176 128 170 Q156 176 160 150 Q128 136 96 150Z', '#FFD27A') +
      ellipse(128, 142, 11, 8, INK, '') +
      path('M128 150 V160 M114 160 Q128 170 142 160', 'none', THIN) + shine(92, 86, 16, 6);
  }
  return svg256(body);
}

const svg256 = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512"><defs><clipPath id="h"><circle cx="128" cy="128" r="118"/></clipPath></defs><g clip-path="url(#h)">${body}</g>${circle(128, 128, 118, 'none', `stroke="${INK}" stroke-width="8"`)}</svg>\n`;
