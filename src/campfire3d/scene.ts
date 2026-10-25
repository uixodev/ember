import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Particles } from './particles';
import * as TX from './textures';

export type Level = 0 | 1 | 2 | 3;
export type Size = 1 | 2 | 3 | 4;

export interface LogSpec {
  id: string;
  level: Level;
  /** 1 = freshly fed, 0 = about to cool. Moves the glowing dot along the log. */
  progress: number;
  size: Size;
}

export interface LabelPos { id: string; x: number; y: number; depth: number; visible: boolean }

export interface CampfireOptions {
  onPick: (id: string | null) => void;
  onFrame: (labels: LabelPos[]) => void;
  onInteract?: () => void;
  reducedMotion: boolean;
}

export interface CameraView { azimuth: number; polar: number; distance?: number }

const LEN: Record<Size, number> = { 1: 1.45, 2: 1.85, 3: 2.25, 4: 2.65 };
const RAD: Record<Size, number> = { 1: 0.13, 2: 0.18, 3: 0.25, 4: 0.33 };
const TILT = (16 * Math.PI) / 180;
const REST_ID = '__resting';

const rngOf = (seed: number) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** A teardrop standing on y = 0, 1 tall, colours from pale yellow at the base to red at the tip. Solid colours only. */
function flameGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(0.5 * Math.pow(1 - Math.pow(t, 1.55), 0.78), t));
  }
  const g = new THREE.LatheGeometry(pts, 14);
  const stops = ['#FFF1B0', '#FFD25A', '#FF9A2E', '#E8553A', '#D2402F'].map((c) => new THREE.Color(c));
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

interface Tongue { mesh: THREE.Mesh; baseW: number; baseH: number; phase: number; speed: number; need: number; x: number; z: number }
interface LogObj {
  id: string; spec: LogSpec; root: THREE.Group; tilt: THREE.Group; body: THREE.Mesh; halo: THREE.Mesh;
  side: THREE.MeshStandardMaterial; flames: THREE.Mesh[]; dot: THREE.Mesh; shadow: THREE.Mesh;
  len: number; rad: number; rIn: number; yIn: number; flare: number; theta: number;
}

export class Campfire {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  private readonly controls: OrbitControls;
  private last = performance.now();
  private elapsed = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly logs = new Map<string, LogObj>();
  private readonly logGroup = new THREE.Group();
  private readonly fire = new THREE.Group();
  private readonly tongues: Tongue[] = [];
  private readonly flameGeo = flameGeometry();
  private readonly flameMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  private readonly light = new THREE.PointLight(0xff9a2e, 0, 14, 1.2);
  private readonly hotPool: THREE.Mesh;
  private readonly coldPool: THREE.Mesh;
  private readonly coals: THREE.Mesh[] = [];
  private readonly ash: THREE.Group;
  private readonly sparks: Particles;
  private readonly burst: Particles;
  private readonly flies: Particles;
  private readonly snow: Particles;
  private readonly sparkLife = new Float32Array(90);
  private readonly sparkVel = new Float32Array(90 * 3);
  private readonly burstLife = new Float32Array(50);
  private readonly burstVel = new Float32Array(50 * 3);
  private readonly rest = new THREE.Group();
  private readonly textures: THREE.Texture[] = [];
  private readonly disposables: { dispose: () => void }[] = [];
  private bark: THREE.CanvasTexture;
  private frostBark: THREE.CanvasTexture;
  private endGrain: THREE.CanvasTexture;
  private char: THREE.CanvasTexture;
  private glowAlong: THREE.CanvasTexture;
  private cracks: THREE.CanvasTexture;
  private warmth = 0.5;
  private shownWarmth = 0.5;
  private selected: string | null = null;
  private raf = 0;
  private running = true;
  private visible = true;
  private idleTimer = 0;
  private baseDistance = 11;
  private fly: { from: CameraView & { distance: number }; to: CameraView & { distance: number }; t: number } | null = null;
  private down = { x: 0, y: 0, t: 0 };
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private width = 1;
  private height = 1;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly opts: CampfireOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.bark = TX.barkTexture();
    this.frostBark = TX.barkTexture(true);
    this.endGrain = TX.endGrainTexture();
    this.char = TX.charTexture();
    this.glowAlong = TX.glowAlongTexture();
    this.cracks = TX.cracksTexture();
    const glow = TX.glowSprite();
    const dot = TX.dotSprite();
    const flake = TX.flakeSprite();
    this.textures.push(this.bark, this.frostBark, this.endGrain, this.char, this.glowAlong, this.cracks, glow, dot, flake);

    // light
    this.scene.add(new THREE.HemisphereLight(0xcfc9ff, 0x2c2266, 1.0));
    const sun = new THREE.DirectionalLight(0xdad5ff, 0.7);
    sun.position.set(-4, 7, 5);
    this.scene.add(sun);
    this.light.position.set(0, 1.4, 0);
    this.scene.add(this.light);

    // ground, pools of light, stones
    const groundTex = TX.groundTexture();
    this.textures.push(groundTex);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(7.4, 48), new THREE.MeshBasicMaterial({ map: groundTex, transparent: true, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.hotPool = this.pool(['#B4483A', '#8A3A2A', '#4A2420'], 3.6);
    this.coldPool = this.pool(['#7FB4F5', '#3F63C8', '#2C3C9A'], 3.2);

    const stoneRng = rngOf(3);
    const stoneMat = [0x8f88ec, 0x7d76df, 0xa59ff2].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
    this.disposables.push(...stoneMat);
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * Math.PI * 2 + 0.2;
      const g = new THREE.IcosahedronGeometry(0.3 + stoneRng() * 0.12, 1);
      this.disposables.push(g);
      const m = new THREE.Mesh(g, stoneMat[i % 3]);
      m.position.set(Math.cos(a) * 1.55, 0.1, Math.sin(a) * 1.55);
      m.scale.set(1.1, 0.62, 0.95 + stoneRng() * 0.2);
      m.rotation.y = stoneRng() * 6;
      this.scene.add(m);
    }

    // fire
    this.buildFire();
    this.ash = new THREE.Group();
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x3a1e22, roughness: 1 });
    const ashGeo = new THREE.SphereGeometry(0.6, 16, 10);
    this.disposables.push(ashMat, ashGeo);
    const ashMesh = new THREE.Mesh(ashGeo, ashMat);
    ashMesh.scale.set(1, 0.22, 1);
    ashMesh.position.y = 0.1;
    this.ash.add(ashMesh);
    this.scene.add(this.ash);
    this.scene.add(this.fire);
    this.scene.add(this.logGroup);

    // particles
    this.sparks = new Particles(90, dot);
    this.burst = new Particles(50, dot);
    this.flies = new Particles(16, glow);
    this.snow = new Particles(260, flake);
    for (const p of [this.sparks, this.burst, this.flies, this.snow]) this.scene.add(p.points);
    this.disposables.push(this.sparks, this.burst, this.flies, this.snow);
    this.initSnowAndFlies();

    this.buildResting();

    // camera
    this.camera.position.set(0, 5.4, 9.5);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.9, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.75;
    this.controls.zoomSpeed = 0.8;
    this.controls.minPolarAngle = 0.22;
    this.controls.maxPolarAngle = 1.42;
    this.controls.autoRotate = !opts.reducedMotion;
    this.controls.autoRotateSpeed = 0.7;
    this.controls.addEventListener('start', () => this.interacted());

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
    this.io.observe(canvas);
    document.addEventListener('visibilitychange', this.onVis);
    this.resize();
    this.loop();
  }

  // ---- building ---------------------------------------------------------------------------

  private pool(stops: string[], radius: number): THREE.Mesh {
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
    this.textures.push(t);
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    this.scene.add(m);
    return m;
  }

  private buildFire(): void {
    const r = rngOf(21);
    const rings: [number, number, number, number][] = [ // count, radius, minH, maxH
      [1, 0, 2.3, 2.6], [5, 0.3, 1.5, 2.2], [7, 0.55, 0.9, 1.5], [6, 0.35, 0.5, 0.9],
    ];
    let n = 0;
    const total = rings.reduce((s, x) => s + x[0], 0);
    for (const [count, radius, minH, maxH] of rings) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r();
        const m = new THREE.Mesh(this.flameGeo, this.flameMat);
        const baseH = minH + r() * (maxH - minH);
        const baseW = 0.42 + (baseH / 2.6) * 0.34 + r() * 0.1;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        m.position.set(x, 0.18, z);
        this.fire.add(m);
        this.tongues.push({ mesh: m, baseW, baseH, phase: r() * 10, speed: 1.6 + r() * 1.6, need: n / total, x, z });
        n++;
      }
    }
    // coals under the flames
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x4a2420, emissive: 0xff7a2e, emissiveIntensity: 1, roughness: 0.8 });
    const coalGeo = new THREE.IcosahedronGeometry(0.2, 0);
    this.disposables.push(coalMat, coalGeo, this.flameGeo, this.flameMat);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(coalGeo, coalMat.clone());
      const a = (i / 8) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.42, 0.13, Math.sin(a) * 0.42);
      m.scale.set(1.2, 0.7, 1);
      m.rotation.set(r(), r() * 6, r());
      this.fire.add(m);
      this.coals.push(m);
    }
  }

  private buildResting(): void {
    this.rest.position.set(2.5, 0, -2.7);
    this.rest.rotation.y = -0.5;
    const mat = new THREE.MeshStandardMaterial({ map: this.frostBark, color: 0xa8b8f0, roughness: 0.9 });
    const endMat = new THREE.MeshStandardMaterial({ map: this.endGrain, color: 0xb8c4f0, roughness: 0.9 });
    const geo = new THREE.CylinderGeometry(0.17, 0.17, 1.3, 14);
    this.disposables.push(mat, endMat, geo);
    const spots: [number, number][] = [[-0.19, 0.17], [0.19, 0.17], [0, 0.5]];
    for (const [x, y] of spots) {
      const m = new THREE.Mesh(geo, [mat, endMat, endMat]);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, y, x);
      this.rest.add(m);
    }
    this.scene.add(this.rest);
  }

  private initSnowAndFlies(): void {
    const r = rngOf(8);
    for (let i = 0; i < this.snow.count; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 6.4;
      this.snow.pos.set([Math.cos(a) * d, r() * 7, Math.sin(a) * d], i * 3);
      this.snow.size[i] = 0.16 + r() * 0.16;
      this.snow.alpha[i] = 0.55 + r() * 0.4;
      this.snow.setColor(i, new THREE.Color('#ffffff'));
    }
    const fly = new THREE.Color('#FFE98A');
    for (let i = 0; i < this.flies.count; i++) {
      this.flies.size[i] = 0.4;
      this.flies.alpha[i] = 0;
      this.flies.setColor(i, fly);
    }
    this.snow.commit();
    this.flies.commit();
  }

  // ---- logs -----------------------------------------------------------------------------------

  private logMaterial(level: Level, len: number): THREE.MeshStandardMaterial {
    const cold = level === 0;
    const map = (cold ? this.frostBark : this.bark).clone();
    map.repeat.set(2, Math.max(1, len / 1.4));
    map.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ map, color: cold ? 0xa8b8f0 : 0xffffff, roughness: 0.88 });
    this.disposables.push(m, map);
    if (level === 3) { m.emissive = new THREE.Color(0xff6a2e); m.emissiveMap = this.glowAlong; m.emissiveIntensity = 1.0; }
    if (level === 2) { m.emissive = new THREE.Color(0xe8782e); m.emissiveMap = this.glowAlong; m.emissiveIntensity = 0.45; }
    if (level === 1) { m.emissive = new THREE.Color(0xff7a2e); m.emissiveMap = this.cracks; m.emissiveIntensity = 1.2; }
    return m;
  }

  private buildLog(spec: LogSpec): LogObj {
    const len = LEN[spec.size];
    const rad = RAD[spec.size];
    const cold = spec.level === 0;
    const side = this.logMaterial(spec.level, len);
    const outer = new THREE.MeshStandardMaterial({ map: this.endGrain, color: cold ? 0xb8c4f0 : 0xffffff, roughness: 0.9 });
    const inner = new THREE.MeshStandardMaterial({ map: this.char, roughness: 1 });
    this.disposables.push(outer, inner);
    const geo = new THREE.CylinderGeometry(rad * 0.92, rad, len, 24, 1, false);
    this.disposables.push(geo);
    const body = new THREE.Mesh(geo, [side, outer, inner]);
    body.rotation.z = -Math.PI / 2;
    body.position.x = len / 2;
    body.userData.logId = spec.id;

    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const haloGeo = new THREE.CylinderGeometry(rad * 1.3, rad * 1.34, len * 1.05, 24, 1, true);
    this.disposables.push(haloMat, haloGeo);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.z = -Math.PI / 2;
    halo.position.x = len / 2;

    const tilt = new THREE.Group();
    tilt.rotation.z = -TILT;
    tilt.add(body, halo);

    const root = new THREE.Group();
    root.add(tilt);

    const shadowMat = new THREE.MeshBasicMaterial({ map: this.textures[6] as THREE.Texture, color: 0x15103f, transparent: true, opacity: 0.55, depthWrite: false });
    this.disposables.push(shadowMat);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    root.add(shadow);

    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 });
    const dotGeo = new THREE.SphereGeometry(0.075, 12, 8);
    this.disposables.push(dotMat, dotGeo);
    const dot = new THREE.Mesh(dotGeo, dotMat);
    root.add(dot);

    const flames: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Mesh(this.flameGeo, this.flameMat);
      root.add(f);
      flames.push(f);
    }
    this.logGroup.add(root);
    return { id: spec.id, spec, root, tilt, body, halo, side, flames, dot, shadow, len, rad, rIn: 0.4, yIn: 0, flare: 0, theta: 0 };
  }

  private disposeLog(o: LogObj): void {
    this.logGroup.remove(o.root);
  }

  /** Create, update and arrange the logs. Safe to call whenever the data changes. */
  setLogs(specs: LogSpec[]): void {
    const ids = new Set(specs.map((s) => s.id));
    for (const [id, o] of this.logs) if (!ids.has(id)) { this.disposeLog(o); this.logs.delete(id); }
    const n = specs.length;
    specs.forEach((spec, i) => {
      let o = this.logs.get(spec.id);
      if (o && (o.spec.size !== spec.size || o.spec.level !== spec.level)) {
        const flare = o.flare;
        this.disposeLog(o);
        o = this.buildLog(spec);
        o.flare = Math.max(flare, 0.6);
        this.logs.set(spec.id, o);
      } else if (!o) {
        o = this.buildLog(spec);
        this.logs.set(spec.id, o);
      }
      o.spec = spec;
      o.theta = i === 0 ? Math.PI / 2 : Math.PI / 2 + (i * Math.PI * 2) / n;
      o.rIn = 0.42 + Math.max(0, n - 6) * 0.045;
      o.yIn = o.len * Math.sin(TILT) + o.rad * 0.95;
      o.root.rotation.y = -o.theta;
      o.tilt.position.set(o.rIn, o.yIn, 0);
      const run = o.len * Math.cos(TILT);
      o.shadow.scale.set(o.len * 1.15, o.rad * 3.6, 1);
      o.shadow.position.x = o.rIn + run / 2;
      o.dot.visible = spec.level > 0;
      const at = (f: number) => new THREE.Vector3(o!.rIn + f * run, o!.yIn - f * o!.len * Math.sin(TILT) + o!.rad * 1.02, 0);
      o.dot.position.copy(at(0.14 + 0.74 * spec.progress));
      o.flames.forEach((f, k) => {
        f.visible = spec.level === 3;
        const p = at(0.2 + k * 0.22);
        f.position.copy(p);
        f.userData.base = k === 0 ? 0.42 : 0.3;
      });
    });
    this.applyLabelAnchors();
  }

  setWarmth(w: number): void { this.warmth = Math.max(0, Math.min(1, w)); }
  setSelected(id: string | null): void { this.selected = id; }
  setAutoRotate(on: boolean): void { this.controls.autoRotate = on && !this.opts.reducedMotion; }

  /** The log flares and throws sparks into the fire. */
  feed(id: string): void {
    const o = this.logs.get(id);
    if (!o) return;
    o.flare = 1;
    const origin = new THREE.Vector3(o.rIn + 0.2, o.yIn + 0.2, 0);
    o.root.localToWorld(origin);
    const r = rngOf(Math.floor(performance.now()));
    const hot = new THREE.Color('#FFD25A');
    const warm = new THREE.Color('#FF9A2E');
    for (let i = 0; i < this.burst.count; i++) {
      this.burstLife[i] = 0.7 + r() * 0.9;
      this.burst.pos.set([origin.x + (r() - 0.5) * 0.3, origin.y, origin.z + (r() - 0.5) * 0.3], i * 3);
      this.burstVel.set([(r() - 0.5) * 1.6 - origin.x * 0.25, 1.8 + r() * 2.6, (r() - 0.5) * 1.6 - origin.z * 0.25], i * 3);
      this.burst.size[i] = 0.1 + r() * 0.1;
      this.burst.setColor(i, i % 2 ? hot : warm);
    }
    this.swell = 1;
  }
  private swell = 0;

  // ---- camera ---------------------------------------------------------------------------------

  private current(): CameraView & { distance: number } {
    const off = this.camera.position.clone().sub(this.controls.target);
    return { azimuth: this.controls.getAzimuthalAngle(), polar: this.controls.getPolarAngle(), distance: off.length() };
  }

  flyTo(view: CameraView): void {
    const from = this.current();
    let to = { azimuth: view.azimuth, polar: view.polar, distance: view.distance ?? this.baseDistance };
    // take the short way round
    let d = to.azimuth - from.azimuth;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    to = { ...to, azimuth: from.azimuth + d };
    this.fly = { from, to, t: 0 };
    this.controls.autoRotate = false;
  }

  private place(v: CameraView & { distance: number }): void {
    const t = this.controls.target;
    this.camera.position.set(
      t.x + v.distance * Math.sin(v.polar) * Math.sin(v.azimuth),
      t.y + v.distance * Math.cos(v.polar),
      t.z + v.distance * Math.sin(v.polar) * Math.cos(v.azimuth),
    );
  }

  private interacted(): void {
    this.opts.onInteract?.();
    this.fly = null;
    this.controls.autoRotate = false;
    window.clearTimeout(this.idleTimer);
  }

  // ---- input ----------------------------------------------------------------------------------

  private onDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  private onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 8 || performance.now() - this.down.t > 450) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const bodies = [...this.logs.values()].map((o) => o.body);
    const hit = this.raycaster.intersectObjects(bodies, false)[0];
    this.opts.onPick(hit ? (hit.object.userData.logId as string) : null);
  };
  private onVis = () => { this.running = document.visibilityState === 'visible'; };

  // ---- frame ----------------------------------------------------------------------------------

  private resize(): void {
    const box = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    this.width = Math.max(1, Math.round(box.width));
    this.height = Math.max(1, Math.round(box.height));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    // keep the whole clearing in view on a narrow phone
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fit = 4.3 / Math.tan(hFov / 2);
    const fitV = 3.7 / Math.tan(vFov / 2);
    const first = this.baseDistance === 11;
    this.baseDistance = Math.max(7.2, Math.min(fit, 15), fitV);
    this.controls.minDistance = this.baseDistance * 0.5;
    this.controls.maxDistance = this.baseDistance * 1.3;
    if (first) this.place({ azimuth: 0, polar: 1.12, distance: this.baseDistance });
    this.camera.updateProjectionMatrix();
    const pxH = this.height * this.renderer.getPixelRatio();
    for (const p of [this.sparks, this.burst, this.flies, this.snow]) p.setScale(pxH, this.camera.fov);
  }

  private anchors = new Map<string, THREE.Object3D>();
  private applyLabelAnchors(): void {
    // each log's label sits just past its outer end
    for (const o of this.logs.values()) {
      let a = this.anchors.get(o.id);
      if (!a) { a = new THREE.Object3D(); this.anchors.set(o.id, a); this.scene.add(a); }
      a.position.set(o.rIn + o.len * Math.cos(TILT) + 0.28, 0.5 + o.rad, 0);
      o.root.updateMatrixWorld(true);
      o.root.localToWorld(a.position);
    }
    for (const id of [...this.anchors.keys()]) if (!this.logs.has(id) && id !== REST_ID) { this.scene.remove(this.anchors.get(id)!); this.anchors.delete(id); }
    let rest = this.anchors.get(REST_ID);
    if (!rest) { rest = new THREE.Object3D(); this.anchors.set(REST_ID, rest); this.scene.add(rest); }
    rest.position.set(2.5, 1.3, -2.7);
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.running || !this.visible) return;
    this.elapsed += dt;
    const t = this.elapsed;
    this.update(dt, t);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.emitLabels();
  };

  private update(dt: number, t: number): void {
    const calm = this.opts.reducedMotion;
    this.shownWarmth += (this.warmth - this.shownWarmth) * Math.min(1, dt * 2.2);
    const I = this.shownWarmth;
    const alive = I > 0.07;

    if (this.fly) {
      this.fly.t = Math.min(1, this.fly.t + dt / 0.85);
      const k = ease(this.fly.t);
      const { from, to } = this.fly;
      this.place({ azimuth: from.azimuth + (to.azimuth - from.azimuth) * k, polar: from.polar + (to.polar - from.polar) * k, distance: from.distance + (to.distance - from.distance) * k });
      if (this.fly.t >= 1) this.fly = null;
    }

    // fire
    this.swell = Math.max(0, this.swell - dt * 1.4);
    const boost = 1 + this.swell * 0.28;
    this.fire.visible = alive;
    this.ash.visible = !alive;
    const flick = calm ? 1 : 1 + 0.07 * Math.sin(t * 13) + 0.04 * Math.sin(t * 29);
    this.light.intensity = alive ? (4 + I * 22) * flick * boost : 0;
    this.light.color.set(alive ? 0xff9a2e : 0x8cc2ff);
    for (const f of this.tongues) {
      const on = I * 1.05 > f.need * 0.85;
      f.mesh.visible = on;
      if (!on) continue;
      const k = 0.5 + 0.95 * I;
      const w = calm ? 0 : Math.sin(t * f.speed + f.phase);
      const w2 = calm ? 0 : Math.sin(t * f.speed * 0.7 + f.phase * 1.7);
      f.mesh.scale.set(f.baseW * (1 + 0.1 * w2) * (0.7 + I * 0.4), f.baseH * k * (1 + 0.13 * w) * boost, f.baseW * (1 - 0.1 * w2) * (0.7 + I * 0.4));
      f.mesh.rotation.z = 0.12 * w2 + (f.x * 0.12);
      f.mesh.rotation.x = 0.1 * Math.cos(t * f.speed * 0.8 + f.phase) - f.z * 0.12;
    }
    this.coals.forEach((c, i) => {
      const m = c.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = alive ? 0.7 + 0.5 * (calm ? 0.5 : Math.sin(t * 3 + i * 1.7) * 0.5 + 0.5) : 0.15;
    });
    (this.hotPool.material as THREE.MeshBasicMaterial).opacity = alive ? Math.min(1, 0.25 + I * 0.95) : 0;
    this.hotPool.scale.setScalar(0.65 + I * 0.5 + this.swell * 0.1);
    (this.coldPool.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - I * 5) * 0.95;

    // sparks rising from the fire
    const r = Math.random;
    const gold = [new THREE.Color('#FFD25A'), new THREE.Color('#FF9A2E'), new THREE.Color('#FFFBE0')];
    for (let i = 0; i < this.sparks.count; i++) {
      this.sparkLife[i] -= dt;
      if (this.sparkLife[i] <= 0) {
        if (!alive || calm || i > 12 + I * 78) { this.sparks.alpha[i] = 0; continue; }
        const a = r() * Math.PI * 2;
        const d = r() * 0.5;
        this.sparks.pos.set([Math.cos(a) * d, 0.9 + r() * 0.8, Math.sin(a) * d], i * 3);
        this.sparkVel.set([(r() - 0.5) * 0.7, 0.9 + r() * (1.1 + I), (r() - 0.5) * 0.7], i * 3);
        this.sparkLife[i] = 1.1 + r() * 1.6;
        this.sparks.size[i] = 0.05 + r() * 0.07;
        this.sparks.setColor(i, gold[i % 3]);
      }
      this.sparks.pos[i * 3] += this.sparkVel[i * 3] * dt + Math.sin(t * 2 + i) * 0.004;
      this.sparks.pos[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt;
      this.sparks.pos[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
      this.sparks.alpha[i] = Math.min(1, this.sparkLife[i] * 1.5);
    }
    this.sparks.commit();

    // sparks thrown by feeding a log
    for (let i = 0; i < this.burst.count; i++) {
      if (this.burstLife[i] <= 0) { this.burst.alpha[i] = 0; continue; }
      this.burstLife[i] -= dt;
      this.burstVel[i * 3 + 1] -= 2.2 * dt;
      for (let k = 0; k < 3; k++) this.burst.pos[i * 3 + k] += this.burstVel[i * 3 + k] * dt;
      this.burst.alpha[i] = Math.max(0, Math.min(1, this.burstLife[i] * 1.6));
    }
    this.burst.commit();

    // fireflies, only when the fire is healthy
    const flyOn = I > 0.3 && !calm;
    for (let i = 0; i < this.flies.count; i++) {
      const a = t * 0.12 * (1 + (i % 3) * 0.3) + i * 1.3;
      const d = 2.6 + (i % 5) * 0.7;
      this.flies.pos.set([Math.cos(a) * d + Math.sin(t * 0.6 + i) * 0.4, 0.8 + (i % 4) * 0.5 + Math.sin(t * 0.9 + i * 2) * 0.3, Math.sin(a) * d], i * 3);
      this.flies.alpha[i] = flyOn ? 0.18 + 0.5 * Math.max(0, Math.sin(t * 1.2 + i * 2.1)) * Math.min(1, (I - 0.3) * 3) : 0;
    }
    this.flies.commit();

    // snow when it is cold
    const cold = Math.max(0, Math.min(1, (0.4 - I) / 0.4));
    const shown = Math.round(cold * this.snow.count);
    for (let i = 0; i < this.snow.count; i++) {
      if (i >= shown) { this.snow.alpha[i] = 0; continue; }
      if (!calm) {
        this.snow.pos[i * 3 + 1] -= dt * (0.35 + (i % 7) * 0.09);
        this.snow.pos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.18;
        if (this.snow.pos[i * 3 + 1] < 0.05) this.snow.pos[i * 3 + 1] = 7;
      }
      this.snow.alpha[i] = 0.5 + ((i * 13) % 40) / 100;
    }
    this.snow.commit();

    // logs
    for (const o of this.logs.values()) {
      o.flare = Math.max(0, o.flare - dt * 1.1);
      const sel = this.selected === o.id;
      const lvl = o.spec.level;
      const base = lvl === 3 ? 1 : lvl === 2 ? 0.45 : lvl === 1 ? 1.2 : 0;
      const pulse = calm ? 0 : lvl === 3 ? 0.25 * Math.sin(t * 7 + o.theta) : lvl === 1 ? 0.35 * Math.sin(t * 2.4 + o.theta * 3) : 0.1 * Math.sin(t * 3 + o.theta);
      if (lvl > 0) o.side.emissiveIntensity = (base + pulse) * (0.35 + 0.65 * Math.min(1, I + 0.35)) + o.flare * 2.6;
      (o.halo.material as THREE.MeshBasicMaterial).opacity = sel ? 0.14 + (calm ? 0 : 0.07 * Math.sin(t * 4)) : 0;
      o.dot.scale.setScalar(1 + (calm ? 0 : 0.25 * Math.sin(t * 5 + o.theta)));
      o.flames.forEach((f, k) => {
        if (!f.visible) return;
        const w = calm ? 0 : Math.sin(t * (6 + k) + o.theta + k);
        const b = (f.userData.base as number) * (1 + o.flare * 0.8);
        f.scale.set(b * 0.55 * (1 + 0.1 * w), b * (1.05 + 0.2 * w), b * 0.55);
        f.rotation.z = 0.12 * w;
      });
    }
  }

  private emitLabels(): void {
    const out: LabelPos[] = [];
    const v = new THREE.Vector3();
    const toCam = this.camera.position;
    for (const [id, a] of this.anchors) {
      v.copy(a.position).project(this.camera);
      const dist = a.position.distanceTo(toCam);
      out.push({ id, x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, depth: Math.max(0, Math.min(1, (dist - this.baseDistance * 0.55) / (this.baseDistance * 1.1))), visible: v.z < 1 });
    }
    this.opts.onFrame(out);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.idleTimer);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.controls.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.textures.forEach((t) => t.dispose());
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.renderer.dispose();
  }
}
