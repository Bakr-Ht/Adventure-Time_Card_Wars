import Phaser from 'phaser';
import { COLORS, FONTS, hex } from '../theme';
import { textResolution } from '../viewport';

export function displayLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: number = COLORS.ink,
  stroke = 0,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.display,
      fontSize: `${size}px`,
      color: hex(color),
      stroke: hex(COLORS.ink),
      strokeThickness: stroke,
      resolution: textResolution(scene),
    })
    .setOrigin(0.5);
}

export function bodyLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  wrapWidth?: number,
  color: number = COLORS.ink,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.body,
      fontStyle: '700',
      fontSize: `${size}px`,
      color: hex(color),
      align: 'center',
      lineSpacing: -1,
      wordWrap: wrapWidth ? { width: wrapWidth, useAdvancedWrap: true } : undefined,
      resolution: textResolution(scene),
    })
    .setOrigin(0.5);
}

/** Shrinks a text object until it fits the box. Keeps card text from spilling. */
export function fitText(text: Phaser.GameObjects.Text, maxWidth: number, maxHeight = Infinity, minSize = 9): void {
  let size = parseFloat(String(text.style.fontSize));
  while ((text.width > maxWidth || text.height > maxHeight) && size > minSize) {
    size -= 0.5;
    text.setFontSize(size);
  }
}
