import { buildManifest } from '../assets/manifest';
import { COLORS } from '../ui/theme';
import { BaseScene } from './BaseScene';

/** Loads every asset listed in the central manifest, with a progress bar. */
export class BootScene extends BaseScene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.setupViewport();
    const { width, height } = this.vp;
    const barW = Math.min(520, width * 0.6);
    const x = (width - barW) / 2;
    const y = height / 2 + 30;
    this.displayText(width / 2, height / 2 - 50, 'Shuffling the Land of Ooo…', 40, COLORS.lemon);
    const g = this.add.graphics();
    const draw = (p: number) => {
      g.clear();
      g.fillStyle(COLORS.ink).fillRoundedRect(x + 5, y + 6, barW, 34, 12);
      g.fillStyle(COLORS.paper).fillRoundedRect(x, y, barW, 34, 12);
      g.fillStyle(COLORS.mint).fillRoundedRect(x + 4, y + 4, Math.max(0, (barW - 8) * p), 26, 9);
      g.lineStyle(4, COLORS.ink).strokeRoundedRect(x, y, barW, 34, 12);
    };
    draw(0);
    this.load.on('progress', draw);
    this.load.on('loaderror', (file: { key: string; src: string }) => {
      console.error(`Missing asset ${file.key} (${file.src})`);
    });
    for (const asset of buildManifest()) {
      this.load.svg(asset.key, asset.url, { width: asset.width, height: asset.height });
    }
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
