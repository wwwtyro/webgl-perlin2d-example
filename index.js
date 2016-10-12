"use strict";

const regl = require('regl')();

function randVec2() {
  while(true) {
    let x = 2 * Math.random() - 1;
    let y = 2 * Math.random() - 1;
    let l = Math.sqrt(x * x + y * y);
    if (l > 1) continue;
    return {x: x/l, y: y/l}
  }
}

function generateNoiseTexture(regl, size) {
  let l = size * size * 2;
  let array = new Uint8Array(l);
  for (let i = 0; i < l; i++) {
    let r = randVec2();
    array[i * 2 + 0] = Math.round(0.5 * (1.0 + r.x) * 255);
    array[i * 2 + 1] = Math.round(0.5 * (1.0 + r.y) * 255);
  }
  return regl.texture({
    format: 'luminance alpha',
    width: size,
    height: size,
    wrapS: 'repeat',
    wrapT: 'repeat',
    mag: 'nearest',
    min: 'nearest',
    data: array
  });
}

let tNoiseSize = 512;
let tNoise = generateNoiseTexture(regl, tNoiseSize);

let renderNoise = regl({
  vert: `
    precision highp float;
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0, 1);
    }
  `,
  frag: `
    precision highp float;
    uniform sampler2D source, tNoise;
    uniform vec3 color;
    uniform vec2 offset;
    uniform float scale, density, falloff, tNoiseSize;
    varying vec2 vUV;

    float interpolate(float a, float b, float t) {
        t = clamp(t, 0.0, 1.0);
        float tPrime = t * t * t * (t * (6.0 * t - 15.0) + 10.0);
        return mix(a, b, tPrime);
    }

    float perlin_2d(vec2 r) {
        vec2 l0 = floor(r);
        vec2 l1 = l0 + vec2(1, 0);
        vec2 l2 = l0 + vec2(1, 1);
        vec2 l3 = l0 + vec2(0, 1);
        vec2 g0 = texture2D(tNoise, l0/tNoiseSize).ba;
        vec2 g1 = texture2D(tNoise, l1/tNoiseSize).ba;
        vec2 g2 = texture2D(tNoise, l2/tNoiseSize).ba;
        vec2 g3 = texture2D(tNoise, l3/tNoiseSize).ba;
        g0 = 2.0 * g0 - 1.0;
        g1 = 2.0 * g1 - 1.0;
        g2 = 2.0 * g2 - 1.0;
        g3 = 2.0 * g3 - 1.0;
        vec2 d0 = r - l0;
        vec2 d1 = r - l1;
        vec2 d2 = r - l2;
        vec2 d3 = r - l3;
        float p0 = dot(d0, g0);
        float p1 = dot(d1, g1);
        float p2 = dot(d2, g2);
        float p3 = dot(d3, g3);
        float tx = r.x - l0.x;
        float ty = r.y - l0.y;
        float v01 = interpolate(p0, p1, tx);
        float v32 = interpolate(p3, p2, tx);
        return interpolate(v01, v32, ty);
    }

    void main() {
      float n = perlin_2d(gl_FragCoord.xy/scale);
      n = 0.5 * n + 0.5;
      gl_FragColor = vec4(n,n,n, 1);
    }
  `,
  attributes: {
    position: regl.buffer([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
  },
  uniforms: {
    scale: regl.prop('scale'),
    tNoise: tNoise,
    tNoiseSize: tNoiseSize
  },
  count: 6
});

renderNoise({
  scale: Math.max(window.innerWidth, window.innerHeight) / 16
});
