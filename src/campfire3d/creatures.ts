import * as THREE from 'three';

/**
 * Creatures made of fire, standing on the hottest campfires. Each is built from a few simple shapes,
 * coloured like flame (pale in the middle, red at the edges, in the fire's own colours) and animated.
 * They are about one unit tall and face +z; the world turns them toward the camera.
 */
export type CreatureId = 'phoenix' | 'fox' | 'dragon' | 'salamander' | 'imp' | 'owl' | 'wolf' | 'cat' | 'rabbit' | 'serpent' | 'bear' | 'turtle' | 'stag' | 'spirit' | 'bat' | 'frog' | 'penguin' | 'octopus' | 'butterfly' | 'dino' | 'unicorn' | 'jelly';

export const CREATURE_IDS: CreatureId[] = ['phoenix', 'fox', 'dragon', 'salamander', 'imp', 'owl', 'wolf', 'cat', 'rabbit', 'serpent', 'bear', 'turtle', 'stag', 'spirit', 'bat', 'frog', 'penguin', 'octopus', 'butterfly', 'dino', 'unicorn', 'jelly'];
export const CREATURE_NAMES: Record<CreatureId, string> = {
  phoenix: 'Phoenix', fox: 'Fire fox', dragon: 'Dragon', salamander: 'Salamander', imp: 'Imp', owl: 'Fire owl',
  wolf: 'Wolf', cat: 'Cat', rabbit: 'Rabbit', serpent: 'Serpent', bear: 'Bear', turtle: 'Turtle', stag: 'Stag', spirit: 'Spirit',
  bat: 'Bat', frog: 'Frog', penguin: 'Penguin', octopus: 'Octopus', butterfly: 'Butterfly', dino: 'Dino', unicorn: 'Unicorn', jelly: 'Jellyfish',
};

export interface Creature {
  group: THREE.Group;
  /** Swap the flame colouring for another material (the Mythic rainbow), or back with null. */
  setMaterial: (m: THREE.Material | null) => void;
  tick: (t: number) => void;
  dispose: () => void;
}

const EYE = 0x1c1850;

class Builder {
  readonly group = new THREE.Group();
  readonly body: THREE.Mesh[] = [];
  readonly eyes: THREE.Mesh[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly flameMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: EYE });
  private readonly whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  add(parent: THREE.Object3D, g: THREE.BufferGeometry, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    const m = new THREE.Mesh(g, this.flameMat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    this.body.push(m);
    this.geos.push(g);
    return m;
  }

  eye(parent: THREE.Object3D, r: number, x: number, y: number, z: number, white = false): THREE.Mesh {
    const g = new THREE.SphereGeometry(r, 10, 8);
    const m = new THREE.Mesh(g, white ? this.whiteMat : this.eyeMat);
    m.position.set(x, y, z);
    parent.add(m);
    this.eyes.push(m);
    this.geos.push(g);
    return m;
  }

  pivot(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  /** Colour every vertex by its distance from the middle: pale in the core, red at the tips. */
  finish(ramp: string[], tick: (t: number) => void): Creature {
    const stops = ramp.map((c) => new THREE.Color(c));
    this.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.group);
    const center = box.getCenter(new THREE.Vector3());
    const maxR = box.getSize(new THREE.Vector3()).length() * 0.42;
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (const m of this.body) {
      const p = m.geometry.attributes.position;
      const colors = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
        const t = Math.min(0.999, Math.pow(v.distanceTo(center) / maxR, 0.85));
        const f = t * (stops.length - 1);
        const k = Math.floor(f);
        c.copy(stops[k]).lerp(stops[k + 1], f - k);
        colors.set([c.r, c.g, c.b], i * 3);
      }
      m.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    return {
      group: this.group,
      setMaterial: (m) => { for (const mesh of this.body) mesh.material = m ?? this.flameMat; },
      tick,
      dispose: () => { this.geos.forEach((g) => g.dispose()); this.flameMat.dispose(); this.eyeMat.dispose(); this.whiteMat.dispose(); },
    };
  }
}

const sph = (r: number, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const cone = (r: number, h: number, seg = 10) => { const g = new THREE.ConeGeometry(r, h, seg); g.translate(0, h / 2, 0); return g; };
const cyl = (rt: number, rb: number, h: number, seg = 8) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(0, -h / 2, 0); return g; };

// ---- Phoenix: a bird of flame with wings that beat and a long, trailing tail ---------------------

function phoenix(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.24), 0, 0.36, 0, 1, 1.25, 0.95);
  b.add(g, sph(0.15), 0, 0.72, 0.07);
  b.add(g, cone(0.045, 0.16), 0, 0.7, 0.22, 1, 1, 1, Math.PI / 2);
  for (const [x, rz] of [[0, 0], [-0.06, 0.4], [0.06, -0.4]] as const) b.add(g, cone(0.035, 0.22), x, 0.84, 0.03, 1, 1, 1, -0.5, 0, rz);
  b.eye(g, 0.032, -0.07, 0.75, 0.17);
  b.eye(g, 0.032, 0.07, 0.75, 0.17);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const w = b.pivot(g, side * 0.2, 0.45, 0);
    [[104, 0.7], [78, 0.62], [54, 0.52], [30, 0.42]].forEach(([deg, len]) => {
      b.add(w, cone(0.075, len), 0, 0, 0, 1, 1, 0.35, 0, 0, side * (deg * Math.PI) / 180);
    });
    wings.push(w);
  }
  const tail: THREE.Group[] = [];
  [[0.75, 0.5], [0.6, 0], [0.5, -0.5]].forEach(([len, rz], i) => {
    const t = b.pivot(g, 0, 0.18, -0.12);
    b.add(t, cone(0.06, len), 0, 0, 0, 1, 1, 0.5, Math.PI - 0.2, 0, rz * 0.5);
    t.rotation.z = rz * 0.3 + i * 0.01;
    tail.push(t);
  });
  return b.finish(ramp, (t) => {
    const flap = Math.sin(t * 6);
    wings[0].rotation.z = 0.12 + flap * 0.38;
    wings[1].rotation.z = -0.12 - flap * 0.38;
    g.userData.bob = Math.sin(t * 3) * 0.05;
    tail.forEach((s, i) => { s.rotation.x = Math.sin(t * 3 + i) * 0.12; });
  });
}

// ---- Fox: sitting, with a big curling tail and pricked ears --------------------------------------

function fox(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.2), 0, 0.3, 0, 0.95, 0.9, 1.45);
  b.add(g, sph(0.16), 0, 0.3, 0.2);
  const head = b.pivot(g, 0, 0.5, 0.3);
  b.add(head, sph(0.17), 0, 0, 0);
  b.add(head, cone(0.075, 0.2), 0, -0.04, 0.12, 1, 1, 1, Math.PI / 2);
  b.add(head, cone(0.065, 0.22), -0.09, 0.12, -0.02, 1, 1, 0.8, 0, 0, 0.15);
  b.add(head, cone(0.065, 0.22), 0.09, 0.12, -0.02, 1, 1, 0.8, 0, 0, -0.15);
  b.eye(head, 0.03, -0.07, 0.03, 0.14);
  b.eye(head, 0.03, 0.07, 0.03, 0.14);
  b.eye(head, 0.026, 0, -0.04, 0.3);
  for (const [x, z] of [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.14], [0.1, -0.14]]) b.add(g, cyl(0.05, 0.04, 0.22), x, 0.2, z);
  const tail = b.pivot(g, 0, 0.32, -0.3);
  [[0, 0, 0, 0.13], [0, 0.07, -0.14, 0.14], [0, 0.2, -0.24, 0.13], [0, 0.34, -0.28, 0.11], [0, 0.47, -0.24, 0.08]].forEach(([x, y, z, r]) => b.add(tail, sph(r), x, y, z));
  b.add(tail, cone(0.07, 0.2), 0, 0.58, -0.18, 1, 1, 1, 0.5);
  return b.finish(ramp, (t) => {
    tail.rotation.z = Math.sin(t * 2.4) * 0.28;
    tail.rotation.x = Math.sin(t * 1.7) * 0.08;
    head.rotation.y = Math.sin(t * 0.9) * 0.25;
    head.rotation.x = Math.sin(t * 1.3) * 0.06;
    g.userData.bob = Math.sin(t * 2) * 0.025;
  });
}

// ---- Dragon: a serpent rising out of the fire, with small beating wings -------------------------

function dragon(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  const segs: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) segs.push(b.add(g, sph(0.2 - i * 0.017), 0, 0.12 + i * 0.1, 0));
  const head = b.pivot(g, 0, 0.98, 0.04);
  b.add(head, sph(0.17), 0, 0, 0, 1, 0.9, 1.1);
  b.add(head, sph(0.1), 0, -0.03, 0.17, 1, 0.85, 1.25);
  b.add(head, cone(0.04, 0.2), -0.09, 0.1, -0.05, 1, 1, 1, -0.5, 0, 0.35);
  b.add(head, cone(0.04, 0.2), 0.09, 0.1, -0.05, 1, 1, 1, -0.5, 0, -0.35);
  b.eye(head, 0.032, -0.08, 0.05, 0.12);
  b.eye(head, 0.032, 0.08, 0.05, 0.12);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const w = b.pivot(g, side * 0.14, 0.62, -0.04);
    b.add(w, cone(0.26, 0.55, 3), side * 0.22, 0.1, 0, 1, 1, 0.18, 0, 0, -side * 1.15);
    b.add(w, cone(0.17, 0.4, 3), side * 0.2, -0.08, 0, 1, 1, 0.18, 0, 0, -side * 1.4);
    wings.push(w);
  }
  b.add(g, cone(0.08, 0.28), 0, 0.02, 0, 1, 1, 1, Math.PI);
  return b.finish(ramp, (t) => {
    segs.forEach((m, i) => { m.position.x = Math.sin(t * 2.6 + i * 0.7) * 0.1 * (0.4 + i * 0.14); m.position.z = Math.cos(t * 2.2 + i * 0.6) * 0.05; });
    head.position.x = Math.sin(t * 2.6 + 7 * 0.7) * 0.1 * 1.5;
    head.rotation.z = Math.sin(t * 2.6 + 5) * 0.2;
    head.rotation.x = Math.sin(t * 1.4) * 0.1;
    const flap = Math.sin(t * 5.2);
    wings[0].rotation.z = flap * 0.3;
    wings[1].rotation.z = -flap * 0.3;
  });
}

// ---- Salamander: a little lizard with a curling tail and bulging eyes ----------------------------

function salamander(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.13), 0, 0.2, 0, 1, 0.9, 2.5);
  b.add(g, sph(0.15), 0, 0.22, 0.34, 1, 0.9, 1.05);
  b.eye(g, 0.04, -0.08, 0.34, 0.38);
  b.eye(g, 0.04, 0.08, 0.34, 0.38);
  b.eye(g, 0.016, -0.08, 0.35, 0.415, true);
  b.eye(g, 0.016, 0.08, 0.35, 0.415, true);
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-1, 0.18], [1, 0.18], [-1, -0.16], [1, -0.16]] as const) {
    const l = b.pivot(g, x * 0.1, 0.18, z);
    b.add(l, cyl(0.04, 0.032, 0.17), x * 0.06, 0, 0, 1, 1, 1, 0, 0, x * 0.7);
    b.add(l, sph(0.045), x * 0.17, -0.15, 0.02);
    legs.push(l);
  }
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) tail.push(b.add(g, sph(0.12 - i * 0.012), 0, 0.2 - i * 0.005, -0.28 - i * 0.12));
  b.add(g, cone(0.04, 0.12), 0, 0.17, -1.2, 1, 1, 1, -Math.PI / 2);
  return b.finish(ramp, (t) => {
    tail.forEach((m, i) => { m.position.x = Math.sin(t * 3 + i * 0.6) * 0.04 * (i + 1) * 0.5; });
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 4 + i * 1.6) * 0.18; });
    g.rotation.y = Math.sin(t * 0.8) * 0.15;
    g.userData.bob = Math.sin(t * 2.4) * 0.02;
  });
}

// ---- Imp: a round little devil with horns, waving arms, tiny wings and an arrow tail ------------

function imp(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.26), 0, 0.34, 0, 1, 1.1, 1);
  const head = b.pivot(g, 0, 0.72, 0);
  b.add(head, sph(0.2), 0, 0, 0);
  b.add(head, cone(0.045, 0.22), -0.11, 0.15, 0, 1, 1, 1, 0, 0, 0.45);
  b.add(head, cone(0.045, 0.22), 0.11, 0.15, 0, 1, 1, 1, 0, 0, -0.45);
  b.add(head, cone(0.05, 0.14), -0.2, 0.02, 0, 1, 1, 1, 0, 0, Math.PI / 2 + 0.2);
  b.add(head, cone(0.05, 0.14), 0.2, 0.02, 0, 1, 1, 1, 0, 0, -Math.PI / 2 - 0.2);
  b.eye(head, 0.04, -0.08, 0.03, 0.17);
  b.eye(head, 0.04, 0.08, 0.03, 0.17);
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const a = b.pivot(g, side * 0.24, 0.5, 0.04);
    b.add(a, cyl(0.045, 0.05, 0.26), side * 0.08, 0, 0, 1, 1, 1, 0, 0, side * 0.9);
    b.add(a, sph(0.065), side * 0.2, -0.2, 0);
    arms.push(a);
  }
  for (const x of [-0.1, 0.1]) b.add(g, cyl(0.06, 0.05, 0.2), x, 0.14, 0);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const w = b.pivot(g, side * 0.14, 0.5, -0.2);
    b.add(w, cone(0.15, 0.3, 3), side * 0.12, 0.08, 0, 1, 1, 0.2, 0, 0, -side * 1.1);
    wings.push(w);
  }
  const tail = b.pivot(g, 0, 0.2, -0.22);
  [[0, 0, 0], [0, 0.06, -0.12], [0, 0.17, -0.2], [0, 0.3, -0.22]].forEach(([x, y, z]) => b.add(tail, sph(0.055), x, y, z));
  b.add(tail, cone(0.08, 0.16), 0, 0.42, -0.2, 1, 1, 0.5);
  return b.finish(ramp, (t) => {
    arms[0].rotation.z = Math.sin(t * 4) * 0.5;
    arms[1].rotation.z = -Math.sin(t * 4 + 1.6) * 0.5;
    wings[0].rotation.z = Math.sin(t * 9) * 0.3;
    wings[1].rotation.z = -Math.sin(t * 9) * 0.3;
    tail.rotation.z = Math.sin(t * 3) * 0.3;
    head.rotation.z = Math.sin(t * 2) * 0.1;
    g.userData.bob = Math.abs(Math.sin(t * 3)) * 0.07;
  });
}

// ---- Owl: round and wise, with big eyes, ear tufts and wings that ruffle --------------------------

function owl(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.28), 0, 0.38, 0, 1, 1.25, 0.95);
  const head = b.pivot(g, 0, 0.74, 0.03);
  b.add(head, sph(0.2), 0, 0, 0, 1.2, 0.95, 1);
  b.add(head, cone(0.05, 0.16), -0.13, 0.15, 0, 1, 1, 1, 0, 0, 0.3);
  b.add(head, cone(0.05, 0.16), 0.13, 0.15, 0, 1, 1, 1, 0, 0, -0.3);
  b.eye(head, 0.085, -0.09, 0.02, 0.15, true);
  b.eye(head, 0.085, 0.09, 0.02, 0.15, true);
  b.eye(head, 0.046, -0.09, 0.02, 0.22);
  b.eye(head, 0.046, 0.09, 0.02, 0.22);
  b.add(head, cone(0.04, 0.1), 0, -0.05, 0.19, 1, 1, 1, Math.PI * 0.55);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const w = b.pivot(g, side * 0.27, 0.5, 0);
    b.add(w, sph(0.16), side * 0.02, -0.14, -0.02, 0.4, 1.7, 0.7);
    wings.push(w);
  }
  b.add(g, cone(0.12, 0.3, 4), 0, 0.12, -0.24, 1, 1, 0.4, Math.PI * 0.85);
  for (const x of [-0.09, 0.09]) b.add(g, cone(0.035, 0.1), x, 0.06, 0.1, 1, 1, 1, Math.PI);
  return b.finish(ramp, (t) => {
    head.rotation.y = Math.sin(t * 0.7) * 0.7;
    head.rotation.z = Math.sin(t * 1.9) * 0.05;
    wings[0].rotation.z = 0.1 + Math.max(0, Math.sin(t * 1.4)) * 0.28;
    wings[1].rotation.z = -0.1 - Math.max(0, Math.sin(t * 1.4)) * 0.28;
    g.userData.bob = Math.sin(t * 2.2) * 0.025;
  });
}

// ---- Wolf: standing proud, long snout, upright ears, bushy tail ----------------------------------

function wolf(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.2), 0, 0.42, -0.02, 0.9, 0.95, 1.7);
  b.add(g, sph(0.17), 0, 0.5, 0.2);
  const head = b.pivot(g, 0, 0.66, 0.3);
  b.add(head, sph(0.15), 0, 0, 0, 0.95, 0.95, 1.05);
  b.add(head, cone(0.07, 0.24), 0, -0.04, 0.12, 1, 1, 0.9, Math.PI / 2);
  b.add(head, cone(0.06, 0.2), -0.08, 0.14, -0.03, 1, 1, 0.7, 0, 0, 0.1);
  b.add(head, cone(0.06, 0.2), 0.08, 0.14, -0.03, 1, 1, 0.7, 0, 0, -0.1);
  b.eye(head, 0.026, -0.065, 0.03, 0.12);
  b.eye(head, 0.026, 0.065, 0.03, 0.12);
  for (const [x, z] of [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.2], [0.1, -0.2]]) b.add(g, cyl(0.05, 0.04, 0.32), x, 0.3, z);
  const tail = b.pivot(g, 0, 0.5, -0.3);
  b.add(tail, cone(0.09, 0.42), 0, 0, 0, 1, 1, 1, Math.PI * 0.72);
  return b.finish(ramp, (t) => {
    tail.rotation.z = Math.sin(t * 2.2) * 0.25;
    head.rotation.x = -0.1 + Math.sin(t * 0.8) * 0.12;
    head.rotation.y = Math.sin(t * 0.6) * 0.3;
    g.userData.bob = Math.sin(t * 2) * 0.02;
  });
}

// ---- Cat: sitting, tall tail that swishes ---------------------------------------------------------

function cat(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.22), 0, 0.28, -0.02, 0.95, 1.1, 1.05);
  const head = b.pivot(g, 0, 0.6, 0.06);
  b.add(head, sph(0.16), 0, 0, 0, 1.1, 0.95, 1);
  b.add(head, cone(0.065, 0.14, 3), -0.1, 0.14, 0, 1, 1, 1, 0, 0, 0.25);
  b.add(head, cone(0.065, 0.14, 3), 0.1, 0.14, 0, 1, 1, 1, 0, 0, -0.25);
  b.eye(head, 0.03, -0.07, 0.02, 0.14);
  b.eye(head, 0.03, 0.07, 0.02, 0.14);
  b.add(head, sph(0.02), 0, -0.03, 0.16);
  for (const x of [-0.08, 0.08]) b.add(g, cyl(0.045, 0.04, 0.2), x, 0.17, 0.16);
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) tail.push(b.add(g, sph(0.055 - i * 0.002), 0.16 + Math.sin(i * 0.5) * 0.1, 0.1 + i * 0.08, -0.2));
  return b.finish(ramp, (t) => {
    tail.forEach((m, i) => { m.position.x = 0.16 + Math.sin(i * 0.5) * 0.1 + Math.sin(t * 2.4 + i * 0.5) * 0.04 * (i + 1) * 0.5; });
    head.rotation.z = Math.sin(t * 1.2) * 0.12;
    head.rotation.y = Math.sin(t * 0.7) * 0.3;
    g.userData.bob = Math.sin(t * 2.6) * 0.015;
  });
}

// ---- Rabbit: round, with tall ears that twitch and a hopping bob ----------------------------------

function rabbit(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.24), 0, 0.28, -0.02, 1, 1, 1.1);
  const head = b.pivot(g, 0, 0.56, 0.12);
  b.add(head, sph(0.15), 0, 0, 0);
  const ears: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const e = b.pivot(head, side * 0.06, 0.1, -0.02);
    b.add(e, sph(0.05), 0, 0.17, 0, 0.6, 3.2, 0.4);
    ears.push(e);
  }
  b.eye(head, 0.03, -0.07, 0.02, 0.12);
  b.eye(head, 0.03, 0.07, 0.02, 0.12);
  b.add(head, sph(0.025), 0, -0.04, 0.14);
  b.add(g, sph(0.07), 0, 0.22, -0.3);
  for (const x of [-0.1, 0.1]) b.add(g, sph(0.07), x, 0.07, 0.14, 1, 0.7, 1.5);
  return b.finish(ramp, (t) => {
    ears[0].rotation.z = 0.15 + Math.sin(t * 3) * 0.08;
    ears[1].rotation.z = -0.15 - Math.sin(t * 3 + 1) * 0.08;
    head.rotation.y = Math.sin(t * 1.1) * 0.3;
    g.userData.bob = Math.abs(Math.sin(t * 2.4)) * 0.06;
  });
}

// ---- Serpent: a coiled snake rising up with a swaying head ----------------------------------------

function serpent(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  const segs: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 0.62;
    const r = 0.22 - i * 0.008;
    segs.push(b.add(g, sph(0.11 - i * 0.003), Math.cos(a) * r, 0.1 + i * 0.045, Math.sin(a) * r));
  }
  const head = b.pivot(g, 0, 0.78, 0);
  b.add(head, sph(0.13), 0, 0, 0.02, 1, 0.8, 1.2);
  b.eye(head, 0.026, -0.06, 0.04, 0.1);
  b.eye(head, 0.026, 0.06, 0.04, 0.1);
  b.add(head, cone(0.015, 0.12), 0, -0.04, 0.2, 1, 1, 1, Math.PI / 2);
  return b.finish(ramp, (t) => {
    segs.forEach((m, i) => { const a = i * 0.62 + t * 1.2; const r = 0.22 - i * 0.008; m.position.x = Math.cos(a) * r; m.position.z = Math.sin(a) * r; });
    head.position.x = Math.cos(14 * 0.62 + t * 1.2) * 0.1;
    head.position.z = Math.sin(14 * 0.62 + t * 1.2) * 0.1;
    head.rotation.y = -(14 * 0.62 + t * 1.2) + Math.PI / 2;
    head.rotation.x = 0.2 + Math.sin(t * 2) * 0.1;
  });
}

// ---- Bear: big and round, waving a paw ------------------------------------------------------------

function bear(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.3), 0, 0.34, 0, 1, 1.1, 0.95);
  const head = b.pivot(g, 0, 0.74, 0.05);
  b.add(head, sph(0.19), 0, 0, 0);
  b.add(head, sph(0.075), -0.14, 0.15, -0.02);
  b.add(head, sph(0.075), 0.14, 0.15, -0.02);
  b.add(head, sph(0.09), 0, -0.05, 0.14, 1, 0.8, 0.9);
  b.eye(head, 0.03, -0.075, 0.04, 0.15);
  b.eye(head, 0.03, 0.075, 0.04, 0.15);
  b.add(head, sph(0.03), 0, -0.02, 0.22);
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const a = b.pivot(g, side * 0.3, 0.5, 0.04);
    b.add(a, cyl(0.08, 0.07, 0.3), side * 0.04, 0, 0, 1, 1, 1, 0, 0, side * 0.25);
    arms.push(a);
  }
  for (const x of [-0.14, 0.14]) b.add(g, cyl(0.1, 0.09, 0.18), x, 0.16, 0.06);
  return b.finish(ramp, (t) => {
    arms[1].rotation.z = -0.5 - Math.sin(t * 5) * 0.4;
    arms[0].rotation.z = 0.1 + Math.sin(t * 1.5) * 0.05;
    head.rotation.z = Math.sin(t * 1.3) * 0.1;
    g.userData.bob = Math.sin(t * 2) * 0.025;
  });
}

// ---- Turtle: a domed shell, a slow neck and little flippers ---------------------------------------

function turtle(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.32, 16, 10), 0, 0.2, 0, 1, 0.75, 1.15);
  for (const [x, y, z] of [[0, 0.46, 0], [-0.16, 0.38, 0.1], [0.16, 0.38, 0.1], [-0.15, 0.36, -0.12], [0.15, 0.36, -0.12]]) b.add(g, sph(0.07), x, y, z, 1, 0.5, 1);
  const neck = b.pivot(g, 0, 0.18, 0.32);
  b.add(neck, sph(0.1), 0, 0.04, 0.1, 0.9, 0.9, 1.4);
  b.add(neck, sph(0.1), 0, 0.1, 0.24);
  b.eye(neck, 0.025, -0.05, 0.14, 0.31);
  b.eye(neck, 0.025, 0.05, 0.14, 0.31);
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-1, 0.2], [1, 0.2], [-1, -0.2], [1, -0.2]] as const) {
    const l = b.pivot(g, x * 0.26, 0.1, z);
    b.add(l, sph(0.08), x * 0.04, -0.02, 0, 1.3, 0.8, 1.1);
    legs.push(l);
  }
  b.add(g, cone(0.05, 0.14), 0, 0.14, -0.36, 1, 1, 1, -Math.PI / 2);
  return b.finish(ramp, (t) => {
    neck.rotation.x = Math.sin(t * 0.9) * 0.12;
    neck.rotation.y = Math.sin(t * 0.6) * 0.3;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.6 + i * 1.5) * 0.18; });
    g.userData.bob = Math.sin(t * 1.4) * 0.015;
  });
}

// ---- Stag: a tall deer with branching antlers -----------------------------------------------------

function stag(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.18), 0, 0.5, -0.02, 0.9, 0.95, 1.8);
  b.add(g, cone(0.09, 0.34), 0, 0.5, 0.2, 1, 1, 1, -0.5);
  const head = b.pivot(g, 0, 0.88, 0.32);
  b.add(head, sph(0.1), 0, 0, 0, 0.95, 1, 1.15);
  b.add(head, cone(0.045, 0.16), 0, -0.04, 0.1, 1, 1, 1, Math.PI / 2);
  b.add(head, cone(0.04, 0.1), -0.09, 0.05, -0.02, 1, 1, 0.6, 0, 0, Math.PI / 2 - 0.3);
  b.add(head, cone(0.04, 0.1), 0.09, 0.05, -0.02, 1, 1, 0.6, 0, 0, -Math.PI / 2 + 0.3);
  for (const side of [-1, 1]) {
    b.add(head, cone(0.02, 0.3), side * 0.06, 0.1, -0.02, 1, 1, 1, 0, 0, -side * 0.35);
    b.add(head, cone(0.016, 0.16), side * 0.13, 0.22, -0.02, 1, 1, 1, 0, 0, -side * 0.9);
    b.add(head, cone(0.016, 0.14), side * 0.1, 0.3, -0.02, 1, 1, 1, 0, 0, side * 0.2);
  }
  b.eye(head, 0.022, -0.055, 0.03, 0.09);
  b.eye(head, 0.022, 0.055, 0.03, 0.09);
  for (const [x, z] of [[-0.09, 0.16], [0.09, 0.16], [-0.09, -0.2], [0.09, -0.2]]) b.add(g, cyl(0.035, 0.025, 0.4), x, 0.4, z);
  return b.finish(ramp, (t) => {
    head.rotation.x = Math.sin(t * 0.9) * 0.1;
    head.rotation.y = Math.sin(t * 0.55) * 0.35;
    g.userData.bob = Math.sin(t * 1.8) * 0.02;
  });
}

// ---- Spirit: a floating teardrop of flame with a wavy tail and two bright eyes --------------------

function spirit(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.26), 0, 0.55, 0, 1, 1.15, 0.95);
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) tail.push(b.add(g, sph(0.22 - i * 0.035), 0, 0.38 - i * 0.1, 0));
  b.eye(g, 0.05, -0.1, 0.6, 0.2, true);
  b.eye(g, 0.05, 0.1, 0.6, 0.2, true);
  b.eye(g, 0.025, -0.1, 0.6, 0.245);
  b.eye(g, 0.025, 0.1, 0.6, 0.245);
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const a = b.pivot(g, side * 0.24, 0.52, 0.04);
    b.add(a, sph(0.07), side * 0.1, -0.02, 0, 1.6, 0.8, 0.8);
    arms.push(a);
  }
  b.add(g, cone(0.07, 0.2), 0, 0.84, 0, 1, 1, 1, 0.2);
  return b.finish(ramp, (t) => {
    tail.forEach((m, i) => { m.position.x = Math.sin(t * 3 + i * 0.8) * 0.05 * (i + 1) * 0.5; });
    arms[0].rotation.z = Math.sin(t * 2.4) * 0.3;
    arms[1].rotation.z = -Math.sin(t * 2.4 + 1) * 0.3;
    g.userData.bob = Math.sin(t * 2) * 0.07 + 0.03;
  });
}



// ---- Bat: wings spread wide, big ears, a flapping hover ------------------------------------------

function bat(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.17), 0, 0.5, 0, 1, 1.2, 0.95);
  const head = b.pivot(g, 0, 0.72, 0.02);
  b.add(head, sph(0.13), 0, 0, 0);
  b.add(head, cone(0.06, 0.2, 4), -0.08, 0.1, 0, 1, 1, 0.5, 0, 0, 0.2);
  b.add(head, cone(0.06, 0.2, 4), 0.08, 0.1, 0, 1, 1, 0.5, 0, 0, -0.2);
  b.add(head, cone(0.03, 0.06), -0.03, -0.09, 0.09, 1, 1, 1, Math.PI);
  b.add(head, cone(0.03, 0.06), 0.03, -0.09, 0.09, 1, 1, 1, Math.PI);
  b.eye(head, 0.032, -0.05, 0.02, 0.11, true); b.eye(head, 0.032, 0.05, 0.02, 0.11, true);
  b.eye(head, 0.015, -0.05, 0.02, 0.14); b.eye(head, 0.015, 0.05, 0.02, 0.14);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const w = b.pivot(g, side * 0.14, 0.56, 0);
    [[0.95, 0.62], [0.55, 0.52], [0.2, 0.42]].forEach(([deg, len]) => b.add(w, cone(0.1, len, 4), 0, 0, 0, 1, 1, 0.22, 0, 0, side * (deg * Math.PI) / 2 * -1 + side * 0.2));
    b.add(w, cone(0.3, 0.45, 3), side * 0.28, -0.12, 0, 1, 0.8, 0.15, 0, 0, side * 1.45);
    wings.push(w);
  }
  b.add(g, cone(0.05, 0.14), -0.05, 0.36, 0, 1, 1, 1, Math.PI); b.add(g, cone(0.05, 0.14), 0.05, 0.36, 0, 1, 1, 1, Math.PI);
  return b.finish(ramp, (t) => {
    const flap = Math.sin(t * 7);
    wings[0].rotation.z = 0.1 + flap * 0.5; wings[1].rotation.z = -0.1 - flap * 0.5;
    g.userData.bob = 0.12 + Math.sin(t * 3.5) * 0.06;
  });
}

// ---- Frog: squat, wide mouth, big eyes on top, hopping ----------------------------------------------

function frog(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.27), 0, 0.26, 0, 1.15, 0.8, 1.15);
  const head = b.pivot(g, 0, 0.42, 0.18);
  b.add(head, sph(0.19), 0, 0, 0, 1.3, 0.7, 1);
  b.eye(head, 0.07, -0.12, 0.1, 0.03, true); b.eye(head, 0.07, 0.12, 0.1, 0.03, true);
  b.eye(head, 0.035, -0.12, 0.1, 0.09); b.eye(head, 0.035, 0.12, 0.1, 0.09);
  b.add(head, sph(0.02), -0.04, 0.02, 0.18); b.add(head, sph(0.02), 0.04, 0.02, 0.18);
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const l = b.pivot(g, side * 0.24, 0.16, -0.08);
    b.add(l, sph(0.13), 0, 0, 0, 0.6, 1, 1.5);
    b.add(l, sph(0.07), side * 0.04, -0.12, 0.2, 1.4, 0.6, 1.8);
    legs.push(l);
    b.add(g, sph(0.06), side * 0.17, 0.07, 0.24, 1.3, 0.7, 1.7);
  }
  return b.finish(ramp, (t) => {
    const hop = Math.abs(Math.sin(t * 2.6));
    legs[0].rotation.x = -hop * 0.5; legs[1].rotation.x = -hop * 0.5;
    head.rotation.x = -hop * 0.15;
    g.userData.bob = hop * 0.14;
  });
}

// ---- Penguin: an egg with flippers, a beak and little feet -----------------------------------------

function penguin(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.27), 0, 0.4, 0, 1, 1.45, 0.95);
  b.add(g, sph(0.2), 0, 0.72, 0.02, 1, 0.95, 0.95);
  b.add(g, cone(0.05, 0.13), 0, 0.7, 0.17, 1, 1, 1, Math.PI * 0.5);
  b.eye(g, 0.035, -0.08, 0.77, 0.14); b.eye(g, 0.035, 0.08, 0.77, 0.14);
  const fl: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const f = b.pivot(g, side * 0.26, 0.55, 0);
    b.add(f, sph(0.07), side * 0.05, -0.12, 0, 0.5, 2.4, 0.9);
    fl.push(f);
    b.add(g, sph(0.07), side * 0.1, 0.03, 0.12, 1.3, 0.4, 1.9);
  }
  return b.finish(ramp, (t) => {
    g.rotation.z = Math.sin(t * 3) * 0.1;
    fl[0].rotation.z = 0.2 + Math.sin(t * 3 + 1) * 0.3; fl[1].rotation.z = -0.2 - Math.sin(t * 3 + 1) * 0.3;
    g.userData.bob = Math.abs(Math.sin(t * 3)) * 0.03;
  });
}

// ---- Octopus: a round head, eight tentacles that curl and sway ----------------------------------------

function octopus(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.27), 0, 0.62, 0, 1, 1.15, 1);
  b.eye(g, 0.06, -0.1, 0.6, 0.22, true); b.eye(g, 0.06, 0.1, 0.6, 0.22, true);
  b.eye(g, 0.028, -0.1, 0.6, 0.275); b.eye(g, 0.028, 0.1, 0.6, 0.275);
  const arms: THREE.Mesh[][] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const row: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) row.push(b.add(g, sph(0.085 - i * 0.012), Math.cos(a) * (0.16 + i * 0.07), 0.38 - i * 0.07, Math.sin(a) * (0.16 + i * 0.07)));
    arms.push(row);
  }
  return b.finish(ramp, (t) => {
    arms.forEach((row, k) => row.forEach((m, i) => {
      const a = (k / 8) * Math.PI * 2 + Math.sin(t * 2 + k + i * 0.5) * 0.12 * (i + 1) * 0.4;
      const r = 0.16 + i * 0.07;
      m.position.x = Math.cos(a) * r; m.position.z = Math.sin(a) * r;
    }));
    g.userData.bob = Math.sin(t * 2.2) * 0.04;
  });
}

// ---- Butterfly: four big wings that open and close, a slim body, feelers ---------------------------------

function butterfly(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.07), 0, 0.5, 0, 1, 3.2, 1);
  b.add(g, sph(0.07), 0, 0.72, 0.01);
  b.add(g, cone(0.012, 0.2), -0.03, 0.76, 0, 1, 1, 1, 0, 0, 0.5); b.add(g, cone(0.012, 0.2), 0.03, 0.76, 0, 1, 1, 1, 0, 0, -0.5);
  b.eye(g, 0.02, -0.03, 0.73, 0.06); b.eye(g, 0.02, 0.03, 0.73, 0.06);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const w = b.pivot(g, 0, 0.56, 0);
    b.add(w, sph(0.3), side * 0.28, 0.1, 0, 1, 1.1, 0.12);
    b.add(w, sph(0.22), side * 0.2, -0.16, 0, 1, 1, 0.12);
    wings.push(w);
  }
  return b.finish(ramp, (t) => {
    const open = 0.35 + Math.abs(Math.sin(t * 3.2)) * 0.8;
    wings[0].rotation.y = -open; wings[1].rotation.y = open;
    g.userData.bob = 0.1 + Math.sin(t * 2) * 0.08;
  });
}

// ---- Dino: a long neck, back plates, a thick tail --------------------------------------------------------

function dino(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.26), 0, 0.34, 0, 0.95, 0.95, 1.5);
  const neck: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) neck.push(b.add(g, sph(0.12 - i * 0.012), 0, 0.46 + i * 0.12, 0.22 + i * 0.07));
  const head = b.pivot(g, 0, 0.98, 0.5);
  b.add(head, sph(0.12), 0, 0, 0, 1, 0.9, 1.3);
  b.add(head, sph(0.075), 0, -0.02, 0.13, 1, 0.8, 1.4);
  b.eye(head, 0.03, -0.075, 0.04, 0.07); b.eye(head, 0.03, 0.075, 0.04, 0.07);
  for (let i = 0; i < 5; i++) b.add(g, cone(0.07, 0.17 - i * 0.015, 4), 0, 0.57 + (i % 2) * 0.02, 0.18 - i * 0.12);
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) tail.push(b.add(g, sph(0.17 - i * 0.025), 0, 0.28 - i * 0.02, -0.3 - i * 0.14));
  for (const x of [-0.14, 0.14]) b.add(g, cyl(0.07, 0.06, 0.2), x, 0.18, 0.04);
  return b.finish(ramp, (t) => {
    head.rotation.x = Math.sin(t * 1.4) * 0.15; head.rotation.y = Math.sin(t * 0.8) * 0.3;
    neck.forEach((m, i) => { m.position.x = Math.sin(t * 1.2 + i * 0.4) * 0.03 * (i + 1); });
    tail.forEach((m, i) => { m.position.x = Math.sin(t * 2.4 + i * 0.6) * 0.05 * (i + 1) * 0.6; });
    g.userData.bob = Math.sin(t * 2) * 0.02;
  });
}

// ---- Unicorn: a horse with a spiralling horn and a flowing mane -----------------------------------------

function unicorn(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.2), 0, 0.46, -0.02, 0.9, 0.95, 1.7);
  b.add(g, cone(0.1, 0.36), 0, 0.52, 0.2, 1, 1, 1, -0.55);
  const head = b.pivot(g, 0, 0.88, 0.34);
  b.add(head, sph(0.11), 0, 0, 0, 0.95, 1, 1.2);
  b.add(head, cone(0.06, 0.2), 0, -0.05, 0.1, 1, 1, 1, Math.PI / 2);
  b.add(head, cone(0.025, 0.3, 6), 0, 0.12, 0.05, 1, 1, 1, 0.25);
  b.add(head, cone(0.045, 0.12), -0.07, 0.1, -0.03, 1, 1, 0.5, 0, 0, 0.2); b.add(head, cone(0.045, 0.12), 0.07, 0.1, -0.03, 1, 1, 0.5, 0, 0, -0.2);
  b.eye(head, 0.026, -0.06, 0.03, 0.09); b.eye(head, 0.026, 0.06, 0.03, 0.09);
  const mane: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) mane.push(b.add(g, sph(0.06), 0, 0.82 - i * 0.07, 0.2 - i * 0.05));
  for (const [x, z] of [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.2], [0.08, -0.2]]) b.add(g, cyl(0.035, 0.028, 0.4), x, 0.4, z);
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) tail.push(b.add(g, sph(0.06), 0, 0.5 - i * 0.07, -0.34 - i * 0.04));
  return b.finish(ramp, (t) => {
    head.rotation.x = Math.sin(t * 1.3) * 0.12; head.rotation.y = Math.sin(t * 0.7) * 0.25;
    mane.forEach((m, i) => { m.position.x = Math.sin(t * 3 + i * 0.7) * 0.05 * (i * 0.5 + 1); });
    tail.forEach((m, i) => { m.position.x = Math.sin(t * 2.6 + i * 0.8) * 0.06 * (i + 1) * 0.6; });
    g.userData.bob = Math.sin(t * 2) * 0.02;
  });
}

// ---- Jellyfish: a floating dome with long, trailing tentacles -------------------------------------------------

function jelly(ramp: string[]): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.3, 16, 10), 0, 0.72, 0, 1, 0.8, 1);
  b.eye(g, 0.05, -0.1, 0.7, 0.26, true); b.eye(g, 0.05, 0.1, 0.7, 0.26, true);
  b.eye(g, 0.022, -0.1, 0.7, 0.305); b.eye(g, 0.022, 0.1, 0.7, 0.305);
  const strands: THREE.Mesh[][] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const row: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) row.push(b.add(g, sph(0.05 - i * 0.005), Math.cos(a) * 0.2, 0.58 - i * 0.1, Math.sin(a) * 0.2));
    strands.push(row);
  }
  return b.finish(ramp, (t) => {
    strands.forEach((row, k) => row.forEach((m, i) => {
      const a = (k / 6) * Math.PI * 2;
      m.position.x = Math.cos(a) * 0.2 + Math.sin(t * 2.4 + i * 0.6 + k) * 0.05 * (i + 1) * 0.5;
      m.position.z = Math.sin(a) * 0.2 + Math.cos(t * 2 + i * 0.6 + k) * 0.04 * (i + 1) * 0.5;
    }));
    g.scale.y = 1 + Math.sin(t * 2.6) * 0.04;
    g.userData.bob = 0.2 + Math.sin(t * 1.8) * 0.1;
  });
}

// ---- Pests: creatures of gloom that find fires nobody has fed for a long time --------------------
// Dark and cold, with bright eyes. They are not in the collection and never stand on a fire.

export type PestId = 'gloom' | 'chill' | 'gnaw' | 'smoke';
export const PEST_IDS: PestId[] = ['gloom', 'chill', 'gnaw', 'smoke'];
export const PEST_NAMES: Record<PestId, string> = { gloom: 'Gloom', chill: 'Chill', gnaw: 'Gnaw', smoke: 'Smoke' };
const NIGHT = ['#B5ADFF', '#8077E8', '#5B52BC', '#3F3884', '#2B2570'];
const FROST = ['#EAF4FF', '#A9D4FF', '#5F95E8', '#34609F', '#243F70'];

function gloom(): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.3), 0, 0.36, 0, 1, 1.05, 0.95);
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) tail.push(b.add(g, sph(0.2 - i * 0.04), 0, 0.12 - i * 0.02, -0.2 - i * 0.14));
  b.eye(g, 0.085, -0.11, 0.44, 0.24, true); b.eye(g, 0.085, 0.11, 0.44, 0.24, true);
  b.eye(g, 0.04, -0.11, 0.44, 0.31); b.eye(g, 0.04, 0.11, 0.44, 0.31);
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const a = b.pivot(g, side * 0.27, 0.34, 0.05);
    b.add(a, cone(0.05, 0.3), side * 0.12, -0.1, 0, 1, 1, 1, 0, 0, side * 2.2);
    arms.push(a);
  }
  return b.finish(NIGHT, (t) => {
    tail.forEach((m, i) => { m.position.x = Math.sin(t * 3 + i) * 0.06 * (i + 1); });
    arms[0].rotation.z = Math.sin(t * 5) * 0.4; arms[1].rotation.z = -Math.sin(t * 5 + 1) * 0.4;
    g.userData.bob = Math.sin(t * 2.4) * 0.04;
  });
}

function chill(): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.24), 0, 0.34, 0, 1, 1.15, 1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.add(g, cone(0.055, 0.26), Math.cos(a) * 0.2, 0.42 + (i % 3) * 0.08, Math.sin(a) * 0.2 - 0.04, 1, 1, 1, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
  }
  b.add(g, cone(0.08, 0.32), 0, 0.62, 0);
  b.eye(g, 0.06, -0.09, 0.4, 0.2, true); b.eye(g, 0.06, 0.09, 0.4, 0.2, true);
  b.eye(g, 0.028, -0.09, 0.4, 0.25); b.eye(g, 0.028, 0.09, 0.4, 0.25);
  const legs: THREE.Mesh[] = [];
  for (const x of [-0.1, 0.1]) legs.push(b.add(g, cone(0.07, 0.2), x, 0, 0.04, 1, 1, 1, Math.PI));
  return b.finish(FROST, (t) => {
    legs[0].rotation.x = Math.PI + Math.sin(t * 6) * 0.3; legs[1].rotation.x = Math.PI - Math.sin(t * 6) * 0.3;
    g.userData.bob = Math.abs(Math.sin(t * 4)) * 0.05;
    g.rotation.z = Math.sin(t * 2) * 0.05;
  });
}

function gnaw(): Creature {
  const b = new Builder();
  const g = b.group;
  b.add(g, sph(0.2), 0, 0.26, -0.04, 0.95, 0.9, 1.5);
  const head = b.pivot(g, 0, 0.3, 0.26);
  b.add(head, sph(0.13), 0, 0, 0, 1, 0.95, 1.1);
  b.add(head, cone(0.07, 0.22), 0, -0.03, 0.1, 1, 1, 1, Math.PI / 2);
  b.add(head, sph(0.075), -0.1, 0.12, -0.03, 1, 1, 0.4); b.add(head, sph(0.075), 0.1, 0.12, -0.03, 1, 1, 0.4);
  b.eye(head, 0.04, -0.06, 0.04, 0.1, true); b.eye(head, 0.04, 0.06, 0.04, 0.1, true);
  b.eye(head, 0.02, -0.06, 0.04, 0.135); b.eye(head, 0.02, 0.06, 0.04, 0.135);
  for (const [x, z] of [[-0.09, 0.14], [0.09, 0.14], [-0.09, -0.16], [0.09, -0.16]]) b.add(g, cone(0.05, 0.16), x, 0.14, z, 1, 1, 1, Math.PI);
  const tail: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) tail.push(b.add(g, sph(0.035 - i * 0.002), 0, 0.22 - i * 0.01, -0.3 - i * 0.1));
  return b.finish(NIGHT, (t) => {
    head.rotation.y = Math.sin(t * 2.2) * 0.4; head.rotation.x = Math.sin(t * 7) * 0.08;
    tail.forEach((m, i) => { m.position.x = Math.sin(t * 4 + i * 0.7) * 0.05 * (i + 1) * 0.6; });
    g.userData.bob = Math.abs(Math.sin(t * 5)) * 0.03;
  });
}

function smoke(): Creature {
  const b = new Builder();
  const g = b.group;
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) puffs.push(b.add(g, sph(0.26 - i * 0.035), 0, 0.2 + i * 0.17, 0));
  b.eye(g, 0.07, -0.1, 0.78, 0.15, true); b.eye(g, 0.07, 0.1, 0.78, 0.15, true);
  b.eye(g, 0.032, -0.1, 0.78, 0.21); b.eye(g, 0.032, 0.1, 0.78, 0.21);
  return b.finish(NIGHT, (t) => {
    puffs.forEach((m, i) => { m.position.x = Math.sin(t * 2.2 + i * 0.9) * 0.07 * (i + 1) * 0.5; m.position.z = Math.cos(t * 1.8 + i) * 0.04; });
    g.userData.bob = Math.sin(t * 1.6) * 0.05;
  });
}

const PEST_BUILDERS: Record<PestId, () => Creature> = { gloom, chill, gnaw, smoke };
export const buildPest = (id: PestId): Creature => PEST_BUILDERS[id]();
export const pestFor = (areaId: string): PestId => PEST_IDS[Math.abs([...areaId].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)) % PEST_IDS.length];

const BUILDERS: Record<CreatureId, (ramp: string[]) => Creature> = { phoenix, fox, dragon, salamander, imp, owl, wolf, cat, rabbit, serpent, bear, turtle, stag, spirit, bat, frog, penguin, octopus, butterfly, dino, unicorn, jelly };

export function buildCreature(id: CreatureId, ramp: string[]): Creature {
  return BUILDERS[id](ramp);
}

/** A stable pick per area, so the same area keeps the same creature. */
export function autoCreature(areaId: string, pool: CreatureId[] = CREATURE_IDS): CreatureId {
  // FNV-1a with a final mix, so short names that differ by a letter still land on different creatures
  let h = 2166136261;
  for (let i = 0; i < areaId.length; i++) { h ^= areaId.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return pool[(h >>> 0) % pool.length];
}
