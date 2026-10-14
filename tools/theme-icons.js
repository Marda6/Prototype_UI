// Theme copies of the icon SVGs: light copies of every icon for the light themes (Silver, Frost).
// Run after adding or changing an icon:  node tools/theme-icons.js
//
// The light themes are the dark ones turned inside out: lightness is mirrored in OKLab
// (the dark background becomes the light one and the light ink the dark one), the hue stays.
//   · neutral colours (greys, white, black) — lightness mirrored, so the layers keep their contrast;
//     the light ones (the icon ink) then softened towards the inset (ICON_SOFT), since a black glyph
//     on light reads harsher than a white one on dark;
//     unlike the text tokens, icon opacities are not raised (solid glyphs read heavy enough), and
//     the lighter tones of an icon (below 0.9) get lighter still (a → a^1.5, 0.48 → 0.33), or in a
//     two-tone icon they nearly merge with the main tone on light;
//   · the green and the yellow of ENCY — the theme's compensated accents;
//   · any other colour (red, operation colours, move types) — kept when it reads on the light
//     inset (contrast 3:1 for icons), otherwise darkened to 3:1 with its hue kept.
// Writes <dir>/light/*.svg next to each icon folder and packages/project/theme-icons.css, which
// swaps <img> sources by CSS (content:url) so the src the scripts compare stays the same.
const fs = require('fs'), path = require('path');
const PKG = path.join(__dirname, '..', 'packages');
const DIRS = [
  {dir: 'project/assets', url: 'assets/light/'},            // urls relative to project/theme-icons.css
  {dir: 'shared-ui/assets', url: '../shared-ui/assets/light/'}
];
// LIGHT_INSET: the greyest light surface icons sit on (frames, header) — accents are checked against it
const DARK_BG = '#0e1010', DARK_INK = '#f5f5f5', LIGHT_INSET = '#e5e8e8';
const GREEN = '#05784f', YELLOW = '#ac7d06';                 // = --ec-green / icon yellow of the light themes
// dark ink on light reads heavier than light ink on dark: the mirrored ink of an icon is softened
// towards the inset by this share: a soft black (#101010 → #252525); more (0.22, #3e3f3f) read muddy
const ICON_SOFT = 0.1;
const ACCENT = {'#00a36d': GREEN, '#00a37c': GREEN, '#06b289': GREEN, '#00cb9a': GREEN, '#00d8a2': GREEN,
                '#ffc127': YELLOW, '#ffc22c': YELLOW, '#ffc247': YELLOW};

/* ---------- colour math: sRGB ↔ OKLab, WCAG contrast ---------- */
const hex2 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const toHex = c => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const gam = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
function oklab(c){ const [r, g, b] = c.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; }
function fromOklab([L, a, b]){
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(gam); }
const lum = c => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const MIRROR = oklab(hex2(DARK_BG))[0] + oklab(hex2(DARK_INK))[0];
const inGamut = c => c.every(v => v > -0.0005 && v < 1.0005);
// the colour at lightness L with the hue of (a, b), chroma reduced until it fits sRGB
function fit(L, a, b){ for (let k = 1; k >= 0; k -= 0.01){ const c = fromOklab([L, a * k, b * k]); if (inGamut(c)) return c; } return fromOklab([L, 0, 0]); }

const cache = {};
function light(hex){
  hex = hex.toLowerCase(); if (hex.length === 4) hex = '#' + hex.slice(1).replace(/./g, '$&$&');
  if (cache[hex]) return cache[hex];
  let out;
  const c = hex2(hex), [L, a, b] = oklab(c), chroma = Math.hypot(a, b);
  if (ACCENT[hex]) out = ACCENT[hex];
  else if (chroma < 0.04){
    let m = fromOklab([MIRROR - L, a, b]).map(v => Math.min(1, Math.max(0, v)));
    if (L > 0.5) m = m.map((v, i) => v * (1 - ICON_SOFT) + hex2(LIGHT_INSET)[i] * ICON_SOFT);
    out = toHex(m);
  }
  else if (contrast(c, hex2(LIGHT_INSET)) >= 3) out = hex;
  else {
    let best = c, bd = 9;
    for (let x = 0.15; x < 0.98; x += 0.0005){ const t = fit(x, a, b), d = Math.abs(contrast(t, hex2(LIGHT_INSET)) - 3); if (d < bd){ bd = d; best = t; } }
    out = toHex(best);
  }
  return cache[hex] = out;
}
const NAMED = {white: '#ffffff', black: '#000000'};

/* ---------- convert ---------- */
const HEX = /(?<!url\()#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const NAMED_RE = /((?:fill|stroke|stop-color|color)\s*(?:=\s*"|:\s*))(white|black)\b/g;
const OPACITY = /((?:fill-|stroke-)?opacity\s*(?:=\s*"|:\s*))([0-9.]+)/g;
let css = '/* Generated by tools/theme-icons.js — do not edit. A theme\'s copy of an icon replaces the\n' +
          '   default one in place; the img src (which the scripts compare) stays the same. */\n';
let count = 0;
for (const {dir, url} of DIRS){
  const src = path.join(PKG, dir), dst = path.join(src, 'light');
  fs.mkdirSync(dst, {recursive: true});
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.svg')).sort()){
    let s = fs.readFileSync(path.join(src, f), 'utf8');
    const colours = (s.match(HEX) || []).concat((s.match(NAMED_RE) || []).map(m => NAMED[m.match(/white|black/)[0]]));
    // a monochrome light icon: its lighter tones (opacity below 0.9; the main tone is 0.96 or 1)
    // get lighter still
    const mono = colours.length && colours.every(h => { const [L, a, b] = oklab(hex2(h)); return Math.hypot(a, b) < 0.04 && L > 0.5; });
    // one pass, so a converted colour is never converted again
    s = s.replace(new RegExp(HEX.source + '|' + NAMED_RE.source, 'g'),
      (m, pre, n) => n ? pre + light(NAMED[n]) : light(m));
    if (mono) s = s.replace(OPACITY, (m, pre, v) => pre + (+v < 0.9 ? +Math.pow(+v, 1.5).toFixed(3) : v));
    fs.writeFileSync(path.join(dst, f), s);
    css += ':root[data-theme$="-light"] img[src$="/' + f + '"]{content:url(' + url + f + ');}\n';
    count++;
  }
}

fs.writeFileSync(path.join(PKG, 'project', 'theme-icons.css'), css);
console.log(count + ' light icons written');
