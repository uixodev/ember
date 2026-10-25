import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTier, type TierDecor } from './tiers';
import type { Tier } from './mastery';
import { buildCreature, autoCreature, type Creature, type CreatureId } from './creatures';
import { flameGeometry, type FlameShape } from './flame';
import { PALETTES, type PaletteId } from './palettes';
import { Particles } from './particles';
import { buildStick, makeWoodMaterials, STICKS, type StickKind, type StickObj, type WoodMaterials } from './sticks';
import * as TX from './textures';

export type Level = 0 | 1 | 2 | 3;
export type Size = 1 | 2 | 3 | 4;

/** How the flames look and move. */
export type FireStyle = 'camp' | 'inferno' | 'torch' | 'swirl' | 'wisp' | 'candle' | 'crystal';
export const FIRE_STYLES: { id: FireStyle; name: string }[] = [
  { id: 'camp', name: 'Campfire' }, { id: 'inferno', name: 'Inferno' }, { id: 'torch', name: 'Torch' }, { id: 'swirl', name: 'Swirl' },
  { id: 'wisp', name: 'Wisps' }, { id: 'candle', name: 'Candle' }, { id: 'crystal', name: 'Crystal' },
];

export interface FireSpec {
  id: string; level: Level; progress: number; size: Size; color: PaletteId; style: FireStyle;
  /** The fire creature that stands on a Hot fire: a kind, "auto" for a stable pick, or "none". */
  creature: CreatureId | 'auto' | 'none';
  /** Where the fire sits on the ground. Left out, it takes the next free spot in the grid. */
  pos?: { x: number; z: number };
  /** Mastery design, 1 to 7. */
  tier?: Tier;
}
export interface LabelPos {
  id: string; x: number; y: number; depth: number; visible: boolean;
  /** Screen point straight above the middle of the fire, for things that float over it. */
  ax: number; ay: number;
}
export interface CameraView { azimuth: number; polar: number; distance?: number }

export interface DragState {
  dragging: boolean;
  kind?: StickKind;
  /** The fire the stick is over, if any. */
  overFire?: string | null;
  /** Finger position relative to the canvas, in pixels. */
  x: number;
  y: number;
}

export interface WorldOptions {
  onFrame: (labels: LabelPos[]) => void;
  onSelectFire: (id: string | null) => void;
  /** A stick was let go over a fire: ask what you did. */
  onDrop: (fireId: string, kind: StickKind, stickId: number) => void;
  onDrag: (s: DragState) => void;
  onInteract?: () => void;
  /** A fire was carried to a new spot (move mode). */
  /** A fire was pressed and held without moving: where on the canvas, in pixels. */
  onFireHold?: (id: string, x: number, y: number) => void;
  onFireMoved?: (id: string, x: number, z: number) => void;
  reducedMotion: boolean;
}

const FIRE_SCALE: Record<Size, number> = { 1: 0.78, 2: 0.92, 3: 1.08, 4: 1.28 };
const FLAME_LEVEL: Record<Level, number> = { 3: 1, 2: 0.6, 1: 0.16, 0: 0 };
const COAL_GLOW: Record<Level, number> = { 3: 1.1, 2: 0.75, 1: 1.45, 0: 0 };
const HOVER_HEIGHT = 0.95;
const GX = 3.5;
const GZ = 3.2;
const SPARKS_PER = 12;
const SNOW_PER = 34;
const MAX_FIRES = 12;
const DECOR_KINDS: StickKind[] = ['branch', 'kindling', 'log', 'split', 'branch', 'kindling'];

const rngOf = (seed: number) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/** Fire slots, the most central first, so the main area gets the middle. */
export function layoutFires(n: number): { x: number; z: number }[] {
  if (n === 0) return [];
  const cols = n <= 3 ? n : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const slots: { x: number; z: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = r < rows - 1 ? cols : n - (rows - 1) * cols;
    for (let c = 0; c < inRow; c++) slots.push({ x: (c - (inRow - 1) / 2) * GX, z: (r - (rows - 1) / 2) * GZ });
  }
  return slots.sort((a, b) => Math.hypot(a.x, a.z * 1.2) - Math.hypot(b.x, b.z * 1.2));
}

interface Tongue { mesh: THREE.Mesh; shape: FlameShape; baseW: number; baseH: number; phase: number; speed: number; need: number; x: number; z: number; orbitR: number; orbitA: number; hover: number }

interface FireObj {
  id: string; spec: FireSpec; group: THREE.Group; scale: number; pos: THREE.Vector3;
  tongues: Tongue[]; coals: THREE.Mesh[]; stones: THREE.Mesh[]; hotPool: THREE.Mesh; coldPool: THREE.Mesh; ring: THREE.Mesh; hit: THREE.Mesh; ash: THREE.Mesh;
  shownF: number; shownCoal: number; shownCold: number; flare: number; excite: number; index: number;
  paintedLevel: Level | null; paintedColor: PaletteId | null;
  tier: Tier; decor: TierDecor | null;
  flames: THREE.Group; creature: { id: CreatureId; obj: Creature } | null; creatureShown: number; facing: number;
}

type Anim =
  | { kind: 'return'; t: number; dur: number; from: THREE.Vector3; yaw0: number }
  | { kind: 'fly'; t: number; dur: number; from: THREE.Vector3; fireId: string }
  | { kind: 'burn'; t: number; dur: number; fireId: string }
  | { kind: 'vanish'; t: number; dur: number; from: THREE.Vector3 };

interface StickRun { obj: StickObj; state: 'drag' | 'hold' | 'anim'; anim: Anim | null; target: THREE.Vector3; tilt: number; fireId?: string; burnMats?: THREE.MeshStandardMaterial[] }

export class CampfireWorld {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly fires = new Map<string, FireObj>();
  private readonly sticks = new Map<number, StickRun>();
  private readonly flameGeos = new Map<string, THREE.BufferGeometry>();
  private creaturesAlways = false;
  private readonly poolTex = new Map<PaletteId, THREE.CanvasTexture>();
  private coldTex!: THREE.CanvasTexture;
  private readonly flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  private readonly wood: WoodMaterials;
  private readonly stoneMats: THREE.MeshStandardMaterial[];
  private readonly frostMats: THREE.MeshStandardMaterial[];
  private readonly coalGeo = new THREE.IcosahedronGeometry(0.17, 0);
  private readonly stoneGeo = new THREE.IcosahedronGeometry(0.28, 1);
  private readonly discGeo = new THREE.CircleGeometry(2.3, 36);
  private readonly ringGeo = new THREE.RingGeometry(1.32, 1.5, 48);
  private readonly hitGeo = new THREE.CylinderGeometry(1.25, 1.25, 2.4, 10);
  private readonly ashGeo = new THREE.SphereGeometry(0.8, 16, 8);
  private readonly ground: THREE.Mesh;
  private readonly light = new THREE.PointLight(0xff9a2e, 0, 9, 1.2);
  private readonly sparks: Particles;
  private readonly burst: Particles;
  private readonly flies: Particles;
  private readonly snow: Particles;
  private readonly sparkLife = new Float32Array(MAX_FIRES * SPARKS_PER);
  private readonly sparkVel = new Float32Array(MAX_FIRES * SPARKS_PER * 3);
  private readonly burstLife = new Float32Array(90);
  private readonly burstVel = new Float32Array(90 * 3);
  private readonly disposables: { dispose: () => void }[] = [];
  private readonly textures: THREE.Texture[] = [];
  private nextStickId = 1;
  private extent = 5;
  private depth = 4;
  private center = new THREE.Vector3(0, 0.6, 0);
  private drag: { run: StickRun; pointer: number } | null = null;
  private hover: string | null = null;
  private selected: string | null = null;
  private showAll = false;
  private down = { x: 0, y: 0, t: 0 };
  private fly: { from: CameraView & { distance: number }; to: CameraView & { distance: number }; t: number } | null = null;
  private baseDistance = 11;
  private raf = 0;
  private last = performance.now();
  private elapsed = 0;
  private running = true;
  private visible = true;
  private width = 1;
  private height = 1;
  private lightTarget = new THREE.Vector3();
  private insetTop = 0;
  private insetBottom = 0;
  private targetTop = 0;
  private targetBottom = 0;
  private lastOffset = NaN;
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly opts: WorldOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.wood = makeWoodMaterials();
    const dot = TX.dotSprite();
    const glow = TX.glowSprite();
    const flake = TX.flakeSprite();
    const ground = TX.groundTexture();
    this.coldTex = this.makePool(['#7FB4F5', '#3F63C8', '#2C3C9A']);
    this.textures.push(this.wood.bark, this.wood.endGrain, this.wood.inner, dot, glow, flake, ground, this.coldTex);

    this.stoneMats = [0x8f88ec, 0x7d76df, 0xa59ff2].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
    this.frostMats = [0xaebbe8, 0x9aa9dc, 0xc4cff2].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true }));
    this.disposables.push(...this.stoneMats, ...this.frostMats, this.flameMat, this.coalGeo, this.stoneGeo, this.discGeo, this.ringGeo, this.hitGeo, this.ashGeo);

    this.scene.add(new THREE.HemisphereLight(0xcfc9ff, 0x2c2266, 1.05));
    const sun = new THREE.DirectionalLight(0xdad5ff, 0.7);
    sun.position.set(-4, 8, 6);
    this.scene.add(sun, this.light);

    this.ground = new THREE.Mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshBasicMaterial({ map: ground, transparent: true, depthWrite: false }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

    this.sparks = new Particles(MAX_FIRES * SPARKS_PER, dot);
    this.burst = new Particles(90, dot);
    this.flies = new Particles(14, glow);
    this.snow = new Particles(MAX_FIRES * SNOW_PER, flake);
    for (const p of [this.sparks, this.burst, this.flies, this.snow]) this.scene.add(p.points);
    this.disposables.push(this.sparks, this.burst, this.flies, this.snow);
    const fly = new THREE.Color('#FFE98A');
    for (let i = 0; i < this.flies.count; i++) { this.flies.size[i] = 0.4; this.flies.setColor(i, fly); }

    this.camera.position.set(0, 6, 11);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointercancel', this.onUp);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(this.center);
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.75;
    this.controls.zoomSpeed = 0.8;
    this.controls.minPolarAngle = 0.22;
    this.controls.maxPolarAngle = 1.42;
    this.controls.autoRotate = false;
    this.controls.addEventListener('start', () => this.interacted());

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
    this.io.observe(canvas);
    document.addEventListener('visibilitychange', this.onVis);
    this.resize();
    this.loop();
  }

  // ---- palettes --------------------------------------------------------------------------------

  private makePool(stops: string[]): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, stops[0]);
    gr.addColorStop(0.3, stops[1]);
    gr.addColorStop(0.62, stops[2]);
    gr.addColorStop(1, 'rgba(44,34,102,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private flameFor(id: PaletteId, shape: FlameShape = 'round'): THREE.BufferGeometry {
    const key = `${id}:${shape}`;
    let g = this.flameGeos.get(key);
    if (!g) { g = flameGeometry(PALETTES[id].ramp, shape); this.flameGeos.set(key, g); this.disposables.push(g); }
    return g;
  }

  private poolFor(id: PaletteId): THREE.CanvasTexture {
    let t = this.poolTex.get(id);
    if (!t) { t = this.makePool(PALETTES[id].pool); this.poolTex.set(id, t); this.textures.push(t); }
    return t;
  }

  /** Apply a fire's colour: flames, coals and the glow on the ground. */
  private paint(f: FireObj, id: PaletteId): void {
    f.tongues.forEach((t) => { t.mesh.geometry = this.flameFor(id, t.shape); });
    this.dropCreature(f);
    f.coals.forEach((c) => (c.material as THREE.MeshStandardMaterial).emissive.setHex(PALETTES[id].coal));
    const mat = f.hotPool.material as THREE.MeshBasicMaterial;
    mat.map = this.poolFor(id);
    mat.needsUpdate = true;
    f.paintedColor = id;
  }

  // ---- building -------------------------------------------------------------------------------

  /** Where the flames of each style stand, and how big they are. */
  private tonguePlan(style: FireStyle, r: () => number): { x: number; z: number; w: number; h: number; shape: FlameShape; speed?: number; orbitR?: number; orbitA?: number; hover?: number }[] {
    const out: { x: number; z: number; w: number; h: number; shape: FlameShape; speed?: number; orbitR?: number; orbitA?: number; hover?: number }[] = [];
    const ring = (count: number, radius: number, minH: number, maxH: number, wMul: number, shape: FlameShape = 'round', speed?: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r();
        const h = minH + r() * (maxH - minH);
        out.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius, w: (0.34 + (h / 1.6) * 0.26 + r() * 0.08) * wMul, h, shape, speed });
      }
    };
    if (style === 'camp') { ring(1, 0, 1.35, 1.55, 1); ring(4, 0.2, 0.85, 1.25, 1); ring(6, 0.4, 0.45, 0.8, 1); }
    else if (style === 'inferno') { ring(1, 0, 1.9, 2.2, 1.25); ring(6, 0.3, 1.3, 1.8, 1.2); ring(9, 0.58, 0.8, 1.3, 1.15); ring(8, 0.82, 0.45, 0.8, 1.1); }
    else if (style === 'torch') { ring(1, 0, 2.2, 2.4, 0.62, 'slim', 3); ring(3, 0.1, 1.5, 2, 0.6, 'slim', 3.4); ring(4, 0.2, 0.9, 1.3, 0.55, 'slim', 3.8); }
    else if (style === 'crystal') { ring(1, 0, 1.5, 1.7, 0.95, 'crystal', 0.9); ring(5, 0.28, 0.9, 1.4, 0.9, 'crystal', 1); ring(7, 0.55, 0.5, 0.9, 0.85, 'crystal', 1.1); }
    else if (style === 'swirl') {
      for (let i = 0; i < 15; i++) {
        const a = i * 0.72;
        const rad = 0.06 + i * 0.034;
        out.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, w: 0.42 - i * 0.012, h: 1.75 - i * 0.075, shape: 'round', speed: 2.4 });
      }
    } else if (style === 'candle') {
      out.push({ x: 0, z: 0, w: 0.5, h: 1.55, shape: 'slim', speed: 1.3 });
      out.push({ x: 0, z: 0, w: 0.3, h: 0.9, shape: 'core', speed: 1.6 });
    } else {
      // wisps: small flames that float and drift around above the coals
      for (let i = 0; i < 8; i++) out.push({ x: 0, z: 0, w: 0.26 + r() * 0.08, h: 0.5 + r() * 0.3, shape: 'slim', speed: 1.4 + r(), orbitR: 0.28 + r() * 0.5, orbitA: r() * 6.28, hover: 0.5 + r() * 0.9 });
    }
    return out;
  }

  private buildFire(spec: FireSpec, index: number): FireObj {
    const r = rngOf(100 + index * 17);
    const group = new THREE.Group();
    const scale = FIRE_SCALE[spec.size];
    group.scale.setScalar(scale);
    const stones: THREE.Mesh[] = [];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.2;
      const m = new THREE.Mesh(this.stoneGeo, this.stoneMats[i % 3]);
      m.position.set(Math.cos(a) * 0.98, 0.1, Math.sin(a) * 0.98);
      m.scale.set(1.15, 0.64, 0.95 + r() * 0.25);
      m.rotation.y = r() * 6;
      group.add(m);
      stones.push(m);
    }
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x2a1820, roughness: 1 });
    this.disposables.push(ashMat);
    const ash = new THREE.Mesh(this.ashGeo, ashMat);
    ash.scale.set(1, 0.16, 1);
    ash.position.y = 0.06;
    group.add(ash);

    const coals: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const cm = new THREE.MeshStandardMaterial({ color: 0x4a2420, emissive: 0xff7a2e, emissiveIntensity: 0, roughness: 0.8 });
      this.disposables.push(cm);
      const m = new THREE.Mesh(this.coalGeo, cm);
      const a = (i / 7) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.36, 0.12, Math.sin(a) * 0.36);
      m.scale.set(1.2, 0.7, 1);
      m.rotation.set(r(), r() * 6, r());
      group.add(m);
      coals.push(m);
    }

    const tongues: Tongue[] = [];
    const fireGroup = new THREE.Group();
    fireGroup.position.y = 0.14;
    group.add(fireGroup);
    const plan = this.tonguePlan(spec.style, r);
    plan.forEach((p, n) => {
      const m = new THREE.Mesh(this.flameFor(spec.color, p.shape), this.flameMat);
      m.position.set(p.x, 0, p.z);
      fireGroup.add(m);
      tongues.push({ mesh: m, shape: p.shape, baseW: p.w, baseH: p.h, phase: r() * 10, speed: p.speed ?? 1.6 + r() * 1.6, need: n / plan.length, x: p.x, z: p.z, orbitR: p.orbitR ?? 0, orbitA: p.orbitA ?? 0, hover: p.hover ?? 0 });
    });

    const hotPool = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ map: this.poolFor(spec.color), transparent: true, depthWrite: false, opacity: 0 }));
    const coldPool = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ map: this.coldTex, transparent: true, depthWrite: false, opacity: 0 }));
    for (const p of [hotPool, coldPool]) { p.rotation.x = -Math.PI / 2; p.position.y = 0.02; group.add(p); this.disposables.push(p.material as THREE.Material); }

    const ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    group.add(ring);
    this.disposables.push(ring.material as THREE.Material);

    const hit = new THREE.Mesh(this.hitGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    hit.position.y = 1.1;
    hit.userData.fireId = spec.id;
    group.add(hit);
    this.disposables.push(hit.material as THREE.Material);

    // a few pieces of wood lying about, for scenery only
    const placed = 2 + (index % 2);
    for (let i = 0; i < placed; i++) {
      const kind = DECOR_KINDS[(index * 2 + i) % DECOR_KINDS.length];
      const stick = buildStick(-1 - index * 10 - i, kind, this.wood, 40 + index * 7 + i);
      const a = Math.PI * (0.62 + 0.55 * i) + r() * 0.5 + (index % 3) * 0.7;
      const d = 1.75 + r() * 0.35;
      stick.group.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      stick.group.rotation.y = a + Math.PI / 2 + (r() - 0.5) * 0.9;
      stick.group.scale.setScalar(0.8);
      stick.hit.visible = false;
      stick.shadow.position.set(stick.group.position.x, 0.015, stick.group.position.z);
      stick.shadow.rotation.z = -stick.group.rotation.y;
      stick.shadow.scale.multiplyScalar(0.8);
      group.add(stick.group, stick.shadow);
      this.disposables.push({ dispose: () => stick.mats.forEach((m) => m.dispose()) });
    }

    this.scene.add(group);
    return { id: spec.id, spec, group, scale, flames: fireGroup, creature: null, creatureShown: 0, facing: 0, pos: new THREE.Vector3(), tongues, coals, stones, hotPool, coldPool, ring, hit, ash, shownF: FLAME_LEVEL[spec.level], shownCoal: COAL_GLOW[spec.level], shownCold: spec.level === 0 ? 1 : 0, flare: 0, excite: 0, index, paintedLevel: null, paintedColor: spec.color, tier: 1, decor: null };
  }

  /** Create, update and arrange one campfire per area. */
  setFires(specs: FireSpec[]): void {
    const capped = specs.slice(0, MAX_FIRES);
    const ids = new Set(capped.map((s) => s.id));
    for (const [id, f] of this.fires) if (!ids.has(id)) { this.dropCreature(f); f.decor?.dispose(); this.scene.remove(f.group); this.fires.delete(id); }
    const slots = layoutFires(capped.length);
    capped.forEach((spec, i) => {
      let f = this.fires.get(spec.id);
      if (f && (f.spec.size !== spec.size || f.spec.style !== spec.style)) { this.dropCreature(f); f.decor?.dispose(); this.scene.remove(f.group); f = undefined; }
      if (!f) { f = this.buildFire(spec, i); this.fires.set(spec.id, f); }
      f.spec = spec;
      f.index = i;
      this.applyTier(f, spec.tier ?? 1);
      f.pos.set(spec.pos?.x ?? slots[i].x, 0, spec.pos?.z ?? slots[i].z);
      f.group.position.copy(f.pos);
      if (f.paintedColor !== spec.color) this.paint(f, spec.color);
      if (f.paintedLevel !== spec.level) {
        const cold = spec.level === 0;
        f.stones.forEach((m, k) => { m.material = (cold ? this.frostMats : this.stoneMats)[k % 3]; });
        (f.ash.material as THREE.MeshStandardMaterial).color.set(cold ? 0x4a5384 : 0x2a1820);
        f.paintedLevel = spec.level;
      }
    });
    if (this.sigOf() !== this.fitSig) this.refit();
  }

  private fitSig = '';
  private sigOf(): string { return [...this.fires.values()].map((f) => `${f.id}:${f.pos.x.toFixed(2)},${f.pos.z.toFixed(2)}`).join('|'); }

  private applyTier(f: FireObj, tier: Tier): void {
    if (f.tier === tier && (f.decor || tier === 1)) return;
    if (f.decor) { f.group.remove(f.decor.group); f.decor.dispose(); f.decor = null; }
    f.tier = tier;
    if (tier > 1) { f.decor = buildTier(tier); f.group.add(f.decor.group); }
  }

  /** Frame the camera around wherever the fires are now. */
  private refit(keepTarget = false): void {
    this.fitSig = this.sigOf();
    let maxX = 2.8, minZ = -2.4, maxZ = 2.4;
    for (const f of this.fires.values()) { maxX = Math.max(maxX, Math.abs(f.pos.x) + 2.7); minZ = Math.min(minZ, f.pos.z - 2.4); maxZ = Math.max(maxZ, f.pos.z + 2.4); }
    this.extent = maxX;
    this.depth = (maxZ - minZ) / 2 + 0.8;
    this.center.set(0, 0.6, (minZ + maxZ) / 2);
    if (!keepTarget) this.controls.target.copy(this.center);
    this.ground.scale.setScalar(Math.max(this.extent, this.depth) + 3.2);
    this.ground.position.set(0, 0, this.center.z);
    this.resize();
  }

  // ---- moving fires -----------------------------------------------------------------------------

  private moveMode = false;
  private fireDrag: { id: string; pointer: number; dx: number; dz: number } | null = null;

  private focusTarget: THREE.Vector3 | null = null;

  /** Glide the camera in close to one fire. */
  focusFire(id: string): void {
    const f = this.fires.get(id);
    if (!f) return;
    this.focusTarget = new THREE.Vector3(f.pos.x, 0.7, f.pos.z);
    const from = this.current();
    this.controls.autoRotate = false;
    this.fly = { from, to: { azimuth: from.azimuth, polar: 1.0, distance: Math.max(this.controls.minDistance, this.baseDistance * 0.5) }, t: 0 };
  }

  /** While on, dragging a fire carries it across the ground instead of turning the camera. */
  setMoveMode(on: boolean): void { this.moveMode = on; }

  private groundAt(clientX: number, clientY: number): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.ndcAt(clientX, clientY), this.camera);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit) ? hit : null;
  }

  private lastPointer = { x: 0, y: 0 };
  private onMove = (e: PointerEvent) => {
    this.lastPointer = { x: e.clientX, y: e.clientY };
    const d = this.fireDrag;
    if (!d || e.pointerId !== d.pointer) return;
    const f = this.fires.get(d.id);
    const g = this.groundAt(e.clientX, e.clientY);
    if (!f || !g) return;
    let x = Math.max(-14, Math.min(14, g.x + d.dx));
    let z = Math.max(-14, Math.min(14, g.z + d.dz));
    for (const o of this.fires.values()) {
      if (o === f) continue;
      const gap = 3.1, dist = Math.hypot(x - o.pos.x, z - o.pos.z);
      if (dist < gap) { const k = dist > 1e-3 ? gap / dist : 1; x = o.pos.x + (x - o.pos.x) * k; z = o.pos.z + (z - o.pos.z) * k; if (dist <= 1e-3) x += gap; }
    }
    f.pos.set(x, 0, z);
    f.group.position.set(x, 0.22, z);
  };

  private endFireDrag(): void {
    const d = this.fireDrag;
    if (!d) return;
    this.fireDrag = null;
    this.controls.enabled = true;
    const f = this.fires.get(d.id);
    if (!f) return;
    f.group.position.set(f.pos.x, 0, f.pos.z);
    this.opts.onFireMoved?.(d.id, f.pos.x, f.pos.z);
    this.refit(true);
  }

  // ---- public controls ------------------------------------------------------------------------

  /** Space covered by controls at the top and bottom, so the fires sit in the free middle. */
  setInsets(top: number, bottom: number): void { this.targetTop = top; this.targetBottom = bottom; }

  private applyOffset(force = false): void {
    const y = (this.insetBottom - this.insetTop) / 2;
    if (!force && Math.abs(y - this.lastOffset) < 0.3) return;
    this.lastOffset = y;
    this.camera.setViewOffset(this.width, this.height, 0, y, this.width, this.height);
  }

  setSelected(id: string | null): void { this.selected = id; }
  /** Show a creature on every lit fire, not only the Hot ones (to preview them). */
  setCreaturesAlways(on: boolean): void { this.creaturesAlways = on; }
  setShowAllNames(on: boolean): void { this.showAll = on; }
  setAutoRotate(on: boolean): void { this.controls.autoRotate = on && !this.opts.reducedMotion; }

  /** The fire swells and throws sparks, in its own colours. */
  flare(fireId: string): void {
    const f = this.fires.get(fireId);
    if (!f) return;
    f.flare = 1;
    const r = Math.random;
    const colors = PALETTES[f.spec.color].sparks.map((c) => new THREE.Color(c));
    for (let i = 0; i < this.burst.count; i++) {
      this.burstLife[i] = 0.8 + r() * 1.0;
      this.burst.pos.set([f.pos.x + (r() - 0.5) * 0.5, 0.7, f.pos.z + (r() - 0.5) * 0.5], i * 3);
      this.burstVel.set([(r() - 0.5) * 2.2, 2 + r() * 2.8, (r() - 0.5) * 2.2], i * 3);
      this.burst.size[i] = 0.07 + r() * 0.1;
      this.burst.setColor(i, colors[i % 3]);
    }
  }

  /** The held stick flies into its fire and burns away. */
  consumeStick(stickId: number): void {
    const run = this.sticks.get(stickId);
    if (!run || !run.fireId) return;
    run.state = 'anim';
    run.anim = { kind: 'fly', t: 0, dur: 0.38, from: run.obj.group.position.clone(), fireId: run.fireId };
  }

  /** Nothing was logged: the stick fades away, back into the inventory. */
  returnStick(stickId: number): void {
    const run = this.sticks.get(stickId);
    if (!run) return;
    this.hover = null;
    run.state = 'anim';
    run.anim = { kind: 'vanish', t: 0, dur: 0.38, from: run.obj.group.position.clone() };
  }

  flyTo(view: CameraView): void {
    this.focusTarget = null;
    const from = this.current();
    let d = view.azimuth - from.azimuth;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.fly = { from, to: { azimuth: from.azimuth + d, polar: view.polar, distance: view.distance ?? this.baseDistance }, t: 0 };
    this.controls.autoRotate = false;
  }

  /** Little pictures of each kind of wood, for the inventory. */
  renderIcons(): Partial<Record<StickKind, string>> {
    const out: Partial<Record<StickKind, string>> = {};
    const W = 220;
    const H = 130;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5fd0, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-2, 4, 3);
    scene.add(key);
    const cam = new THREE.OrthographicCamera(-1.35, 1.35, 0.8, -0.8, 0.1, 20);
    cam.position.set(0, 3.2, 3.4);
    cam.lookAt(0, 0.2, 0);
    const buf = new Uint8Array(W * H * 4);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d')!;
    const prevTarget = this.renderer.getRenderTarget();
    try {
      for (const kind of Object.keys(STICKS) as StickKind[]) {
        const s = buildStick(-999, kind, this.wood, 7);
        s.group.children.forEach((c) => { if (c !== s.hit) c.position.x += 0; });
        s.hit.visible = false;
        const scale = Math.min(2.4 / s.length, 1.25);
        s.group.scale.setScalar(scale);
        s.group.rotation.y = -0.45;
        s.group.position.set(0, -0.02, 0);
        scene.add(s.group);
        this.renderer.setRenderTarget(rt);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear();
        this.renderer.render(scene, cam);
        this.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
        const img = g.createImageData(W, H);
        for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
        g.clearRect(0, 0, W, H);
        g.putImageData(img, 0, 0);
        out[kind] = canvas.toDataURL('image/png');
        scene.remove(s.group);
        s.mats.forEach((m) => m.dispose());
      }
    } catch {
      /* icons are a nicety: the inventory falls back to plain shapes */
    } finally {
      this.renderer.setRenderTarget(prevTarget);
      rt.dispose();
    }
    return out;
  }

  private current(): CameraView & { distance: number } {
    return { azimuth: this.controls.getAzimuthalAngle(), polar: this.controls.getPolarAngle(), distance: this.camera.position.distanceTo(this.controls.target) };
  }

  private place(v: CameraView & { distance: number }): void {
    const t = this.controls.target;
    this.camera.position.set(t.x + v.distance * Math.sin(v.polar) * Math.sin(v.azimuth), t.y + v.distance * Math.cos(v.polar), t.z + v.distance * Math.sin(v.polar) * Math.cos(v.azimuth));
  }

  private interacted(): void { this.opts.onInteract?.(); this.fly = null; this.focusTarget = null; this.controls.autoRotate = false; }

  // ---- dragging wood out of the inventory ------------------------------------------------------

  private ndcAt(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    // below the picture (over the inventory) the wood stays just inside the bottom edge
    const y = Math.max(-0.86, -((clientY - rect.top) / rect.height) * 2 + 1);
    return new THREE.Vector2(Math.max(-0.95, Math.min(0.95, ((clientX - rect.left) / rect.width) * 2 - 1)), y);
  }

  /** Pick a piece of wood up from the inventory. */
  beginTrayDrag(kind: StickKind, clientX: number, clientY: number, pointer: number): void {
    if (this.drag) return;
    const id = this.nextStickId++;
    const obj = buildStick(id, kind, this.wood, id * 31 + 7);
    obj.shadow.visible = true;
    this.scene.add(obj.group, obj.shadow);
    const run: StickRun = { obj, state: 'drag', anim: null, target: new THREE.Vector3(), tilt: 0 };
    this.sticks.set(id, run);
    obj.group.scale.setScalar(0.35);
    obj.group.rotation.y = -0.5;
    this.drag = { run, pointer };
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.fly = null;
    this.opts.onInteract?.();
    this.moveTrayDrag(clientX, clientY, true);
  }

  moveTrayDrag(clientX: number, clientY: number, snap = false): void {
    if (!this.drag) return;
    this.raycaster.setFromCamera(this.ndcAt(clientX, clientY), this.camera);
    const hit = new THREE.Vector3();
    const run = this.drag.run;
    if (this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -HOVER_HEIGHT), hit)) {
      const lim = Math.max(this.extent, this.depth) + 2.5;
      run.target.set(Math.max(-lim, Math.min(lim, hit.x)), HOVER_HEIGHT, Math.max(this.center.z - lim, Math.min(this.center.z + lim, hit.z)));
      if (snap) run.obj.group.position.copy(run.target);
    }
    let over: string | null = null;
    let best = Infinity;
    for (const f of this.fires.values()) {
      const d = Math.hypot(run.target.x - f.pos.x, run.target.z - f.pos.z);
      if (d < 1.55 * f.scale + 0.45 && d < best) { best = d; over = f.id; }
    }
    this.hover = over;
    const rect = this.canvas.getBoundingClientRect();
    this.opts.onDrag({ dragging: true, kind: run.obj.kind, overFire: over, x: clientX - rect.left, y: clientY - rect.top });
  }

  /** Let go. Over a fire it asks what you did; anywhere else the wood goes back into the inventory. */
  endTrayDrag(drop: boolean): void {
    if (!this.drag) return;
    const { run } = this.drag;
    this.drag = null;
    this.controls.enabled = true;
    this.opts.onDrag({ dragging: false, x: 0, y: 0 });
    if (drop && this.hover) {
      run.state = 'hold';
      run.fireId = this.hover;
      this.opts.onDrop(this.hover, run.obj.kind, run.obj.id);
    } else {
      this.returnStick(run.obj.id);
    }
    this.hover = null;
  }

  // ---- taps on the scene ------------------------------------------------------------------------

  private holdTimer = 0;
  private clearHold(): void { window.clearTimeout(this.holdTimer); this.holdTimer = 0; }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (!e.isPrimary) this.clearHold();
    if (this.drag) return;
    const rect = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), this.camera);
    const hit = this.raycaster.intersectObjects([...this.fires.values()].map((f) => f.hit), false)[0];
    if (!this.moveMode) {
      this.clearHold();
      if (hit && e.isPrimary) {
        const fireId = hit.object.userData.fireId as string;
        const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        this.holdTimer = window.setTimeout(() => {
          this.holdTimer = 0;
          if (Math.hypot(this.lastPointer.x - e.clientX, this.lastPointer.y - e.clientY) < 10 && !this.drag) this.opts.onFireHold?.(fireId, sx, sy);
        }, 550);
      }
      return;
    }
    if (!hit) return;
    const id = hit.object.userData.fireId as string;
    const f = this.fires.get(id);
    const g = this.groundAt(e.clientX, e.clientY);
    if (!f || !g) return;
    this.fireDrag = { id, pointer: e.pointerId, dx: f.pos.x - g.x, dz: f.pos.z - g.z };
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.fly = null;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.opts.onSelectFire(id);
    this.opts.onInteract?.();
  };
  private onUp = (e: PointerEvent) => {
    this.clearHold();
    if (this.fireDrag) { this.endFireDrag(); return; }
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 8 || performance.now() - this.down.t > 450) return;
    const rect = this.canvas.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), this.camera);
    const hit = this.raycaster.intersectObjects([...this.fires.values()].map((f) => f.hit), false)[0];
    this.opts.onSelectFire(hit ? (hit.object.userData.fireId as string) : null);
  };
  private onVis = () => { this.running = document.visibilityState === 'visible'; };

  // ---- frame ----------------------------------------------------------------------------------

  private resize(): void {
    const box = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    this.width = Math.max(1, Math.round(box.width));
    this.height = Math.max(1, Math.round(box.height));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fit = (this.extent * 0.88) / Math.tan(hFov / 2);
    // the scene lives in the part of the screen the controls leave free
    const free = Math.max(0.4, 1 - Math.min(0.5, 300 / this.height));
    const fitV = (this.depth * 0.95) / (Math.tan(vFov / 2) * free);
    const first = this.baseDistance === 11;
    const next = Math.max(7, Math.min(fit, 40), fitV);
    const changed = Math.abs(next - this.baseDistance) > 0.01;
    this.baseDistance = next;
    this.controls.minDistance = next * 0.4;
    this.controls.maxDistance = next * 1.3;
    if (first || (changed && !this.drag)) this.place({ azimuth: this.current().azimuth || 0, polar: first ? 0.84 : this.current().polar, distance: next });
    this.camera.updateProjectionMatrix();
    this.applyOffset(true);
    const pxH = this.height * this.renderer.getPixelRatio();
    for (const p of [this.sparks, this.burst, this.flies, this.snow]) p.setScale(pxH, this.camera.fov);
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.running || !this.visible) return;
    this.elapsed += dt;
    this.insetTop = damp(this.insetTop, this.targetTop, 7, dt);
    this.insetBottom = damp(this.insetBottom, this.targetBottom, 7, dt);
    this.applyOffset();
    this.update(dt, this.elapsed);
    this.controls.update();
    // two-finger panning stays over the fires: pull the target back and carry the camera with it
    const t = this.controls.target;
    const cx = Math.max(-this.extent, Math.min(this.extent, t.x));
    const cz = Math.max(this.center.z - this.depth, Math.min(this.center.z + this.depth, t.z));
    if (cx !== t.x || cz !== t.z) { this.camera.position.x += cx - t.x; this.camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
    this.renderer.render(this.scene, this.camera);
    this.emitLabels();
  };

  private update(dt: number, t: number): void {
    const calm = this.opts.reducedMotion;
    if (this.fly) {
      this.fly.t = Math.min(1, this.fly.t + dt / 0.85);
      const k = ease(this.fly.t);
      const { from, to } = this.fly;
      this.controls.target.lerp(this.focusTarget ?? this.center, Math.min(1, dt * 6));
      this.place({ azimuth: from.azimuth + (to.azimuth - from.azimuth) * k, polar: from.polar + (to.polar - from.polar) * k, distance: from.distance + (to.distance - from.distance) * k });
      if (this.fly.t >= 1) this.fly = null;
    }
    const r = Math.random;
    let anyWarm = false;

    for (const f of this.fires.values()) {
      const lvl = f.spec.level;
      const sparkCols = PALETTES[f.spec.color].sparks.map((c) => new THREE.Color(c));
      const target = FLAME_LEVEL[lvl] * (0.82 + 0.18 * f.spec.progress);
      f.shownF = damp(f.shownF, target, 2.4, dt);
      f.shownCoal = damp(f.shownCoal, COAL_GLOW[lvl], 2.4, dt);
      f.shownCold = damp(f.shownCold, lvl === 0 ? 1 : 0, 2.2, dt);
      f.flare = Math.max(0, f.flare - dt * 1.3);
      if (f.decor && !this.opts.reducedMotion) f.decor.tick(t + f.index, Math.min(1, f.shownF * 1.2 + f.shownCoal * 0.15));
      else if (f.decor) f.decor.tick(0, Math.min(1, f.shownF));
      const over = this.hover === f.id;
      f.excite = damp(f.excite, over ? 1 : 0, 8, dt);
      const F = f.shownF;
      const boost = 1 + f.flare * 0.4 + f.excite * 0.14;
      if (F > 0.3) anyWarm = true;

      const style = f.spec.style;
      f.flames.rotation.y = calm ? 0 : style === 'swirl' ? t * 1.15 : style === 'crystal' ? t * 0.35 : 0;
      const amp = style === 'crystal' ? 0.35 : style === 'candle' ? 0.6 : 1;
      for (const tg of f.tongues) {
        const on = F * 1.18 > tg.need * 0.92;
        tg.mesh.visible = on;
        if (!on) continue;
        const k = 0.3 + 1.0 * F;
        const w = calm ? 0 : Math.sin(t * tg.speed + tg.phase) * amp;
        const w2 = calm ? 0 : Math.sin(t * tg.speed * 0.7 + tg.phase * 1.7) * amp;
        const wd = (0.62 + F * 0.5) * (1 + f.flare * 0.25);
        if (style === 'wisp') {
          const a = tg.orbitA + t * 0.55 * (0.6 + (tg.phase % 1));
          tg.mesh.position.set(Math.cos(a) * tg.orbitR, tg.hover * (0.4 + F * 0.8) + (calm ? 0 : Math.sin(t * 1.3 + tg.phase) * 0.14), Math.sin(a) * tg.orbitR);
          tg.mesh.scale.set(tg.baseW * (0.9 + 0.2 * w2) * wd, tg.baseH * (0.55 + F * 0.8) * (1 + 0.18 * w) * boost, tg.baseW * (0.9 - 0.2 * w2) * wd);
          tg.mesh.rotation.set(0.1 * w2, 0, 0.1 * w);
        } else if (style === 'swirl') {
          const ang = Math.atan2(tg.z, tg.x);
          tg.mesh.scale.set(tg.baseW * (1 + 0.08 * w2) * wd, tg.baseH * k * (1 + 0.1 * w) * boost, tg.baseW * (1 - 0.08 * w2) * wd);
          tg.mesh.rotation.set(Math.cos(ang) * 0.42, 0, Math.sin(ang) * 0.42);
        } else {
          tg.mesh.scale.set(tg.baseW * (1 + 0.1 * w2) * wd, tg.baseH * k * (1 + 0.13 * w) * boost, tg.baseW * (1 - 0.1 * w2) * wd);
          tg.mesh.rotation.z = 0.12 * w2 + tg.x * 0.12;
          tg.mesh.rotation.x = 0.1 * Math.cos(t * tg.speed * 0.8 + tg.phase) * amp - tg.z * 0.12;
        }
      }
      this.updateCreature(f, dt, t);
      f.coals.forEach((c, i) => {
        const m = c.material as THREE.MeshStandardMaterial;
        const pulse = calm ? 0.5 : Math.sin(t * (lvl === 1 ? 2.2 : 3.2) + i * 1.7) * 0.5 + 0.5;
        m.emissiveIntensity = f.shownCoal * (0.6 + 0.6 * pulse) * (1 + f.flare * 0.8);
      });
      (f.hotPool.material as THREE.MeshBasicMaterial).opacity = Math.min(1, F * 1.1 + (lvl === 1 ? 0.3 : 0));
      f.hotPool.scale.setScalar(0.7 + F * 0.5 + f.flare * 0.15);
      (f.coldPool.material as THREE.MeshBasicMaterial).opacity = f.shownCold * 0.85;
      const ringMat = f.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = over ? 0.75 + (calm ? 0 : 0.18 * Math.sin(t * 7)) : this.selected === f.id ? 0.28 : 0;
      f.ring.scale.setScalar(over ? 1.06 + (calm ? 0 : 0.04 * Math.sin(t * 7)) : 1);

      for (let n = 0; n < SPARKS_PER; n++) {
        const i = f.index * SPARKS_PER + n;
        this.sparkLife[i] -= dt;
        if (this.sparkLife[i] <= 0) {
          if (calm || F < 0.12 || n > 2 + F * 10) { this.sparks.alpha[i] = 0; continue; }
          const a = r() * Math.PI * 2;
          const d = r() * 0.35 * f.scale;
          this.sparks.pos.set([f.pos.x + Math.cos(a) * d, 0.6 * f.scale + r() * 0.5, f.pos.z + Math.sin(a) * d], i * 3);
          this.sparkVel.set([(r() - 0.5) * 0.5, 0.7 + r() * (0.8 + F), (r() - 0.5) * 0.5], i * 3);
          this.sparkLife[i] = 0.9 + r() * 1.4;
          this.sparks.size[i] = 0.04 + r() * 0.05;
          this.sparks.setColor(i, sparkCols[i % 3]);
        }
        for (let k = 0; k < 3; k++) this.sparks.pos[i * 3 + k] += this.sparkVel[i * 3 + k] * dt;
        this.sparks.alpha[i] = Math.min(1, this.sparkLife[i] * 1.5);
      }

      for (let n = 0; n < SNOW_PER; n++) {
        const i = f.index * SNOW_PER + n;
        if (f.shownCold < 0.05 || n >= f.shownCold * SNOW_PER) { this.snow.alpha[i] = 0; continue; }
        if (this.snow.alpha[i] === 0 || this.snow.pos[i * 3 + 1] < 0.05) {
          const a = r() * Math.PI * 2;
          const d = Math.sqrt(r()) * 1.7 * f.scale;
          this.snow.pos.set([f.pos.x + Math.cos(a) * d, 0.4 + r() * 2.6, f.pos.z + Math.sin(a) * d], i * 3);
          this.snow.size[i] = 0.1 + r() * 0.08;
          this.snow.setColor(i, new THREE.Color('#ffffff'));
        }
        if (!calm) {
          this.snow.pos[i * 3 + 1] -= dt * (0.25 + (n % 5) * 0.08);
          this.snow.pos[i * 3] += Math.sin(t * 0.8 + i) * dt * 0.12;
        }
        this.snow.alpha[i] = 0.55 + ((i * 13) % 40) / 100;
      }
    }
    for (let i = this.fires.size * SPARKS_PER; i < this.sparks.count; i++) this.sparks.alpha[i] = 0;
    for (let i = this.fires.size * SNOW_PER; i < this.snow.count; i++) this.snow.alpha[i] = 0;
    this.sparks.commit();
    this.snow.commit();

    for (let i = 0; i < this.burst.count; i++) {
      if (this.burstLife[i] <= 0) { this.burst.alpha[i] = 0; continue; }
      this.burstLife[i] -= dt;
      this.burstVel[i * 3 + 1] -= 2.4 * dt;
      for (let k = 0; k < 3; k++) this.burst.pos[i * 3 + k] += this.burstVel[i * 3 + k] * dt;
      this.burst.alpha[i] = Math.max(0, Math.min(1, this.burstLife[i] * 1.6));
    }
    this.burst.commit();

    const flyOn = anyWarm && !calm;
    for (let i = 0; i < this.flies.count; i++) {
      const a = t * 0.1 * (1 + (i % 3) * 0.3) + i * 1.3;
      const d = (this.extent * 0.55) + (i % 5) * 0.6;
      this.flies.pos.set([Math.cos(a) * d + Math.sin(t * 0.6 + i) * 0.4, 0.8 + (i % 4) * 0.5 + Math.sin(t * 0.9 + i * 2) * 0.3, this.center.z + Math.sin(a) * d * 0.8], i * 3);
      this.flies.alpha[i] = flyOn ? 0.18 + 0.5 * Math.max(0, Math.sin(t * 1.2 + i * 2.1)) : 0;
    }
    this.flies.commit();

    const lit = this.fires.get(this.hover ?? this.selected ?? '');
    if (lit) { this.lightTarget.set(lit.pos.x, 1.3 * lit.scale, lit.pos.z); this.light.color.set(PALETTES[lit.spec.color].swatch); }
    this.light.position.lerp(this.lightTarget, 1 - Math.exp(-dt * 6));
    const want = lit && lit.shownF > 0.05 ? (4 + lit.shownF * 16) * (calm ? 1 : 1 + 0.07 * Math.sin(t * 13)) * (1 + lit.excite * 0.4) : 0;
    this.light.intensity = damp(this.light.intensity, want, 6, dt);

    this.updateSticks(dt, t);
  }

  private creatureFor(f: FireObj): CreatureId | null {
    const c = f.spec.creature;
    return c === 'none' ? null : c === 'auto' ? autoCreature(f.id) : c;
  }

  private dropCreature(f: FireObj): void {
    if (!f.creature) return;
    this.scene.remove(f.creature.obj.group);
    f.creature.obj.dispose();
    f.creature = null;
    f.creatureShown = 0;
  }

  /** A creature of fire stands on the Hot fires: it grows out of the flames, faces you and bobs. */
  private updateCreature(f: FireObj, dt: number, t: number): void {
    const id = this.creatureFor(f);
    const want = id !== null && (f.spec.level === 3 || (this.creaturesAlways && f.shownF > 0.12));
    f.creatureShown = damp(f.creatureShown, want ? 1 : 0, want ? 2.6 : 5, dt);
    if (want && id && (!f.creature || f.creature.id !== id)) {
      this.dropCreature(f);
      const obj = buildCreature(id, PALETTES[f.spec.color].ramp);
      this.scene.add(obj.group);
      f.creature = { id, obj };
      f.creatureShown = 0;
      this.flare(f.id);
    }
    if (!f.creature) return;
    if (!want && f.creatureShown < 0.01) { this.dropCreature(f); return; }
    const show = f.creatureShown;
    const F0 = f.shownF;
    // stand on the tallest flame that is burning right now
    let top = 0;
    for (const tg of f.tongues) {
      if (!tg.mesh.visible) continue;
      top = Math.max(top, f.spec.style === 'wisp' ? tg.hover * (0.4 + F0 * 0.8) + tg.baseH * 0.9 : tg.baseH * (0.3 + F0));
    }
    const bob = this.opts.reducedMotion ? 0 : Math.sin(t * 2 + f.index) * 0.05;
    const e = show < 1 ? 1 - Math.pow(1 - show, 3) * (1 + 0.6 * Math.cos(show * 3)) : 1;
    const base = f.scale * 1.25 * (1 + f.flare * 0.15);
    f.creature.obj.group.scale.setScalar(Math.max(0.001, base * Math.max(0, e)));
    if (!this.opts.reducedMotion) f.creature.obj.tick(t + f.index * 1.7);
    const own = (f.creature.obj.group.userData.bob as number | undefined) ?? 0;
    f.creature.obj.group.position.set(f.pos.x, (0.14 + top * 0.82) * f.scale + bob + own * base, f.pos.z);
    const want2 = Math.atan2(this.camera.position.x - f.pos.x, this.camera.position.z - f.pos.z);
    let d = want2 - f.facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    f.facing += d * (1 - Math.exp(-dt * 4));
    f.creature.obj.group.rotation.y = f.facing;
    f.creature.obj.group.visible = show > 0.01;
  }

  private updateSticks(dt: number, t: number): void {
    const calm = this.opts.reducedMotion;
    for (const run of [...this.sticks.values()]) {
      const g = run.obj.group;
      const sh = run.obj.shadow;
      if (run.state === 'drag') {
        const before = g.position.x;
        g.position.x = damp(g.position.x, run.target.x, 16, dt);
        g.position.y = damp(g.position.y, run.target.y, 14, dt);
        g.position.z = damp(g.position.z, run.target.z, 16, dt);
        const vx = (g.position.x - before) / Math.max(dt, 0.001);
        run.tilt = damp(run.tilt, Math.max(-0.5, Math.min(0.5, -vx * 0.06)), 10, dt);
        g.rotation.z = run.tilt;
        g.rotation.x = damp(g.rotation.x, calm ? 0 : Math.sin(t * 5) * 0.04, 8, dt);
        g.scale.setScalar(damp(g.scale.x, 1.08, 12, dt));
      } else if (run.state === 'hold') {
        const f = this.fires.get(run.fireId ?? '');
        if (f) {
          g.position.x = damp(g.position.x, f.pos.x, 9, dt);
          g.position.z = damp(g.position.z, f.pos.z, 9, dt);
          g.position.y = damp(g.position.y, 1.25 * f.scale + (calm ? 0 : Math.sin(t * 3) * 0.06), 9, dt);
        }
        g.rotation.z = damp(g.rotation.z, 0, 8, dt);
        g.rotation.y += dt * (calm ? 0 : 0.6);
      } else if (run.anim) {
        this.stepAnim(run, dt);
      }
      if (!this.sticks.has(run.obj.id)) continue;
      sh.position.set(g.position.x, 0.015, g.position.z);
      sh.rotation.z = -g.rotation.y;
      (sh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.08, 0.5 - Math.max(0, g.position.y) * 0.25);
      sh.visible = g.scale.x > 0.05;
    }
  }

  private stepAnim(run: StickRun, dt: number): void {
    const a = run.anim!;
    const g = run.obj.group;
    a.t = Math.min(a.dur, a.t + dt);
    const k = a.t / a.dur;
    if (a.kind === 'vanish') {
      const e = ease(k);
      g.scale.setScalar(Math.max(0.01, 1.08 * (1 - e)));
      g.position.y = a.from.y - e * 0.5;
      if (k >= 1) this.retire(run);
    } else if (a.kind === 'fly') {
      const f = this.fires.get(a.fireId);
      const to = f ? new THREE.Vector3(f.pos.x, 0.5 * f.scale, f.pos.z) : a.from;
      const e = ease(k);
      g.position.lerpVectors(a.from, to, e);
      g.rotation.z = (1 - e) * g.rotation.z + e * 0.2;
      if (k >= 1) {
        this.flare(a.fireId);
        // each stick gets its own materials so it can darken and glow without touching the others
        const mats: THREE.MeshStandardMaterial[] = [];
        g.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || o === run.obj.hit) return;
          const list = Array.isArray(m.material) ? m.material : [m.material];
          const cloned = list.map((x) => { const c = (x as THREE.MeshStandardMaterial).clone(); mats.push(c); return c; });
          m.material = Array.isArray(m.material) ? cloned : cloned[0];
        });
        run.burnMats = mats;
        run.anim = { kind: 'burn', t: 0, dur: 1.25, fireId: a.fireId };
      }
    } else if (a.kind === 'burn') {
      const char = new THREE.Color(0x140c10);
      const fire = this.fires.get(a.fireId);
      const glowHex = fire ? PALETTES[fire.spec.color].coal : 0xff6a2e;
      for (const m of run.burnMats ?? []) {
        m.color.lerp(char, 0.1 + k * 0.1);
        m.emissive.setHex(glowHex);
        m.emissiveIntensity = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 1.6;
      }
      const s = 1 - ease(Math.max(0, (k - 0.25) / 0.75)) * 0.92;
      g.scale.set(s, s, s);
      if (Math.random() < 0.5 && !this.opts.reducedMotion) {
        const i = Math.floor(Math.random() * this.burst.count);
        if (this.burstLife[i] <= 0) {
          const cols = PALETTES[fire?.spec.color ?? 'classic'].sparks;
          this.burstLife[i] = 0.6;
          this.burst.pos.set([g.position.x + (Math.random() - 0.5) * 0.4, g.position.y + 0.2, g.position.z + (Math.random() - 0.5) * 0.4], i * 3);
          this.burstVel.set([(Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6], i * 3);
          this.burst.size[i] = 0.05 + Math.random() * 0.06;
          this.burst.setColor(i, new THREE.Color(cols[i % 3]));
        }
      }
      if (k >= 1) this.retire(run);
    }
  }

  /** The stick is gone (burned, or put back in the inventory). */
  private retire(run: StickRun): void {
    this.sticks.delete(run.obj.id);
    this.scene.remove(run.obj.group, run.obj.shadow);
    run.burnMats?.forEach((m) => m.dispose());
    run.obj.mats.forEach((m) => m.dispose());
  }

  private emitLabels(): void {
    const out: LabelPos[] = [];
    const v = new THREE.Vector3();
    for (const f of this.fires.values()) {
      // a small sign on the ground in front of the fire
      v.set(f.pos.x, 0.12, f.pos.z + 1.55 * f.scale);
      const dist = v.distanceTo(this.camera.position);
      v.project(this.camera);
      const wanted = this.showAll || this.selected === f.id || this.hover === f.id;
      const top = new THREE.Vector3(f.pos.x, (2.05 + (f.tier >= 7 ? 0.55 : 0)) * f.scale, f.pos.z).project(this.camera);
      out.push({ id: f.id, ax: (top.x * 0.5 + 0.5) * this.width, ay: (-top.y * 0.5 + 0.5) * this.height, x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, depth: Math.max(0, Math.min(1, (dist - this.baseDistance * 0.45) / (this.baseDistance * 1.0))), visible: v.z < 1 && wanted });
    }
    this.opts.onFrame(out);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.clearHold();
    document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.controls.dispose();
    for (const f of this.fires.values()) this.dropCreature(f);
    this.disposables.forEach((d) => d.dispose());
    this.textures.forEach((t) => t.dispose());
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.renderer.dispose();
  }
}
