import * as THREE from 'three';

/** A teardrop standing on y = 0, 1 tall, colours from pale yellow at the base to red at the tip. Solid colours only. */
export function flameGeometry(ramp: string[] = ['#FFF1B0', '#FFD25A', '#FF9A2E', '#E8553A', '#D2402F']): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(0.5 * Math.pow(1 - Math.pow(t, 1.55), 0.78), t));
  }
  const g = new THREE.LatheGeometry(pts, 14);
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
  return g;
}
