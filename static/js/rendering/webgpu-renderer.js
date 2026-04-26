/**
 * WebGPU Renderer
 * WebGPU-first renderer for the Mandelbrot family (Mandelbrot / Julia / Multibrot).
 */

import { CONFIG } from '../core/config.js';
import { devLog } from '../core/logger.js';
import { computeColorForScheme, getColorSchemeIndex } from '../fractals/utils.js';
import { isWebGPUFirstFractalType } from './webgpu-fractals.js';

const WORKGROUP_SIZE = 8;
const PALETTE_SIZE = 512;
const PARAMS_SIZE_BYTES = 48;

function clampByte(x) {
  return Math.max(0, Math.min(255, x | 0));
}

function createPaletteBytes(colorScheme) {
  const scheme =
    typeof colorScheme === 'string' && colorScheme.startsWith('custom:')
      ? colorScheme
      : getColorSchemeIndex(colorScheme);
  const data = new Uint8Array(PALETTE_SIZE * 4);
  const out = new Float32Array(3);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const t = i / (PALETTE_SIZE - 1);
    const rgb = computeColorForScheme(t, scheme, out);
    const o = i * 4;
    data[o + 0] = clampByte(rgb[0] * 255);
    data[o + 1] = clampByte(rgb[1] * 255);
    data[o + 2] = clampByte(rgb[2] * 255);
    data[o + 3] = 255;
  }
  return data;
}

function createPipelines(device, presentationFormat) {
  const computeShaderCode = `
struct Params {
  width: u32,
  height: u32,
  iterations: u32,
  kind: u32, /* fractal kind enum (see JS mapping) */
  zoom: f32,
  offsetX: f32,
  offsetY: f32,
  order: f32, /* multibrot order (2..10) */
  xScale: f32,
  yScale: f32,
  juliaCX: f32,
  juliaCY: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var paletteTex: texture_2d<f32>;
@group(0) @binding(2) var paletteSampler: sampler;
@group(0) @binding(3) var outTex: texture_storage_2d<rgba8unorm, write>;

fn complexPow(z: vec2<f32>, n: f32) -> vec2<f32> {
  if (abs(n - 2.0) < 0.0001) {
    return vec2<f32>(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
  }
  let r = length(z);
  if (r < 0.000001) {
    return vec2<f32>(0.0, 0.0);
  }
  let theta = atan2(z.y, z.x);
  let rn = pow(r, n);
  let nt = n * theta;
  return vec2<f32>(rn * cos(nt), rn * sin(nt));
}

const INV_LOG2: f32 = 1.4426950408889634;

fn fmod(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}

fn fmod3(x: vec3<f32>, y: f32) -> vec3<f32> {
  return x - vec3<f32>(y) * floor(x / vec3<f32>(y));
}

fn fract(x: f32) -> f32 {
  return x - floor(x);
}

fn hashNoise(p: vec2<f32>) -> f32 {
  // GLSL-like: fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)
  return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn barycentric(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> vec3<f32> {
  let v0 = c - a;
  let v1 = b - a;
  let v2 = p - a;
  let dot00 = dot(v0, v0);
  let dot01 = dot(v0, v1);
  let dot02 = dot(v0, v2);
  let dot11 = dot(v1, v1);
  let dot12 = dot(v1, v2);
  let denom = dot00 * dot11 - dot01 * dot01;
  let invDenom = 1.0 / max(denom, 1e-20);
  let u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  let v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  return vec3<f32>(1.0 - u - v, v, u);
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn isInsideRhombus(p: vec2<f32>, center: vec2<f32>, v1: vec2<f32>, v2: vec2<f32>) -> bool {
  let rel = p - center;
  let a = dot(rel, v1);
  let b = dot(rel, v2);
  let v1Len = length(v1);
  let v2Len = length(v2);
  return abs(a) <= v1Len * 0.5 && abs(b) <= v2Len * 0.5;
}

fn isInsideRectangle(p: vec2<f32>, center: vec2<f32>, v1: vec2<f32>, v2: vec2<f32>) -> bool {
  // Same test as rhombus/rectangle in GLSL modules.
  return isInsideRhombus(p, center, v1, v2);
}

fn isInsideTriangle(p: vec2<f32>, v0: vec2<f32>, v1: vec2<f32>, v2: vec2<f32>) -> bool {
  let v0v1 = v1 - v0;
  let v0v2 = v2 - v0;
  let v0p = p - v0;
  let dot00 = dot(v0v2, v0v2);
  let dot01 = dot(v0v2, v0v1);
  let dot02 = dot(v0v2, v0p);
  let dot11 = dot(v0v1, v0v1);
  let dot12 = dot(v0v1, v0p);
  let denom = dot00 * dot11 - dot01 * dot01;
  let invDenom = 1.0 / max(denom, 1e-20);
  let u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  let v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
}

fn isInsideHexagon(p: vec2<f32>, center: vec2<f32>, size: f32) -> bool {
  let PI: f32 = 3.14159265359;
  let rel = p - center;
  let angle = atan2(rel.y, rel.x);
  let dist = length(rel);
  let angle60 = PI / 3.0;
  // normalizedAngle = mod(angle + PI, angle60 * 2) - angle60
  let normalizedAngle = fmod(angle + PI, angle60 * 2.0) - angle60;
  let edgeDist = size * 0.5 / cos(normalizedAngle);
  return dist <= edgeDist;
}

fn polygonVertex(n: u32, i: u32) -> vec2<f32> {
  let PI: f32 = 3.14159265359;
  var angle = f32(i) * 2.0 * PI / f32(n);
  if (n == 3u) {
    angle = angle - PI * 0.5;
  } else if (n == 4u) {
    angle = angle + PI * 0.25;
  } else if (n == 5u) {
    angle = angle - PI * 0.5;
  } else if (n == 6u) {
    angle = angle + 0.0;
  } else {
    angle = angle - PI * 0.5;
  }
  return vec2<f32>(cos(angle), sin(angle));
}

fn isInsidePolygon(p: vec2<f32>, center: vec2<f32>, radius: f32, n: u32) -> bool {
  var i: u32 = 0u;
  loop {
    if (i >= n || i >= 12u) { break; }
    let v1 = polygonVertex(n, i) * radius + center;
    let ni = i + 1u;
    let nextI = select(ni, 0u, ni >= n);
    let v2 = polygonVertex(n, nextI) * radius + center;
    let edge = v2 - v1;
    let toPoint = p - v1;
    let cross = edge.x * toPoint.y - edge.y * toPoint.x;
    if (cross < 0.0) { return false; }
    i = i + 1u;
  }
  return true;
}

fn sierpinskiTriangleValue(c: vec2<f32>, maxIter: u32) -> f32 {
  let v0 = vec2<f32>(0.0, 0.866);
  let v1 = vec2<f32>(-1.0, -0.866);
  let v2 = vec2<f32>(1.0, -0.866);
  var p = c;
  let centerThreshold = 0.333;
  var i: u32 = 0u;
  loop {
    if (i >= maxIter || i >= 200u) { break; }
    let b = barycentric(p, v0, v1, v2);
    if (b.x < 0.0 || b.y < 0.0 || b.z < 0.0) { return f32(i); }
    if (b.x > centerThreshold && b.y > centerThreshold && b.z > centerThreshold) { return f32(i); }
    if (b.x >= b.y && b.x >= b.z) {
      p = (p - v0) * 2.0 + v0;
    } else if (b.y >= b.z) {
      p = (p - v1) * 2.0 + v1;
    } else {
      p = (p - v2) * 2.0 + v2;
    }
    i = i + 1u;
  }
  return f32(maxIter);
}

fn sierpinskiCarpetValue(c: vec2<f32>, uIter: u32) -> f32 {
  let iterations = u32(clamp(f32(uIter) / 15.0, 1.0, 8.0));
  if (c.x < -1.0 || c.x > 1.0 || c.y < -1.0 || c.y > 1.0) { return 0.0; }
  var pos = c * 0.5 + vec2<f32>(0.5);
  var i: u32 = 0u;
  loop {
    if (i >= iterations || i >= 10u) { break; }
    let scaled = pos * 3.0;
    let cell = floor(scaled);
    if (cell.x == 1.0 && cell.y == 1.0) { return 0.0; }
    pos = scaled - floor(scaled);
    i = i + 1u;
  }
  var depth = 0.0;
  pos = c * 0.5 + vec2<f32>(0.5);
  i = 0u;
  loop {
    if (i >= iterations || i >= 10u) { break; }
    let scaled = pos * 3.0;
    let cell = floor(scaled);
    if (cell.x == 1.0 && cell.y == 1.0) {
      depth = depth + f32(i) * 5.0;
      break;
    }
    let centerDist = abs(cell - vec2<f32>(1.0));
    let maxDist = max(centerDist.x, centerDist.y);
    depth = depth + maxDist * 2.0;
    pos = scaled - floor(scaled);
    i = i + 1u;
  }
  return fmod(depth * 10.0, f32(uIter) * 0.9);
}

fn mengerCarpetValue(c: vec2<f32>, uIter: u32) -> f32 {
  let iterations = u32(clamp(f32(uIter) / 15.0, 1.0, 8.0));
  if (c.x < -1.0 || c.x > 1.0 || c.y < -1.0 || c.y > 1.0) { return 0.0; }
  var pos = c * 0.5 + vec2<f32>(0.5);
  var i: u32 = 0u;
  loop {
    if (i >= iterations || i >= 10u) { break; }
    let scaled = pos * 3.0;
    let cell = floor(scaled);
    if (cell.x == 1.0 && cell.y == 1.0) { return 0.0; }
    if (cell.x == 1.0 && cell.y == 0.0) { return 0.0; }
    if (cell.x == 1.0 && cell.y == 2.0) { return 0.0; }
    if (cell.x == 0.0 && cell.y == 1.0) { return 0.0; }
    if (cell.x == 2.0 && cell.y == 1.0) { return 0.0; }
    pos = scaled - floor(scaled);
    i = i + 1u;
  }
  var depth = 0.0;
  pos = c * 0.5 + vec2<f32>(0.5);
  i = 0u;
  loop {
    if (i >= iterations || i >= 10u) { break; }
    let scaled = pos * 3.0;
    let cell = floor(scaled);
    let centerDist = abs(cell - vec2<f32>(1.0));
    let maxDist = max(centerDist.x, centerDist.y);
    let cornerDist = min(centerDist.x, centerDist.y);
    depth = depth + maxDist * 2.0 + cornerDist * 1.5;
    pos = scaled - floor(scaled);
    i = i + 1u;
  }
  return fmod(depth * 10.0, f32(uIter) * 0.9);
}

fn sierpinskiPolygonValue(c: vec2<f32>, uIter: u32, n: u32, scaleFactor: f32, baseRadius: f32) -> f32 {
  let maxDepth = u32(clamp(f32(uIter) / 20.0, 1.0, 6.0));
  var currentPos = c;
  var currentRadius = baseRadius;
  var currentCenter = vec2<f32>(0.0);
  var depth = 0.0;
  var level: u32 = 0u;
  loop {
    if (level >= maxDepth || level >= 6u) { break; }
    if (!isInsidePolygon(currentPos, currentCenter, currentRadius, n)) { return 0.0; }
    let centerRadius = currentRadius * scaleFactor;
    if (isInsidePolygon(currentPos, currentCenter, centerRadius, n)) { return 0.0; }
    let subRadius = currentRadius * scaleFactor;
    var found = false;
    var i: u32 = 0u;
    loop {
      if (i >= n || i >= 12u) { break; }
      let v = polygonVertex(n, i);
      let subCenter = currentCenter + v * currentRadius * (1.0 - scaleFactor);
      if (isInsidePolygon(currentPos, subCenter, subRadius, n)) {
        currentCenter = subCenter;
        currentRadius = subRadius;
        depth = depth + 1.0;
        found = true;
        break;
      }
      i = i + 1u;
    }
    if (!found) { return depth * 15.0 + 10.0; }
    level = level + 1u;
  }
  return depth * 15.0 + f32(maxDepth) * 5.0;
}

fn sierpinskiTetrahedronValue(c: vec2<f32>, uIter: u32) -> f32 {
  let iterations = u32(clamp(f32(uIter) / 20.0, 1.0, 6.0));
  var p = vec3<f32>(c.x, c.y, 0.0) * 1.5;
  var scale = 1.0;
  var inSet = true;
  var depth = 0.0;
  var i: u32 = 0u;
  loop {
    if (i >= iterations || i >= 6u) { break; }
    p = p * scale;
    scale = scale * 2.0;
    p = fmod3(p + vec3<f32>(1.0), 2.0) - vec3<f32>(1.0);
    let dist = length(p);
    if (dist < 0.45) {
      let absP = abs(p);
      let maxCoord = max(max(absP.x, absP.y), absP.z);
      let minCoord = min(min(absP.x, absP.y), absP.z);
      let coordSpread = maxCoord - minCoord;
      if (maxCoord < 0.35 && coordSpread < 0.25) {
        inSet = false;
        break;
      }
    }
    depth = depth + 1.0;
    i = i + 1u;
  }
  if (!inSet || depth == 0.0) { return 0.0; }
  let distFromOrigin = length(c);
  let angle = atan2(c.y, c.x);
  let result = depth * 15.0 + distFromOrigin * 10.0 + sin(angle * 3.0) * 5.0;
  return min(result, f32(uIter) * 0.9);
}

fn sierpinskiGasketValue(c: vec2<f32>, uIter: u32) -> f32 {
  let n = u32(clamp(params.xScale * 6.0 + 3.0, 3.0, 12.0));
  let maxDepth = u32(clamp(f32(uIter) / 30.0, 1.0, 6.0));
  var currentPos = c;
  var currentRadius = 0.85;
  var currentCenter = vec2<f32>(0.0);
  var depth = 0.0;
  var level: u32 = 0u;
  loop {
    if (level >= maxDepth || level >= 6u) { break; }
    if (!isInsidePolygon(currentPos, currentCenter, currentRadius, n)) { return 0.0; }
    // Approximate module scaling factors; key behavior is "remove center" and recurse to vertex sub-polygons
    let scaleFactor = select(1.0 / 2.0, 1.0 / 3.0, n == 6u);
    let centerRadius = currentRadius * scaleFactor;
    if (isInsidePolygon(currentPos, currentCenter, centerRadius, n)) { return 0.0; }
    let subRadius = currentRadius * scaleFactor;
    var found = false;
    var i: u32 = 0u;
    loop {
      if (i >= n || i >= 12u) { break; }
      let v = polygonVertex(n, i);
      let subCenter = currentCenter + v * currentRadius * (1.0 - scaleFactor);
      if (isInsidePolygon(currentPos, subCenter, subRadius, n)) {
        currentCenter = subCenter;
        currentRadius = subRadius;
        depth = depth + 1.0;
        found = true;
        break;
      }
      i = i + 1u;
    }
    if (!found) { return depth * 15.0 + 10.0 + f32(n) * 2.0; }
    level = level + 1u;
  }
  return depth * 15.0 + f32(maxDepth) * 5.0 + f32(n);
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height) {
    return;
  }

  let w = f32(params.width);
  let h = f32(params.height);
  let uv = (vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5) / vec2<f32>(w, h));

  let aspect = w / h;
  let scale = 4.0 / params.zoom;

  // Coordinate transform:
  // - Most fractals follow createFragmentShader: aspect * xScale on X, yScale on Y
  // - sierpinski-gasket intentionally does NOT apply xScale (it uses xScale as a parameter)
  // - multibrot and multibrot-julia intentionally do NOT apply xScale (xScale is the "order" control)
  var xScaleCoord = params.xScale;
  if (params.kind == 2u || params.kind == 3u) {
    xScaleCoord = 1.0;
  }
  let cDefault = vec2<f32>(
    (uv.x - 0.5) * scale * aspect * xScaleCoord + params.offsetX,
    (uv.y - 0.5) * scale * params.yScale + params.offsetY
  );
  let cGasket = vec2<f32>(
    (uv.x - 0.5) * scale * aspect + params.offsetX,
    (uv.y - 0.5) * scale * params.yScale + params.offsetY
  );
  let c = select(cDefault, cGasket, params.kind == 26u);

  // Pixel/shader fractals we implement in compute:
  // 20..26: Sierpinski pixel family (currently not enabled via allowlist)
  // 30: fractal-islands
  // 60..64: tilings family (aperiodic/domino/pinwheel/rhombic/snowflake)
  if ((params.kind >= 20u && params.kind <= 26u) || params.kind == 30u || (params.kind >= 60u && params.kind <= 64u)) {
    let maxIter = max(1u, params.iterations);
    var iterValue: f32 = 0.0;
    if (params.kind == 20u) {
      iterValue = sierpinskiTriangleValue(c, maxIter);
    } else if (params.kind == 21u) {
      iterValue = sierpinskiCarpetValue(c, maxIter);
    } else if (params.kind == 22u) {
      iterValue = mengerCarpetValue(c, maxIter);
    } else if (params.kind == 23u) {
      iterValue = sierpinskiPolygonValue(c, maxIter, 6u, 1.0 / 3.0, 0.85);
    } else if (params.kind == 24u) {
      iterValue = sierpinskiPolygonValue(c, maxIter, 5u, 1.0 / (1.0 + 1.618033988749895), 0.9);
    } else if (params.kind == 25u) {
      iterValue = sierpinskiTetrahedronValue(c, maxIter);
    } else if (params.kind == 26u) {
      iterValue = sierpinskiGasketValue(c, maxIter);
    } else if (params.kind == 30u) {
      // fractal-islands (ported from GLSL module; uses palette texture)
      let iterations = u32(clamp(f32(maxIter) / 15.0, 1.0, 8.0));

      // Membership test
      var pos = clamp(c * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
      var ok = true;
      var i: u32 = 0u;
      loop {
        if (i >= iterations || i >= 10u) { break; }
        let scaled = pos * 3.0;
        let cell = floor(scaled);
        if (
          (cell.x == 1.0 && cell.y == 1.0) ||
          (cell.x == 0.0 && cell.y == 1.0) ||
          (cell.x == 1.0 && cell.y == 0.0) ||
          (cell.x == 1.0 && cell.y == 2.0) ||
          (cell.x == 2.0 && cell.y == 1.0)
        ) {
          ok = false;
          break;
        }
        pos = scaled - floor(scaled);
        i = i + 1u;
      }
      if (!ok) {
        iterValue = 0.0;
      } else {
        var depth = 0.0;
        pos = c * 0.5 + vec2<f32>(0.5);
        i = 0u;
        loop {
          if (i >= iterations || i >= 10u) { break; }
          let scaled = pos * 3.0;
          let cell = floor(scaled);
          if (cell.x == 0.0 && cell.y == 0.0) {
            depth = depth + 10.0;
          } else if (cell.x == 2.0 && cell.y == 0.0) {
            depth = depth + 8.0;
          } else if (cell.x == 0.0 && cell.y == 2.0) {
            depth = depth + 6.0;
          } else if (cell.x == 2.0 && cell.y == 2.0) {
            depth = depth + 4.0;
          }
          let cellCenter = (cell + vec2<f32>(0.5)) / 3.0;
          let distFromCenter = length(pos - cellCenter);
          depth = depth + distFromCenter * 3.0;
          depth = depth + f32(i) * 2.0;
          pos = scaled - floor(scaled);
          i = i + 1u;
        }
        iterValue = fmod(depth * 7.0, f32(maxIter) * 0.9);
      }
    } else if (params.kind == 60u) {
      // aperiodic-tilings
      let PHI: f32 = 1.618033988749;
      let PI: f32 = 3.14159265359;
      let scale = 3.0 + params.yScale * 4.0;
      let p = c * scale;
      let levels = u32(clamp(f32(maxIter) / 20.0, 2.0, 8.0));
      let baseSize: f32 = 3.0;
      let rotation = params.xScale * PI * 2.0;
      var pattern: f32 = 0.0;
      var level: u32 = 0u;
      loop {
        if (level >= levels || level >= 8u) { break; }
        let scaleFactor = mix(2.0, PHI, fmod(f32(level), 2.0));
        let currentSize = baseSize / pow(scaleFactor, f32(level));
        var numTiles: u32 = 1u;
        if (level > 0u) {
          numTiles = u32(pow(6.0, f32(level - 1u))) + 1u;
        }
        var found = false;
        var i: u32 = 0u;
        loop {
          if (i >= numTiles || i >= 50u) { break; }
          let goldenAngle: f32 = 2.399963229728653;
          let angle = f32(i) * goldenAngle + rotation;
          let radius = currentSize * sqrt(f32(i)) * 0.35;
          let tileCenter = vec2<f32>(cos(angle), sin(angle)) * radius;
          let hexSize = currentSize * 0.85;
          if (isInsideHexagon(p, tileCenter, hexSize)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let rhombAngle1 = PI / 6.0 + f32(level) * 0.1;
          let rhombAngle2 = PI / 3.0 - f32(level) * 0.05;
          let v1 = rotate(vec2<f32>(currentSize, 0.0), angle + rhombAngle1);
          let v2 = rotate(vec2<f32>(currentSize * 1.2, 0.0), angle - rhombAngle2);
          if (isInsideRhombus(p, tileCenter, v1, v2)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let v3 = rotate(vec2<f32>(currentSize * 0.9, 0.0), angle + PI / 4.0);
          let v4 = rotate(vec2<f32>(currentSize * 0.9 * 1.4142135623730951, 0.0), angle - PI / 4.0);
          if (isInsideRhombus(p, tileCenter, v3, v4)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let v5 = rotate(vec2<f32>(currentSize * PHI * 0.7, 0.0), angle + PI / 5.0);
          let v6 = rotate(vec2<f32>(currentSize * 0.7, 0.0), angle - PI / 5.0);
          if (isInsideRhombus(p, tileCenter, v5, v6)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          i = i + 1u;
        }
        if (found) { break; }
        level = level + 1u;
      }
      let noise = hashNoise(p) * 0.1;
      let result = pattern + noise;
      iterValue = result * f32(maxIter);
    } else if (params.kind == 61u) {
      // domino-substitution
      let PI: f32 = 3.14159265359;
      let scale = 3.0 + params.yScale * 3.0;
      let p = c * scale;
      let levels = u32(clamp(f32(maxIter) / 20.0, 2.0, 8.0));
      let baseSize: f32 = 3.0;
      let rotation = params.xScale * PI * 2.0;
      var pattern: f32 = 0.0;
      var level: u32 = 0u;
      loop {
        if (level >= levels || level >= 8u) { break; }
        let currentSize = baseSize / pow(2.0, f32(level));
        var numTiles: u32 = 1u;
        if (level > 0u) {
          numTiles = u32(pow(4.0, f32(level - 1u))) + 1u;
        }
        var found = false;
        var i: u32 = 0u;
        loop {
          if (i >= numTiles || i >= 50u) { break; }
          let angle = f32(i) * PI / 2.0 + rotation;
          let radius = currentSize * sqrt(f32(i)) * 0.4;
          let tileCenter = vec2<f32>(cos(angle), sin(angle)) * radius;
          let dominoWidth = currentSize * 1.8;
          let dominoHeight = currentSize * 0.9;
          let v1 = rotate(vec2<f32>(dominoWidth, 0.0), angle);
          let v2 = rotate(vec2<f32>(0.0, dominoHeight), angle);
          if (isInsideRectangle(p, tileCenter, v1, v2)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let dominoWidth2 = currentSize * 0.9;
          let dominoHeight2 = currentSize * 1.8;
          let v3 = rotate(vec2<f32>(dominoWidth2, 0.0), angle);
          let v4 = rotate(vec2<f32>(0.0, dominoHeight2), angle);
          if (isInsideRectangle(p, tileCenter, v3, v4)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let dominoSize = currentSize * 1.2;
          let v5 = rotate(vec2<f32>(dominoSize, 0.0), angle + PI / 4.0);
          let v6 = rotate(vec2<f32>(0.0, dominoSize * 0.5), angle + PI / 4.0);
          if (isInsideRectangle(p, tileCenter, v5, v6)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          i = i + 1u;
        }
        if (found) { break; }
        level = level + 1u;
      }
      let noise = hashNoise(p) * 0.1;
      let result = pattern + noise;
      iterValue = result * f32(maxIter);
    } else if (params.kind == 62u) {
      // pinwheel-tiling
      let iterations = u32(clamp(f32(maxIter) / 20.0, 1.0, 6.0));
      var pos = clamp(c * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
      let baseSize: f32 = 1.0;
      var v0 = vec2<f32>(0.0, 0.0);
      var v1 = vec2<f32>(baseSize, 0.0);
      var v2 = vec2<f32>(0.0, baseSize * 2.0);
      let trianglePos = vec2<f32>(
        pos.x * baseSize,
        pos.y * baseSize * 2.0 * (1.0 - pos.x * 0.5)
      );
      if (!isInsideTriangle(trianglePos, v0, v1, v2)) {
        iterValue = 0.0;
      } else {
        var depth: f32 = 0.0;
        var currentPos = trianglePos;
        var currentV0 = v0;
        var currentV1 = v1;
        var currentV2 = v2;
        var i: u32 = 0u;
        loop {
          if (i >= iterations || i >= 6u) { break; }
          let mid01 = (currentV0 + currentV1) * 0.5;
          let mid02 = (currentV0 + currentV2) * 0.5;
          let mid12 = (currentV1 + currentV2) * 0.5;
          var found = false;
          if (isInsideTriangle(currentPos, currentV0, mid01, mid02)) {
            currentV0 = currentV0;
            currentV1 = mid01;
            currentV2 = mid02;
            depth = depth + 1.0;
            found = true;
          } else if (isInsideTriangle(currentPos, mid01, currentV1, mid12)) {
            currentV0 = mid01;
            currentV1 = currentV1;
            currentV2 = mid12;
            depth = depth + 2.0;
            found = true;
          } else if (isInsideTriangle(currentPos, mid02, mid12, currentV2)) {
            currentV0 = mid02;
            currentV1 = mid12;
            currentV2 = currentV2;
            depth = depth + 3.0;
            found = true;
          } else if (isInsideTriangle(currentPos, mid01, mid02, mid12)) {
            currentV0 = mid01;
            currentV1 = mid02;
            currentV2 = mid12;
            depth = depth + 4.0;
            found = true;
          } else if (isInsideTriangle(currentPos, mid02, mid01, mid12)) {
            currentV0 = mid02;
            currentV1 = mid01;
            currentV2 = mid12;
            depth = depth + 5.0;
            found = true;
          }
          if (!found) {
            break;
          }
          i = i + 1u;
        }
        iterValue = depth * 12.0 + f32(iterations) * 8.0;
      }
    } else if (params.kind == 63u) {
      // rhombic-tiling
      let PHI: f32 = 1.618033988749;
      let PI: f32 = 3.14159265359;
      let scale = 2.0 + params.yScale * 3.0;
      let p = c * scale;
      let levels = u32(clamp(f32(maxIter) / 25.0, 2.0, 8.0));
      let baseSize: f32 = 2.5;
      let rotation = params.xScale * PI * 2.0;
      var pattern: f32 = 0.0;
      var level: u32 = 0u;
      loop {
        if (level >= levels || level >= 8u) { break; }
        let currentSize = baseSize / pow(PHI, f32(level));
        var numTiles: u32 = 1u;
        if (level > 0u) {
          numTiles = u32(pow(5.0, f32(level - 1u))) + 1u;
        }
        var found = false;
        var i: u32 = 0u;
        loop {
          if (i >= numTiles || i >= 50u) { break; }
          let angle = f32(i) * PI * 2.0 / 5.0 + rotation;
          let radius = currentSize * sqrt(f32(i)) * 0.4;
          let tileCenter = vec2<f32>(cos(angle), sin(angle)) * radius;
          let thickAngle = PI / 5.0;
          let v1 = rotate(vec2<f32>(currentSize, 0.0), angle + thickAngle);
          let v2 = rotate(vec2<f32>(currentSize * PHI, 0.0), angle - thickAngle);
          if (isInsideRhombus(p, tileCenter, v1, v2)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let thinAngle = PI / 10.0;
          let v3 = rotate(vec2<f32>(currentSize * PHI, 0.0), angle + thinAngle);
          let v4 = rotate(vec2<f32>(currentSize, 0.0), angle - thinAngle);
          if (isInsideRhombus(p, tileCenter, v3, v4)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let v5 = rotate(vec2<f32>(currentSize * 0.8, 0.0), angle + PI / 6.0);
          let v6 = rotate(vec2<f32>(currentSize * 0.8 * PHI, 0.0), angle - PI / 6.0);
          if (isInsideRhombus(p, tileCenter, v5, v6)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          i = i + 1u;
        }
        if (found) { break; }
        level = level + 1u;
      }
      let noise = hashNoise(p) * 0.1;
      let result = pattern + noise;
      iterValue = result * f32(maxIter);
    } else if (params.kind == 64u) {
      // snowflake-tiling
      let PI: f32 = 3.14159265359;
      let SQRT3: f32 = 1.7320508075688772;
      let scale = 3.0 + params.yScale * 3.0;
      let p = c * scale;
      let levels = u32(clamp(f32(maxIter) / 20.0, 2.0, 8.0));
      let baseSize: f32 = 3.0;
      let rotation = params.xScale * PI * 2.0;
      var pattern: f32 = 0.0;
      var level: u32 = 0u;
      loop {
        if (level >= levels || level >= 8u) { break; }
        let currentSize = baseSize / pow(2.0, f32(level));
        var numTiles: u32 = 1u;
        if (level > 0u) {
          numTiles = u32(pow(6.0, f32(level - 1u))) + 1u;
        }
        var found = false;
        var i: u32 = 0u;
        loop {
          if (i >= numTiles || i >= 50u) { break; }
          let angle = f32(i) * PI / 3.0 + rotation;
          let radius = currentSize * sqrt(f32(i)) * 0.3;
          let tileCenter = vec2<f32>(cos(angle), sin(angle)) * radius;
          let hexSize = currentSize * 0.9;
          if (isInsideHexagon(p, tileCenter, hexSize)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let triSize = currentSize * 0.8;
          let v0 = tileCenter;
          let v1 = tileCenter + rotate(vec2<f32>(triSize, 0.0), angle);
          let v2 = tileCenter + rotate(vec2<f32>(triSize * 0.5, triSize * SQRT3 * 0.5), angle);
          if (isInsideTriangle(p, v0, v1, v2)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          let v3 = tileCenter;
          let v4 = tileCenter + rotate(vec2<f32>(triSize * 0.7, 0.0), angle + PI / 6.0);
          let v5 = tileCenter + rotate(vec2<f32>(triSize * 0.35, triSize * SQRT3 * 0.35), angle + PI / 6.0);
          if (isInsideTriangle(p, v3, v4, v5)) {
            let dist = length(p - tileCenter) / currentSize;
            pattern = mix(f32(level) / max(1.0, f32(levels)), 1.0 - dist, 0.7);
            found = true;
            break;
          }
          i = i + 1u;
        }
        if (found) { break; }
        level = level + 1u;
      }
      let noise = hashNoise(p) * 0.1;
      let result = pattern + noise;
      iterValue = result * f32(maxIter);
    }
    // iterValue is produced by the selected fractal kernel above

    var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    if (iterValue < f32(maxIter)) {
      let t = clamp(iterValue / f32(maxIter), 0.0, 1.0);
      color = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(t, 0.5), 0.0);
      color.a = 1.0;
    }
    textureStore(outTex, vec2<i32>(i32(gid.x), i32(gid.y)), color);
    return;
  }

  var z = vec2<f32>(0.0, 0.0);
  var cc = c;
  // kind:
  // 0=mandelbrot, 1=julia, 2=multibrot, 3=multibrot-julia, 4=burning-ship-julia,
  // 5=phoenix-julia, 6=lambda-julia, 7=hybrid-julia
  if (params.kind == 1u || params.kind == 3u || params.kind == 4u || params.kind == 5u || params.kind == 6u || params.kind == 7u) {
    z = c;
    cc = vec2<f32>(params.juliaCX, params.juliaCY);
  }

  let maxIter = max(1u, params.iterations);
  let order = clamp(params.order, 2.0, 10.0);

  var i: u32 = 0u;
  var smoothIter: f32 = f32(maxIter);
  loop {
    if (i >= maxIter) { break; }
    let r2 = dot(z, z);
    if (r2 > 4.0) {
      // Smooth coloring (matches our GLSL createFragmentShader behavior)
      // log_zn = log(|z|^2) / 2 = log(|z|)
      let log_zn = 0.5 * log(max(r2, 1e-16));
      let nu = log(max(log_zn * INV_LOG2, 1e-16)) * INV_LOG2;
      smoothIter = f32(i) + 1.0 - nu;
      break;
    }

    if (params.kind == 4u) {
      // Burning Ship Julia: z = (|Re(z)| + i|Im(z)|)^2 + c
      let ax = abs(z.x);
      let ay = abs(z.y);
      z = vec2<f32>(ax * ax - ay * ay, 2.0 * ax * ay) + cc;
    } else if (params.kind == 5u) {
      // Phoenix Julia: z_new = z^2 + c + p * z_prev
      // p is derived from xScale/yScale in [-1, 1]
      let p = clamp(vec2<f32>((params.xScale - 0.5) * 2.0, (params.yScale - 0.5) * 2.0), vec2<f32>(-1.0), vec2<f32>(1.0));
      let prev = z;
      let sq = vec2<f32>(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
      z = sq + cc + p * prev;
    } else if (params.kind == 6u) {
      // Lambda Julia: z_{n+1} = λ * z_n * (1 - z_n), where λ = c
      let zx2 = z.x * z.x;
      let zy2 = z.y * z.y;
      let real_part = z.x - zx2 + zy2;
      let imag_part = z.y - 2.0 * z.x * z.y;
      z = vec2<f32>(
        cc.x * real_part - cc.y * imag_part,
        cc.x * imag_part + cc.y * real_part
      );
    } else if (params.kind == 7u) {
      // Hybrid Julia: alternate between z^2 and z^3
      let isEven = (i & 1u) == 0u;
      if (isEven) {
        z = vec2<f32>(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + cc;
      } else {
        // z^3 = (x^3 - 3xy^2) + i(3x^2y - y^3)
        let zx2 = z.x * z.x;
        let zy2 = z.y * z.y;
        let real3 = zx2 * z.x - 3.0 * z.x * zy2;
        let imag3 = 3.0 * zx2 * z.y - zy2 * z.y;
        z = vec2<f32>(real3, imag3) + cc;
      }
    } else {
      // Mandelbrot / Julia / Multibrot / Multibrot-Julia (order determines power)
      z = complexPow(z, order) + cc;
    }

    i = i + 1u;
  }

  var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  if (smoothIter < f32(maxIter)) {
    let t = clamp(smoothIter / f32(maxIter), 0.0, 1.0);
    color = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(t, 0.5), 0.0);
    color.a = 1.0;
  }

  textureStore(outTex, vec2<i32>(i32(gid.x), i32(gid.y)), color);
}
`;

  const renderShaderCode = `
struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var out: VSOut;
  let x = f32((vid << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vid & 2u) * 2.0 - 1.0;
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = vec2<f32>(x * 0.5 + 0.5, y * 0.5 + 0.5);
  return out;
}

@group(0) @binding(0) var img: texture_2d<f32>;
@group(0) @binding(1) var imgSampler: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(img, imgSampler, uv);
}
`;

  const lineShaderCode = `
struct Params {
  width: u32,
  height: u32,
  iterations: u32,
  kind: u32,
  zoom: f32,
  offsetX: f32,
  offsetY: f32,
  order: f32,
  xScale: f32,
  yScale: f32,
  juliaCX: f32,
  juliaCY: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var paletteTex: texture_2d<f32>;
@group(0) @binding(2) var paletteSampler: sampler;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) vPosition: vec2<f32>,
};

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> VSOut {
  var out: VSOut;
  let w = f32(params.width);
  let h = f32(params.height);
  let aspect = w / h;
  let scale = 4.0 / params.zoom;
  let relative = position - vec2<f32>(params.offsetX, params.offsetY);
  var scaled = vec2<f32>(
    relative.x / (scale * params.xScale),
    relative.y / (scale * params.yScale)
  );
  scaled.x = scaled.x / aspect;
  out.pos = vec4<f32>(scaled * 2.0, 0.0, 1.0);
  out.vPosition = position;
  return out;
}

@fragment
fn fs_main(@location(0) vPosition: vec2<f32>) -> @location(0) vec4<f32> {
  let dist = length(vPosition);
  let angle = atan2(vPosition.y, vPosition.x);

  // 40=sierpinski-arrowhead, 41=sierpinski-curve, 42=sierpinski-lsystem
  // 50=koch, 51=quadratic-koch
  var t: f32;
  if (params.kind == 50u) {
    // Koch: t = length(vPosition)*0.5 + 0.5
    t = clamp(dist * 0.5 + 0.5, 0.0, 1.0);
  } else {
    var distMul = 1.5;
    var angleMul = 0.3;
    if (params.kind == 41u) {
      distMul = 1.9;
      angleMul = 0.28;
    } else if (params.kind == 42u) {
      distMul = 2.0;
      angleMul = 0.3;
    } else if (params.kind == 51u) {
      distMul = 3.0;
      angleMul = 0.0;
    }
    t = fract(dist * distMul + angle * angleMul);
  }

  let rgb = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(t, 0.5), 0.0).rgb;
  return vec4<f32>(rgb, 1.0);
}
`;

  const computeModule = device.createShaderModule({ code: computeShaderCode });
  const renderModule = device.createShaderModule({ code: renderShaderCode });
  const lineModule = device.createShaderModule({ code: lineShaderCode });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: computeModule, entryPoint: 'main' },
  });

  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format: presentationFormat }] },
    primitive: { topology: 'triangle-strip' },
  });

  const linePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: lineModule,
      entryPoint: 'vs_main',
      buffers: [
        {
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        },
      ],
    },
    fragment: { module: lineModule, entryPoint: 'fs_main', targets: [{ format: presentationFormat }] },
    primitive: { topology: 'line-strip' },
  });

  return { computePipeline, renderPipeline, linePipeline };
}

function generateSierpinskiArrowheadVertices(iterationLevel) {
  const vertices = [];

  function arrowhead(x1, y1, x2, y2, depth, direction) {
    if (depth >= iterationLevel) {
      if (depth === iterationLevel) vertices.push(x2, y2);
      return;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const x1_3 = x1 + dx / 3;
    const y1_3 = y1 + dy / 3;
    const x2_3 = x1 + (2 * dx) / 3;
    const y2_3 = y1 + (2 * dy) / 3;

    const segmentLength = Math.sqrt((x2_3 - x1_3) ** 2 + (y2_3 - y1_3) ** 2);
    const height = (segmentLength * Math.sqrt(3)) / 2;
    const perpX = -dy;
    const perpY = dx;
    const perpLength = Math.sqrt(perpX ** 2 + perpY ** 2) || 1;
    const normalizedPerpX = (perpX / perpLength) * height;
    const normalizedPerpY = (perpY / perpLength) * height;
    const midX = (x1_3 + x2_3) / 2;
    const midY = (y1_3 + y2_3) / 2;
    const tipX = midX + normalizedPerpX * direction;
    const tipY = midY + normalizedPerpY * direction;

    arrowhead(x1, y1, x1_3, y1_3, depth + 1, direction);
    arrowhead(x1_3, y1_3, tipX, tipY, depth + 1, -direction);
    arrowhead(tipX, tipY, x2_3, y2_3, depth + 1, -direction);
    arrowhead(x2_3, y2_3, x2, y2, depth + 1, direction);
  }

  const h = 0.866;
  const w = 1.0;
  const topX = 0;
  const topY = h * 0.67;
  const leftX = -w;
  const leftY = -h * 0.33;
  const rightX = w;
  const rightY = -h * 0.33;

  vertices.push(topX, topY);
  arrowhead(topX, topY, leftX, leftY, 0, 1);
  arrowhead(leftX, leftY, rightX, rightY, 0, -1);
  arrowhead(rightX, rightY, topX, topY, 0, 1);

  return new Float32Array(vertices);
}

function generateSierpinskiCurveVertices(iterationLevel) {
  const vertices = [];
  function sierpinski(x1, y1, x2, y2, depth, rot) {
    if (depth >= iterationLevel) {
      vertices.push(x2, y2);
      return;
    }
    const width = x2 - x1;
    const height = y2 - y1;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const squares = [
      [x1, y1, x1 + halfWidth, y1 + halfHeight],
      [x1, y1 + halfHeight, x1 + halfWidth, y1 + halfHeight * 2],
      [x1 + halfWidth, y1 + halfHeight, x1 + halfWidth * 2, y1 + halfHeight * 2],
      [x1 + halfWidth, y1, x1 + halfWidth * 2, y1 + halfHeight],
    ];

    let pattern, rotations;
    if (rot === 0) {
      pattern = [0, 3, 2, 1];
      rotations = [0, 1, 2, 3];
    } else if (rot === 1) {
      pattern = [3, 2, 1, 0];
      rotations = [1, 2, 3, 0];
    } else if (rot === 2) {
      pattern = [2, 1, 0, 3];
      rotations = [2, 3, 0, 1];
    } else {
      pattern = [1, 0, 3, 2];
      rotations = [3, 0, 1, 2];
    }

    for (let i = 0; i < pattern.length; i++) {
      const idx = pattern[i];
      const [sqX1, sqY1, sqX2, sqY2] = squares[idx];
      sierpinski(sqX1, sqY1, sqX2, sqY2, depth + 1, rotations[i]);
    }
  }

  vertices.push(-0.5, -0.5);
  sierpinski(-0.5, -0.5, 0.5, 0.5, 0, 0);
  return new Float32Array(vertices);
}

function generateSierpinskiLSystemVertices(iterationLevel, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  let lsystemString = 'A';
  for (let i = 0; i < iterationLevel; i++) {
    let newString = '';
    for (let j = 0; j < lsystemString.length; j++) {
      const char = lsystemString[j];
      if (char === 'A') newString += 'B-A-B';
      else if (char === 'B') newString += 'A+B+A';
      else newString += char;
    }
    lsystemString = newString;
  }

  const vertices = [];
  let x = 0;
  let y = -0.5;
  let currentAngle = Math.PI / 2;
  const stepLength = 1.0;
  vertices.push(x, y);

  for (let i = 0; i < lsystemString.length; i++) {
    const char = lsystemString[i];
    if (char === 'A' || char === 'B') {
      x += Math.cos(currentAngle) * stepLength;
      y += Math.sin(currentAngle) * stepLength;
      vertices.push(x, y);
    } else if (char === '+') {
      currentAngle += angleRad;
    } else if (char === '-') {
      currentAngle -= angleRad;
    }
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 2) {
    minX = Math.min(minX, vertices[i]);
    maxX = Math.max(maxX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]);
    maxY = Math.max(maxY, vertices[i + 1]);
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const maxSize = Math.max(width, height) || 1;
  const scale = 2.5 / maxSize;

  const out = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    out[i] = (vertices[i] - centerX) * scale;
    out[i + 1] = (vertices[i + 1] - centerY) * scale;
  }
  return out;
}

function generateKochSnowflakeVertices(iterations) {
  // Ported from `static/js/fractals/2d/koch.js` (CPU vertex generation)
  const h = 0.75;
  const w = h * (Math.sqrt(3) / 2);
  const SQRT3_OVER_2 = Math.sqrt(3) / 2;
  const ONE_THIRD = 1 / 3;
  const TWO_THIRDS = 2 / 3;
  const HALF = 0.5;

  let vertices = [0, h * TWO_THIRDS, -w, -h * ONE_THIRD, w, -h * ONE_THIRD];
  let vertexCount = 3;

  for (let i = 0; i < iterations; i++) {
    const newVertexCount = vertexCount * 4;
    const newVertices = new Float32Array(newVertexCount * 2);
    let writeIndex = 0;

    for (let j = 0; j < vertexCount; j++) {
      const aIndex = j * 2;
      const bIndex = ((j + 1) % vertexCount) * 2;
      const ax = vertices[aIndex];
      const ay = vertices[aIndex + 1];
      const bx = vertices[bIndex];
      const by = vertices[bIndex + 1];

      newVertices[writeIndex++] = ax;
      newVertices[writeIndex++] = ay;

      const dx = bx - ax;
      const dy = by - ay;
      const p1x = ax + dx * ONE_THIRD;
      const p1y = ay + dy * ONE_THIRD;
      newVertices[writeIndex++] = p1x;
      newVertices[writeIndex++] = p1y;

      const v_dx = dx * ONE_THIRD;
      const v_dy = dy * ONE_THIRD;
      newVertices[writeIndex++] = p1x + v_dx * HALF - v_dy * SQRT3_OVER_2;
      newVertices[writeIndex++] = p1y + v_dx * SQRT3_OVER_2 + v_dy * HALF;

      newVertices[writeIndex++] = ax + dx * TWO_THIRDS;
      newVertices[writeIndex++] = ay + dy * TWO_THIRDS;
    }

    vertices = newVertices;
    vertexCount = newVertexCount;
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 2) {
    minX = Math.min(minX, vertices[i]);
    maxX = Math.max(maxX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]);
    maxY = Math.max(maxY, vertices[i + 1]);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const maxSize = Math.max(width, height);
  const scale = maxSize > 0 ? 1.5 / maxSize : 1.0;

  const scaledVertices = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    scaledVertices[i] = (vertices[i] - centerX) * scale;
    scaledVertices[i + 1] = (vertices[i + 1] - centerY) * scale;
  }
  return scaledVertices;
}

function generateQuadraticKochIslandVertices(iterations) {
  // Ported from `static/js/fractals/2d/quadratic-koch.js`
  let vertices = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
    [-0.5, -0.5],
  ];

  for (let iter = 0; iter < iterations; iter++) {
    const newVertices = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      const p1 = vertices[i];
      const p2 = vertices[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;
      const segmentLen = len / 4;

      const points = [
        p1,
        [p1[0] + ux * segmentLen, p1[1] + uy * segmentLen],
        [p1[0] + ux * segmentLen + px * segmentLen, p1[1] + uy * segmentLen + py * segmentLen],
        [p1[0] + ux * 2 * segmentLen + px * segmentLen, p1[1] + uy * 2 * segmentLen + py * segmentLen],
        [p1[0] + ux * 2 * segmentLen + px * 2 * segmentLen, p1[1] + uy * 2 * segmentLen + py * 2 * segmentLen],
        [p1[0] + ux * 3 * segmentLen + px * 2 * segmentLen, p1[1] + uy * 3 * segmentLen + py * 2 * segmentLen],
        [p1[0] + ux * 3 * segmentLen + px * segmentLen, p1[1] + uy * 3 * segmentLen + py * segmentLen],
        [p1[0] + ux * 4 * segmentLen + px * segmentLen, p1[1] + uy * 4 * segmentLen + py * segmentLen],
      ];

      for (let j = 0; j < points.length - 1; j++) newVertices.push(points[j]);
    }
    newVertices.push(newVertices[0]);
    vertices = newVertices;
  }

  const flatVertices = new Float32Array(vertices.length * 2);
  for (let i = 0; i < vertices.length; i++) {
    flatVertices[i * 2] = vertices[i][0];
    flatVertices[i * 2 + 1] = vertices[i][1];
  }
  return flatVertices;
}

/**
 * WebGPU Renderer class
 */
export class WebGPURenderer {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} capabilities - WebGPU capabilities
   */
  constructor(canvas, capabilities) {
    this.canvas = canvas;
    this.device = capabilities.device;
    this.adapter = capabilities.adapter;
    this.format = capabilities.format || 'bgra8unorm';

    // Initialize context
    this.context = canvas.getContext('webgpu');
    if (!this.context) {
      throw new Error('WebGPU context not available');
    }

    // Configure context
    this.context.configure({
      device: this.device,
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    const presentationFormat = this.format;
    const { computePipeline, renderPipeline, linePipeline } = createPipelines(
      this.device,
      presentationFormat
    );
    this.computePipeline = computePipeline;
    this.renderPipeline = renderPipeline;
    this.linePipeline = linePipeline;

    this.paramsBuffer = this.device.createBuffer({
      size: PARAMS_SIZE_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.paletteSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    this.imageSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    this.paletteTexture = null;
    this.paletteColorScheme = null;
    this.outputTexture = null;
    this.outputView = null;
    this.outputWidth = 0;
    this.outputHeight = 0;
  }

  /**
   * Render fractal using WebGPU compute shaders
   * @param {Object} params - Fractal parameters
   * @param {Object} paletteTexture - Palette texture
   */
  async render(fractalType, params) {
    if (!isWebGPUFirstFractalType(fractalType)) return;

    if (
      fractalType === 'sierpinski-arrowhead' ||
      fractalType === 'sierpinski-curve' ||
      fractalType === 'sierpinski-lsystem' ||
      fractalType === 'koch' ||
      fractalType === 'quadratic-koch'
    ) {
      await this.renderLineFractal(fractalType, params);
      return;
    }

    const width = Math.max(1, this.canvas.width | 0);
    const height = Math.max(1, this.canvas.height | 0);

    if (this.outputTexture === null || this.outputWidth !== width || this.outputHeight !== height) {
      if (this.outputTexture) {
        this.outputTexture.destroy();
      }
      this.outputTexture = this.device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC,
      });
      this.outputView = this.outputTexture.createView();
      this.outputWidth = width;
      this.outputHeight = height;
    }

    if (this.paletteTexture === null || this.paletteColorScheme !== params.colorScheme) {
      const bytes = createPaletteBytes(params.colorScheme);
      if (this.paletteTexture) this.paletteTexture.destroy();
      this.paletteTexture = this.device.createTexture({
        size: [PALETTE_SIZE, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });
      this.device.queue.writeTexture(
        { texture: this.paletteTexture },
        bytes,
        { bytesPerRow: PALETTE_SIZE * 4, rowsPerImage: 1 },
        { width: PALETTE_SIZE, height: 1, depthOrArrayLayers: 1 }
      );
      this.paletteColorScheme = params.colorScheme;
    }

    const kind =
      fractalType === 'mandelbrot'
        ? 0
        : fractalType === 'julia'
          ? 1
          : fractalType === 'multibrot'
            ? 2
            : fractalType === 'multibrot-julia'
              ? 3
              : fractalType === 'burning-ship-julia'
                ? 4
                : fractalType === 'phoenix-julia'
                  ? 5
                  : fractalType === 'lambda-julia'
                    ? 6
                    : fractalType === 'hybrid-julia'
                      ? 7
                      : fractalType === 'sierpinski'
                        ? 20
                        : fractalType === 'sierpinski-carpet'
                          ? 21
                          : fractalType === 'menger-carpet'
                            ? 22
                            : fractalType === 'sierpinski-hexagon'
                              ? 23
                              : fractalType === 'sierpinski-pentagon'
                                ? 24
                                : fractalType === 'sierpinski-tetrahedron'
                                  ? 25
                                  : fractalType === 'sierpinski-gasket'
                                    ? 26
                                    : fractalType === 'fractal-islands'
                                      ? 30
                                      : fractalType === 'aperiodic-tilings'
                                        ? 60
                                        : fractalType === 'domino-substitution'
                                          ? 61
                                          : fractalType === 'pinwheel-tiling'
                                            ? 62
                                            : fractalType === 'rhombic-tiling'
                                              ? 63
                                              : fractalType === 'snowflake-tiling'
                                                ? 64
                  : 0;

    const isMultibrot = kind === 2 || kind === 3;
    const order = isMultibrot ? 2.0 + (params.xScale ?? 0) * 8.0 : 2.0;

    const buf = new ArrayBuffer(PARAMS_SIZE_BYTES);
    const u32 = new Uint32Array(buf, 0, 4);
    const f32 = new Float32Array(buf, 16);

    u32[0] = width;
    u32[1] = height;
    u32[2] = Math.max(1, params.iterations | 0);
    u32[3] = kind;

    f32[0] = params.zoom ?? 1.0;
    f32[1] = params.offset?.x ?? 0.0;
    f32[2] = params.offset?.y ?? 0.0;
    f32[3] = Math.max(2.0, Math.min(10.0, order));
    f32[4] = params.xScale ?? 1.0;
    f32[5] = params.yScale ?? 1.0;
    f32[6] = params.juliaC?.x ?? 0.0;
    f32[7] = params.juliaC?.y ?? 0.0;

    this.device.queue.writeBuffer(this.paramsBuffer, 0, buf);

    const computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: this.paletteTexture.createView() },
        { binding: 2, resource: this.paletteSampler },
        { binding: 3, resource: this.outputView },
      ],
    });

    const renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.outputView },
        { binding: 1, resource: this.imageSampler },
      ],
    });

    const encoder = this.device.createCommandEncoder();

    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(
      Math.ceil(width / WORKGROUP_SIZE),
      Math.ceil(height / WORKGROUP_SIZE),
      1
    );
    computePass.end();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: 'store',
        },
      ],
    });
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(4, 1, 0, 0);
    renderPass.end();

    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
  }

  async renderLineFractal(fractalType, params) {
    const width = Math.max(1, this.canvas.width | 0);
    const height = Math.max(1, this.canvas.height | 0);

    if (this.paletteTexture === null || this.paletteColorScheme !== params.colorScheme) {
      const bytes = createPaletteBytes(params.colorScheme);
      if (this.paletteTexture) this.paletteTexture.destroy();
      this.paletteTexture = this.device.createTexture({
        size: [PALETTE_SIZE, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });
      this.device.queue.writeTexture(
        { texture: this.paletteTexture },
        bytes,
        { bytesPerRow: PALETTE_SIZE * 4, rowsPerImage: 1 },
        { width: PALETTE_SIZE, height: 1, depthOrArrayLayers: 1 }
      );
      this.paletteColorScheme = params.colorScheme;
    }

    const kind =
      fractalType === 'sierpinski-arrowhead'
        ? 40
        : fractalType === 'sierpinski-curve'
          ? 41
          : fractalType === 'sierpinski-lsystem'
            ? 42
            : fractalType === 'koch'
              ? 50
              : 51; // quadratic-koch

    const buf = new ArrayBuffer(PARAMS_SIZE_BYTES);
    const u32 = new Uint32Array(buf, 0, 4);
    const f32 = new Float32Array(buf, 16);
    u32[0] = width;
    u32[1] = height;
    u32[2] = Math.max(1, params.iterations | 0);
    u32[3] = kind;
    f32[0] = params.zoom ?? 1.0;
    f32[1] = params.offset?.x ?? 0.0;
    f32[2] = params.offset?.y ?? 0.0;
    f32[3] = 2.0;
    f32[4] = params.xScale ?? 1.0;
    f32[5] = params.yScale ?? 1.0;
    f32[6] = 0.0;
    f32[7] = 0.0;
    this.device.queue.writeBuffer(this.paramsBuffer, 0, buf);

    const iterationLevel =
      fractalType === 'sierpinski-arrowhead'
        ? Math.max(0, Math.min(7, Math.floor((params.iterations ?? 0) / 28)))
        : fractalType === 'sierpinski-curve'
          ? Math.max(0, Math.min(6, Math.floor((params.iterations ?? 0) / 33)))
          : fractalType === 'sierpinski-lsystem'
            ? Math.max(0, Math.min(8, Math.floor((params.iterations ?? 0) / 25)))
            : Math.max(0, Math.min(6, Math.floor((params.iterations ?? 0) / 30)));

    const angleDeg = 45 + (params.xScale ?? 0) * 30;

    const vertices =
      fractalType === 'sierpinski-arrowhead'
        ? generateSierpinskiArrowheadVertices(iterationLevel)
        : fractalType === 'sierpinski-curve'
          ? generateSierpinskiCurveVertices(iterationLevel)
          : fractalType === 'sierpinski-lsystem'
            ? generateSierpinskiLSystemVertices(iterationLevel, angleDeg)
            : fractalType === 'koch'
              ? generateKochSnowflakeVertices(iterationLevel)
              : generateQuadraticKochIslandVertices(iterationLevel);

    if (!this._lineVertexBuffer || this._lineVertexCapacity < vertices.byteLength) {
      if (this._lineVertexBuffer) this._lineVertexBuffer.destroy();
      this._lineVertexBuffer = this.device.createBuffer({
        size: Math.max(vertices.byteLength, 1024),
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this._lineVertexCapacity = this._lineVertexBuffer.size;
    }
    this.device.queue.writeBuffer(this._lineVertexBuffer, 0, vertices);

    const bindGroup = this.device.createBindGroup({
      layout: this.linePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: this.paletteTexture.createView() },
        { binding: 2, resource: this.paletteSampler },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.linePipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, this._lineVertexBuffer);
    pass.draw(vertices.length / 2, 1, 0, 0);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      if (this.outputTexture) this.outputTexture.destroy();
      if (this.paletteTexture) this.paletteTexture.destroy();
    } catch {
      // best-effort
    }
  }
}

/**
 * Initialize WebGPU renderer
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Promise resolving to renderer or null if not available
 */
export async function initWebGPURenderer(canvas, options = {}) {
  const { initWebGPU, formatWebGPUCapabilities } = await import('./webgpu-capabilities.js');

  // Check if WebGPU is enabled
  if (!CONFIG.features.webgpu) {
    return null;
  }

  // Initialize WebGPU
  const capabilities = await initWebGPU({
    powerPreference: options.powerPreference || 'high-performance',
  });

  if (!capabilities.supported) {
    if (import.meta.env?.DEV) {
      console.warn(
        `%c[WebGPU]%c ${capabilities.error || 'Not supported'}`,
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    }
    return null;
  }

  // Log capabilities in development
  devLog.log(
    `%c[WebGPU Capabilities]%c\n${formatWebGPUCapabilities(capabilities)}`,
    'color: #9C27B0; font-weight: bold;',
    'color: inherit; font-family: monospace; font-size: 11px;'
  );

  try {
    const renderer = new WebGPURenderer(canvas, {
      ...capabilities,
      format: 'bgra8unorm',
    });
    return renderer;
  } catch (error) {
    console.error('Failed to create WebGPU renderer:', error);
    return null;
  }
}
