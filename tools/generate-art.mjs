#!/usr/bin/env node
/**
 * Procedural art pipeline: writes every original SVG asset into public/assets
 * and an asset contract (assets.json) describing dimensions and purpose.
 * Run with `npm run art`. Deterministic: same code, same files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardArt } from './art/common.mjs';
import { CREATURES } from './art/creatures.mjs';
import { BUILDINGS, SPELLS, heroPortrait } from './art/objects.mjs';
import { FX, cardBack, glyph, landscapeTile, menuBackground, tableTexture } from './art/scenes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const contract = [];

function write(rel, content, meta) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  contract.push({ path: `assets/${rel}`, ...meta });
}

/** Which backdrop each card's art sits on. Mirrors the card data factions. */
const CARD_FACTIONS = {
  'cool-dog': 'BLUE_PLAINS', 'sharpshooter-squire': 'BLUE_PLAINS', 'plains-pup': 'BLUE_PLAINS', 'earling-swarm': 'BLUE_PLAINS',
  earling: 'BLUE_PLAINS', 'heroic-paladin': 'BLUE_PLAINS', 'blue-colossus': 'BLUE_PLAINS', 'bluebell-medic': 'BLUE_PLAINS',
  'bog-hopper': 'USELESS_SWAMP', 'mud-golem': 'USELESS_SWAMP', 'rainbow-wisp': 'RAINBOW', 'candy-butler': 'RAINBOW',
  'husker-knight': 'CORN_FIELDS', 'corn-ronin': 'CORN_FIELDS', 'kernel-kid': 'CORN_FIELDS', 'popcorn-buddy': 'CORN_FIELDS',
  'field-scarecrow': 'CORN_FIELDS', 'stretchy-mastiff': 'CORN_FIELDS', cornzilla: 'CORN_FIELDS', 'popcorn-pixie': 'CORN_FIELDS',
  'nice-nurse': 'NICE_LANDS', 'snuggle-bear': 'NICE_LANDS',
  'blue-bastion': 'BLUE_PLAINS', 'sword-rack': 'BLUE_PLAINS', 'lookout-tower': 'BLUE_PLAINS', 'tree-fort': 'RAINBOW',
  'swamp-shrine': 'USELESS_SWAMP', 'corn-silo': 'CORN_FIELDS', 'cob-catapult': 'CORN_FIELDS', 'barn-of-plenty': 'CORN_FIELDS',
  'nice-gazebo': 'NICE_LANDS',
  'hero-strike': 'BLUE_PLAINS', 'rally-cry': 'BLUE_PLAINS', 'rousing-tale': 'BLUE_PLAINS', landslide: 'BLUE_PLAINS',
  'frost-snap': 'RAINBOW', demolish: 'RAINBOW', 'bacon-pancakes': 'RAINBOW', 'stretch-slam': 'CORN_FIELDS',
  'corn-storm': 'CORN_FIELDS', 'sandwich-time': 'RAINBOW', 'stretchy-shuffle': 'CORN_FIELDS', 'sour-candy': 'RAINBOW',
};

const subjects = { ...CREATURES, ...BUILDINGS, ...SPELLS };
for (const [id, faction] of Object.entries(CARD_FACTIONS)) {
  const draw = subjects[id];
  if (!draw) throw new Error(`No art subject for ${id}`);
  write(`cards/${id}.svg`, cardArt(faction, draw()), { kind: 'card-art', size: '400x300', anchor: 'top-left' });
}
for (const id of Object.keys(subjects)) {
  if (!CARD_FACTIONS[id]) throw new Error(`Art subject ${id} has no faction backdrop`);
}

for (const id of ['finn', 'jake']) write(`heroes/${id}.svg`, heroPortrait(id), { kind: 'hero-portrait', size: '512x512', anchor: 'center' });

const lands = { 'blue-plains': 'BLUE_PLAINS', 'corn-fields': 'CORN_FIELDS', 'useless-swamp': 'USELESS_SWAMP', 'nice-lands': 'NICE_LANDS' };
for (const [id, faction] of Object.entries(lands)) {
  write(`landscapes/${id}.svg`, landscapeTile(faction), { kind: 'lane-backdrop', size: '480x300', anchor: 'center' });
}
for (const faction of ['BLUE_PLAINS', 'CORN_FIELDS', 'USELESS_SWAMP', 'NICE_LANDS', 'RAINBOW']) {
  write(`ui/glyph-${faction.toLowerCase().replace('_', '-')}.svg`, glyph(faction), { kind: 'faction-glyph', size: '128x128', anchor: 'center' });
}
write('ui/card-back.svg', cardBack(), { kind: 'card-back', size: '300x420', anchor: 'center' });
write('backgrounds/menu.svg', menuBackground(), { kind: 'background', size: '1600x900', anchor: 'center' });
write('backgrounds/table.svg', tableTexture(), { kind: 'tile', size: '256x256', anchor: 'top-left' });
for (const [id, draw] of Object.entries(FX)) write(`fx/${id}.svg`, draw(), { kind: 'particle', size: '32x32', anchor: 'center' });

writeFileSync(join(root, 'assets.json'), `${JSON.stringify({ generatedBy: 'tools/generate-art.mjs', assets: contract }, null, 2)}\n`);
console.log(`Wrote ${contract.length} assets to public/assets`);
