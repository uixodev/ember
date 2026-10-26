import * as THREE from 'three';
import { Particles } from './particles';

/**
 * The level-up show, played on the fire itself. A plain level-up sends a ring across the ground and a fountain of
 * stars. A new design is bigger: three rings, a column of light, a double spiral of stars that rises, and the
 * fire's decor grows out of the ground. Everything is a solid colour in the design's own colours.
 */
interface Ring { mesh: THREE.Mesh; t: number; delay: number; dur: number; reach: number }
interface Pillar { mesh: THREE.Mesh; t: number; dur: number }

const POOL = 220;

export class Celebration {
  readonly group = new THREE.Group();
  readonly stars: Particles;
  private readonly rings: Ring[] = [];
  private readonly pillars: Pillar[] = [];
  private readonly life = new Float32Array(POOL);
  private readonly span = new Float32Array(POOL);
  private readonly vel = new Float32Array(POOL * 3);
  private readonly spin = new Float32Array(POOL * 3);
  private readonly centre = new Float32Array(POOL * 2);
  private cursor = 0;
  private readonly ringGeo = new THREE.RingGeometry(0.92, 1, 64);
  private readonly pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 7, 20, 1, true);

  constructor(dot: THREE.Texture) {
    this.stars = new Particles(POOL, dot);
    this.group.add(this.stars.points);
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, color: THREE.Color, life: number, orbit = 0, phase = 0): void {
    const i = this.cursor++ % POOL;
    this.life[i] = life; this.span[i] = life;
    this.stars.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.spin.set([orbit, phase, 0], i * 3);
    this.centre.set([x, z], i * 2);
    this.stars.size[i] = size;
    this.stars.setColor(i, color);
    this.stars.alpha[i] = 1;
  }

  /** `colors` are the design's colours, light to strong. `big` is a new design. */
  play(x: number, z: number, scale: number, colors: string[], big: boolean, reduced: boolean): void {
    const cols = colors.map((c) => new THREE.Color(c));
    const pick = (i: number) => cols[i % cols.length];
    const rings = reduced ? 1 : big ? 3 : 1;
    for (let i = 0; i < rings; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: pick(i), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.05 + i * 0.01, z);
      this.group.add(mesh);
      this.rings.push({ mesh, t: -i * 0.28, delay: 0, dur: big ? 1.5 : 1.05, reach: (big ? 5.6 : 4) * scale });
    }
    if (big && !reduced) {
      const mat = new THREE.MeshBasicMaterial({ color: pick(0), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.pillarGeo, mat);
      mesh.position.set(x, 3.4, z);
      this.group.add(mesh);
      this.pillars.push({ mesh, t: 0, dur: 1.6 });
    }
    // a fountain of stars
    const n = reduced ? 20 : big ? 90 : 46;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (0.6 + Math.random() * 1.7) * scale;
      this.spawn(x, 0.5, z, Math.cos(a) * sp, 2.8 + Math.random() * 3.2, Math.sin(a) * sp, 0.08 + Math.random() * 0.12, pick(i), 1.1 + Math.random() * 1.1);
    }
    // a new design adds two spirals that climb the column of light
    if (big && !reduced) for (let s = 0; s < 2; s++) for (let i = 0; i < 40; i++) {
      this.spawn(x, 0.1, z, 0, 2.4 + (i / 40) * 1.4, 0, 0.1 + Math.random() * 0.06, pick(i + s), 1.8 + (i / 40) * 0.8, 1.2 * scale, s * Math.PI + (i / 40) * 7);
    }
  }

  update(dt: number): void {
    for (let r = this.rings.length - 1; r >= 0; r--) {
      const o = this.rings[r];
      o.t += dt;
      if (o.t < 0) continue;
      const k = Math.min(1, o.t / o.dur);
      const e = 1 - Math.pow(1 - k, 3);
      o.mesh.scale.setScalar(Math.max(0.01, 0.4 + e * o.reach));
      (o.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.min(1, (1 - k) * 1.4)) * 0.95;
      if (k >= 1) { this.group.remove(o.mesh); (o.mesh.material as THREE.Material).dispose(); this.rings.splice(r, 1); }
    }
    for (let p = this.pillars.length - 1; p >= 0; p--) {
      const o = this.pillars[p];
      o.t += dt;
      const k = Math.min(1, o.t / o.dur);
      const w = 1 + (1 - Math.pow(1 - k, 2)) * 0.6 - k * 0.9;
      o.mesh.scale.set(Math.max(0.05, w), 1, Math.max(0.05, w));
      (o.mesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.5;
      if (k >= 1) { this.group.remove(o.mesh); (o.mesh.material as THREE.Material).dispose(); this.pillars.splice(p, 1); }
    }
    let any = false;
    for (let i = 0; i < POOL; i++) {
      if (this.life[i] <= 0) { this.stars.alpha[i] = 0; continue; }
      any = true;
      this.life[i] -= dt;
      const orbit = this.spin[i * 3];
      if (orbit > 0) {
        // a spiral: circle the column of light while climbing it
        const a = (this.spin[i * 3 + 1] += dt * 5);
        this.stars.pos[i * 3] = this.centre[i * 2] + Math.cos(a) * orbit;
        this.stars.pos[i * 3 + 2] = this.centre[i * 2 + 1] + Math.sin(a) * orbit;
        this.stars.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      } else {
        this.vel[i * 3 + 1] -= 6 * dt;
        for (let k = 0; k < 3; k++) this.stars.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
      }
      this.stars.alpha[i] = Math.max(0, Math.min(1, this.life[i] * 1.8, (this.span[i] - this.life[i]) * 8));
    }
    if (any || this.rings.length || this.pillars.length) this.stars.commit();
  }

  get active(): boolean { return this.rings.length > 0 || this.pillars.length > 0 || this.life.some((l) => l > 0); }

  dispose(): void {
    this.ringGeo.dispose();
    this.pillarGeo.dispose();
    this.stars.dispose();
    for (const o of this.rings) (o.mesh.material as THREE.Material).dispose();
    for (const o of this.pillars) (o.mesh.material as THREE.Material).dispose();
  }
}
