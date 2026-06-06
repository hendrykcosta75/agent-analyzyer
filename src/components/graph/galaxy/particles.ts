import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

/**
 * GPGPU attractor-particle system — a WebGL port of the three.js WebGPU/TSL
 * "compute attractors particles" example. Each particle holds a position and a
 * velocity in ping-pong float textures. Every frame the velocity shader sums a
 * gravitational pull plus a tangential "spinning" force from every attractor,
 * integrates, clamps and damps; the position shader advects and box-wraps.
 */

export const MAX_ATTRACTORS = 16;

/** Gravity + spinning integration → writes new velocity. */
const VELOCITY_FRAGMENT = /* glsl */ `
#define MAX_ATTRACTORS ${MAX_ATTRACTORS}

uniform vec3 uAttractors[MAX_ATTRACTORS];
uniform vec3 uAxes[MAX_ATTRACTORS];
uniform float uMasses[MAX_ATTRACTORS];
uniform int uAttractorCount;
uniform float uParticleGlobalMass;
uniform float uG;
uniform float uSpinning;
uniform float uMaxSpeed;
uniform float uDamping;
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posT = texture2D(texturePosition, uv);
  vec4 velT = texture2D(textureVelocity, uv);

  vec3 position = posT.xyz;
  vec3 velocity = velT.xyz;
  float particleMass = posT.w * uParticleGlobalMass;

  vec3 force = vec3(0.0);
  for (int i = 0; i < MAX_ATTRACTORS; i++) {
    if (i >= uAttractorCount) break;
    vec3 toAttractor = uAttractors[i] - position;
    float distance = max(length(toAttractor), 0.06);
    vec3 direction = toAttractor / distance;

    // Newtonian gravity toward the attractor.
    float gravityStrength = uMasses[i] * particleMass * uG / (distance * distance);
    force += direction * gravityStrength;

    // Tangential swirl around the attractor's spin axis.
    vec3 spinningForce = uAxes[i] * (gravityStrength * uSpinning);
    force += cross(spinningForce, toAttractor);
  }

  velocity += force * uDelta;

  float speed = length(velocity);
  if (speed > uMaxSpeed) velocity = normalize(velocity) * uMaxSpeed;
  velocity *= (1.0 - uDamping);

  gl_FragColor = vec4(velocity, velT.w);
}
`;

/** Advect position by velocity and wrap inside a cube so the field never empties. */
const POSITION_FRAGMENT = /* glsl */ `
uniform float uDelta;
uniform float uBound;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posT = texture2D(texturePosition, uv);
  vec4 velT = texture2D(textureVelocity, uv);

  vec3 position = posT.xyz + velT.xyz * uDelta;

  float halfExtent = uBound * 0.5;
  position = mod(position + halfExtent, uBound) - halfExtent;

  gl_FragColor = vec4(position, posT.w); // keep mass multiplier in .w
}
`;

/** Render: read state textures, size by mass + perspective, color by speed. */
const POINTS_VERTEX = /* glsl */ `
uniform sampler2D uPosition;
uniform sampler2D uVelocity;
uniform float uMaxSpeed;
uniform float uScale;
uniform float uPixelRatio;

attribute vec2 reference;

varying float vSpeed;

void main() {
  vec4 posT = texture2D(uPosition, reference);
  vec4 velT = texture2D(uVelocity, reference);

  vSpeed = clamp(length(velT.xyz) / uMaxSpeed, 0.0, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(posT.xyz, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = uScale * posT.w * uPixelRatio;
  gl_PointSize = size * (300.0 / max(-mvPosition.z, 0.001));
}
`;

const POINTS_FRAGMENT = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;

varying float vSpeed;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  float alpha = smoothstep(0.5, 0.0, d);
  alpha = pow(alpha, 1.6);

  float mixv = smoothstep(0.0, 0.5, vSpeed);
  vec3 col = mix(uColorA, uColorB, mixv);
  col += pow(mixv, 3.0) * 0.65; // incandescent core for the fastest particles

  gl_FragColor = vec4(col, alpha * uOpacity);
}
`;

export interface GalaxySpawn {
  /** Initial particle box extents (x, y, z). */
  box: THREE.Vector3;
  /** Box-wrap extent for the simulation. */
  bound: number;
}

export interface GalaxyCompute {
  gpu: GPUComputationRenderer;
  posVar: ReturnType<GPUComputationRenderer["addVariable"]>;
  velVar: ReturnType<GPUComputationRenderer["addVariable"]>;
  size: number;
}

function fillInitialTextures(
  pos: THREE.DataTexture,
  vel: THREE.DataTexture,
  spawn: GalaxySpawn,
) {
  const p = pos.image.data as unknown as Float32Array;
  const v = vel.image.data as unknown as Float32Array;
  for (let i = 0; i < p.length; i += 4) {
    p[i] = (Math.random() - 0.5) * spawn.box.x;
    p[i + 1] = (Math.random() - 0.5) * spawn.box.y;
    p[i + 2] = (Math.random() - 0.5) * spawn.box.z;
    p[i + 3] = 0.25 + Math.random() * 0.75; // mass multiplier

    // Small random spherical velocity to seed the swirl.
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const s = Math.sin(theta);
    v[i] = s * Math.sin(phi) * 0.05;
    v[i + 1] = Math.cos(theta) * 0.05;
    v[i + 2] = s * Math.cos(phi) * 0.05;
    v[i + 3] = 0;
  }
}

/** Build the GPGPU simulation. Throws if the GPU can't run the compute pass. */
export function buildGalaxyCompute(
  gl: THREE.WebGLRenderer,
  size: number,
  spawn: GalaxySpawn,
): GalaxyCompute {
  const gpu = new GPUComputationRenderer(size, size, gl);

  const pos0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  fillInitialTextures(pos0, vel0, spawn);

  const posVar = gpu.addVariable("texturePosition", POSITION_FRAGMENT, pos0);
  const velVar = gpu.addVariable("textureVelocity", VELOCITY_FRAGMENT, vel0);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);

  const attractors = Array.from({ length: MAX_ATTRACTORS }, () => new THREE.Vector3());
  const axes = Array.from({ length: MAX_ATTRACTORS }, () => new THREE.Vector3(0, 1, 0));
  const masses = new Float32Array(MAX_ATTRACTORS);

  Object.assign(posVar.material.uniforms, {
    uDelta: { value: 1 / 60 },
    uBound: { value: spawn.bound },
  });

  Object.assign(velVar.material.uniforms, {
    uAttractors: { value: attractors },
    uAxes: { value: axes },
    uMasses: { value: masses },
    uAttractorCount: { value: 0 },
    uParticleGlobalMass: { value: 1e4 },
    uG: { value: 6.67e-11 },
    uSpinning: { value: 2.75 },
    uMaxSpeed: { value: 8 },
    uDamping: { value: 0.1 },
    uDelta: { value: 1 / 60 },
  });

  const error = gpu.init();
  if (error !== null) throw new Error(error);

  return { gpu, posVar, velVar, size };
}

/** Point cloud geometry whose vertices index into the compute textures. */
export function createParticleGeometry(size: number): THREE.BufferGeometry {
  const count = size * size;
  const positions = new Float32Array(count * 3);
  const reference = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const col = i % size;
    const row = Math.floor(i / size);
    reference[i * 2] = (col + 0.5) / size;
    reference[i * 2 + 1] = (row + 0.5) / size;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("reference", new THREE.BufferAttribute(reference, 2));
  return geom;
}

export function createParticleMaterial(
  colorA: THREE.ColorRepresentation,
  colorB: THREE.ColorRepresentation,
  pixelRatio: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPosition: { value: null },
      uVelocity: { value: null },
      uMaxSpeed: { value: 8 },
      uScale: { value: 0.2 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0.6 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
    vertexShader: POINTS_VERTEX,
    fragmentShader: POINTS_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}
