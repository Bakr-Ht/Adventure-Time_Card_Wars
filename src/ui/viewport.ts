import Phaser from 'phaser';

/**
 * The canvas always matches the window at device resolution. Scenes work in
 * a logical coordinate space (about 1600x900 on desktop) and the camera zoom
 * maps it onto real pixels, so text and vectors stay crisp at any size.
 */
export interface Viewport {
  width: number;
  height: number;
  /** Logical units → canvas pixels. */
  zoom: number;
  /** Logical units → CSS pixels (for positioning DOM overlays). */
  cssScale: number;
}

export const MAX_DPR = 2;

export function devicePixelRatio(): number {
  return Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
}

export function computeViewport(pixelW: number, pixelH: number, dpr = devicePixelRatio()): Viewport {
  const aspect = pixelW / Math.max(1, pixelH);
  let width: number;
  let height: number;
  if (aspect >= 1.2) {
    height = 900;
    width = Phaser.Math.Clamp(Math.round(900 * aspect), 1080, 1920);
  } else {
    width = 1000;
    height = Phaser.Math.Clamp(Math.round(1000 / aspect), 900, 1800);
  }
  const zoom = Math.min(pixelW / width, pixelH / height);
  // Centre the logical area if clamping left spare room.
  return { width, height, zoom, cssScale: zoom / dpr };
}

/** Points the scene's main camera at the logical space. Call on create and on resize. */
export function applyViewport(scene: Phaser.Scene): Viewport {
  const vp = computeViewport(scene.scale.width, scene.scale.height);
  const cam = scene.cameras.main;
  cam.setZoom(vp.zoom);
  cam.centerOn(vp.width / 2, vp.height / 2);
  return vp;
}

/** Text textures are rendered at this resolution so they stay sharp after zoom. */
export function textResolution(scene: Phaser.Scene): number {
  return Math.min(3, Math.max(1, Math.ceil(scene.cameras.main.zoom * 1.25)));
}
