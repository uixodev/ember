import * as THREE from 'three';

/** The overall shape of one flame. */
export type FlameShape = 'round' | 'slim' | 'crystal' | 'core';

function colorize(g: THREE.BufferGeometry, ramp: string[]): void {
  const stops = ramp.map((c) => new THREE.Color(c));
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = Math.min(0.999, Math.max(0, p.getY(i)));
    const f = y * (stops.length - 1);
    const k = Math.floor(f);
    c.copy(stops[k]).lerp(stops[k + 1], f - k);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * A flame standing on y = 0, 1 tall, colours from the base up to the tip. Solid colours only.
 *  round: the familiar teardrop. slim: narrower, for torches and wisps. crystal: few angular sides.
 *  core: the bright inner flame of a candle, lighter than the outside.
 */
export function flameGeometry(ramp: string[], shape: FlameShape = 'round'): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = shape === 'crystal' ? 6 : 18;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let r: number;
    if (shape === 'crystal') r = 0.5 * (1 - t) * (1 + 0.28 * Math.sin(Math.PI * t * 1.3));
    else if (shape === 'slim') r = 0.34 * Math.pow(1 - Math.pow(t, 1.35), 0.9);
    else r = 0.5 * Math.pow(1 - Math.pow(t, 1.55), 0.78);
    pts.push(new THREE.Vector2(Math.max(0, r), t));
  }
  const g = new THREE.LatheGeometry(pts, shape === 'crystal' ? 5 : 14);
  colorize(g, shape === 'core' ? [ramp[0], ramp[0], ramp[1], ramp[1], ramp[2]] : ramp);
  return g;
}
