/* ENCY Core — workspace v2. Interactions are added as blocks are designed. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const icon = (id) => `<svg><use href="#${id}"/></svg>`;

/* ----------------------------------------------------------- project data */
function op(id, name, type, tool, time, p) { return { id, name, type, tool, time, params: p }; }
const OPS = {
  faceMill1: op('faceMill1','Face Milling 1','Face Milling','40mm End Mill','0:52',{n:3200,vf:1280,fz:0.20,ap:1.5,ae:30,plunge:400}),
  hole1:     op('hole1','Hole machining 1','Hole machining','8mm Drill','0:24',{n:4200,vf:320,fz:0.04,ap:8.0,ae:8,plunge:160}),
  rough1:    op('rough1','Roughing waterline 1','Roughing waterline','16mm End Mill','2:41',{n:3600,vf:1450,fz:0.10,ap:2.0,ae:11,plunge:500}),
  rough2:    op('rough2','Roughing waterline 2','Roughing waterline','16mm End Mill','1:58',{n:3600,vf:1450,fz:0.10,ap:2.0,ae:11,plunge:500}),
  cont25:    op('cont25','2.5D contouring 1','2.5D contouring','8mm End Mill','0:47',{n:5000,vf:900,fz:0.06,ap:4.0,ae:6,plunge:300}),
  p2rough0:  op('p2rough0','Roughing waterline','Roughing waterline','40mm End Mill','3:12',{n:2400,vf:1600,fz:0.22,ap:2.5,ae:28,plunge:500}),
  p2rough1:  op('p2rough1','Roughing waterline 1','Roughing waterline','16mm End Mill','2:05',{n:3600,vf:1450,fz:0.10,ap:2.0,ae:11,plunge:500}),
  p2cont:    op('p2cont','2D contouring 1','2D contouring','8mm End Mill','0:39',{n:5000,vf:900,fz:0.06,ap:5.0,ae:6,plunge:300}),
  p3hole:    op('p3hole','Hole machining 1','Hole machining','8mm Drill','0:22',{n:4200,vf:320,fz:0.04,ap:8.0,ae:8,plunge:160}),
  p3cont1:   op('p3cont1','2D contouring 1','2D contouring','8mm End Mill','0:35',{n:5000,vf:900,fz:0.06,ap:5.0,ae:6,plunge:300}),
  p3cont2:   op('p3cont2','2D contouring 2','2D contouring','65mm Slot mill','0:29',{n:1200,vf:480,fz:0.10,ap:3.0,ae:4,plunge:200}),
  s2face:    op('s2face','Face Milling 2','Face Milling','40mm End Mill','0:48',{n:3200,vf:1280,fz:0.20,ap:1.5,ae:30,plunge:400}),
  s2rough:   op('s2rough','Roughing waterline 1','Roughing waterline','16mm End Mill','1:52',{n:3600,vf:1450,fz:0.10,ap:2.0,ae:11,plunge:500}),
  s2cont:    op('s2cont','2D contouring 1','2D contouring','8mm End Mill','0:41',{n:5000,vf:900,fz:0.06,ap:5.0,ae:6,plunge:300}),
  s2chamf:   op('s2chamf','Chamfering 1','Chamfering','8mm End Mill','0:18',{n:6000,vf:700,fz:0.05,ap:0.6,ae:4,plunge:250}),
  s2hole:    op('s2hole','Hole machining 1','Hole machining','8mm Drill','0:26',{n:4200,vf:320,fz:0.04,ap:8.0,ae:8,plunge:160}),
};
const SETUPS = [
  { id:'setup1', name:'Setup 1',
    wp:{ x:'34.8', y:'436.7', z:'949.4', stock:'42.0 × 168.0 × 52.0 mm', fixture:'Workpiece' },
    parts:[ {name:'Part 1',ops:['faceMill1','hole1','rough1','rough2','cont25']},
            {name:'Part 2',ops:['p2rough0','p2rough1','p2cont']},
            {name:'Part 3',ops:['p3hole','p3cont1','p3cont2']} ] },
  { id:'setup2', name:'Setup 2', collapsed:true,
    wp:{ x:'34.8', y:'436.7', z:'78.0', stock:'42.0 × 168.0 × 52.0 mm', fixture:'Workpiece' },
    parts:[ {name:'Part 1',ops:['s2face','s2rough','s2cont']},
            {name:'Part 2',ops:['s2chamf','s2hole']} ] },
];
/* hreg/dreg: NC register numbers (H#/D#); null = not assigned yet */
const TOOLS = [
  { tno:'T10',  name:'40mm End Mill',  kind:'End mill',      dia:40.0, shank:40, flutes:2, fluteLen:10.0, lenBelowH:55.0, oal:100.0, cornerRad:null, hreg:10,   dreg:10 },
  { tno:'T62',  name:'8mm End Mill',   kind:'End mill',      dia:8.0,  shank:8,  flutes:2, fluteLen:22.0, lenBelowH:50.0, oal:63.0,  cornerRad:null, hreg:62,   dreg:62 },
  { tno:'T63',  name:'16mm End Mill',  kind:'End mill',      dia:16.0, shank:16, flutes:2, fluteLen:32.0, lenBelowH:80.0, oal:92.0,  cornerRad:null, hreg:63,   dreg:63 },
  { tno:'T137', name:'8mm Drill',      kind:'Drill',         dia:8.0,  shank:8,  flutes:2, fluteLen:40.0, lenBelowH:70.0, oal:117.0, cornerRad:null, hreg:null, dreg:null },
  { tno:'T138', name:'65mm Slot mill', kind:'Undercut tool', dia:65.0, shank:27, flutes:4, fluteLen:6.0,  lenBelowH:90.0, oal:135.0, cornerRad:10.0, hreg:138,  dreg:138 },
];

const parseTime = (t) => { const p = t.split(':').map(Number); return p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1]; };
const fmtTime = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60,pad=(n)=>String(n).padStart(2,'0'); return h>0?`${h}:${pad(m)}:${pad(ss)}`:`${m}:${pad(ss)}`; };

/* ----------------------------------------------------- view: Operations */
/* the tool is always visible next to the operation name; the stats below
   are configurable via the sliders button */
const OP_STATS = [
  { key:'n',    label:'S'    },
  { key:'vf',   label:'F'    },
  { key:'ap',   label:'ap'   },
  { key:'ae',   label:'ae'   },
  { key:'time', label:'Time' },
];
const OP_PRESETS = [
  { id:'compact',    label:'Compact',      icon:'i-minimize', stats:[] },
  { id:'timefeeds',  label:'Time & feeds', icon:'i-clock',    stats:['n','vf','time'] },
  { id:'everything', label:'Everything',   icon:'i-sliders',  stats:OP_STATS.map((s) => s.key) },
];
let opStatsSet = new Set(OP_PRESETS.find((p) => p.id === 'compact').stats); // default: Compact
let selectedOp = null;

/* narrow panel → stats move under the name; wide → aligned columns */
function opsNeededWidth() {
  const numeric = ['n','vf','ap','ae'].filter((k) => opStatsSet.has(k)).length;
  return 240 + 100 /* tool */ + numeric * 60 + (opStatsSet.has('time') ? 44 : 0);
}
function opRowHTML(id, stacked) {
  const o = OPS[id];
  const has = (k) => opStatsSet.has(k);
  const sel = id === selectedOp ? ' is-selected' : '';
  if (!stacked) {
    const cells = [`<span class="op-cell op-cell--tool">${o.tool}</span>`];
    if (has('n'))    cells.push(`<span class="op-cell"><i>S</i>${o.params.n}</span>`);
    if (has('vf'))   cells.push(`<span class="op-cell"><i>F</i>${o.params.vf}</span>`);
    if (has('ap'))   cells.push(`<span class="op-cell"><i>ap</i>${o.params.ap}</span>`);
    if (has('ae'))   cells.push(`<span class="op-cell"><i>ae</i>${o.params.ae}</span>`);
    if (has('time')) cells.push(`<span class="op-row__time">${o.time}</span>`);
    return `
        <div class="op-row${sel}" data-op="${id}" title="${o.type} · ${o.tool}">
          <svg class="op-row__ico"><use href="#op-operation"/></svg>
          <span class="op-row__name">${o.name}</span>
          ${cells.join('')}
        </div>`;
  }
  const bits = [];
  if (has('n'))    bits.push(`S ${o.params.n}`);
  if (has('vf'))   bits.push(`F ${o.params.vf}`);
  if (has('ap'))   bits.push(`ap ${o.params.ap}`);
  if (has('ae'))   bits.push(`ae ${o.params.ae}`);
  if (has('time')) bits.push(o.time);
  if (!bits.length) return `
        <div class="op-row${sel}" data-op="${id}" title="${o.type} · ${o.tool}">
          <svg class="op-row__ico"><use href="#op-operation"/></svg>
          <span class="op-row__name">${o.name}</span>
          <span class="op-row__tool">${o.tool}</span>
        </div>`;
  return `
        <div class="op-row op-row--stack${sel}" data-op="${id}" title="${o.type} · ${o.tool}">
          <svg class="op-row__ico"><use href="#op-operation"/></svg>
          <div class="op-row__text">
            <div class="op-row__line1"><span class="op-row__name">${o.name}</span><span class="op-row__tool">${o.tool}</span></div>
            <div class="op-row__sub">${bits.join(' · ')}</div>
          </div>
        </div>`;
}
function renderOperations(panel) {
  const stacked = $('.panel__body', panel).clientWidth < opsNeededWidth();
  panel.dataset.opsStacked = stacked;
  return `<div class="optree">${SETUPS.map((s) => {
    const all = s.parts.flatMap((p) => p.ops);
    const total = fmtTime(all.reduce((a, id) => a + parseTime(OPS[id].time), 0));
    return `
    <div class="setup${s.collapsed ? ' is-collapsed' : ''}" data-setup="${s.id}">
      <div class="setup-row">
        <span class="setup-row__chev">${icon('i-chevdown')}</span>
        <svg class="setup-row__ico"><use href="#op-setup"/></svg>
        <span class="setup-row__name">${s.name}</span>
        <span class="setup-row__meta">${all.length} ops · ${total}</span>
      </div>
      <div class="setup__body">
        ${s.parts.map((p) => `
        <div class="part-row"><svg><use href="#op-part"/></svg>${p.name}</div>
        ${p.ops.map((id) => opRowHTML(id, stacked)).join('')}`).join('')}
      </div>
    </div>`; }).join('')}</div>`;
}

/* a view can exist in two contexts (workspace + checklist mode) — target the
   visible instance first (offsetParent is null inside display:none) */
function viewPanel(viewId) {
  const all = $$('.panel').filter((p) => p.dataset.view === viewId);
  return all.find((p) => p.offsetParent !== null) || all[0];
}
function opsPanel() { return viewPanel('operations'); }
function refreshOps() {
  const panel = opsPanel();
  if (panel) $('.panel__body', panel).innerHTML = renderOperations(panel);
}

function selectOperation(opId) {
  selectedOp = opId;
  $$('.op-row').forEach((r) => r.classList.remove('is-selected'));
  const row = $(`.op-row[data-op="${opId}"]`);
  if (row) {
    row.classList.add('is-selected');
    const setup = row.closest('.setup');
    if (setup) {
      setup.classList.remove('is-collapsed');
      const s = SETUPS.find((x) => x.id === setup.dataset.setup);
      if (s) s.collapsed = false;
    }
  }
}

/* display-options popover (presets + stat chips), shared by the Operations
   and Tool table views — each brings its own stat model */
function renderStatsMenu(view) {
  const menu = $('#statsMenu');
  if (view === 'viewer') {
    // 3D viewer: scene-element visibility, same popover format;
    // groups are separated by plain dividers (no extra headings)
    menu.innerHTML = `
      <div class="statsmenu__label">Visibility</div>
      ${VIEWER_LAYER_GROUPS.map((group) => group.map((l) => `
      <button class="statsmenu__preset${viewer.show[l.key] ? ' is-active' : ''}" data-vlayer="${l.key}">${icon(l.icon)}${l.label}</button>`).join('')).join('<div class="statsmenu__sep"></div>')}
      <div class="statsmenu__hint">Pick which elements are visible in the scene.</div>`;
    $$('#statsMenu [data-vlayer]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.vlayer;
      viewer.show[k] = !viewer.show[k];
      renderStatsMenu(view);
      drawViewer();
    }));
    return;
  }
  const isTools = view === 'tools';
  const STATS = isTools ? TOOL_STATS : OP_STATS;
  const PRESETS = isTools ? TOOL_PRESETS : OP_PRESETS;
  const set = isTools ? toolStatsSet : opStatsSet;
  const refresh = isTools ? refreshTools : refreshOps;
  const active = PRESETS.find((p) =>
    p.stats.length === set.size && p.stats.every((k) => set.has(k)))?.id;
  menu.innerHTML = `
    <div class="statsmenu__label">Preset</div>
    ${PRESETS.map((p) => `
    <button class="statsmenu__preset${p.id === active ? ' is-active' : ''}" data-preset="${p.id}">${icon(p.icon)}${p.label}${p.hint ? `<span class="statsmenu__sub">${p.hint}</span>` : ''}</button>`).join('')}
    <div class="hmenu__sep"></div>
    <div class="statsmenu__label">Customize</div>
    <div class="statsmenu__chips">${STATS.map((s) => `
      <button class="chip${set.has(s.key) ? ' is-active' : ''}" data-stat="${s.key}">${s.label}</button>`).join('')}</div>
    <div class="statsmenu__hint">${isTools
      ? 'H = tool length · Rc = cutter radius (⌀/2) · H#/D# = NC register numbers.'
      : 'Pick which stats appear on each operation.'}</div>`;
  $$('#statsMenu [data-preset]').forEach((b) => b.addEventListener('click', () => {
    const stats = new Set(PRESETS.find((p) => p.id === b.dataset.preset).stats);
    if (isTools) toolStatsSet = stats; else opStatsSet = stats;
    renderStatsMenu(view); refresh();
  }));
  $$('#statsMenu [data-stat]').forEach((b) => b.addEventListener('click', () => {
    const st = isTools ? toolStatsSet : opStatsSet;
    st.has(b.dataset.stat) ? st.delete(b.dataset.stat) : st.add(b.dataset.stat);
    renderStatsMenu(view); refresh();
  }));
}

/* -------------------------------------------------------- view: Overview */
const kvRow = (label, value) => `<div class="kv"><span class="kv__label">${label}</span><span class="kv__value">${value}</span></div>`;
const selectish = (v) => `<button class="selectish"><span>${v}</span>${icon('i-chevdown')}</button>`;
const valueTag = (v) => `<span class="value-tag">${v}</span>`;

function renderOverview() {
  return `<div class="overview">
    <div class="acc">
      <div class="acc__head">General<span class="chev">${icon('i-chevdown')}</span></div>
      <div class="acc__body">
        ${kvRow('Machine', selectish('HAAS DT-2'))}
        ${kvRow('Machine type', selectish('3 Axis'))}
        ${kvRow('Machinable', `<span class="val-ok">● 100%</span>`)}
      </div>
    </div>
    <div class="acc">
      <div class="acc__head">Material<span class="chev">${icon('i-chevdown')}</span></div>
      <div class="acc__body">
        ${kvRow('Stock mode', selectish('Automatic'))}
        ${kvRow('Stock preset', selectish('Default stock'))}
        ${kvRow('Stock size', valueTag('42.0 × 168.0 × 52.0 mm'))}
        ${kvRow('Part dims', valueTag('112 × 28 × 23 mm'))}
      </div>
    </div>
    ${SETUPS.map(setupAccHTML).join('')}
    <div class="acc">
      <div class="acc__head">Holes<span class="chev">${icon('i-chevdown')}</span></div>
      <div class="acc__body">
        ${kvRow('3× ⌀8.0', selectish('No thread'))}
        ${kvRow('1× ⌀9.5', selectish('M10 × 1.5'))}
      </div>
    </div>
    <div class="acc">
      <div class="acc__head">Machinability<span class="chev">${icon('i-chevdown')}</span></div>
      <div class="acc__body">
        <div class="issue">${icon('i-warn')}<div class="issue__text">
          <div class="issue__title">Modified blind hole #1</div>
          <div class="issue__sub">Tip angle changed 118° → 135°</div>
        </div></div>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------ view: Tool table */
/* two representations: a data table and Tool & Assembly blocks with a 2D/3D preview */
let toolsMode = 'table';
let selectedTool = null;
let toolsPreviewPos = 'right';   // shared preview pane: 'off' | 'right' | 'bottom'
const toolPreviewMode = {};      // tno → '2d' | '3d' (default 2d)

const toolTime = (name) =>
  fmtTime(Object.values(OPS).filter((o) => o.tool === name).reduce((a, o) => a + parseTime(o.time), 0));
/* up to 3 decimals, trailing zeros trimmed: 40 → "40", 3.175 → "3.175" */
const num = (n) => String(+n.toFixed(3));

/* one stat model drives both representations: the spec grid on the assembly
   blocks and columns of the table */
/* order = table column order; cards regroup these into geometry (bright) and
   machine offsets (quiet), with time pulled out to the card header */
const TOOL_STATS = [
  { key:'dia',  label:'⌀',    group:'geo',  val:(t) => num(t.dia),      cell:(t) => `${num(t.dia)} mm` },
  { key:'oal',  label:'OAL',  group:'geo',  val:(t) => num(t.oal),      cell:(t) => `${num(t.oal)} mm` },
  { key:'loc',  label:'LOC',  group:'geo',  val:(t) => num(t.fluteLen), cell:(t) => `${num(t.fluteLen)} mm` },
  { key:'z',    label:'Z',    group:'geo',  val:(t) => t.flutes,        cell:(t) => t.flutes },
  { key:'rc',   label:'Rc',   group:'geo',  val:(t) => num(t.dia / 2),  cell:(t) => `${num(t.dia / 2)} mm` },
  { key:'h',    label:'H',    group:'mach', val:(t) => num(t.oal),      cell:(t) => `${num(t.oal)} mm` },
  { key:'hreg', label:'H#',   group:'mach', val:(t) => t.hreg ?? '—',   cell:(t) => t.hreg ?? '—' },
  { key:'dreg', label:'D#',   group:'mach', val:(t) => t.dreg ?? '—',   cell:(t) => t.dreg ?? '—' },
  { key:'time', label:'Time', group:'time', val:(t) => toolTime(t.name), cell:(t) => toolTime(t.name) },
];
const TOOL_PRESETS = [
  { id:'presetting', label:'Tool presetting', hint:'on the machine', icon:'i-bolt',    stats:['dia','oal','z','h'] },
  { id:'offsets',    label:'Control offsets', hint:'into the CNC',   icon:'i-hash',    stats:['h','rc','hreg','dreg'] },
  { id:'everything', label:'Everything',      hint:'',               icon:'i-sliders', stats:TOOL_STATS.map((s) => s.key) },
];
let toolStatsSet = new Set(TOOL_PRESETS.find((p) => p.id === 'presetting').stats);

/* 2D: engineering drawing of the tool itself (no holder) with ⌀ / OAL
   dimensions and an R leader, all driven by the real numbers */
function tool2D(t) {
  const isDrill = t.kind.includes('Drill'), isSlot = t.kind.includes('Undercut');
  const W = 132, H = 120, cx = 78;
  const s = 86 / t.oal, yA = 24, yB = yA + t.oal * s;
  const dw = Math.max(t.dia * s, 6), sw = Math.max(t.shank * s, 5);
  const fl = Math.min(Math.max(t.fluteLen * s, 4), yB - yA - 4);
  const tip = isDrill ? dw * 0.3 : 0;
  const xL = cx - dw / 2, xR = cx + dw / 2;
  const yFeat = isSlot ? yB - fl : yA;                       // top of the measured (widest) feature
  const yDim = 13;                                           // ⌀ dimension line
  const xDim = cx - Math.max(dw, sw) / 2 - 12;               // OAL dimension line
  const uid = `d${t.tno}`;

  const cut = isDrill
    ? `<rect x="${xL.toFixed(1)}" y="${(yB - fl).toFixed(1)}" width="${dw.toFixed(1)}" height="${(fl - tip).toFixed(1)}" class="s3"/>
       <path d="M${xL.toFixed(1)},${(yB - tip).toFixed(1)} L${xR.toFixed(1)},${(yB - tip).toFixed(1)} L${cx},${yB.toFixed(1)} Z" class="s3"/>`
    : `<rect x="${xL.toFixed(1)}" y="${(yB - fl).toFixed(1)}" width="${dw.toFixed(1)}" height="${fl.toFixed(1)}" class="s3"/>`;

  const rlead = t.cornerRad ? `
    <line x1="${(xR - 1).toFixed(1)}" y1="${(yB - 1).toFixed(1)}" x2="${(xR + 12).toFixed(1)}" y2="${(yB - 13).toFixed(1)}" class="dim"/>
    <text x="${(xR + 14).toFixed(1)}" y="${(yB - 15).toFixed(1)}" class="dimt">R ${num(t.cornerRad)}</text>` : '';

  return `<svg class="toolpv toolpv--2d" viewBox="0 0 ${W} ${H}">
    <defs><marker id="${uid}a" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7"
      orient="auto-start-reverse"><path d="M1 4l6.5-2.6v5.2z" style="fill:var(--ec-fg-64)"/></marker></defs>
    <line x1="${cx}" y1="${yA - 5}" x2="${cx}" y2="${(yB + 5).toFixed(1)}" style="stroke:var(--ec-fg-16)" stroke-dasharray="7 3 1.5 3"/>
    <rect x="${(cx - sw / 2).toFixed(1)}" y="${yA}" width="${sw.toFixed(1)}" height="${(yB - yA - fl).toFixed(1)}" class="s2"/>
    ${cut}
    <line x1="${xL.toFixed(1)}" y1="${(yFeat - 2).toFixed(1)}" x2="${xL.toFixed(1)}" y2="${yDim - 3}" class="dim"/>
    <line x1="${xR.toFixed(1)}" y1="${(yFeat - 2).toFixed(1)}" x2="${xR.toFixed(1)}" y2="${yDim - 3}" class="dim"/>
    <line x1="${xL.toFixed(1)}" y1="${yDim}" x2="${xR.toFixed(1)}" y2="${yDim}" class="dim"
      marker-start="url(#${uid}a)" marker-end="url(#${uid}a)"/>
    <text x="${cx}" y="${yDim - 4}" text-anchor="middle" class="dimt">⌀ ${num(t.dia)}</text>
    <line x1="${(xDim - 4).toFixed(1)}" y1="${yA}" x2="${(cx - sw / 2 - 2).toFixed(1)}" y2="${yA}" class="dim"/>
    <line x1="${(xDim - 4).toFixed(1)}" y1="${yB.toFixed(1)}" x2="${(xL - 2).toFixed(1)}" y2="${yB.toFixed(1)}" class="dim"/>
    <line x1="${xDim.toFixed(1)}" y1="${yA}" x2="${xDim.toFixed(1)}" y2="${yB.toFixed(1)}" class="dim"
      marker-start="url(#${uid}a)" marker-end="url(#${uid}a)"/>
    <text transform="rotate(-90 ${(xDim - 5).toFixed(1)} ${((yA + yB) / 2).toFixed(1)})"
      x="${(xDim - 5).toFixed(1)}" y="${((yA + yB) / 2).toFixed(1)}" text-anchor="middle" class="dimt">OAL ${num(t.oal)}</text>
    ${rlead}
  </svg>`;
}

/* 3D: shaded render with the holder stub */
function tool3D(t) {
  const isDrill = t.kind.includes('Drill'), isSlot = t.kind.includes('Undercut');
  const W = 96, H = 120, cx = W / 2, y0 = 8;
  const s = 96 / (22 + t.lenBelowH);                   // 22 mm holder stub
  const hh = 22 * s, below = t.lenBelowH * s;
  const dw = Math.max(t.dia * s, 6);
  const fl = Math.min(Math.max(t.fluteLen * s, 6), below - 4);
  const sw = isSlot ? Math.max(t.shank * s, 8) : dw;
  const tip = isDrill ? dw * 0.3 : 0;
  const yNeck = y0 + hh, yTip = yNeck + below, yF = yTip - fl;
  const uid = `tp${t.tno}`;
  const n = Math.min(t.flutes, 4);
  let helix = '';
  for (let i = 0; i < n; i++) {
    const yy = yF + ((i + 0.5) / n) * (fl - tip);
    helix += `<line x1="${(cx - dw / 2).toFixed(1)}" y1="${(yy + fl * 0.16).toFixed(1)}" x2="${(cx + dw / 2).toFixed(1)}" y2="${(yy - fl * 0.16).toFixed(1)}"/>`;
  }
  return `<svg class="toolpv" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="${uid}m" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#3f464a"/><stop offset=".3" stop-color="#b6c0c5"/>
        <stop offset=".55" stop-color="#7c868b"/><stop offset="1" stop-color="#2f3538"/>
      </linearGradient>
      <linearGradient id="${uid}h" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#23282a"/><stop offset=".35" stop-color="#5b6467"/><stop offset="1" stop-color="#1c2022"/>
      </linearGradient>
    </defs>
    <path d="M${cx - 22},${y0} L${cx + 22},${y0} L${cx + 15},${yNeck.toFixed(1)} L${cx - 15},${yNeck.toFixed(1)} Z" fill="url(#${uid}h)"/>
    <rect x="${(cx - sw / 2).toFixed(1)}" y="${yNeck.toFixed(1)}" width="${sw.toFixed(1)}" height="${(below - fl).toFixed(1)}" fill="url(#${uid}m)"/>
    <rect x="${(cx - dw / 2).toFixed(1)}" y="${yF.toFixed(1)}" width="${dw.toFixed(1)}" height="${(fl - tip).toFixed(1)}" fill="url(#${uid}m)"/>
    ${isDrill ? `<path d="M${(cx - dw / 2).toFixed(1)},${(yTip - tip).toFixed(1)} L${(cx + dw / 2).toFixed(1)},${(yTip - tip).toFixed(1)} L${cx},${yTip.toFixed(1)} Z" fill="url(#${uid}m)"/>` : ''}
    <g stroke="rgba(10,12,12,.45)" stroke-width="1.2">${helix}</g>
  </svg>`;
}

const toolSVG = (t, mode) => (mode === '3d' ? tool3D(t) : tool2D(t));
const toolCapHTML = (t) => `<div class="tool__cap">
  <b>H ${num(t.oal)} · Rc ${num(t.dia / 2)}</b>
  <span>${t.tno} · Z${t.flutes} · ${t.kind}</span></div>`;

/* card = a small spec sheet: divided header (chip + name + time), then
   definition columns — geometry stacked 3 per column with values on one
   axis, machine offsets in their own column behind a hairline */
function toolBlockHTML(t) {
  const sel = t.tno === selectedTool ? ' is-selected' : '';
  const pairs = (group) => TOOL_STATS
    .filter((s) => s.group === group && toolStatsSet.has(s.key))
    .map((s) => `<span class="tspec"><i>${s.label}</i>${s.val(t)}</span>`);
  const geo = pairs('geo'), mach = pairs('mach');
  const cols = [];
  for (let i = 0; i < geo.length; i += 3) cols.push(`<div class="tool__col">${geo.slice(i, i + 3).join('')}</div>`);
  if (mach.length) cols.push(`<div class="tool__col tool__col--quiet">${mach.join('')}</div>`);
  return `
  <div class="tool${sel}" data-tool="${t.tno}">
    <div class="tool__line1"><span class="tag-tno">${t.tno}</span><span class="tool__name" title="${t.name}">${t.name}</span><span class="tool__kind">${t.kind}</span>${
      toolStatsSet.has('time') ? `<span class="tool__time">${toolTime(t.name)}</span>` : ''}</div>
    ${cols.length ? `<div class="tool__body">${cols.join('')}</div>` : ''}
  </div>`;
}

/* shared preview pane: one per tools panel, follows the selection;
   the info block is a column on the right layout, a side column on the bottom one */
function toolSideInner(t) {
  const mode = toolPreviewMode[t.tno] || '2d';
  return `
    <div class="toolside__info">
      <div class="toolside__name">${t.name}</div>
      <div class="tool__modes">
        <div class="seg">
          <button class="${mode === '2d' ? 'is-active' : ''}" data-pmode="2d">2D</button>
          <button class="${mode === '3d' ? 'is-active' : ''}" data-pmode="3d">3D</button>
        </div>
        <button class="tool__holder" disabled title="No holder assigned">Holder</button>
        <span class="panel__hspacer"></span>
        <button class="tool__expand" title="Expand preview">${icon('i-expand')}</button>
      </div>
    </div>
    <div class="tool__preview">${toolSVG(t, mode)}${toolCapHTML(t)}</div>`;
}

/* the head button cycles the pane: right → bottom → off */
function pvSync(btn) {
  btn.classList.toggle('is-active', toolsPreviewPos !== 'off');
  $('use', btn).setAttribute('href', toolsPreviewPos === 'bottom' ? '#i-panel-bottom' : '#i-panel-right');
  btn.title = `Tool preview: ${toolsPreviewPos}`;
}

function openToolZoom(tno) {
  const t = TOOLS.find((x) => x.tno === tno);
  const el = document.createElement('div');
  el.className = 'toolzoom';
  el.innerHTML = `<div class="toolzoom__card">${toolSVG(t, toolPreviewMode[tno] || '2d')}${toolCapHTML(t)}</div>`;
  el.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
}

/* the preview pane needs ~248px: below this body width it hides itself */
const TOOLS_SIDE_MIN = 520;
/* list width from which the card params fit in a single row — measured from
   the actual labels and the widest values, so the row survives until it
   would really hit the card edge */
let _measureCtx;
function textW(s, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = font;
  return _measureCtx.measureText(String(s)).width;
}
function toolsRowMin() {
  const active = TOOL_STATS.filter((s) => s.group !== 'time' && toolStatsSet.has(s.key));
  if (!active.length) return 0;
  let w = 0;
  for (const s of active) {
    w += textW(s.label, '10px Inter, sans-serif') + 6
       + Math.max(...TOOLS.map((t) => textW(s.val(t), '12px Inter, sans-serif')));
  }
  w += (active.length - 1) * 16;                                   // gaps between pairs
  if (active.some((s) => s.group === 'geo') && active.some((s) => s.group === 'mach')) {
    w += 17;                                                       // group divider: border + its padding
  }
  return w + 40;                                                   // card + list chrome, small safety
}
function renderTools(panel) {
  if (toolsPreviewPos !== 'off' && !selectedTool) selectedTool = TOOLS[0].tno;
  const bodyW = panel ? $('.panel__body', panel).clientWidth : 0;
  const tight = panel && bodyW < TOOLS_SIDE_MIN;
  const bottomish = toolsPreviewPos === 'bottom' || (toolsPreviewPos === 'right' && tight);
  const listW = bodyW - (toolsPreviewPos === 'right' && !bottomish ? 249 : 0);
  const cols = TOOL_STATS.filter((s) => toolStatsSet.has(s.key));
  const list = toolsMode === 'cards'
    ? `<div class="toolsx${listW >= toolsRowMin() ? ' toolsx--row' : ''}">${TOOLS.map(toolBlockHTML).join('')}</div>`
    : `<table class="dtable">
    <thead><tr><th>T#</th><th>Name</th>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>
      ${TOOLS.map((t) => `
      <tr data-tool="${t.tno}"${t.tno === selectedTool ? ' class="is-selected"' : ''}>
        <td><span class="tag-tno">${t.tno}</span></td>
        <td><span class="dtable__name">${icon('i-toolbit')}${t.name}</span></td>
        ${cols.map((c) => `<td>${c.cell(t)}</td>`).join('')}
      </tr>`).join('')}
    </tbody>
  </table>`;
  const t = TOOLS.find((x) => x.tno === selectedTool) || TOOLS[0];
  const side = toolsPreviewPos !== 'off' ? `<aside class="toolside" data-tool="${t.tno}">${toolSideInner(t)}</aside>` : '';
  // bottomish: the right pane never just disappears — when the panel is too
  // narrow for it, it degrades into the bottom strip
  return `<div class="toolswrap${bottomish ? ' toolswrap--bottom' : ''}"><div class="toolslist">${list}</div>${side}</div>`;
}

function refreshTools() {
  const panel = viewPanel('tools');
  if (panel) $('.panel__body', panel).innerHTML = renderTools(panel);
}

function selectTool(tno) {
  selectedTool = tno;
  $$('[data-tool]').forEach((el) => el.classList.toggle('is-selected', el.dataset.tool === tno));
  const side = $('.toolside');
  if (side && side.dataset.tool !== tno) {
    side.dataset.tool = tno;
    side.innerHTML = toolSideInner(TOOLS.find((x) => x.tno === tno));
  }
}

/* workpiece setup accordion (one per setup) — lives inside Overview since
   Setup merged into it (Ruslan: too many small views); on a wide panel the
   preview docks beside the fields (container query, .acc--wp) */
function setupAccHTML(s) {
  return `
    <div class="acc acc--wp">
      <div class="acc__head">${s.name}<span class="chev">${icon('i-chevdown')}</span></div>
      <div class="acc__body acc__body--wp">
        <div class="acc__kvs">
          ${kvRow('Part zero', `<span class="coord"><b>X</b>${s.wp.x}</span><span class="coord"><b>Y</b>${s.wp.y}</span><span class="coord"><b>Z</b>${s.wp.z}</span>`)}
          ${kvRow('Stock', valueTag(s.wp.stock))}
          ${kvRow('Fixture', `<button class="linklike">${s.wp.fixture}</button>`)}
        </div>
        <div class="preview"><div class="ghost">3D view</div></div>
      </div>
    </div>`;
}

/* ----------------------------------------------- view: Setup checklist */
/* generated from SETUPS + TOOLS (fixture → stock → part zero → tools →
   program), plus per-setup custom steps. Rows are deliberately taller than
   the app standard — the list is read at the machine, often from a touch
   screen. Progress persists in localStorage; steps expand in place so the
   view is self-contained on phones (no reliance on neighboring panels). */
const CL_KEY = 'ency-cl-2356';
const clDone = new Set(JSON.parse(localStorage.getItem(CL_KEY) || '[]'));
let clOpen = null; // id of the expanded step
let clSec = null;  // open section; null = the sections overview (cards)
const CL_CUSTOM = { setup1: ['Check coolant concentration'] }; // technologist-added
function clToolDetail(t) {
  // a tidy 3×2 spec grid (labels/values from TOOL_STATS, shared with the
  // Tool table); the drawing opens in the shared .toolzoom overlay instead
  // of living inside the card — keeps the params section clean
  const spec = (key) => {
    const s = TOOL_STATS.find((x) => x.key === key);
    return `<span class="tspec"><i>${s.label}</i>${s.cell(t)}</span>`;
  };
  return `<div class="cl__tool">
    <div class="cl__specs">${['dia', 'oal', 'loc', 'z', 'hreg', 'dreg'].map(spec).join('')}</div>
    <button class="header__iconbtn cl__pv" data-toolzoom="${t.tno}" title="Tool preview">${icon('i-expand')}</button>
  </div>`;
}
/* tool prep is its OWN flow: unique tools across the whole program, in
   program order — loaded into the magazine once, not per setup */
function clToolSteps() {
  const names = [...new Set(SETUPS.flatMap((s) => s.parts.flatMap((p) => p.ops))
    .map((id) => OPS[id].tool))];
  return names.map((n) => TOOLS.find((t) => t.name === n)).filter(Boolean)
    .map((t) => ({ id: `tool-${t.tno}`, label: `Load ${t.tno} · ${t.name}`,
      val: `⌀${num(t.dia)} mm`, detail: clToolDetail(t) }));
}
function clSetupSteps(s) {
  return [
    { id: `${s.id}-fixture`, label: 'Install the fixture', val: s.wp.fixture },
    { id: `${s.id}-stock`,   label: 'Verify the stock',    val: s.wp.stock },
    { id: `${s.id}-zero`,    label: 'Set the part zero',   val: 'G54',
      detail: `<div class="cl__coords">
        <span class="coord"><b>X</b>${s.wp.x}</span>
        <span class="coord"><b>Y</b>${s.wp.y}</span>
        <span class="coord"><b>Z</b>${s.wp.z}</span></div>` },
    ...(CL_CUSTOM[s.id] || []).map((label, i) => ({
      id: `${s.id}-custom${i}`, label, custom: true })),
    { id: `${s.id}-prog`, label: 'Load the NC program, verify offsets', val: '# 2356' },
  ];
}
/* sections are cards on the overview screen (scales to 10+ setups): the
   user picks where to start; the flat order (tools → setups) still defines
   the guided Next flow across sections */
function clSections() {
  return [
    { id: 'tools', name: 'Tools', steps: clToolSteps() },
    ...SETUPS.map((s) => ({ id: s.id, name: s.name, steps: clSetupSteps(s) })),
  ];
}
const clAll = () => clSections().flatMap((sec) => sec.steps);
const clSecOf = (id) => clSections().find((sec) => sec.steps.some((st) => st.id === id))?.id;
const clSave = () => localStorage.setItem(CL_KEY, JSON.stringify([...clDone]));
function clCounts() {
  const all = clAll();
  return { done: all.filter((st) => clDone.has(st.id)).length, total: all.length };
}
function clSyncHeader() {
  const { done, total } = clCounts();
  const numEl = $('#clBtnNum');
  if (numEl) numEl.textContent = done ? `${done}/${total}` : '';
}
function clStepHTML(st) {
  const done = clDone.has(st.id);
  // every step can be the active one — even without a spec card it expands
  // into the action strip, so "Next" is always a big target (no aiming)
  const open = clOpen === st.id;
  return `
    <div class="cl__step${done ? ' is-done' : ''}${open ? ' is-open' : ''}" data-step="${st.id}">
      <button class="cl__box" data-clcheck="${st.id}" title="${done ? 'Uncheck' : 'Done'}">${icon('i-check')}</button>
      <span class="cl__label">${st.label}</span>
      ${st.custom ? '<span class="cl__tag">custom</span>' : ''}
      <span class="cl__val">${st.val || ''}</span>
      <svg class="cl__chev"><use href="#i-chevdown"/></svg>
    </div>
    ${open && st.detail ? `<div class="cl__detail">${st.detail}</div>` : ''}`;
}
/* first unchecked step in program order (wraps around); null when all done */
function clNextAfter(id) {
  const all = clAll();
  const i = id ? all.findIndex((st) => st.id === id) : -1;
  const next = all.slice(i + 1).find((st) => !clDone.has(st.id))
    || all.find((st) => !clDone.has(st.id));
  return next?.id ?? null;
}
function renderChecklist() {
  const sections = clSections();
  const { done, total } = clCounts();
  const sec = clSec ? sections.find((x) => x.id === clSec) : null;
  // inside a section: breadcrumb back to the overview; outside: section cards
  const crumb = sec ? (() => {
    const d = sec.steps.filter((st) => clDone.has(st.id)).length;
    return `<div class="cl__crumb">
      <button class="header__iconbtn" data-clsecs title="All sections"><svg><use href="#i-back"/></svg></button>
      <span class="cl__crumb-name">${sec.name}</span>
      <span class="cl__crumb-cnt">${d}/${sec.steps.length}</span>
    </div>`;
  })() : '';
  const content = sec
    ? `<div class="cl__steps">${sec.steps.map(clStepHTML).join('')}</div>`
    : `<div class="cl__cards">${sections.map((x) => {
        const d = x.steps.filter((st) => clDone.has(st.id)).length, t = x.steps.length;
        return `<button class="cl__card" data-clsec="${x.id}">
          <span class="cl__card-name">${x.name}</span>
          <span class="cl__card-cnt${d === t ? ' is-done' : ''}">${d === t ? icon('i-check') : ''}${d}/${t} steps</span>
          <svg class="cl__card-chev"><use href="#i-chev"/></svg>
          <i class="cl__card-bar" style="width:${t ? (d / t) * 100 : 0}%"></i>
        </button>`;
      }).join('')}</div>`;
  return `<div class="cl">
    <div class="cl__head">
      <div class="cl__progress">
        <div class="cl__bar">${sections.map((x) => {
          const d = x.steps.filter((st) => clDone.has(st.id)).length, t = x.steps.length;
          return `<div class="cl__seg" title="${x.name}"><i style="width:${t ? (d / t) * 100 : 0}%"></i></div>`;
        }).join('')}</div>
        <span class="cl__count">${done}/${total}</span>
        ${done ? '<button class="cl__reset">Reset</button>' : ''}
        <button class="btn-primary cl__next" data-clnext ${done === total ? 'disabled' : ''}>${icon('i-check')}Next</button>
      </div>
      ${crumb}
    </div>
    ${done === total && !sec ? `<div class="cl__done">${icon('i-check')}<b>Setup complete</b><span>Checked by Ruslan M</span></div>` : ''}
    ${content}
  </div>`;
}

/* ------------------------------------------------------ view: 3D Viewer */
/* static render + view toolbar (layer toggles) + a simulation timeline;
   playback walks the operations in program order and highlights the current
   one in the Operations tree */
const OP_ORDER = (() => {
  let t = 0; const arr = [];
  SETUPS.forEach((s) => s.parts.forEach((p) => p.ops.forEach((id) => {
    const d = parseTime(OPS[id].time);
    arr.push({ id, start: t, end: t + d }); t += d;
  })));
  return arr;
})();
const VIEWER_TOTAL = OP_ORDER.length ? OP_ORDER[OP_ORDER.length - 1].end : 0;
const VIEWER_SPEED = 60; // simulated seconds per real second

const viewer = { t: 0, playing: false, last: 0, lastOp: null, dims: false, measure: false,
  show: { part: true, stock: true, fixture: true, context: false, machine: false,
          tool: true, holder: true, path: true, normals: false, points: false, axes: true } };

/* the full set of display settings (the demo scene only reacts to a few of
   them — the real app has its own engine, this popover documents the options).
   Grouped by meaning: scene geometry / tooling / toolpath data / helpers. */
const VIEWER_LAYER_GROUPS = [
  [
    { key:'part',    label:'Part',          icon:'i-part'    },
    { key:'stock',   label:'Stock',         icon:'i-box'     },
    { key:'fixture', label:'Fixture',       icon:'i-layers'  },
    { key:'context', label:'Setup context', icon:'i-context' },
    { key:'machine', label:'Full machine',  icon:'i-machine' },
  ],
  [
    { key:'tool',    label:'Tool',          icon:'i-toolbit' },
    { key:'holder',  label:'Holder',        icon:'i-holder'  },
  ],
  [
    { key:'path',    label:'Toolpath',      icon:'i-mesh'    },
    { key:'normals', label:'Normals',       icon:'i-normals' },
    { key:'points',  label:'Points',        icon:'i-points'  },
  ],
  [
    { key:'axes',    label:'Axes',          icon:'i-axes'    },
  ],
];

/* --- tiny software 3D renderer (project rule: no dependencies) ---------- */
/* flat-shaded painter's algorithm on canvas; enough for a demo part the
   user can orbit (drag) and zoom (wheel) */
const VIEWER_CAM_HOME = { yaw: -0.7, pitch: 0.6, zoom: 1.2, dist: 900 };
viewer.cam = { ...VIEWER_CAM_HOME };

function faceNormal(pts) {
  const [a, b, c] = pts;
  const u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], v = [c[0]-b[0], c[1]-b[1], c[2]-b[2]];
  const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  const l = Math.hypot(...n) || 1;
  return n.map((x) => x / l);
}
/* sub > 1 slices the top face into strips: the painter's sort breaks when a
   small mesh stands on one huge coplanar face (it sinks into it) */
function boxMesh(cx, cyy, z0, z1, w, d, rgb, tag, sub = 1) {
  const x0 = cx-w/2, x1 = cx+w/2, y0 = cyy-d/2, y1 = cyy+d/2;
  const v = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  const idx = [[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
  const faces = idx.map((f) => { const pts = f.map((i) => v[i]); return { pts, n: faceNormal(pts), edge: true }; });
  for (let i = 0; i < sub; i++) {
    const xa = x0 + (w * i) / sub, xb = x0 + (w * (i + 1)) / sub;
    faces.push({ pts: [[xa,y0,z1],[xb,y0,z1],[xb,y1,z1],[xa,y1,z1]], n: [0,0,1], edge: sub === 1 });
  }
  return { tag, rgb, faces };
}
function cylMesh(cx, cyy, z0, z1, r, n, rgb, tag) {
  const bot = [], top = [], faces = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    bot.push([cx + r*Math.cos(a), cyy + r*Math.sin(a), z0]);
    top.push([cx + r*Math.cos(a), cyy + r*Math.sin(a), z1]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const pts = [bot[i], bot[j], top[j], top[i]];
    faces.push({ pts, n: faceNormal(pts), edge: false });
  }
  faces.push({ pts: top, n: [0,0,1], edge: true });
  faces.push({ pts: [...bot].reverse(), n: [0,0,-1], edge: true });
  return { tag, rgb, faces };
}
function diskMesh(cx, cyy, z, r, n, rgb, tag) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + r*Math.cos(a), cyy + r*Math.sin(a), z]); }
  return { tag, rgb, faces: [{ pts, n: [0,0,1], edge: false }] };
}

/* demo scene: milled part (base + step block + boss) on a fixture plate */
const AL = [168,178,183], VIO = [122,112,192], HOLE = [15,17,19];
const VIEWER_SCENE = [
  boxMesh(0, 0, -6, 0, 150, 60, VIO, 'fixture', 6),
  boxMesh(0, 0, 0, 8, 112, 28, AL, 'part', 8),
  boxMesh(-38, 0, 8, 23, 36, 28, AL, 'part'),
  cylMesh(28, 0, 8, 20, 10, 20, AL, 'part'),
  diskMesh(28, 0, 20.05, 4.75, 20, HOLE, 'part'),   // M10 in the boss
  diskMesh(2, 0, 8.05, 4, 16, HOLE, 'part'),        // 3× ⌀8
  diskMesh(48, 7, 8.05, 4, 16, HOLE, 'part'),
  diskMesh(48, -7, 8.05, 4, 16, HOLE, 'part'),
];

function drawViewer() {
  // two contexts can host the viewer — draw on the visible canvas
  const c = $$('.viewer__canvas').find((x) => x.offsetParent !== null) || $('.viewer__canvas');
  if (!c) return;
  const r = c.getBoundingClientRect(); if (!r.width || !r.height) return;
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(r.width), H = Math.round(r.height);
  if (c.width !== W*dpr || c.height !== H*dpr) { c.width = W*dpr; c.height = H*dpr; }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const { yaw, pitch, zoom, dist } = viewer.cam;
  const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const S = (Math.min(W, H) / 250) * zoom;
  const proj = (p) => {
    const x1 = p[0]*cy_ - p[1]*sy_, y1 = p[0]*sy_ + p[1]*cy_, z1 = p[2];
    const d = y1*cp + z1*sp;                       // toward the camera
    const u = z1*cp - y1*sp;                       // screen up
    const k = S * dist / (dist - d);
    return { x: W/2 + x1*k, y: H*0.54 - u*k, d };
  };
  const line = (a, b, color, wd = 1, dash = null) => {
    const A = proj(a), B = proj(b);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
    ctx.strokeStyle = color; ctx.lineWidth = wd;
    ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
  };

  // floor grid under the fixture
  ctx.strokeStyle = 'rgba(245,245,245,.05)'; ctx.lineWidth = 1;
  for (let g = -100; g <= 100; g += 25) {
    line([g, -100, -6], [g, 100, -6], 'rgba(245,245,245,.05)');
    line([-100, g, -6], [100, g, -6], 'rgba(245,245,245,.05)');
  }

  // meshes → visible faces, far-to-near
  const faces = [];
  for (const m of VIEWER_SCENE) {
    if (m.tag && viewer.show[m.tag] === false) continue;
    for (const f of m.faces) {
      const P = f.pts.map(proj);
      let area = 0;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i+1)%P.length]; area += a.x*b.y - b.x*a.y; }
      if (area <= 0) continue;                     // backface (front = positive with y-down)
      const nx1 = f.n[0]*cy_ - f.n[1]*sy_, ny1 = f.n[0]*sy_ + f.n[1]*cy_;
      const nd = ny1*cp + f.n[2]*sp, nu = f.n[2]*cp - ny1*sp;
      const b = 0.42 + 0.58 * Math.max(0, -0.35*nx1 + 0.5*nu + 0.78*nd);
      faces.push({ P, d: P.reduce((s, p) => s + p.d, 0) / P.length, rgb: m.rgb, b, edge: f.edge });
    }
  }
  faces.sort((a, b) => a.d - b.d);
  for (const f of faces) {
    ctx.beginPath();
    f.P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = `rgb(${f.rgb.map((v) => Math.round(v * f.b)).join(',')})`;
    ctx.fill();
    if (f.edge) { ctx.strokeStyle = 'rgba(8,10,11,.45)'; ctx.lineWidth = .75; ctx.stroke(); }
  }

  // stock: dashed wireframe box around the part
  if (viewer.show.stock) {
    const sx = 58, sy = 16, sz = 26, col = 'rgba(245,245,245,.3)', dash = [4, 3];
    for (const z of [0, sz]) {
      line([-sx,-sy,z],[sx,-sy,z],col,1,dash); line([sx,-sy,z],[sx,sy,z],col,1,dash);
      line([sx,sy,z],[-sx,sy,z],col,1,dash);   line([-sx,sy,z],[-sx,-sy,z],col,1,dash);
    }
    for (const [x, y] of [[-sx,-sy],[sx,-sy],[sx,sy],[-sx,sy]]) line([x,y,0],[x,y,sz],col,1,dash);
  }

  // toolpath: serpentine over the step block
  if (viewer.show.path) {
    const pts = [[-52, -10, 36], [-52, -10, 24.5]];
    for (let i = 0, y = -10; y <= 10; y += 5, i++) {
      pts.push([i % 2 ? -52 : -24, y, 24.5]);
      if (y + 5 <= 10) pts.push([i % 2 ? -52 : -24, y + 5, 24.5]);
    }
    ctx.beginPath();
    pts.forEach((p, i) => { const q = proj(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    ctx.strokeStyle = 'rgba(70,172,255,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  // part-zero axes triad (token colors: coral / green / blue)
  if (viewer.show.axes) {
    const O = [-60, -18, 0], L = 30;
    const ax = [[[O[0]+L, O[1], O[2]], '#ff7072', 'X'], [[O[0], O[1]+L, O[2]], '#84ebb8', 'Y'], [[O[0], O[1], O[2]+L], '#46acff', 'Z']];
    ctx.font = '9px Inter, sans-serif';
    for (const [end, col, lbl] of ax) {
      line(O, end, col, 1.2);
      const p = proj(end);
      ctx.fillStyle = col; ctx.fillText(lbl, p.x + 3, p.y - 3);
    }
  }

  // the UI inside the view adapts to the panel: no scrolling, ever —
  // super-short panels drop the top bars, narrow ones collapse the filters
  const host = c.closest('.viewer');
  host.classList.toggle('viewer--slim', H < 120);
  viewerFiltersSync(host);
}

/* the filters bar sits right of the measure bar; when the panel is too
   narrow for all toggles it collapses into one button with the popover */
const VIEWER_FILTERS_MIN = 330;
function viewerFiltersHTML() {
  if (viewer.filtersCompact) {
    return `<button data-vact="filters" title="Display filters">${icon('i-eye')}</button>`;
  }
  return VIEWER_LAYER_GROUPS.map((g) => g.map((l) =>
    `<button data-vshow="${l.key}" class="${viewer.show[l.key] ? 'is-on' : ''}" title="${l.label}">${icon(l.icon)}</button>`)
    .join('')).join('<span class="viewer__sep"></span>');
}
function viewerFiltersSync(v) {
  const top = $('.viewer__top', v), bar = $('.viewer__bar', v), f = $('.viewer__filters', v);
  if (!top || !f) return;
  const compact = top.clientWidth - bar.offsetWidth - 8 < VIEWER_FILTERS_MIN;
  if (compact !== viewer.filtersCompact) {
    viewer.filtersCompact = compact;
    f.innerHTML = viewerFiltersHTML();
  }
}

function renderViewer() {
  requestAnimationFrame(drawViewer); // paint once the markup is in the DOM
  const pct = VIEWER_TOTAL ? (viewer.t / VIEWER_TOTAL) * 100 : 0;
  return `
  <div class="viewer${viewer.playing ? ' is-playing' : ''}">
    <canvas class="viewer__canvas"></canvas>
    <div class="viewer__top">
      <div class="viewer__bar">
        <button data-vact="fit" title="Fit view">${icon('i-target')}</button>
        <button data-vact="dims" class="${viewer.dims ? 'is-active' : ''}" title="Dimensions">${icon('i-ruler')}</button>
        <button data-vact="measure" class="${viewer.measure ? 'is-active' : ''}" title="Measure">${icon('i-measure')}</button>
      </div>
      <div class="viewer__filters">${viewerFiltersHTML()}</div>
    </div>
    <div class="viewer__timeline">
      <button data-vact="prev" title="Previous operation">${icon('i-skip-back')}</button>
      <button data-vact="play" class="viewer__play" title="Play simulation"><svg class="ic-play"><use href="#i-play"/></svg><svg class="ic-pause"><use href="#i-pause"/></svg></button>
      <button data-vact="next" title="Next operation">${icon('i-skip-fwd')}</button>
      <div class="viewer__track">
        <div class="viewer__rail"></div>
        <div class="viewer__fill" style="width:${pct}%"></div>
        <div class="viewer__thumb" style="left:${pct}%"></div>
      </div>
      <span class="viewer__time">${fmtTime(Math.round(viewer.t))} / ${fmtTime(VIEWER_TOTAL)}</span>
    </div>
  </div>`;
}

function viewerSync() {
  const v = $$('.viewer').find((x) => x.offsetParent !== null) || $('.viewer');
  if (!v) return;
  const pct = VIEWER_TOTAL ? (viewer.t / VIEWER_TOTAL) * 100 : 0;
  $('.viewer__fill', v).style.width = `${pct}%`;
  $('.viewer__thumb', v).style.left = `${pct}%`;
  $('.viewer__time', v).textContent = `${fmtTime(Math.round(viewer.t))} / ${fmtTime(VIEWER_TOTAL)}`;
  v.classList.toggle('is-playing', viewer.playing);
  const cur = OP_ORDER.find((o) => viewer.t >= o.start && viewer.t < o.end)
    ?? OP_ORDER[OP_ORDER.length - 1];
  if (cur && cur.id !== viewer.lastOp) { viewer.lastOp = cur.id; selectOperation(cur.id); }
}

function viewerTick(ts) {
  if (!viewer.playing) return;
  if (!$('.viewer')) { viewer.playing = false; viewer.last = 0; return; } // view hidden — pause
  const dt = viewer.last ? (ts - viewer.last) / 1000 : 0;
  viewer.last = ts;
  viewer.t = Math.min(VIEWER_TOTAL, viewer.t + dt * VIEWER_SPEED);
  if (viewer.t >= VIEWER_TOTAL) { viewer.playing = false; viewer.last = 0; }
  viewerSync();
  if (viewer.playing) requestAnimationFrame(viewerTick);
}

function viewerPlayPause() {
  if (viewer.playing) { viewer.playing = false; viewer.last = 0; viewerSync(); return; }
  if (viewer.t >= VIEWER_TOTAL) viewer.t = 0;
  if (viewer.t === 0) viewer.lastOp = null; // re-highlight from the first operation
  viewer.playing = true; viewer.last = 0;
  viewerSync();
  requestAnimationFrame(viewerTick);
}

function viewerSeek(sec) {
  viewer.t = Math.max(0, Math.min(VIEWER_TOTAL, sec));
  viewer.lastOp = null; // resync the highlighted operation
  viewerSync();
}

/* prev goes to the start of the current operation first (audio-player style) */
function viewerStep(dir) {
  const found = OP_ORDER.findIndex((o) => viewer.t >= o.start && viewer.t < o.end);
  const i = found === -1 ? OP_ORDER.length - 1 : found;
  if (dir > 0) viewerSeek(i + 1 < OP_ORDER.length ? OP_ORDER[i + 1].start : VIEWER_TOTAL);
  else viewerSeek(viewer.t - OP_ORDER[i].start > 2 ? OP_ORDER[i].start : (OP_ORDER[i - 1]?.start ?? 0));
}

/* ------------------------------------------------ panel views (combobox) */
const VIEWS = [
  { id: 'overview',   label: 'Overview',   icon: 'i-grid-view' },
  { id: 'operations', label: 'Operations', icon: 'op-operation' },
  { id: 'tools',      label: 'Tool table', icon: 'i-toolbit' },
  { id: 'viewer',     label: '3D Viewer',  icon: 'i-cube' },
];
const viewById = (id) => VIEWS.find((v) => v.id === id);

const VIEW_RENDERERS = { operations: renderOperations, overview: renderOverview, tools: renderTools, viewer: renderViewer };

function setPanelView(panel, viewId) {
  const v = viewById(viewId);
  panel.dataset.view = viewId;
  $('.panel__switch', panel).innerHTML =
    `<span>${v.label}</span><svg class="caret">${icon('i-chevdown').slice(5)}`;
  $$('.panel__menu button', panel).forEach((b) => b.classList.toggle('is-active', b.dataset.view === viewId));
  const vlabel = $('.panel__vlabel', panel);
  if (vlabel) vlabel.textContent = v.label;
  const settings = $('.panel__settings', panel);
  if (settings) settings.hidden = !['operations', 'tools'].includes(viewId);
  const mode = $('.panel__mode', panel);
  if (mode) {
    mode.hidden = viewId !== 'tools';
    $$('button', mode).forEach((b) => b.classList.toggle('is-active', b.dataset.tmode === toolsMode));
  }
  const pv = $('.panel__pv', panel);
  if (pv) {
    pv.hidden = viewId !== 'tools';
    pvSync(pv);
  }
  const render = VIEW_RENDERERS[viewId];
  $('.panel__body', panel).innerHTML = render ? render(panel) : `<div class="ghost">${v.label}</div>`;
}

function togglePanel(panel) {
  const collapsed = panel.classList.toggle('is-collapsed');
  if (panel.classList.contains('panel--left')) {
    // keep the dragged width across collapse/expand
    if (collapsed) { panel._w = panel.style.width; panel.style.width = ''; }
    else panel.style.width = panel._w || '';
  } else {
    // clear inline flex from divider drags so the remaining panel fills the column
    const other = $$('.rightcol .panel').find((p) => p !== panel);
    if (collapsed) {
      // only one right panel may be collapsed: collapsing this one expands the other
      other.classList.remove('is-collapsed');
      panel.style.flex = ''; other.style.flex = '';
    } else {
      panel.style.flex = ''; other.style.flex = '';
    }
  }
}

function initPanelHead(panel) {
  const head = $('.panel__head', panel);
  head.innerHTML = `
    <button class="panel__collapse" title="Collapse panel"><svg class="ic-min"><use href="#i-minimize"/></svg><svg class="ic-exp"><use href="#i-maximize"/></svg></button>
    <span class="panel__sep"></span>
    <button class="panel__switch"></button>
    <div class="panel__menu" hidden>${VIEWS.map((v) => `
      <button data-view="${v.id}">${v.label}</button>`).join('')}</div>
    <span class="panel__hspacer"></span>
    <div class="panel__mode" hidden>
      <button data-tmode="table" title="Table view"><svg><use href="#i-rows"/></svg></button>
      <button data-tmode="cards" title="Card view"><svg><use href="#i-grid-view"/></svg></button>
    </div>
    <button class="panel__pv" title="Tool preview" hidden>${icon('i-panel-right')}</button>
    <button class="panel__settings" title="List display options" hidden>${icon('i-sliders')}</button>`;
  $('.panel__pv', panel).addEventListener('click', (e) => {
    toolsPreviewPos = toolsPreviewPos === 'right' ? 'bottom' : toolsPreviewPos === 'bottom' ? 'off' : 'right';
    pvSync(e.currentTarget);
    refreshTools();
  });
  $$('.panel__mode button', panel).forEach((b) => b.addEventListener('click', () => {
    if (toolsMode === b.dataset.tmode) return;
    toolsMode = b.dataset.tmode;
    $$('.panel__mode button', panel).forEach((x) => x.classList.toggle('is-active', x.dataset.tmode === toolsMode));
    refreshTools();
  }));
  $('.panel__settings', panel).addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('#statsMenu');
    const open = menu.hidden;
    $$('.panel__menu').forEach((m) => { m.hidden = true; });
    if (open) {
      renderStatsMenu(panel.dataset.view);
      menu.hidden = false; // show first so its height is measurable
      const r = e.currentTarget.getBoundingClientRect();
      const mh = menu.offsetHeight;
      // opens downward; flips up when it would run past the viewport
      const top = r.bottom + 4 + mh > innerHeight ? r.top - 4 - mh : r.bottom + 4;
      menu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8))}px`;
      menu.style.top = `${Math.max(8, top)}px`;
    } else menu.hidden = true;
  });
  $('.panel__collapse', panel).addEventListener('click', () => togglePanel(panel));
  $('.panel__vlabel', panel)?.addEventListener('click', () => togglePanel(panel));

  // operations tree + overview accordions (delegated — body re-renders on view switch)
  $('.panel__body', panel).addEventListener('click', (e) => {
    const acc = e.target.closest('.acc__head');
    if (acc) { acc.parentElement.classList.toggle('is-collapsed'); return; }
    const srow = e.target.closest('.setup-row');
    if (srow) {
      const el = srow.parentElement;
      el.classList.toggle('is-collapsed');
      const s = SETUPS.find((x) => x.id === el.dataset.setup);
      if (s) s.collapsed = el.classList.contains('is-collapsed');
      return;
    }
    const orow = e.target.closest('.op-row');
    if (orow) {
      selectOperation(orow.dataset.op);
      // picking an operation moves the simulation playhead to its start
      const o = OP_ORDER.find((x) => x.id === orow.dataset.op);
      if (o && $('.viewer')) { viewer.t = o.start; viewer.lastOp = orow.dataset.op; viewerSync(); }
      return;
    }
    // 3D viewer: scene-element toggles on the filters bar
    const vsh = e.target.closest('[data-vshow]');
    if (vsh) {
      const k = vsh.dataset.vshow;
      viewer.show[k] = !viewer.show[k];
      vsh.classList.toggle('is-on', viewer.show[k]);
      drawViewer();
      return;
    }
    // 3D viewer: transport + tool modes
    const vact = e.target.closest('[data-vact]');
    if (vact) {
      const a = vact.dataset.vact;
      if (a === 'play') viewerPlayPause();
      else if (a === 'prev') viewerStep(-1);
      else if (a === 'next') viewerStep(1);
      else if (a === 'fit') { viewer.cam = { ...VIEWER_CAM_HOME }; drawViewer(); }
      else if (a === 'dims' || a === 'measure') {
        const k = a === 'dims' ? 'dims' : 'measure';
        viewer[k] = !viewer[k];
        vact.classList.toggle('is-active', viewer[k]);
      } else if (a === 'filters') {
        // collapsed filters: the same visibility popover, anchored to the button
        e.stopPropagation();
        const menu = $('#statsMenu');
        const open = menu.hidden;
        $$('.panel__menu').forEach((m) => { m.hidden = true; });
        if (open) {
          renderStatsMenu('viewer');
          menu.hidden = false;
          const r = vact.getBoundingClientRect();
          const mh = menu.offsetHeight;
          const top = r.bottom + 4 + mh > innerHeight ? r.top - 4 - mh : r.bottom + 4;
          menu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8))}px`;
          menu.style.top = `${Math.max(8, top)}px`;
        } else menu.hidden = true;
      }
      return;
    }
    // tool table / cards / shared preview pane
    const pmode = e.target.closest('[data-pmode]');
    if (pmode) {
      const host = pmode.closest('[data-tool]');
      toolPreviewMode[host.dataset.tool] = pmode.dataset.pmode;
      host.innerHTML = toolSideInner(TOOLS.find((x) => x.tno === host.dataset.tool));
      return;
    }
    const exp = e.target.closest('.tool__expand');
    if (exp) { openToolZoom(exp.closest('[data-tool]').dataset.tool); return; }
    const trow = e.target.closest('[data-tool]');
    if (trow && !trow.classList.contains('toolside')) selectTool(trow.dataset.tool);
  });
  const menu = $('.panel__menu', panel);
  $('.panel__switch', panel).addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    $$('.panel__menu').forEach((m) => { m.hidden = true; });
    if (open) {
      menu.hidden = false; // show first so its height is measurable
      const r = e.currentTarget.getBoundingClientRect();
      const mh = menu.offsetHeight;
      // opens downward; flips up when it would run past the viewport
      const top = r.bottom + 4 + mh > innerHeight ? r.top - 4 - mh : r.bottom + 4;
      menu.style.left = `${Math.min(r.left, innerWidth - menu.offsetWidth - 8)}px`;
      menu.style.top = `${Math.max(8, top)}px`;
    }
  });
  $$('.panel__menu button', panel).forEach((b) => b.addEventListener('click', () => {
    const target = b.dataset.view, current = panel.dataset.view;
    if (target !== current) {
      // the view is already shown in another panel — swap the two panels;
      // swaps stay INSIDE the workspace: the checklist-mode panel switches
      // freely (duplicate views across contexts are fine — one is hidden)
      const other = panel.closest('.main')
        ? $$('.main .panel').find((p) => p !== panel && p.dataset.view === target) : null;
      if (other) setPanelView(other, current);
      setPanelView(panel, target);
    }
    // picking a view in a collapsed panel means "show it" — expand
    if (panel.classList.contains('is-collapsed')) togglePanel(panel);
    menu.hidden = true;
  }));
  setPanelView(panel, panel.dataset.view);
}

/* ------------------------------------------------------ draggable dividers */
function makeDraggable(divider, onDrag) {
  let start = null, moved = false;
  divider.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // touch: no text-selection / scroll gesture from the grab
    start = { ...onDrag.start(e), x0: e.clientX, y0: e.clientY };
    moved = false;
    divider.classList.add('is-active');
    divider.setPointerCapture(e.pointerId);
  });
  divider.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (Math.abs(e.clientX - start.x0) + Math.abs(e.clientY - start.y0) > 3) moved = true;
    if (moved) onDrag.move(e, start);
  });
  const end = () => {
    if (start && !moved) onDrag.click?.(); // plain click on the divider
    start = null;
    divider.classList.remove('is-active');
  };
  divider.addEventListener('pointerup', end);
  divider.addEventListener('pointercancel', end);
}

/* fits the worst case: tool card, Everything preset, 3-decimal values
   (2 geometry columns + machine column) plus the scrollbar */
const MIN_W = 340;  // shared: left panel and right column can't go narrower
const MIN_H = 100;  // top/bottom panels can't go shorter

document.addEventListener('DOMContentLoaded', () => {
  // workspace panels + the checklist-mode reference panel (it is a real
  // panel with the view combobox); the checklist panel itself stays static
  $$('.main .panel, .clmode__ov').forEach(initPanelHead);

  // checklist is a separate MODE, not a panel view: the workspace is replaced
  // by a fixed two-panel layout — Overview for reference + the checklist
  const setClMode = (on) => {
    document.body.classList.toggle('is-clmode', on);
    $('#clBtn').classList.toggle('is-active', on);
    if (on) {
      // the reference panel keeps whatever view the user left it in; the
      // checklist opens on the sections overview so the user picks the flow
      clOpen = clNextAfter(null);
      clSec = null;
      $('#clListBody').innerHTML = renderChecklist();
    }
  };
  $('#clBtn').addEventListener('click', () => setClMode(!document.body.classList.contains('is-clmode')));
  $('#clClose').addEventListener('click', () => setClMode(false));
  // the divider between the reference and the checklist is draggable too
  const clOv = $('.clmode__ov');
  makeDraggable($('#clDividerV'), {
    start: (e) => ({ x: e.clientX, w: clOv.getBoundingClientRect().width }),
    move: (e, s) => {
      const content = $('#clMode').clientWidth - 20;     // minus .clmode padding
      const max = content - 10 - MIN_W;                  // divider + list minimum
      clOv.style.flex = `0 0 ${Math.max(MIN_W, Math.min(max, s.w + (e.clientX - s.x)))}px`;
    },
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const zoom = $('.toolzoom'); // the drawing overlay closes first
    if (zoom) { zoom.remove(); return; }
    setClMode(false);
  });
  // checklist interactions live on the RIGHT panel only — the left reference
  // panel is a real panel and handles its own clicks via initPanelHead
  $('.clmode__list').addEventListener('click', (e) => {
    const clRefresh = () => {
      if (clOpen) clSec = clSecOf(clOpen) || clSec; // follow the flow across sections
      $('#clListBody').innerHTML = renderChecklist();
      clSyncHeader();
      $(`#clListBody [data-step="${clOpen}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    // a section card opens its steps, starting at the first unchecked one
    const card = e.target.closest('[data-clsec]');
    if (card) {
      clSec = card.dataset.clsec;
      const sec = clSections().find((x) => x.id === clSec);
      clOpen = sec?.steps.find((st) => !clDone.has(st.id))?.id ?? null;
      $('#clListBody').innerHTML = renderChecklist();
      return;
    }
    // breadcrumb: back to the sections overview
    if (e.target.closest('[data-clsecs]')) {
      clSec = null;
      $('#clListBody').innerHTML = renderChecklist();
      return;
    }
    // sticky "Next": mark the active step done, advance to the next unchecked
    if (e.target.closest('[data-clnext]')) {
      const id = clOpen && !clDone.has(clOpen) ? clOpen : clNextAfter(null);
      if (id) {
        clDone.add(id);
        clSave();
        clOpen = clNextAfter(id);
      }
      clRefresh();
      return;
    }
    // the checkbox toggles a step directly; checking also advances the flow
    const clc = e.target.closest('[data-clcheck]');
    if (clc) {
      const id = clc.dataset.clcheck;
      const checking = !clDone.has(id);
      checking ? clDone.add(id) : clDone.delete(id);
      clSave();
      if (checking) clOpen = clNextAfter(id);
      clRefresh();
      return;
    }
    if (e.target.closest('.cl__reset')) {
      clDone.clear();
      clSave();
      $('#clListBody').innerHTML = renderChecklist();
      clSyncHeader();
      return;
    }
    // tool drawing opens in the shared fullscreen overlay
    const tz = e.target.closest('[data-toolzoom]');
    if (tz) { openToolZoom(tz.dataset.toolzoom); return; }
    const cls = e.target.closest('.cl__step');
    if (cls) {
      clOpen = clOpen === cls.dataset.step ? null : cls.dataset.step;
      $('#clListBody').innerHTML = renderChecklist();
      return;
    }
  });
  clSyncHeader();
  document.addEventListener('click', () => {
    $$('.panel__menu').forEach((m) => { m.hidden = true; });
    $('#moreMenu').hidden = true;
    $('#membersPanel').hidden = true;
    $('#statsMenu').hidden = true;
    $('#datePanel').hidden = true;
  });
  $('#statsMenu').addEventListener('click', (e) => e.stopPropagation());

  // viewer pointer interactions (delegated: the viewer body re-renders on view swaps)
  document.addEventListener('pointerdown', (e) => {
    // timeline scrubbing
    const tr = e.target.closest('.viewer__track');
    if (tr) {
      e.preventDefault();
      const seekTo = (ev) => {
        const r = tr.getBoundingClientRect();
        viewerSeek(((ev.clientX - r.left) / r.width) * VIEWER_TOTAL);
      };
      seekTo(e);
      const move = (ev) => seekTo(ev);
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      return;
    }
    // orbit: drag on the canvas rotates the camera
    const cv = e.target.closest('.viewer__canvas');
    if (cv) {
      e.preventDefault();
      const s = { x: e.clientX, y: e.clientY, yaw: viewer.cam.yaw, pitch: viewer.cam.pitch };
      const move = (ev) => {
        viewer.cam.yaw = s.yaw + (ev.clientX - s.x) * 0.01;
        viewer.cam.pitch = Math.max(-1.45, Math.min(1.45, s.pitch + (ev.clientY - s.y) * 0.008));
        drawViewer();
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
  });
  // zoom with the wheel over the canvas
  document.addEventListener('wheel', (e) => {
    if (!e.target.closest?.('.viewer__canvas')) return;
    e.preventDefault();
    viewer.cam.zoom = Math.max(0.35, Math.min(3.5, viewer.cam.zoom * (e.deltaY < 0 ? 1.12 : 0.9)));
    drawViewer();
  }, { passive: false });

  // auto table ↔ stacked layout for the operations list on panel resize
  const ro = new ResizeObserver((entries) => {
    for (const en of entries) {
      const panel = en.target;
      if (panel.classList.contains('is-collapsed')) continue;
      if (panel.dataset.view === 'viewer') { drawViewer(); continue; }
      if (panel.dataset.view === 'tools') {
        // the right pane degrades into the bottom strip when width runs out
        const wrap = $('.toolswrap', panel);
        if (wrap) {
          const tight = $('.panel__body', panel).clientWidth < TOOLS_SIDE_MIN;
          wrap.classList.toggle('toolswrap--bottom',
            toolsPreviewPos === 'bottom' || (toolsPreviewPos === 'right' && tight));
          // wide cards lay their params out in a single row
          const tx = $('.toolsx', panel);
          if (tx) tx.classList.toggle('toolsx--row', $('.toolslist', panel).clientWidth >= toolsRowMin());
        }
        continue;
      }
      if (panel.dataset.view !== 'operations') continue;
      const body = $('.panel__body', panel);
      const stacked = body.clientWidth < opsNeededWidth();
      if (String(stacked) !== panel.dataset.opsStacked) body.innerHTML = renderOperations(panel);
    }
  });
  $$('.main .panel, .clmode__ov').forEach((p) => ro.observe(p));

  // back to the Clouds projects listing
  $('.header__back').addEventListener('click', () => { location.href = '../clouds/'; });

  // the Preview button on a Clouds card passes the project name in the URL
  const pvName = new URLSearchParams(location.search).get('name');
  if (pvName) {
    $('.header__title').textContent = pvName;
    document.title = pvName + ' — ENCY Core';
    // the shell's active window tab mirrors the previewed project
    const tab = $('.htabs .htab.active .htab-t');
    if (tab) tab.textContent = pvName;
  }

  // header "more" dropdown
  const moreBtn = $('#moreBtn'), moreMenu = $('#moreMenu');
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = moreMenu.hidden;
    $$('.panel__menu').forEach((m) => { m.hidden = true; });
    if (open) {
      moreMenu.hidden = false;
      const r = moreBtn.getBoundingClientRect();
      moreMenu.style.left = `${r.right - moreMenu.offsetWidth}px`;
      moreMenu.style.top = `${r.bottom + 4}px`;
    } else moreMenu.hidden = true;
  });
  $$('#moreMenu button').forEach((b) => b.addEventListener('click', () => { moreMenu.hidden = true; }));

  // compact header: the update date opens who-updated + created-on
  const updBtn = $('#updBtn'), datePanel = $('#datePanel');
  updBtn.addEventListener('click', (e) => {
    if (!matchMedia('(max-width:1080px)').matches) return; // clickable only when the created date is hidden
    e.stopPropagation();
    const open = datePanel.hidden;
    $$('.panel__menu').forEach((m) => { m.hidden = true; });
    $('#moreMenu').hidden = true;
    $('#membersPanel').hidden = true;
    if (open) {
      datePanel.hidden = false;
      const r = updBtn.getBoundingClientRect();
      datePanel.style.left = `${Math.max(8, Math.min(r.left, innerWidth - datePanel.offsetWidth - 8))}px`;
      datePanel.style.top = `${r.bottom + 6}px`;
    } else datePanel.hidden = true;
  });
  datePanel.addEventListener('click', (e) => e.stopPropagation());

  // project details popover (members)
  const membersBtn = $('#membersBtn'), membersPanel = $('#membersPanel');
  membersBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = membersPanel.hidden;
    $$('.panel__menu').forEach((m) => { m.hidden = true; });
    moreMenu.hidden = true;
    if (open) {
      membersPanel.hidden = false;
      const r = membersBtn.getBoundingClientRect();
      membersPanel.style.left = `${Math.max(8, r.right - membersPanel.offsetWidth)}px`;
      membersPanel.style.top = `${r.bottom + 6}px`;
    } else membersPanel.hidden = true;
  });
  membersPanel.addEventListener('click', (e) => e.stopPropagation());
  $('#pdClose').addEventListener('click', () => { membersPanel.hidden = true; });
  $('#pdMore').addEventListener('click', (e) => {
    const hiddenBlock = $('.pdetails__hidden');
    const open = hiddenBlock.hidden;
    hiddenBlock.hidden = !open;
    e.currentTarget.classList.toggle('is-open', open);
    e.currentTarget.lastChild.textContent = open ? 'Show less' : '+2 more';
  });
  $$('.inforow__copy').forEach((b) => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(b.dataset.copy);
    b.querySelector('use').setAttribute('href', '#i-check');
    setTimeout(() => b.querySelector('use').setAttribute('href', '#i-copy'), 1200);
  }));

  const left = $('#leftPanel'), topP = $('#topPanel'), main = $('.main');

  makeDraggable($('#dividerV'), {
    start: (e) => ({ x: e.clientX, w: left.getBoundingClientRect().width }),
    move: (e, s) => {
      left.classList.remove('is-collapsed'); // dragging re-opens a collapsed panel
      const content = main.clientWidth - 20;             // minus .main padding
      const max = content - 10 - MIN_W;                  // divider + right minimum
      left.style.width = `${Math.max(MIN_W, Math.min(max, s.w + (e.clientX - s.x)))}px`;
    },
    click: () => { if (left.classList.contains('is-collapsed')) togglePanel(left); },
  });

  const bottomP = $('#bottomPanel');
  makeDraggable($('#dividerH'), {
    start: (e) => ({ y: e.clientY, h: topP.getBoundingClientRect().height }),
    move: (e, s) => {
      // dragging re-opens whichever right panel is collapsed
      topP.classList.remove('is-collapsed');
      bottomP.classList.remove('is-collapsed');
      const total = topP.parentElement.getBoundingClientRect().height;
      const h = Math.max(MIN_H, Math.min(total - MIN_H - 10, s.h + (e.clientY - s.y)));
      topP.style.flex = `0 0 ${h}px`;
    },
    click: () => {
      if (topP.classList.contains('is-collapsed')) togglePanel(topP);
      else if (bottomP.classList.contains('is-collapsed')) togglePanel(bottomP);
    },
  });
});
