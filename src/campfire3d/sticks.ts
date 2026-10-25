import * as THREE from 'three';
import type { Effort } from '../engine/hold';
import * as TX from './textures';

export type StickKind = 'kindling' | 'branch' | 'split' | 'log' | 'big';

/** What each kind of wood suggests when you drop it on a fire. You can always change it in the sheet. */
export const STICKS: Record<StickKind, { name: string; minutes: number; effort: Effort; blurb: string; /** Percent of heat it adds to a fire. */ gain: number }> = {
  kindling: { name: 'Kindling', minutes: 5, effort: 2, blurb: 'a quick one', gain: 5 },
  branch: { name: 'Branch', minutes: 15, effort: 3, blurb: 'a short session', gain: 10 },
  split: { name: 'Split log', minutes: 30, effort: 3, blurb: 'a proper go', gain: 20 },
  log: { name: 'Log', minutes: 60, effort: 4, blurb: 'a solid hour', gain: 30 },
  big: { name: 'Big log', minutes: 120, effort: 5, blurb: 'a long, hard push', gain: 100 },
};

export const STICK_KINDS = Object.keys(STICKS) as StickKind[];

export interface StickObj {
  id: number;
  kind: StickKind;
  group: THREE.Group;
  /** The part you grab: bigger than the wood so a fingertip finds it. */
  hit: THREE.Mesh;
  /** Where it lies when nobody holds it. */
  home: THREE.Vector3;
  homeYaw: number;
  /** Half its thickness: the height it rests at on the ground. */
  rest: number;
  length: number;
  shadow: THREE.Mesh;
  mats: THREE.Material[];
}

const rng = (seed: number) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

/** Bend a cylinder (standing on y) sideways a little, so no two sticks are dead straight. */
function bend(g: THREE.BufferGeometry, amount: number, seed: number): void {
  const r = rng(seed);
  const phase = r() * Math.PI;
  const p = g.attributes.position;
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  const h = max.y - min.y || 1;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - min.y) / h;
    p.setX(i, p.getX(i) + amount * Math.sin(Math.PI * t + phase) * h);
    p.setZ(i, p.getZ(i) + amount * 0.5 * Math.sin(2 * Math.PI * t + phase) * h);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
}

export interface WoodMaterials {
  bark: THREE.CanvasTexture;
  endGrain: THREE.CanvasTexture;
  inner: THREE.CanvasTexture;
}

export function makeWoodMaterials(): WoodMaterials {
  return { bark: TX.barkTexture(), endGrain: TX.endGrainTexture(), inner: TX.splitFaceTexture() };
}

function barkMat(w: WoodMaterials, len: number, tint = 0xffffff): THREE.MeshStandardMaterial {
  const map = w.bark.clone();
  map.repeat.set(2, Math.max(1, len / 1.4));
  map.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, color: tint, roughness: 0.9 });
}

function cyl(rTop: number, rBot: number, len: number, seg = 18): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, len, seg, 6, false);
}

/** Build one stick lying along +X with its underside on y = 0. */
export function buildStick(id: number, kind: StickKind, w: WoodMaterials, seed: number): StickObj {
  const r = rng(seed);
  const group = new THREE.Group();
  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    group.add(mesh);
    geos.push(g);
    return mesh;
  };
  const end = new THREE.MeshStandardMaterial({ map: w.endGrain, roughness: 0.9 });
  mats.push(end);
  let length = 1.5;
  let rest = 0.2;

  if (kind === 'kindling') {
    length = 1.0;
    rest = 0.07;
    const m = barkMat(w, 1, 0xd9b99a);
    mats.push(m);
    for (let i = 0; i < 5; i++) {
      const g = cyl(0.028 + r() * 0.01, 0.04 + r() * 0.012, length * (0.78 + r() * 0.28));
      bend(g, 0.04, seed + i);
      add(g, [m, end, end], [length / 2, 0.04 + (i % 2) * 0.05, (i - 2) * 0.052 + (r() - 0.5) * 0.02], [r() * 0.5 - 0.25, (r() - 0.5) * 0.18, -Math.PI / 2 + (r() - 0.5) * 0.1]);
    }
  } else if (kind === 'branch') {
    length = 1.55;
    rest = 0.1;
    const m = barkMat(w, 1.5, 0xc9a58a);
    mats.push(m);
    const main = cyl(0.045, 0.085, length);
    bend(main, 0.05, seed);
    add(main, [m, end, end], [length / 2, 0.09, 0], [0, 0, -Math.PI / 2]);
    for (const [at, ang, l] of [[0.42, 0.7, 0.55], [0.7, -0.6, 0.42]] as const) {
      const g = cyl(0.02, 0.04, l, 12);
      add(g, [m, end, end], [length * at + 0.1, 0.1, (ang > 0 ? 1 : -1) * 0.14], [ang > 0 ? 0.6 : -0.6, 0, -Math.PI / 2 + ang * 0.7]);
    }
  } else if (kind === 'split') {
    length = 1.25;
    rest = 0.2;
    const radius = 0.22;
    const m = barkMat(w, length);
    const face = new THREE.MeshStandardMaterial({ map: w.inner, roughness: 0.85 });
    mats.push(m, face);
    const half = new THREE.CylinderGeometry(radius, radius, length, 20, 1, true, -Math.PI / 2, Math.PI);
    add(half, m, [length / 2, radius, 0], [0, 0, -Math.PI / 2]);
    // the flat, freshly split face, lying on the ground side so the bark faces up
    const flat = new THREE.PlaneGeometry(length, radius * 2);
    add(flat, face, [length / 2, 0.005, 0], [-Math.PI / 2, 0, 0]);
    for (const x of [0, length]) {
      const cap = new THREE.CircleGeometry(radius, 20, 0, Math.PI);
      add(cap, end, [x, 0.005, 0], [0, x === 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
    }
  } else if (kind === 'log') {
    length = 1.55;
    rest = 0.25;
    const m = barkMat(w, length);
    const g = cyl(0.23, 0.26, length, 24);
    bend(g, 0.012, seed);
    mats.push(m);
    add(g, [m, end, end], [length / 2, 0.26, 0], [0, 0, -Math.PI / 2]);
  } else {
    length = 1.95;
    rest = 0.36;
    const m = barkMat(w, length, 0xe8d6c8);
    const g = cyl(0.33, 0.39, length, 28);
    bend(g, 0.018, seed);
    mats.push(m);
    add(g, [m, end, end], [length / 2, 0.38, 0], [0, 0, -Math.PI / 2]);
    for (const [x, a] of [[0.7, 1.2], [1.35, -0.8]] as const) {
      const knot = new THREE.SphereGeometry(0.1, 10, 8);
      add(knot, m, [x, 0.38 + Math.sin(a) * 0.37, Math.cos(a) * 0.37], [0, 0, 0]).scale.set(1, 0.7, 1);
    }
  }
  // lift so the underside touches the ground, and centre the grab point
  group.children.forEach((c) => c.position.x -= length / 2);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(length + 0.5, Math.max(0.6, rest * 2.4), Math.max(0.7, rest * 3)),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  hit.position.y = Math.max(0.3, rest);
  hit.userData.stickId = id;
  group.add(hit);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x15103f, transparent: true, opacity: 0.5, depthWrite: false, map: TX.glowSprite() }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(length * 1.2, Math.max(0.5, rest * 3.2), 1);
  shadow.position.y = 0.015;
  mats.push(shadow.material as THREE.Material);

  group.userData.geos = geos;
  group.userData.stickId = id;
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.userData.stickId = id; });
  return { id, kind, group, hit, home: new THREE.Vector3(), homeYaw: 0, rest, length, shadow, mats };
}
