import * as THREE from 'three';

const VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vA;
varying vec3 vC;
uniform float uScale;
void main() {
  vA = aAlpha;
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform sampler2D uMap;
varying float vA;
varying vec3 vC;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC, a);
  #include <colorspace_fragment>
}`;

/**
 * A cloud of round points, each with its own size, colour and see-through amount.
 * Plain blending (not additive), so a spark over the lavender sky stays orange instead of turning pink.
 */
export class Particles {
  readonly points: THREE.Points;
  readonly pos: Float32Array;
  readonly size: Float32Array;
  readonly alpha: Float32Array;
  readonly col: Float32Array;
  private readonly material: THREE.ShaderMaterial;

  constructor(readonly count: number, map: THREE.Texture) {
    this.pos = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.col = new Float32Array(count * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: map }, uScale: { value: 400 } },
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
  }

  setScale(viewportHeightPx: number, fovDeg: number): void {
    this.material.uniforms.uScale.value = viewportHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  setColor(i: number, c: THREE.Color): void {
    this.col[i * 3] = c.r;
    this.col[i * 3 + 1] = c.g;
    this.col[i * 3 + 2] = c.b;
  }

  commit(): void {
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true;
    a.aSize.needsUpdate = true;
    a.aAlpha.needsUpdate = true;
    a.aColor.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
