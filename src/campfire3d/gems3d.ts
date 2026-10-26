import * as THREE from 'three';
import type { Rarity } from './collection';
import { PALETTES, type PaletteId } from './palettes';

/**
 * Precious stones to lie on the ground. A common stone is a rough, polished nugget; an uncommon one an elongated
 * crystal; rare and up are brilliant cuts (a table on top, a girdle, a pointed pavilion below). The better the
 * rarity, the bigger, brighter and more sparkling. Legendary stones shimmer through soft rainbow colours.
 */
export interface GemModel {
  group: THREE.Group;
  /** The stone itself, which spins. */
  stone: THREE.Object3D;
  update: (t: number) => void;
  dispose: () => void;
}

const SIZE: Record<Rarity, number> = { common: 1.2, uncommon: 1.4, rare: 1.6, epic: 1.85, legendary: 2.15 };

/** A brilliant cut, as a profile turned around the vertical axis: culet, pavilion, girdle, crown, table. */
function brilliant(): THREE.LatheGeometry {
  const pts = [[0, -0.24], [0.15, 0.0], [0.17, 0.02], [0.17, 0.05], [0.12, 0.13], [0.075, 0.15], [0, 0.15]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 8);
}

export function buildGem(color: PaletteId, rarity: Rarity, holo: THREE.Material, glowTex: THREE.Texture): GemModel {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const base = new THREE.Color(PALETTES[color]?.swatch ?? '#9FB0D0');
  const bright = base.clone().lerp(new THREE.Color(0xffffff), 0.25);
  const g = <T extends THREE.BufferGeometry>(x: T): T => { geos.push(x); return x; };

  let geo: THREE.BufferGeometry;
  if (rarity === 'common') { geo = g(new THREE.DodecahedronGeometry(0.17, 0)); geo.scale(1.15, 0.7, 1); }
  else if (rarity === 'uncommon') { geo = g(new THREE.OctahedronGeometry(0.17, 0)); geo.scale(0.8, 1.45, 0.8); }
  else geo = g(brilliant());

  const stoneMat = rarity === 'legendary'
    ? holo
    : (() => { const m = new THREE.MeshStandardMaterial({ color: bright, emissive: base, emissiveIntensity: 0.28 + 0.1 * ['common', 'uncommon', 'rare', 'epic'].indexOf(rarity), roughness: 0.12, metalness: 0.2, flatShading: true }); mats.push(m); return m; })();
  const stone = new THREE.Mesh(geo, stoneMat);
  stone.position.y = rarity === 'common' ? 0.12 : rarity === 'uncommon' ? 0.25 : 0.27;
  group.add(stone);
  if (rarity === 'legendary') {
    const edge = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
    mats.push(edge);
    const hull = new THREE.Mesh(geo, edge);
    hull.scale.setScalar(1.14);
    stone.add(hull);
  }

  // a soft shadow and, for the better stones, a glow
  const shadow = new THREE.Mesh(g(new THREE.CircleGeometry(0.2, 16)), (() => { const m = new THREE.MeshBasicMaterial({ color: 0x0d0a30, transparent: true, opacity: 0.45, depthWrite: false }); mats.push(m); return m; })());
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);
  let glow: THREE.Sprite | null = null;
  if (rarity === 'epic' || rarity === 'legendary' || rarity === 'rare') {
    const m = new THREE.SpriteMaterial({ map: glowTex, color: rarity === 'legendary' ? 0xffffff : bright, transparent: true, opacity: rarity === 'rare' ? 0.35 : 0.6, depthWrite: false });
    mats.push(m);
    glow = new THREE.Sprite(m);
    glow.scale.setScalar(rarity === 'legendary' ? 1.3 : rarity === 'epic' ? 1.0 : 0.7);
    glow.position.y = 0.28;
    group.add(glow);
  }
  // sparkles for the top two
  const sparks: THREE.Mesh[] = [];
  if (rarity === 'epic' || rarity === 'legendary') {
    const sg = g(new THREE.OctahedronGeometry(0.035, 0));
    for (let i = 0; i < (rarity === 'legendary' ? 4 : 2); i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
      mats.push(m);
      const s = new THREE.Mesh(sg, m);
      group.add(s);
      sparks.push(s);
    }
  }
  group.scale.setScalar(SIZE[rarity]);

  return {
    group, stone,
    update: (t) => {
      stone.rotation.y = t * (rarity === 'common' ? 0.6 : 1.1);
      stone.position.y += (Math.sin(t * 2) * 0.012 - (stone.userData.lastBob ?? 0));
      stone.userData.lastBob = Math.sin(t * 2) * 0.012;
      if (glow) (glow.material as THREE.SpriteMaterial).opacity = (rarity === 'rare' ? 0.3 : 0.5) + Math.sin(t * 3) * 0.12;
      sparks.forEach((s, i) => {
        const a = t * 1.6 + i * (Math.PI * 2 / sparks.length);
        s.position.set(Math.cos(a) * 0.3, 0.3 + Math.sin(t * 3 + i * 2) * 0.12, Math.sin(a) * 0.3);
        s.scale.setScalar(0.6 + 0.5 * Math.abs(Math.sin(t * 5 + i)));
        s.rotation.y = t * 3;
      });
    },
    dispose: () => { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); },
  };
}
