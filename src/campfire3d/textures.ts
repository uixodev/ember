import * as THREE from 'three';

/** Everything is drawn in code, so there are no image files to download. */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function texture(c: HTMLCanvasElement, repeat = false, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Bark: long streaks running along the log (up and down the canvas). */
export function barkTexture(frost = false): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const r = rng(frost ? 77 : 11);
  g.fillStyle = '#6E402E';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 150; i++) {
    const x = r() * 256;
    const w = 1 + r() * 5;
    const tone = r();
    g.fillStyle = tone < 0.5 ? `rgba(30,16,20,${0.12 + r() * 0.3})` : `rgba(150,96,62,${0.1 + r() * 0.25})`;
    g.fillRect(x, 0, w, 256);
    g.fillRect(x - 256, 0, w, 256);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(20,10,14,${0.15 + r() * 0.25})`;
    g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 10 + r() * 40);
  }
  if (frost) {
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`;
      g.beginPath();
      g.arc(r() * 256, r() * 256, 0.6 + r() * 1.8, 0, Math.PI * 2);
      g.fill();
    }
  }
  return texture(c, true);
}

/** The cut end of a log: pale wood with growth rings. */
export function endGrainTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, '#C8975F');
  gr.addColorStop(1, '#A87848');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(96,58,30,.55)';
  for (let r = 6; r < 64; r += 5.5) {
    g.lineWidth = 1 + (r % 11 === 0 ? 0.8 : 0);
    g.beginPath();
    g.arc(64 + Math.sin(r) * 1.2, 64, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = '#6E4526';
  g.beginPath();
  g.arc(64, 64, 3, 0, Math.PI * 2);
  g.fill();
  return texture(c);
}

/** The inner end: charred black. */
export function charTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#1E1218';
  g.fillRect(0, 0, 64, 64);
  const r = rng(5);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(90,36,32,${r() * 0.5})`;
    g.fillRect(r() * 64, r() * 64, 3, 3);
  }
  return texture(c);
}

/**
 * Brightness along a log: full at the inner end (by the fire), fading outward.
 * Cylinder texture rows run from the outer end (top of the canvas) to the inner end (bottom).
 */
export function glowAlongTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(8, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#000');
  gr.addColorStop(0.5, '#000');
  gr.addColorStop(0.82, '#4a4a4a');
  gr.addColorStop(1, '#fff');
  g.fillStyle = gr;
  g.fillRect(0, 0, 8, 256);
  return texture(c, false, false);
}

/** Glowing cracks for an embers log, bright near the fire. */
export function cracksTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 256);
  const r = rng(31);
  for (let i = 0; i < 16; i++) {
    let x = r() * 128;
    let y = 90 + r() * 166;
    g.lineWidth = 1.5 + r() * 2;
    const heat = (y - 60) / 196;
    g.strokeStyle = `rgb(${Math.round(255 * heat)},${Math.round(150 * heat)},${Math.round(60 * heat)})`;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 18;
      y -= 6 + r() * 14;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return texture(c, true, false);
}

/** Soft round glow, white. Tinted by the material. */
export function glowSprite(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,.14)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return texture(c);
}

/** A small round dot for sparks and fireflies. */
export function dotSprite(): THREE.CanvasTexture {
  const [c, g] = canvas(32, 32);
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return texture(c);
}

/** A six-armed snowflake. */
export function flakeSprite(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineWidth = 4;
  g.translate(32, 32);
  for (let i = 0; i < 3; i++) {
    g.rotate(Math.PI / 3);
    g.beginPath();
    g.moveTo(0, -26);
    g.lineTo(0, 26);
    g.stroke();
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-6, -17);
    g.lineTo(0, -11);
    g.lineTo(6, -17);
    g.moveTo(-6, 17);
    g.lineTo(0, 11);
    g.lineTo(6, 17);
    g.stroke();
    g.lineWidth = 4;
  }
  return texture(c);
}

/** The clearing: dark indigo that fades into the sky at its edge. */
export function groundTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  gr.addColorStop(0, '#3A2A6E');
  gr.addColorStop(0.45, '#2C2266');
  gr.addColorStop(0.75, 'rgba(44,34,102,.8)');
  gr.addColorStop(1, 'rgba(44,34,102,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  const r = rng(9);
  for (let i = 0; i < 380; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 230;
    g.fillStyle = `rgba(143,136,236,${0.03 + r() * 0.05})`;
    g.beginPath();
    g.arc(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 1 + r() * 2.5, 0, Math.PI * 2);
    g.fill();
  }
  return texture(c);
}
