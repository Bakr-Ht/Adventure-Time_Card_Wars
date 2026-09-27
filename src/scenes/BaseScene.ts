import Phaser from 'phaser';
import { applyViewport, devicePixelRatio, textResolution, type Viewport } from '../ui/viewport';
import { FONTS, hex, COLORS } from '../ui/theme';

/**
 * Common scene plumbing: logical viewport, resize handling, DOM overlay
 * cleanup and consistent text styling.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected vp!: Viewport;
  private domDisposers: (() => void)[] = [];

  protected setupViewport(onResize?: () => void): void {
    this.vp = applyViewport(this);
    const handler = () => {
      if (!this.sys.isActive()) return;
      this.vp = applyViewport(this);
      onResize?.();
    };
    this.scale.on('resize', handler);
    this.events.once('shutdown', () => {
      this.scale.off('resize', handler);
      this.disposeDom();
    });
  }

  protected trackDom(dispose: () => void): void {
    this.domDisposers.push(dispose);
  }

  protected disposeDom(): void {
    for (const d of this.domDisposers.splice(0)) d();
  }

  /** Logical rect → CSS pixel rect, for aligning DOM overlays with the canvas. */
  protected toCss(rect: { x: number; y: number; w: number; h: number }): { left: number; top: number; width: number; height: number } {
    const dpr = devicePixelRatio();
    const offX = (this.scale.width - this.vp.width * this.vp.zoom) / 2 / dpr;
    const offY = (this.scale.height - this.vp.height * this.vp.zoom) / 2 / dpr;
    const s = this.vp.cssScale;
    return { left: offX + rect.x * s, top: offY + rect.y * s, width: rect.w * s, height: rect.h * s };
  }

  displayText(x: number, y: number, text: string, size: number, color: number = COLORS.paper, stroke = 6): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: FONTS.display,
        fontSize: `${size}px`,
        color: hex(color),
        stroke: hex(COLORS.ink),
        strokeThickness: stroke,
        resolution: textResolution(this),
      })
      .setOrigin(0.5);
  }
}
