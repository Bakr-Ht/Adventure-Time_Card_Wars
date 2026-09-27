import Phaser from 'phaser';
import { UI_KEYS } from '../../assets/manifest';
import { flags, settings } from '../../settings';
import { displayLabel } from '../cards/text';
import { COLORS } from '../theme';
import type { Point } from '../hud/battleLayout';

/**
 * Small, reusable effects. Durations pass through `ms()` so reduced-motion
 * and test speed-ups apply everywhere at once.
 */
export class Fx {
  constructor(private scene: Phaser.Scene) {}

  get reduced(): boolean {
    return settings.get().reducedMotion;
  }

  ms(duration: number): number {
    const factor = (this.reduced ? 0.4 : 1) / flags.speed;
    return Math.max(1, Math.round(duration * factor));
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      const duration = typeof config.duration === 'number' ? this.ms(config.duration) : this.ms(250);
      this.scene.tweens.add({
        ...config,
        duration,
        delay: typeof config.delay === 'number' ? this.ms(config.delay) : undefined,
        onComplete: (...args) => {
          (config.onComplete as ((...a: unknown[]) => void) | undefined)?.(...args);
          resolve();
        },
      });
    });
  }

  wait(duration: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(this.ms(duration), resolve));
  }

  floatText(at: Point, text: string, color: number, size = 34): void {
    const t = displayLabel(this.scene, at.x, at.y, text, size, color, 7).setDepth(900);
    if (!this.reduced) t.setScale(0.4);
    this.scene.tweens.add({ targets: t, scale: 1, duration: this.ms(160), ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: at.y - 60,
      alpha: 0,
      delay: this.ms(450),
      duration: this.ms(600),
      onComplete: () => t.destroy(),
    });
  }

  burst(at: Point, texture: string = UI_KEYS.spark, count = 10, tint?: number): void {
    if (this.reduced) count = Math.min(count, 3);
    const emitter = this.scene.add.particles(at.x, at.y, texture, {
      speed: { min: 90, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: this.ms(520),
      rotate: { min: 0, max: 360 },
      tint: tint ?? undefined,
      emitting: false,
    });
    emitter.setDepth(850);
    emitter.explode(count);
    this.scene.time.delayedCall(this.ms(700), () => emitter.destroy());
  }

  shake(target: Phaser.GameObjects.Container, strength = 8): Promise<void> {
    if (this.reduced) return this.wait(80);
    const x = target.x;
    return this.tween({ targets: target, x: x + strength, duration: 45, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => target.setX(x) });
  }

  cameraShake(intensity = 0.006): void {
    if (!this.reduced) this.scene.cameras.main.shake(this.ms(180), intensity);
  }

  /** Full-width ribbon announcing a turn or phase. */
  async banner(text: string, color: number, width: number, y: number): Promise<void> {
    const c = this.scene.add.container(-width / 2, y).setDepth(950);
    const g = this.scene.add.graphics();
    const w = Math.min(760, width * 0.8);
    g.fillStyle(COLORS.ink).fillRoundedRect(-w / 2 + 6, -44 + 7, w, 88, 20);
    g.fillStyle(color).fillRoundedRect(-w / 2, -44, w, 88, 20);
    g.lineStyle(5, COLORS.ink).strokeRoundedRect(-w / 2, -44, w, 88, 20);
    const t = displayLabel(this.scene, 0, 4, text, 56, COLORS.paper, 9);
    c.add([g, t]).setAngle(-2);
    if (this.reduced) {
      c.setX(width / 2);
      await this.wait(500);
      c.destroy();
      return;
    }
    await this.tween({ targets: c, x: width / 2, duration: 260, ease: 'Back.Out' });
    await this.wait(420);
    await this.tween({ targets: c, x: width * 1.5, duration: 220, ease: 'Quad.In' });
    c.destroy();
  }
}
