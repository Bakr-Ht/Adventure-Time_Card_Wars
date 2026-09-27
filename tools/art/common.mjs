/**
 * Shared vocabulary for the procedural SVG art. Everything is drawn with a
 * thick "ink" outline and flat fills so the set reads as one sticker style.
 */
export const INK = '#2A1B3D';
export const STROKE = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
export const THIN = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

export const FACTION = {
  BLUE_PLAINS: { sky: '#A8E6F2', far: '#7FA8F5', near: '#4C7FE6', accent: '#2F5FC4', tuft: '#3355B8' },
  CORN_FIELDS: { sky: '#FFE9A8', far: '#F5C94A', near: '#E9A92B', accent: '#C9861A', tuft: '#6FAF3A' },
  USELESS_SWAMP: { sky: '#C9D79A', far: '#8FAE55', near: '#667F33', accent: '#4B6224', tuft: '#3E5A1E' },
  NICE_LANDS: { sky: '#FFD9EA', far: '#FFB3D1', near: '#F58FBA', accent: '#E06A9E', tuft: '#FFFFFF' },
  RAINBOW: { sky: '#D7CCFF', far: '#B7A6F5', near: '#9C88EB', accent: '#7A63D6', tuft: '#FFFFFF' },
};

export function svg(w, h, body, scale = 2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}">${body}</svg>\n`;
}

export const circle = (cx, cy, r, fill, extra = STROKE) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
export const ellipse = (cx, cy, rx, ry, fill, extra = STROKE) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
export const path = (d, fill = 'none', extra = STROKE) => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const rect = (x, y, w, h, rx, fill, extra = STROKE) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
export const poly = (pts, fill, extra = STROKE) => `<polygon points="${pts}" fill="${fill}" ${extra}/>`;
export const g = (transform, body) => `<g transform="${transform}">${body}</g>`;

export const shadow = (cx, cy, rx, ry = rx * 0.22) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity="0.2"/>`;
export const shine = (cx, cy, rx, ry) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" opacity="0.45" transform="rotate(-25 ${cx} ${cy})"/>`;

/** Big friendly cartoon eyes. `look` shifts the pupils. */
export function eyes(x1, x2, y, r = 7, look = 1.5) {
  const one = (x) =>
    circle(x, y, r, '#FFFFFF', THIN) + circle(x + look, y + 0.5, r * 0.45, INK, '') + circle(x + look - r * 0.2, y - r * 0.2, r * 0.15, '#FFFFFF', '');
  return one(x1) + one(x2);
}

export const smile = (cx, cy, w = 10) => path(`M${cx - w} ${cy} Q${cx} ${cy + w * 0.8} ${cx + w} ${cy}`, 'none', THIN);
export const frown = (cx, cy, w = 8) => path(`M${cx - w} ${cy + 4} Q${cx} ${cy - w * 0.5} ${cx + w} ${cy + 4}`, 'none', THIN);
export const blush = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="5" ry="3" fill="#FF7FB0" opacity="0.6"/>`;

/** Four-point sparkle, used for magic and highlights. */
export const sparkle = (cx, cy, r, fill = '#FFFFFF') =>
  path(`M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`, fill, THIN);

/** Scenic backdrop for a 200x150 art window, themed by faction. */
export function backdrop(faction) {
  const c = FACTION[faction];
  let body = `<rect width="200" height="150" fill="${c.sky}"/>`;
  switch (faction) {
    case 'BLUE_PLAINS':
      body += circle(160, 30, 14, '#FFF6B8', THIN);
      body += path('M-10 100 Q40 70 90 92 T210 84 V160 H-10Z', c.far, THIN);
      body += path('M-10 118 Q60 96 120 116 T210 110 V160 H-10Z', c.near, THIN);
      for (const [x, y] of [[20, 128], [70, 138], [150, 130], [185, 142]]) {
        body += path(`M${x - 5} ${y} l3 -9 l2 9 l3 -11 l2 11`, 'none', `stroke="${c.tuft}" stroke-width="2.5" stroke-linecap="round"`);
      }
      break;
    case 'CORN_FIELDS':
      body += circle(165, 28, 13, '#FFFFFF', THIN);
      body += path('M-10 96 H210 V160 H-10Z', c.far, THIN);
      for (let x = 8; x < 200; x += 22) {
        body += path(`M${x} 96 V78`, 'none', `stroke="${c.tuft}" stroke-width="3" stroke-linecap="round"`);
        body += ellipse(x + 3, 80, 3, 7, '#FFE066', THIN);
      }
      for (let y = 108; y < 160; y += 14) body += path(`M-10 ${y} Q100 ${y - 6} 210 ${y}`, 'none', `stroke="${c.accent}" stroke-width="3"`);
      break;
    case 'USELESS_SWAMP':
      body += path('M-10 92 Q50 84 100 94 T210 90 V160 H-10Z', c.far, THIN);
      body += path('M-10 112 Q60 104 110 114 T210 110 V160 H-10Z', c.near, THIN);
      body += ellipse(40, 128, 16, 5, '#86A845', THIN) + ellipse(165, 136, 13, 4, '#86A845', THIN);
      body += circle(120, 70, 4, '#E6F2C2', THIN) + circle(130, 58, 3, '#E6F2C2', THIN) + circle(24, 60, 3, '#E6F2C2', THIN);
      body += path('M178 92 V50 M178 58 q-8 -4 -12 -12 M178 66 q8 -3 12 -10', 'none', `stroke="${c.accent}" stroke-width="3" stroke-linecap="round"`);
      break;
    case 'NICE_LANDS':
      for (const [x, y, s] of [[40, 34, 1], [150, 24, 0.8]]) {
        body += g(`translate(${x} ${y}) scale(${s})`, path('M-26 8 q-6 -16 12 -16 q6 -14 22 -6 q16 -8 20 10 q12 2 6 12Z', '#FFFFFF', THIN));
      }
      body += path('M-10 104 Q50 80 110 100 T210 92 V160 H-10Z', c.far, THIN);
      body += path('M-10 124 Q70 108 130 122 T210 118 V160 H-10Z', c.near, THIN);
      break;
    case 'RAINBOW': {
      const bands = ['#FF6B6B', '#FFB347', '#FFE066', '#7ED957', '#5BC0EB', '#9B7BEA'];
      bands.forEach((col, i) => {
        body += path(`M${10 + i * 7} 150 A${90 - i * 7} ${90 - i * 7} 0 0 1 ${190 - i * 7} 150`, 'none', `stroke="${col}" stroke-width="7" opacity="0.75"`);
      });
      body += path('M-10 122 Q60 110 120 124 T210 118 V160 H-10Z', '#B7E27A', THIN);
      break;
    }
  }
  return body;
}

/** Wraps subject art in a faction backdrop and clips to the art window. */
export function cardArt(faction, subject) {
  return svg(
    200,
    150,
    `<defs><clipPath id="c"><rect width="200" height="150"/></clipPath></defs><g clip-path="url(#c)">${backdrop(faction)}${subject}</g>`,
  );
}
