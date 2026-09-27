import {
  INK, STROKE, THIN, blush, circle, ellipse, eyes, frown, g, path, poly, rect, shadow, shine, smile, sparkle,
} from './common.mjs';

const knightHelmet = (cx, cy, fill) =>
  path(`M${cx - 20} ${cy + 10} Q${cx - 22} ${cy - 22} ${cx} ${cy - 24} Q${cx + 22} ${cy - 22} ${cx + 20} ${cy + 10}Z`, fill) +
  rect(cx - 14, cy - 6, 28, 7, 3, INK, '') +
  path(`M${cx} ${cy - 24} q4 -12 14 -14`, 'none', `stroke="#FF6B6B" stroke-width="5" stroke-linecap="round"`);

/** Subject art for each creature id. Coordinates live in a 200x150 window. */
export const CREATURES = {
  'cool-dog': () =>
    shadow(100, 134, 46) +
    path('M62 132 Q58 92 78 82 L122 82 Q142 92 138 132Z', '#E8EEF5') +
    path('M60 64 q-18 -4 -16 20 q10 6 20 -2Z', '#9AA6B8') + path('M140 64 q18 -4 16 20 q-10 6 -20 -2Z', '#9AA6B8') +
    circle(100, 66, 32, '#F4F7FB') +
    ellipse(100, 82, 14, 10, '#FFFFFF') + ellipse(100, 76, 6, 4, INK, '') +
    path('M68 58 H132 L128 70 Q116 76 104 68 H96 Q84 76 72 70Z', INK, '') +
    path('M76 60 l10 0', 'none', 'stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"') +
    smile(100, 88, 8) + shine(84, 44, 8, 4),

  'sharpshooter-squire': () =>
    shadow(95, 134, 36) +
    rect(78, 92, 34, 38, 10, '#5B8DEF') + rect(84, 112, 22, 8, 3, '#FFD64A', THIN) +
    circle(95, 72, 24, '#FFE0C2') + knightHelmet(95, 68, '#C9D3E3') +
    path('M132 58 Q156 92 132 126', 'none', `stroke="${INK}" stroke-width="5"`) +
    path('M132 58 L132 126', 'none', `stroke="${INK}" stroke-width="1.5"`) +
    path('M112 92 L150 92 M144 86 l8 6 l-8 6', 'none', STROKE) +
    path('M112 100 l18 -8', 'none', STROKE),

  'plains-pup': () =>
    path('M22 100 h26 M16 112 h30 M26 124 h20', 'none', `stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.8"`) +
    shadow(110, 134, 40) +
    ellipse(112, 106, 34, 22, '#7FB2FF') +
    path('M88 122 l-6 12 M104 126 l0 10 M122 126 l2 10 M138 120 l8 10', 'none', STROKE) +
    circle(146, 86, 20, '#9CC4FF') +
    path('M138 70 q-6 -22 10 -18 q2 10 -2 18Z', '#5B8DEF') +
    path('M78 100 q-14 -10 -10 -24', 'none', STROKE) +
    eyes(142, 156, 84, 5) + ellipse(166, 92, 4, 3, INK, '') + smile(154, 96, 5) + shine(100, 96, 10, 5),

  'earling-swarm': () =>
    [[60, 104, 0.8], [140, 104, 0.8], [100, 94, 1.05]].map(([x, y, s]) =>
      g(`translate(${x} ${y}) scale(${s})`,
        shadow(0, 34, 24) +
        path('M-20 -4 q-26 -30 -8 -34 q10 8 10 26Z', '#8FB8FF') + path('M20 -4 q26 -30 8 -34 q-10 8 -10 26Z', '#8FB8FF') +
        circle(0, 10, 24, '#B9D3FF') + eyes(-8, 8, 6, 5) + smile(0, 18, 5) + blush(-14, 16) + blush(14, 16)),
    ).join(''),

  earling: () =>
    g('translate(100 90) scale(1.4)',
      shadow(0, 30, 24) +
      path('M-20 -4 q-26 -30 -8 -34 q10 8 10 26Z', '#8FB8FF') + path('M20 -4 q26 -30 8 -34 q-10 8 -10 26Z', '#8FB8FF') +
      circle(0, 10, 22, '#B9D3FF') + eyes(-8, 8, 6, 5) + smile(0, 18, 5)),

  'heroic-paladin': () =>
    shadow(100, 136, 50) +
    path('M70 132 L74 88 Q100 78 126 88 L130 132Z', '#9FB2D6') +
    circle(100, 64, 26, '#FFE0C2') + knightHelmet(100, 60, '#DDE5F2') +
    path('M50 84 Q50 120 74 132 Q92 118 90 84Z', '#3F6FD8') + path('M70 94 v24 M60 104 h20', 'none', `stroke="#FFD64A" stroke-width="5" stroke-linecap="round"`) +
    rect(138, 34, 10, 76, 3, '#EEF3FA') + rect(128, 106, 30, 8, 3, '#FFD64A') + rect(139, 114, 8, 18, 3, '#9C6B3F') +
    shine(143, 50, 2, 12),

  'blue-colossus': () =>
    shadow(100, 142, 80) +
    path('M20 150 Q24 50 100 34 Q176 50 180 150Z', '#4C7FE6') +
    path('M44 70 q10 -16 20 -2 M70 44 q8 -14 16 0 M112 40 q10 -14 18 2 M138 58 q10 -12 16 4', 'none', `stroke="#2B4FAF" stroke-width="4" stroke-linecap="round"`) +
    path('M62 86 l20 8 M138 86 l-20 8', 'none', `stroke="${INK}" stroke-width="6" stroke-linecap="round"`) +
    circle(80, 100, 8, '#FFF6B8') + circle(120, 100, 8, '#FFF6B8') + circle(80, 101, 3.5, INK, '') + circle(120, 101, 3.5, INK, '') +
    rect(82, 118, 36, 12, 5, INK, '') + path('M88 118 v6 M100 118 v6 M112 118 v6', 'none', 'stroke="#FFFFFF" stroke-width="3"') +
    shine(60, 64, 14, 6),

  'bluebell-medic': () =>
    shadow(100, 136, 32) +
    path('M100 132 V92', 'none', `stroke="#3E8E4E" stroke-width="6" stroke-linecap="round"`) +
    path('M100 116 q-22 -2 -26 -16 q18 -4 26 12Z', '#6FC27A') +
    path('M70 60 Q70 30 100 30 Q130 30 130 60 L138 84 Q120 78 112 88 Q100 78 88 88 Q80 78 62 84Z', '#8EA4FF') +
    eyes(90, 110, 60, 6) + smile(100, 70, 6) + blush(82, 68) + blush(118, 68) +
    rect(118, 98, 26, 20, 5, '#FFFFFF') + path('M131 102 v12 M125 108 h12', 'none', 'stroke="#F2545B" stroke-width="4" stroke-linecap="round"'),

  'bog-hopper': () =>
    shadow(100, 136, 50) +
    path('M52 128 q-10 -30 20 -34 M148 128 q10 -30 -20 -34', 'none', `stroke="${INK}" stroke-width="12" stroke-linecap="round"`) +
    path('M52 128 q-10 -30 20 -34 M148 128 q10 -30 -20 -34', 'none', 'stroke="#7BB33A" stroke-width="6" stroke-linecap="round"') +
    ellipse(100, 104, 44, 28, '#8CC63F') + ellipse(100, 112, 28, 14, '#D8F09A', THIN) +
    circle(80, 76, 14, '#8CC63F') + circle(120, 76, 14, '#8CC63F') + eyes(80, 120, 74, 8, 0) +
    path('M80 100 Q100 112 120 100', 'none', THIN) + shine(76, 94, 8, 4),

  'mud-golem': () =>
    shadow(100, 140, 60) +
    path('M44 138 Q34 96 52 70 Q64 40 100 40 Q140 40 150 72 Q168 100 156 138Z', '#8A6440') +
    path('M60 62 q10 -6 14 4 M130 58 q8 -2 10 8 M70 112 q8 -4 12 4', 'none', `stroke="#6B4A2C" stroke-width="4" stroke-linecap="round"`) +
    rect(70, 76, 22, 14, 4, '#C9C2B5') + rect(108, 76, 22, 14, 4, '#C9C2B5') + circle(81, 83, 3, INK, '') + circle(119, 83, 3, INK, '') +
    path('M80 108 h40', 'none', STROKE) + circle(56, 100, 7, '#A57A50', THIN) + circle(146, 110, 6, '#A57A50', THIN),

  'rainbow-wisp': () =>
    ['#FF6B6B', '#FFB347', '#FFE066', '#7ED957', '#5BC0EB'].map((c, i) =>
      path(`M${96 - i * 3} ${96 + i * 3} Q${60 - i * 4} ${120 + i * 2} ${30 - i * 2} ${104 + i * 5}`, 'none', `stroke="${c}" stroke-width="6" stroke-linecap="round"`)).join('') +
    circle(112, 76, 30, '#FFFFFF', `stroke="${INK}" stroke-width="4" opacity="0.95"`) +
    circle(112, 76, 22, '#FFF6B8', '') + eyes(104, 120, 72, 6) + smile(112, 86, 6) +
    sparkle(150, 44, 8, '#FFE066') + sparkle(160, 100, 6) + sparkle(70, 40, 5, '#9B7BEA'),

  'candy-butler': () =>
    shadow(100, 136, 36) +
    rect(78, 88, 44, 46, 12, '#FF9EC7') + poly('92,90 100,98 108,90 108,104 100,98 92,104', INK, '') +
    circle(100, 64, 26, '#FFC2DD') + path('M78 50 Q100 30 122 50', 'none', `stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"`) +
    eyes(91, 109, 62, 5) + path('M92 74 h16', 'none', THIN) +
    path('M122 100 l20 -6', 'none', STROKE) + ellipse(152, 92, 20, 5, '#DDE5F2') + circle(146, 82, 6, '#7ED957', THIN) + circle(158, 84, 5, '#FF6B6B', THIN),

  'husker-knight': () =>
    shadow(100, 138, 44) +
    path('M58 136 Q54 96 72 86 L128 86 Q146 96 142 136Z', '#7BB33A') +
    path('M60 136 Q72 104 100 96 Q128 104 140 136', 'none', `stroke="#5E8E26" stroke-width="4"`) +
    ellipse(100, 64, 24, 34, '#FFD64A') +
    [0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => circle(88 + c * 12, 44 + r * 11, 4.5, '#FFE88A', THIN)).join('')).join('') +
    rect(80, 58, 40, 10, 4, INK, '') + circle(92, 63, 2.5, '#FFFFFF', '') + circle(108, 63, 2.5, '#FFFFFF', '') +
    rect(142, 64, 30, 40, 8, '#C9D3E3') + path('M157 70 v28 M146 84 h22', 'none', `stroke="#E9A92B" stroke-width="4" stroke-linecap="round"`),

  'corn-ronin': () =>
    shadow(96, 138, 40) +
    path('M70 136 Q68 100 80 92 L112 92 Q124 100 122 136Z', '#3E5A8C') + path('M74 110 h44', 'none', `stroke="#F2545B" stroke-width="6"`) +
    ellipse(96, 62, 22, 32, '#FFD64A') +
    [0, 1, 2].map((r) => [0, 1].map((c) => circle(90 + c * 12, 40 + r * 10, 4, '#FFE88A', THIN)).join('')).join('') +
    rect(72, 58, 48, 8, 3, '#F2545B') + path('M72 62 l-16 -6 M72 62 l-14 6', 'none', `stroke="#F2545B" stroke-width="5" stroke-linecap="round"`) +
    path('M86 76 l8 -3 M106 76 l-8 -3', 'none', THIN) + circle(90, 78, 2.5, INK, '') + circle(102, 78, 2.5, INK, '') +
    path('M126 128 L170 40', 'none', `stroke="${INK}" stroke-width="9" stroke-linecap="round"`) +
    path('M130 120 L170 40', 'none', 'stroke="#EEF3FA" stroke-width="4" stroke-linecap="round"') + rect(122, 116, 16, 6, 2, '#F2545B', THIN),

  'kernel-kid': () =>
    shadow(100, 136, 26) +
    path('M100 128 Q70 126 72 96 Q76 62 100 58 Q124 62 128 96 Q130 126 100 128Z', '#FFD64A') +
    path('M88 64 Q100 50 112 64', 'none', `stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"`) +
    eyes(92, 108, 92, 6) + smile(100, 106, 6) + blush(84, 102) + blush(116, 102) +
    path('M72 104 l-12 -8 M128 104 l12 -8', 'none', STROKE),

  'popcorn-buddy': () =>
    shadow(100, 134, 34) +
    [[82, 96, 18], [118, 96, 18], [100, 78, 20], [90, 112, 16], [112, 112, 16]].map(([x, y, r]) => circle(x, y, r, '#FFFBEA')).join('') +
    circle(100, 98, 22, '#FFFBEA', '') + eyes(92, 108, 96, 5) + smile(100, 108, 5) + path('M86 84 q4 -4 8 0', 'none', 'stroke="#FFD64A" stroke-width="3"'),

  'field-scarecrow': () =>
    shadow(100, 140, 30) +
    path('M100 140 V60', 'none', `stroke="${INK}" stroke-width="12" stroke-linecap="round"`) + path('M100 140 V60', 'none', 'stroke="#9C6B3F" stroke-width="6"') +
    path('M48 84 H152', 'none', `stroke="${INK}" stroke-width="12" stroke-linecap="round"`) + path('M48 84 H152', 'none', 'stroke="#9C6B3F" stroke-width="6"') +
    path('M76 80 L124 80 L130 122 L70 122Z', '#6C8FD6') + rect(90, 94, 12, 12, 2, '#F2545B', THIN) +
    path('M44 82 l-8 -6 M44 86 l-10 2 M156 82 l8 -6 M156 86 l10 2', 'none', `stroke="#E9A92B" stroke-width="3" stroke-linecap="round"`) +
    circle(100, 58, 18, '#F5E6B8') + path('M92 54 l6 6 M98 54 l-6 6 M104 54 l6 6 M110 54 l-6 6', 'none', THIN) + path('M92 66 q8 4 16 0', 'none', THIN) +
    path('M68 44 H132 L118 40 Q100 12 82 40Z', '#E9A92B'),

  'stretchy-mastiff': () =>
    shadow(100, 136, 70) +
    path('M30 118 C30 60 90 60 90 96 C90 132 150 132 150 80', 'none', `stroke="${INK}" stroke-width="30" stroke-linecap="round"`) +
    path('M30 118 C30 60 90 60 90 96 C90 132 150 132 150 80', 'none', 'stroke="#F5A623" stroke-width="22" stroke-linecap="round"') +
    circle(156, 62, 24, '#FFB84D') + ellipse(166, 72, 12, 8, '#FFD89A', THIN) + ellipse(172, 68, 4, 3, INK, '') +
    eyes(148, 162, 54, 6) + path('M136 50 q-10 10 -4 26', 'none', STROKE) + circle(30, 124, 8, '#FFB84D'),

  cornzilla: () =>
    shadow(100, 146, 70) +
    path('M40 150 Q30 60 100 22 Q170 60 160 150Z', '#FFD64A') +
    [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3].map((c) => circle(70 + c * 20 + (r % 2) * 10, 44 + r * 14, 6, '#FFE88A', THIN)).join('')).join('') +
    path('M40 150 Q20 100 44 70 M160 150 Q180 100 156 70', '#7BB33A') +
    path('M60 108 Q100 136 140 108 Z', INK, '') + poly('70,110 78,120 86,114 94,124 102,116 110,124 118,114 126,120 132,110', '#FFFFFF', THIN) +
    path('M72 84 l16 6 M128 84 l-16 6', 'none', `stroke="${INK}" stroke-width="6" stroke-linecap="round"`) +
    circle(82, 94, 6, '#F2545B', THIN) + circle(118, 94, 6, '#F2545B', THIN),

  'popcorn-pixie': () =>
    path('M88 88 Q50 50 62 96 Z', '#D6F3FF') + path('M112 88 Q150 50 138 96 Z', '#D6F3FF') +
    [[88, 92, 14], [112, 92, 14], [100, 78, 16], [100, 104, 14]].map(([x, y, r]) => circle(x, y, r, '#FFFBEA')).join('') +
    circle(100, 92, 18, '#FFFBEA', '') + eyes(93, 107, 90, 5) + smile(100, 100, 4) +
    path('M100 118 v14', 'none', THIN) + sparkle(62, 120, 7, '#FFE066') + sparkle(140, 40, 6, '#FF9EC7') + sparkle(150, 118, 5),

  'nice-nurse': () =>
    shadow(100, 138, 40) +
    path('M60 126 q-18 -8 -6 -26 q-10 -22 16 -26 q8 -22 32 -12 q24 -12 34 10 q24 4 16 28 q14 16 -6 28Z', '#FFFFFF') +
    rect(84, 44, 32, 18, 5, '#FFFFFF') + path('M100 48 v10 M95 53 h10', 'none', 'stroke="#F2545B" stroke-width="3.5" stroke-linecap="round"') +
    eyes(90, 110, 88, 6) + smile(100, 102, 7) + blush(80, 98) + blush(120, 98),

  'snuggle-bear': () =>
    shadow(100, 140, 46) +
    circle(70, 52, 14, '#F58FBA') + circle(130, 52, 14, '#F58FBA') + circle(70, 52, 6, '#FFD9EA', '') + circle(130, 52, 6, '#FFD9EA', '') +
    path('M58 138 Q50 96 70 86 L130 86 Q150 96 142 138Z', '#F58FBA') +
    circle(100, 70, 30, '#F9A8CB') + ellipse(100, 80, 12, 8, '#FFD9EA', THIN) + ellipse(100, 76, 5, 3.5, INK, '') +
    path('M88 62 q4 -4 8 0 M104 62 q4 -4 8 0', 'none', THIN) + smile(100, 84, 5) +
    path('M100 128 C80 114 80 100 92 100 Q100 100 100 108 Q100 100 108 100 C120 100 120 114 100 128Z', '#F2545B'),
};
