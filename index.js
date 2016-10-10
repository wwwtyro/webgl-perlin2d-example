"use strict";

const regl = require('regl')();

function randomVec2() {
  while (true) {
    let x = Math.random() * 2 - 1;
    let y = Math.random() * 2 - 1;
    let d = Math.sqrt(x*x + y*y);
    if (d > 1) continue;
    return {x: x/d, y: y/d};
  }
}

function generateNoiseTexture(regl, rng, size) {
  let l = size * size * 2;
  let array = new Uint8Array(l);
  for (let i = 0; i < l; i++) {
    let r = randomVec2();
    array[i * 2 + 0] = Math.round(0.5 * (1.0 + r.x) * 255);
    array[i * 2 + 1] = Math.round(0.5 * (1.0 + r.y) * 255);
  }
  return regl.texture({
    format: 'luminance alpha',
    width: size,
    height: size,
    wrapS: 'repeat',
    wrapT: 'repeat',
    data: array
  });
}

let tNoiseSize = 512;
let tNoise = generateNoiseTexture(regl, null, tNoiseSize);

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

    float smootherstep(float a, float b, float r) {
        r = clamp(r, 0.0, 1.0);
        r = r * r * r * (r * (6.0 * r - 15.0) + 10.0);
        return mix(a, b, r);
    }

    float perlin_2d(vec2 p) {
        vec2 p0 = floor(p);
        vec2 p1 = p0 + vec2(1, 0);
        vec2 p2 = p0 + vec2(1, 1);
        vec2 p3 = p0 + vec2(0, 1);
        vec2 d0 = texture2D(tNoise, p0/tNoiseSize).ba;
        vec2 d1 = texture2D(tNoise, p1/tNoiseSize).ba;
        vec2 d2 = texture2D(tNoise, p2/tNoiseSize).ba;
        vec2 d3 = texture2D(tNoise, p3/tNoiseSize).ba;
        d0 = 2.0 * d0 - 1.0;
        d1 = 2.0 * d1 - 1.0;
        d2 = 2.0 * d2 - 1.0;
        d3 = 2.0 * d3 - 1.0;
        vec2 p0p = p - p0;
        vec2 p1p = p - p1;
        vec2 p2p = p - p2;
        vec2 p3p = p - p3;
        float dp0 = dot(d0, p0p);
        float dp1 = dot(d1, p1p);
        float dp2 = dot(d2, p2p);
        float dp3 = dot(d3, p3p);
        float fx = p.x - p0.x;
        float fy = p.y - p0.y;
        float m01 = smootherstep(dp0, dp1, fx);
        float m32 = smootherstep(dp3, dp2, fx);
        float m01m32 = smootherstep(m01, m32, fy);
        return m01m32;
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
