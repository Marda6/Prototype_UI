/**
 * CAM Robot Preview — extracted from the Approach / Return prototype.
 * Dependency-free browser ES module. See README.md for integration examples.
 *
 * Procedural demo robot, orthographic projection, Canvas 2D rendering.
 * Joint interpolation is illustrative; no controller, IK or collision solver.
 */

export const AXES = Object.freeze(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'E1', 'E2']);

export const DEFAULT_POSE = Object.freeze({
  A1: 5.153, A2: -78.774, A3: 117.061, A4: 24.299,
  A5: 34.839, A6: -100.39, E1: 0, E2: 0,
});

// Camera yaw and pitch are in radians; robot angles are in degrees.
export const DEFAULT_CAMERA = Object.freeze({ yaw: -0.68, pitch: 0.49, zoom: 1 });

// ENCY: flat viewport background (--ec-bg) instead of the green gradient; red approach/return path
const COLORS = Object.freeze({
  background: '#0e1010', backgroundCenter: '#0e1010', grid: '#1e2325',
  basePlate: '#6e7971', base: '#d68c35', baseRing: '#414d46',
  link: '#f0a144', joint: '#df903a', jointCap: '#515d54', jointBack: '#7b887f',
  toolHolder: '#bbc6be', tool: '#f1d17a', tip: '#ffe29d',
  fixtureBase: '#67766a', fixtureLeg: '#65776b', fixtureTop: '#7e9384',
  workpiece: '#8fb3a0', clamp: '#59685f', edge: '#c2bd9327',
  path: '#ff5c7799', pathSelected: '#ff5c77', pathEnd: '#ff5c77aa', pathEndSelected: '#ffd0d8',
  marker: '#f5f5f5b8', markerActive: '#f5f5f5', markerLeader: '#f5f5f53d',
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, n) => a.map(v => v * n);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));
const matVec = (m, v) => [dot(m.slice(0, 3), v), dot(m.slice(3, 6), v), dot(m.slice(6, 9), v)];
const LIGHT = unit([-0.3, -0.4, 1]);
const BOX_FACES = [[0, 3, 2, 1], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5], [4, 5, 6, 7]];

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

function readPose(input, base, name = 'pose') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`${name} must be an object with axis values.`);
  }
  for (const key of Object.keys(input)) {
    if (!AXES.includes(key)) throw new TypeError(`Unknown axis ${name}.${key}.`);
  }
  const result = {};
  for (const key of AXES) {
    const value = Object.prototype.hasOwnProperty.call(input, key) ? input[key] : base?.[key];
    result[key] = finite(value, `${name}.${key}`);
  }
  return result;
}

function mix(from, to, progress) {
  const pose = {};
  for (const key of AXES) pose[key] = from[key] + (to[key] - from[key]) * progress;
  return pose;
}

/** Linear interpolation of all eight axes, in degrees. Progress is clamped to 0…1. */
export function interpolatePose(from, to, progress) {
  return mix(readPose(from), readPose(to), clamp(finite(progress, 'progress'), 0, 1));
}

function matMul(a, b) {
  const result = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      result.push(a[row * 3] * b[col] + a[row * 3 + 1] * b[col + 3] + a[row * 3 + 2] * b[col + 6]);
    }
  }
  return result;
}

function rotation(axis, degrees) {
  const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  if (axis === 'x') return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** Demo forward kinematics. Replace this function to introduce a different robot. */
function buildRobot(pose) {
  let orientation = rotation('z', pose.E1);
  let position = [0, 0, 200];
  const links = [], joints = [];

  function joint(name, axis, length, radius) {
    const vector = axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1];
    joints.push({ name, p: [...position], axis: matVec(orientation, vector), radius });
    orientation = matMul(orientation, rotation(axis, pose[name]));
    if (length) {
      const next = add(position, matVec(orientation, [length, 0, 0]));
      links.push({ a: [...position], b: next, radius: radius * 0.64 });
      position = next;
    }
  }

  joint('A1', 'z', 0, 83);
  joint('A2', 'y', 450, 74);
  joint('A3', 'y', 400, 61);
  joint('A4', 'x', 90, 39);
  joint('A5', 'y', 70, 32);
  joint('A6', 'x', 0, 27);
  return {
    links, joints, wrist: [...position],
    toolEnd: add(position, matVec(orientation, [155, 0, 0])),
  };
}

/** Tool tip [x, y, z] in the demo world; geometry lengths use millimetres. */
export function getToolPosition(pose) {
  return buildRobot(readPose(pose)).toolEnd;
}

function shade(hex, brightness) {
  return `rgb(${[1, 3, 5].map(i => Math.round(clamp(parseInt(hex.slice(i, i + 2), 16) * brightness, 0, 255))).join(',')})`;
}

function face(output, points, color, edge = true) {
  const normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
  output.push({ points, color: shade(color, 0.56 + 0.44 * Math.max(0, dot(normal, LIGHT))), edge });
}

function boxCorners(min, max) {
  return [
    [min[0], min[1], min[2]], [max[0], min[1], min[2]],
    [max[0], max[1], min[2]], [min[0], max[1], min[2]],
    [min[0], min[1], max[2]], [max[0], min[1], max[2]],
    [max[0], max[1], max[2]], [min[0], max[1], max[2]],
  ];
}

function box(output, min, max, color, transform = p => p) {
  const vertices = boxCorners(min, max).map(transform);
  for (const indices of BOX_FACES) face(output, indices.map(i => vertices[i]), color);
}

function beam(output, a, b, radius, color) {
  const direction = unit(sub(b, a));
  const u = unit(cross(direction, Math.abs(direction[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1]));
  const v = unit(cross(direction, u));
  const vertices = [];
  for (const end of [a, b]) {
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      vertices.push(add(end, add(mul(u, radius * x), mul(v, radius * y))));
    }
  }
  for (const indices of BOX_FACES) face(output, indices.map(i => vertices[i]), color);
}

function cylinder(output, center, axis, radius, length, color) {
  const count = 18, direction = unit(axis);
  const u = unit(cross(direction, Math.abs(direction[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1]));
  const v = cross(direction, u), a = [], b = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 2 * i / count;
    const offset = add(mul(u, Math.cos(angle) * radius), mul(v, Math.sin(angle) * radius));
    a.push(add(center, add(offset, mul(direction, -length / 2))));
    b.push(add(center, add(offset, mul(direction, length / 2))));
  }
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    face(output, [a[i], a[j], b[j], b[i]], color, false);
  }
  face(output, a.slice().reverse(), color);
  face(output, b, color);
}

function fixtureTransform(pose) {
  const pivot = [695, -295, 180], orientation = rotation('y', pose.E2);
  return point => add(pivot, matVec(orientation, sub(point, pivot)));
}

/** Demo meshes, deliberately independent of the editor and its command types. */
function buildScene(pose, robot) {
  const output = [], c = COLORS;
  box(output, [-145, -125, -30], [145, 125, 10], c.basePlate);
  box(output, [-99, -99, 10], [99, 99, 155], c.base);
  cylinder(output, [0, 0, 172], [0, 0, 1], 106, 32, c.baseRing);
  for (const link of robot.links) beam(output, link.a, link.b, link.radius, c.link);
  robot.joints.forEach((joint, i) => {
    cylinder(output, joint.p, joint.axis, joint.radius, joint.radius * 1.4, c.joint);
    cylinder(output, add(joint.p, mul(joint.axis, joint.radius * 0.77)), joint.axis, joint.radius * 0.69, 12, c.jointCap);
    if (i > 2) cylinder(output, add(joint.p, mul(joint.axis, -joint.radius * 0.78)), joint.axis, joint.radius * 0.55, 10, c.jointBack);
  });
  const toolMiddle = add(robot.wrist, mul(sub(robot.toolEnd, robot.wrist), 0.58));
  beam(output, robot.wrist, toolMiddle, 16, c.toolHolder);
  beam(output, toolMiddle, robot.toolEnd, 7, c.tool);

  box(output, [560, -405, -30], [830, -185, 12], c.fixtureBase);
  box(output, [588, -382, 12], [610, -208, 158], c.fixtureLeg);
  box(output, [780, -382, 12], [802, -208, 158], c.fixtureLeg);
  const transform = fixtureTransform(pose);
  box(output, [553, -414, 160], [837, -176, 180], c.fixtureTop, transform);
  box(output, [608, -366, 180], [782, -224, 259], c.workpiece, transform);
  box(output, [586, -376, 180], [608, -214, 213], c.clamp, transform);
  box(output, [782, -376, 180], [804, -214, 213], c.clamp, transform);
  return output;
}

// Bounds include the robot's thickness and the rotating fixture, not just its TCP.
function poseBounds(pose) {
  const robot = buildRobot(pose);
  const points = boxCorners([-165, -145, -45], [165, 145, 200]);
  points.push(...boxCorners([540, -435, -45], [850, -155, 160]));
  points.push(...boxCorners([550, -420, 158], [840, -170, 265]).map(fixtureTransform(pose)));
  for (const joint of robot.joints) {
    const r = joint.radius * 1.2;
    points.push(...boxCorners(sub(joint.p, [r, r, r]), add(joint.p, [r, r, r])));
  }
  points.push(...boxCorners(sub(robot.toolEnd, [20, 20, 20]), add(robot.toolEnd, [20, 20, 20])));
  return points;
}

function readSegments(input, samples) {
  if (!Array.isArray(input)) throw new TypeError('segments must be an array.');
  const ids = new Set();
  return input.map((item, index) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) {
      throw new TypeError(`segments[${index}].id must be a nonempty string.`);
    }
    if (ids.has(item.id)) throw new TypeError(`Duplicate segment id: ${item.id}.`);
    ids.add(item.id);
    const from = readPose(item.from, undefined, `segments[${index}].from`);
    const to = readPose(item.to, undefined, `segments[${index}].to`);
    const poses = Array.from({ length: samples + 1 }, (_, i) => mix(from, to, i / samples));
    return {
      id: item.id, from, to,
      points: poses.map(pose => buildRobot(pose).toolEnd),
      bounds: poses.flatMap(poseBounds),
    };
  });
}

function readCamera(patch, base = DEFAULT_CAMERA) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('camera must be an object.');
  for (const key of Object.keys(patch)) {
    if (!['yaw', 'pitch', 'zoom'].includes(key)) throw new TypeError(`Unknown camera field: ${key}.`);
    finite(patch[key], `camera.${key}`);
  }
  const camera = { ...base, ...patch };
  camera.pitch = clamp(camera.pitch, 0.08, 1.2);
  camera.zoom = clamp(camera.zoom, 0.5, 3);
  return camera;
}

/** Mount into an empty div with a defined height. Each instance owns one canvas. */
export class RobotPreview {
  constructor(container, options = {}) {
    if (!container?.ownerDocument?.createElement || typeof container.appendChild !== 'function') {
      throw new TypeError('RobotPreview requires a DOM container element.');
    }
    const samples = options.trajectorySamples ?? 28;
    if (!Number.isInteger(samples) || samples < 2 || samples > 240) {
      throw new RangeError('trajectorySamples must be an integer from 2 to 240.');
    }
    this._pose = readPose(options.pose ?? {}, DEFAULT_POSE);
    this._camera = readCamera(options.camera ?? {});
    this._segments = readSegments(options.segments ?? [], samples);
    this._selected = options.selectedSegmentId ?? null;
    if (this._selected !== null && !this._segments.some(s => s.id === this._selected)) {
      throw new RangeError(`Unknown selected segment: ${this._selected}.`);
    }
    if (options.onSegmentSelect != null && typeof options.onSegmentSelect !== 'function') {
      throw new TypeError('onSegmentSelect must be a function.');
    }
    this._onSelect = options.onSegmentSelect ?? null;
    this._hover = null;
    // ENCY: point markers for non-motion commands (stops, waits, events) — see setMarkers()
    this._markers = []; this._hitMarkers = [];
    this._pixelRatioCap = clamp(finite(options.pixelRatioCap ?? 2, 'pixelRatioCap'), 1, 4);
    this._samples = samples;
    this._visibility = { grid: true, axes: true, trajectory: true };
    this._interactive = options.interactive !== false;
    this._container = container;
    this._window = container.ownerDocument.defaultView;
    this._destroyed = false;
    this._listeners = [];
    this._drag = null;
    this._hitPaths = [];
    this._width = 0;
    this._height = 0;
    this._scale = 1;
    this._center = [0, 0];
    this._bounds = [];

    const canvas = container.ownerDocument.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
    this._canvas = canvas;
    this._ctx = context;
    Object.assign(canvas.style, {
      display: 'block', width: '100%', height: '100%',
      touchAction: this._interactive ? 'none' : 'auto',
      cursor: this._interactive ? 'grab' : 'default',
    });
    canvas.setAttribute('aria-label', options.ariaLabel ?? 'Robot preview. Drag or use arrow keys to orbit; scroll or use plus and minus to zoom; F to fit.');
    canvas.setAttribute('role', 'img');
    if (this._interactive) canvas.tabIndex = 0;
    container.appendChild(canvas);

    this._refreshBounds();
    if (this._interactive) this._bindControls();
    const Observer = this._window?.ResizeObserver;
    if (Observer) {
      this._observer = new Observer(() => this.resize());
      this._observer.observe(container);
    }
    // Also catches window/DPR changes; resize() is available for custom layouts.
    if (this._window) this._listen(this._window, 'resize', () => this.resize());
    this.resize();
  }

  _assertAlive() {
    if (this._destroyed) throw new Error('RobotPreview has been destroyed. Create a new instance to mount again.');
  }

  getPose() {
    this._assertAlive();
    return { ...this._pose };
  }

  /** Accepts a partial pose; unspecified axes keep their current values. */
  setPose(patch) {
    this._assertAlive();
    this._pose = readPose(patch, this._pose);
    this._draw(); // Camera intentionally stays fixed during playback.
  }

  /** Each segment is { id: string, from: completePose, to: completePose }. */
  setSegments(segments, { fit = true } = {}) {
    this._assertAlive();
    const next = readSegments(segments, this._samples);
    this._segments = next;
    if (!this._knows(this._selected)) this._selected = null;
    this._refreshBounds();
    if (fit) {
      this._camera.zoom = 1;
      this._fit();
    }
    this._draw();
  }

  /** Highlight a path or a marker. Programmatic selection does not trigger onSegmentSelect. */
  setSelectedSegment(id) {
    this._assertAlive();
    if (id !== null && !this._knows(id)) {
      throw new RangeError(`Unknown segment: ${id}.`);
    }
    this._selected = id;
    this._draw();
  }
  _knows(id) {
    return id === null || this._segments.some(s => s.id === id) || this._markers.some(m => m.id === id);
  }

  /** ENCY: markers = [{ id, pose, kind: 'stop' | 'wait' | 'event' }] drawn at the tool tip of `pose`.
      Markers take part in hover / click selection exactly like path legs. */
  setMarkers(markers) {
    this._assertAlive();
    if (!Array.isArray(markers)) throw new TypeError('markers must be an array.');
    this._markers = markers.map(m => ({
      id: String(m.id), kind: m.kind || 'event', point: getToolPosition(readPose(m.pose, DEFAULT_POSE)),
    }));
    if (!this._knows(this._selected)) this._selected = null;
    this._draw();
  }

  getCamera() {
    this._assertAlive();
    return { ...this._camera };
  }

  setCamera(patch) {
    this._assertAlive();
    this._camera = readCamera(patch, this._camera);
    this._refreshBounds();
    this._fit();
    this._draw();
  }

  /** Reset zoom and fit the current robot plus all sampled path poses. */
  fitToView() {
    this._assertAlive();
    this._camera.zoom = 1;
    this._refreshBounds();
    this._fit();
    this._draw();
  }

  setVisibility(patch) {
    this._assertAlive();
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('visibility must be an object.');
    for (const [key, value] of Object.entries(patch)) {
      if (!['grid', 'axes', 'trajectory'].includes(key) || typeof value !== 'boolean') {
        throw new TypeError('Visibility accepts boolean grid, axes and trajectory fields.');
      }
    }
    Object.assign(this._visibility, patch);
    this._draw();
  }

  resize() {
    if (this._destroyed) return;
    const rect = this._canvas.getBoundingClientRect();
    this._width = Math.max(0, rect.width);
    this._height = Math.max(0, rect.height);
    if (!this._width || !this._height) return;
    const ratio = Math.min(this._window?.devicePixelRatio || 1, this._pixelRatioCap);
    this._canvas.width = Math.max(1, Math.round(this._width * ratio));
    this._canvas.height = Math.max(1, Math.round(this._height * ratio));
    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this._refreshBounds();
    this._fit();
    this._draw();
  }

  /** Idempotent cleanup: canvas, observer, pointer capture and all listeners. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._observer?.disconnect();
    this._endDrag();
    for (const [target, type, handler, options] of this._listeners) {
      target.removeEventListener(type, handler, options);
    }
    this._listeners = [];
    this._canvas.remove();
    this._segments = [];
    this._bounds = [];
    this._hitPaths = [];
    this._onSelect = null;
  }

  _rawProject(point) {
    const { yaw, pitch } = this._camera;
    const x = Math.cos(yaw) * point[0] - Math.sin(yaw) * point[1];
    const y = Math.sin(yaw) * point[0] + Math.cos(yaw) * point[1];
    return [x, Math.sin(pitch) * y - Math.cos(pitch) * point[2], Math.cos(pitch) * y + Math.sin(pitch) * point[2]];
  }

  _project(point) {
    const q = this._rawProject(point), scale = this._scale * this._camera.zoom;
    return [this._width * 0.5 + (q[0] - this._center[0]) * scale, this._height * 0.51 + (q[1] - this._center[1]) * scale, q[2]];
  }

  _refreshBounds() {
    this._bounds = poseBounds(this._pose).concat(...this._segments.map(segment => segment.bounds));
  }

  _fit() {
    if (!this._width || !this._height) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const point of this._bounds) {
      const [x, y] = this._rawProject(point);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    this._center = [(minX + maxX) / 2, (minY + maxY) / 2];
    this._scale = Math.min(Math.max(1, this._width - 48) / (maxX - minX + 60), Math.max(1, this._height - 40) / (maxY - minY + 80));
  }

  _line(points, color, width = 1, dash = []) {
    if (points.length < 2) return;
    const ctx = this._ctx;
    ctx.beginPath();
    points.forEach((point, index) => {
      const [x, y] = this._project(point);
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.stroke(); ctx.setLineDash([]);
  }

  _draw() {
    const W = this._width, H = this._height;
    if (!W || !H || this._destroyed) return;
    const ctx = this._ctx, c = COLORS;
    ctx.clearRect(0, 0, W, H);
    this._hitPaths = [];
    const gradient = ctx.createRadialGradient(W * 0.46, H * 0.55, 0, W * 0.46, H * 0.55, Math.max(W, H) * 0.7);
    gradient.addColorStop(0, c.backgroundCenter); gradient.addColorStop(1, c.background);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    if (this._visibility.grid) {
      for (let x = -400; x <= 1200; x += 160) this._line([[x, -650, -45], [x, 500, -45]], c.grid, 0.65);
      for (let y = -650; y <= 500; y += 160) this._line([[-400, y, -45], [1200, y, -45]], c.grid, 0.65);
    }
    const robot = buildRobot(this._pose), faces = buildScene(this._pose, robot);
    for (const polygon of faces) {
      polygon.projected = polygon.points.map(point => this._project(point));
      polygon.depth = polygon.projected.reduce((sum, p) => sum + p[2], 0) / polygon.projected.length;
    }
    faces.sort((a, b) => a.depth - b.depth);
    for (const polygon of faces) {
      ctx.beginPath();
      polygon.projected.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fillStyle = polygon.color; ctx.fill();
      if (polygon.edge) { ctx.strokeStyle = c.edge; ctx.lineWidth = 0.6; ctx.stroke(); }
    }
    if (this._visibility.trajectory) {
      // Selected path is painted and hit-tested above the other paths.
      const rank = s => (s.id === this._selected ? 2 : s.id === this._hover ? 1 : 0);
      const paths = [...this._segments].sort((a, b) => rank(a) - rank(b));
      for (const segment of paths) {
        const selected = segment.id === this._selected, hovered = !selected && segment.id === this._hover;
        // ENCY: the whole route stays readable (solid 1.5px); hovered leg brightens, selected is thicker too
        this._line(segment.points, selected || hovered ? c.pathSelected : c.path, selected ? 2.5 : hovered ? 2 : 1.5);
        const projected = segment.points.map(point => this._project(point));
        const end = projected[projected.length - 1];
        ctx.beginPath(); ctx.arc(end[0], end[1], selected ? 3.6 : hovered ? 3 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle = selected ? c.pathEndSelected : c.pathEnd; ctx.fill();
        this._hitPaths.push({ id: segment.id, points: projected });
      }
    }
    const tip = this._project(robot.toolEnd);
    ctx.beginPath(); ctx.arc(tip[0], tip[1], 3.2, 0, Math.PI * 2);
    ctx.fillStyle = c.tip; ctx.fill(); ctx.strokeStyle = '#514f36'; ctx.lineWidth = 1; ctx.stroke();
    this._drawMarkers();
    if (this._visibility.axes) this._drawAxes();
  }

  _drawAxes() {
    const ctx = this._ctx, ox = 25, oy = this._height - 25;
    ctx.font = '11px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'left';
    for (const [vector, label, color] of [
      [[38, 0, 0], 'X', '#d59581'], [[0, 38, 0], 'Y', '#94b69a'], [[0, 0, 38], 'Z', '#8baac4'],
    ]) {
      const q = this._rawProject(vector), dx = q[0] * 0.55, dy = q[1] * 0.55;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + dx, oy + dy);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = color; ctx.fillText(label, ox + dx + 3, oy + dy + 3);
    }
  }

  // ENCY: markers of non-motion commands. Several markers at one spot stack upwards.
  // stop — red octagon · wait — ring with a clock hand · event — diamond
  _drawMarkers() {
    this._hitMarkers = [];
    if (!this._visibility.trajectory || !this._markers.length) return;
    const ctx = this._ctx, c = COLORS, seen = new Map();
    for (const m of this._markers) {
      const p = this._project(m.point), key = `${Math.round(p[0] / 6)}:${Math.round(p[1] / 6)}`;
      const n = seen.get(key) || 0; seen.set(key, n + 1);
      const x = p[0], y = p[1] - 14 - n * 16;
      const selected = m.id === this._selected, hovered = !selected && m.id === this._hover;
      const r = selected ? 7 : hovered ? 6.5 : 5.5;
      // leader from the tool point to the (stacked) marker
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(x, y + r); ctx.strokeStyle = c.markerLeader; ctx.lineWidth = 1; ctx.stroke();
      const fill = m.kind === 'stop' ? (selected || hovered ? c.pathSelected : c.path)
                 : (selected || hovered ? c.markerActive : c.marker);
      ctx.beginPath();
      if (m.kind === 'stop') {
        for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; const px = x + r * Math.cos(a), py = y + r * Math.sin(a); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      } else if (m.kind === 'wait') {
        ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = fill; ctx.lineWidth = selected ? 2 : 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.45, y - r * 0.6); ctx.stroke();
      } else {
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
      }
      if (selected) { ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.strokeStyle = c.markerActive; ctx.lineWidth = 1; ctx.stroke(); }
      this._hitMarkers.push({ id: m.id, x, y, r: r + 4 });
    }
  }

  _nearest(x, y) {
    let best = 12, result = null;
    // markers sit on top of the paths, so they win the hit test
    for (const m of [...this._hitMarkers].reverse()) {
      const d = Math.hypot(x - m.x, y - m.y);
      if (d <= m.r && d < best) { best = d; result = m.id; }
    }
    if (result !== null) return result;
    for (const path of [...this._hitPaths].reverse()) {
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1], b = path.points[i];
        const dx = b[0] - a[0], dy = b[1] - a[1], lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared, 0, 1) : 0;
        const distance = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
        if (distance < best) { best = distance; result = path.id; }
      }
    }
    return result;
  }

  _listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push([target, type, handler, options]);
  }

  _endDrag() {
    const id = this._drag?.id;
    this._drag = null;
    if (id !== undefined && this._canvas.hasPointerCapture?.(id)) this._canvas.releasePointerCapture(id);
    this._canvas.style.cursor = this._interactive ? 'grab' : 'default';
  }

  _bindControls() {
    const canvas = this._canvas;
    this._listen(canvas, 'pointerdown', event => {
      if (event.button !== 0 || this._drag) return;
      this._drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
      canvas.style.cursor = 'grabbing';
    });
    this._listen(canvas, 'pointermove', event => {
      const drag = this._drag;
      if (!drag) {
        // ENCY: hover highlight of the path leg under the cursor
        const rect = canvas.getBoundingClientRect();
        const id = this._nearest(event.clientX - rect.left, event.clientY - rect.top);
        if (id !== this._hover) {
          this._hover = id;
          canvas.style.cursor = id !== null ? 'pointer' : 'grab';
          this._draw();
        }
        return;
      }
      if (event.pointerId !== drag.id) return;
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
      if (!drag.moved && !moved) return;
      drag.moved = true;
      this._camera.yaw += (event.clientX - drag.x) * 0.009;
      this._camera.pitch = clamp(this._camera.pitch + (event.clientY - drag.y) * 0.006, 0.08, 1.2);
      drag.x = event.clientX; drag.y = event.clientY;
      this._refreshBounds(); this._fit(); this._draw();
    });
    this._listen(canvas, 'pointerup', event => {
      const drag = this._drag;
      if (!drag || event.pointerId !== drag.id) return;
      const click = !drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <= 4;
      this._endDrag();
      if (click) {
        const rect = canvas.getBoundingClientRect();
        const id = this._nearest(event.clientX - rect.left, event.clientY - rect.top);
        if (id !== null) { this.setSelectedSegment(id); this._onSelect?.(id); }
      }
    });
    this._listen(canvas, 'pointerleave', () => {
      if (this._hover === null) return;
      this._hover = null; canvas.style.cursor = this._drag ? 'grabbing' : 'grab'; this._draw();
    });
    this._listen(canvas, 'pointercancel', event => { if (event.pointerId === this._drag?.id) this._endDrag(); });
    this._listen(canvas, 'lostpointercapture', event => { if (event.pointerId === this._drag?.id) this._endDrag(); });
    this._listen(canvas, 'wheel', event => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this._height : 1);
      this._camera.zoom = clamp(this._camera.zoom * Math.exp(-delta * 0.0015), 0.5, 3);
      this._draw();
    }, { passive: false });
    this._listen(canvas, 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const patch = {};
      if (event.key === 'ArrowLeft') patch.yaw = this._camera.yaw - 0.09;
      else if (event.key === 'ArrowRight') patch.yaw = this._camera.yaw + 0.09;
      else if (event.key === 'ArrowUp') patch.pitch = this._camera.pitch - 0.06;
      else if (event.key === 'ArrowDown') patch.pitch = this._camera.pitch + 0.06;
      else if (event.key === '+' || event.key === '=') patch.zoom = this._camera.zoom * 1.1;
      else if (event.key === '-') patch.zoom = this._camera.zoom / 1.1;
      else if (event.key.toLowerCase() === 'f') { event.preventDefault(); this.fitToView(); return; }
      else return;
      event.preventDefault(); this.setCamera(patch);
    });
  }
}
