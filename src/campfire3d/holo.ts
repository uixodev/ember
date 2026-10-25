import * as THREE from 'three';

/**
 * The look of the Mythic design: soft, pearly colours that drift through the whole spectrum, like a holographic
 * card. The material replaces the colour of a flame or a creature with a slowly moving pastel gradient, and keeps
 * the original vertex colours only to tell the bright core from the edge. Solid colours, no transparency.
 */
export function holoMaterial(side: THREE.Side = THREE.DoubleSide): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexColors: true,
    side,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vW;
      varying float vHeat;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vHeat = dot(color, vec3(0.299, 0.587, 0.114));
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vW;
      varying float vHeat;
      vec3 hsl(float h, float s, float l) {
        vec3 k = mod(vec3(0.0, 8.0, 4.0) + h * 12.0, 12.0);
        vec3 a = vec3(s * min(l, 1.0 - l));
        return l - a * clamp(min(k - 3.0, 9.0 - k), -1.0, 1.0);
      }
      void main() {
        float flow = vW.y * 0.42 + vW.x * 0.16 + vW.z * 0.2 + uTime * 0.07;
        float h = fract(flow + sin(vW.y * 2.4 + uTime * 0.8) * 0.07 + sin(vW.x * 3.1 - uTime * 0.6) * 0.05);
        vec3 c = hsl(h, 0.72, 0.8);
        float sheen = 0.5 + 0.5 * sin(vW.y * 6.0 - uTime * 1.9 + vW.x * 3.0);
        c = mix(c, vec3(1.0), 0.14 * sheen + smoothstep(0.5, 1.0, vHeat) * 0.5);
        // a glowing white edge where the surface turns away from you, like the rim of a crystal
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        vec3 view = normalize(cameraPosition - vW);
        float rim = pow(1.0 - abs(dot(n, view)), 1.6);
        c = mix(c, vec3(1.0), clamp(rim * 1.25, 0.0, 0.92));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
