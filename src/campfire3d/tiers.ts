import * as THREE from 'three';
import type { Tier } from './mastery';

/**
 * The seven looks of a campfire, from a plain stone ring up to a legend with gold pillars and a crown of light.
 * Each look is added to the fire's group (fire units, the group is scaled with the fire) and animated by `tick`.
 *   1 Camp      the stone ring only
 *   2 Hearth    a second ring of low stones with glowing embers between
 *   3 Cookfire  a tripod with a hanging pot
 *   4 Beacon    four pillars, each with a little torch flame
 *   5 Forge     the pillars joined by a glowing iron ring with rune lights
 *   6 Inferno   as 5, with embers orbiting the fire
 *   7 Legend    gold pillars, a crown ring of light and sparkles
 * Solid colours only.
 */
export interface TierDecor {
  group: THREE.Group;
  /** `lit` is how strongly the fire burns, 0 (cold) to 1. */
  tick: (t: number, lit: number) => void;
  dispose: () => void;
}

const STONE = 0x5f58a8;
const STONE_LIGHT = 0x8f88ec;
const IRON = 0x3a3670;
const WOOD = 0x6b4226;
const GOLD = 0xf2b21e;

export function buildTier(tier: Tier): TierDecor {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T): T => { geos.push(x); return x; };
  const lit = (c: number, flat = true) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: flat }); mats.push(m); return m; };
  const basic = (c: number) => { const m = new THREE.MeshBasicMaterial({ color: c }); mats.push(m); return m; };
  const glowing: THREE.Mesh[] = [];
  const spin: { o: THREE.Object3D; speed: number }[] = [];
  const bobbers: { o: THREE.Object3D; base: number; phase: number }[] = [];
  const flames: THREE.Mesh[] = [];

  // 2+ : outer ring of low stones, with embers between them
  if (tier >= 2) {
    const stoneGeo = g(new THREE.DodecahedronGeometry(0.2, 0));
    const stoneMat = lit(tier >= 7 ? GOLD : STONE);
    const n = 15;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(stoneGeo, stoneMat);
      m.position.set(Math.cos(a) * 1.5, 0.09, Math.sin(a) * 1.5);
      m.scale.set(1.2, 0.55, 0.9 + (i % 3) * 0.15);
      m.rotation.y = i * 1.7;
      group.add(m);
    }
    if (tier === 2) {
      const dot = g(new THREE.SphereGeometry(0.045, 8, 6));
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff9a2e : 0xffd25a });
        mats.push(mat);
        const m = new THREE.Mesh(dot, mat);
        m.position.set(Math.cos(a) * 1.5, 0.12, Math.sin(a) * 1.5);
        group.add(m);
        glowing.push(m);
      }
    }
  }

  // 3 : tripod and pot
  if (tier === 3) {
    const apex = new THREE.Vector3(0, 2.0, 0);
    const pole = g(new THREE.CylinderGeometry(0.035, 0.045, 1, 6));
    const wood = lit(WOOD);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const foot = new THREE.Vector3(Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45);
      const dir = apex.clone().sub(foot);
      const m = new THREE.Mesh(pole, wood);
      m.scale.y = dir.length();
      m.position.copy(foot).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      group.add(m);
    }
    const hang = new THREE.Group();
    hang.position.set(0, 2.0, 0);
    const chain = new THREE.Mesh(g(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5)), lit(IRON));
    chain.position.y = -0.22;
    const pot = new THREE.Mesh(g(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, Math.PI * 0.18, Math.PI * 0.82)), lit(IRON, false));
    pot.position.y = -0.62;
    pot.scale.set(1, 0.85, 1);
    const rim = new THREE.Mesh(g(new THREE.TorusGeometry(0.255, 0.028, 6, 18)), lit(IRON));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.42;
    hang.add(chain, pot, rim);
    group.add(hang);
    spin.push({ o: hang, speed: 0 });
    bobbers.push({ o: hang, base: 2.0, phase: 0 });
  }

  // 4+ : pillars with torch flames
  if (tier >= 4) {
    const gold = tier >= 7;
    const body = g(new THREE.BoxGeometry(0.26, 1.15, 0.26));
    const cap = g(new THREE.BoxGeometry(0.36, 0.1, 0.36));
    const bodyMat = lit(gold ? GOLD : STONE);
    const capMat = lit(gold ? 0xffd84d : STONE_LIGHT);
    const flameA = g(new THREE.ConeGeometry(0.11, 0.3, 7)); flameA.translate(0, 0.15, 0);
    const flameB = g(new THREE.ConeGeometry(0.06, 0.2, 7)); flameB.translate(0, 0.1, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const p = new THREE.Group();
      p.position.set(Math.cos(a) * 1.62, 0, Math.sin(a) * 1.62);
      p.rotation.y = -a;
      const b = new THREE.Mesh(body, bodyMat); b.position.y = 0.575;
      const c = new THREE.Mesh(cap, capMat); c.position.y = 1.2;
      const fa = new THREE.Mesh(flameA, basic(0xff9a2e)); fa.position.y = 1.25;
      const fb = new THREE.Mesh(flameB, basic(0xffe98a)); fb.position.y = 1.27;
      flames.push(fa, fb);
      p.add(b, c, fa, fb);
      group.add(p);
    }
  }

  // 5+ : iron ring joining the pillars, with rune lights
  if (tier >= 5) {
    const gold = tier >= 7;
    const ring = new THREE.Mesh(g(new THREE.TorusGeometry(1.62, 0.05, 8, 48)), lit(gold ? GOLD : IRON, false));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.75;
    group.add(ring);
    const dot = g(new THREE.BoxGeometry(0.1, 0.1, 0.1));
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd25a : 0xff9a2e });
      mats.push(mat);
      const m = new THREE.Mesh(dot, mat);
      m.position.set(Math.cos(a) * 1.62, 0.75, Math.sin(a) * 1.62);
      m.rotation.set(0.6, a, 0.6);
      group.add(m);
      glowing.push(m);
    }
  }

  // 6+ : embers circling the fire
  if (tier >= 6) {
    const dot = g(new THREE.SphereGeometry(0.07, 8, 6));
    for (const [r, y, count, speed, tilt] of [[1.15, 0.9, 9, 0.7, 0.18], [1.4, 1.5, 7, -0.55, -0.22]] as const) {
      const orbit = new THREE.Group();
      orbit.rotation.z = tilt;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffe98a : i % 3 === 1 ? 0xff9a2e : 0xffd25a });
        mats.push(mat);
        const m = new THREE.Mesh(dot, mat);
        m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        m.scale.setScalar(0.8 + (i % 3) * 0.3);
        orbit.add(m);
        bobbers.push({ o: m, base: y, phase: i });
      }
      group.add(orbit);
      spin.push({ o: orbit, speed });
    }
  }

  // 7 : crown of light
  if (tier >= 7) {
    const crown = new THREE.Group();
    crown.position.y = 2.15;
    const ring = new THREE.Mesh(g(new THREE.TorusGeometry(0.95, 0.05, 8, 48)), basic(0xffe98a));
    ring.rotation.x = Math.PI / 2;
    const inner = new THREE.Mesh(g(new THREE.TorusGeometry(0.62, 0.03, 8, 40)), basic(0xffffff));
    inner.rotation.x = Math.PI / 2;
    crown.add(ring, inner);
    const star = g(new THREE.OctahedronGeometry(0.1, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const m = new THREE.Mesh(star, basic(i % 2 ? 0xffffff : 0xffe98a));
      m.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95);
      crown.add(m);
    }
    group.add(crown);
    spin.push({ o: crown, speed: 0.5 });
  }

  return {
    group,
    tick: (t, litness) => {
      for (const s of spin) s.o.rotation.y = t * s.speed;
      for (const b of bobbers) b.o.position.y = b.base + Math.sin(t * 2 + b.phase) * 0.04;
      glowing.forEach((m, i) => { m.visible = litness > 0.05; m.scale.setScalar(0.75 + 0.35 * Math.sin(t * 3 + i * 0.9) * litness + 0.25 * litness); });
      flames.forEach((f, i) => {
        const s = (0.55 + 0.45 * litness) * (1 + Math.sin(t * 9 + i * 1.7) * 0.12);
        f.scale.set(s, s * (1 + Math.sin(t * 7 + i) * 0.15), s);
        f.visible = litness > 0.05;
      });
    },
    dispose: () => { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); },
  };
}
