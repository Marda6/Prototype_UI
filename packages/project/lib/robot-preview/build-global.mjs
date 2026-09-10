// Optional: regenerate the classic build after changing robot-preview.js.
// Run: node build-global.mjs
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('./robot-preview.js', import.meta.url), 'utf8');
const body = source.replace(/^export /gm, '');
const exports = 'RobotPreview, AXES, DEFAULT_POSE, DEFAULT_CAMERA, interpolatePose, getToolPosition';
await writeFile(new URL('./robot-preview.global.js', import.meta.url),
  '// Generated from robot-preview.js by build-global.mjs. Edit the source module.\n' +
  '(function (global) {\n"use strict";\n' + body +
  '\nglobal.CamRobotPreview = Object.freeze({ ' + exports + ' });\n})(globalThis);\n');
