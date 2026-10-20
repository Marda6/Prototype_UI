// System setup — ENCY's settings window (TASetupFrm in Bin64/SCKernel.dll) in our design.
// Opened from the logo menu → Settings; chrome.js loads this file (and setup.css) on first use.
//
// The pages, groups and parameters are the original form's, in its order; the look is the settings
// pattern of the web prototype v2 (see setup.css): page list with icons, sections divided by hairlines, rows with
// the title (and a description where ENCY has one) on the left and the control on the right.
// Presentation changes, no parameter moved between pages: the Graphic window tabs (Main / Visual
// parameters) are two sections; Language "Description" is the description of its row; the three
// unlabelled defaults buttons are one "Defaults" menu. Option lists and texts come from ENCY itself —
// the form's strings, Supplement/Application/ApplicationTypes.xml, ProgramData/…/Languages; sample
// data is marked so.
//
// State: S — applied values (localStorage 'ency.setup'), W — the working copy while the window is
// open; Apply / Ok copy W into S, Cancel / ✕ / Esc drop it. Apply is on only while W differs from S.
// UI theme is the theme of the logo menu (window.ENCY_THEMES), applied on Apply / Ok.
(function(){
  'use strict';

  var TH = window.ENCY_THEMES || {list:[{id:'', t:'Graphite', g:'Dark', base:'#0e1010'}], get:function(){ return ''; }, set:function(){}};
  var STORE = 'ency.setup', SAVED = 'ency.setup.saved';

  /* ---------- icons: the v2 set (Setup Sheet/v2, 24px, stroke 1.5); palette — the standard glyph drawn the same way ---------- */
  var IC = {
    folder:'<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4L11 8h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>',
    ruler:'<rect x="2.5" y="7" width="19" height="10" rx="1.5"/><path d="M7 7v3M11 7v4M15 7v3M19 7v4"/>',
    cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 3v18M4 7.5l8 4.5 8-4.5"/>',
    palette:'<path d="M12 20.5a8.5 8.5 0 1 1 8.5-8.5c0 2.4-1.8 3.5-3.4 3.5h-2.1a1.9 1.9 0 0 0-1.4 3.2c.7.8.2 1.8-1.6 1.8z"/><circle cx="7.6" cy="11" r="1"/><circle cx="10.4" cy="7.4" r="1"/><circle cx="14.8" cy="7.6" r="1"/>',
    download:'<path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"/>',
    sliders:'<path d="M3 6h8M15 6h6M11 4v4"/><path d="M3 12h4M11 12h10M7 10v4"/><path d="M3 18h12M19 18h2M15 16v4"/>',
    toolbit:'<path d="M10 3h4v9l-2 3-2-3z"/><path d="M12 15v6"/>',
    globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.2 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.2-3.7-8.5s1.3-6.2 3.7-8.5z"/>',
    share:'<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
    chevdown:'<path d="M6 9l6 6 6-6"/>',
    chev:'<path d="M9 6l6 6-6 6"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>',
    check:'<path d="M4 12.5l4 4 12-11"/>',
    more:'<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>'
  };
  function ic(n, cls){
    return '<svg class="su-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + IC[n] + '</svg>';
  }

  /* ---------- reference data ---------- */
  // ProgramData/ENCY Software/ENCY NB/Version 3/Languages/CAM_*.lng (description = the language, natively)
  var LANGS = [
    ['CAM_Bg','Bulgarian (Български)'], ['CAM_Cz','Czech (Čeština)'], ['CAM_Deu','German (Deutsch)'],
    ['CAM_Eng','English (English)'], ['CAM_en-US','English, US (English)'], ['CAM_Fr','French (Français)'],
    ['CAM_Hu','Hungarian (Magyar)'], ['CAM_Ita','Italian (Italiano)'], ['CAM_Jpn','Japanese (日本語)'],
    ['CAM_Ko','Korean (한국어)'], ['CAM_Pl','Polish (Polski)'], ['CAM_Pt','Portuguese (Português)'],
    ['CAM_Ptb','Portuguese, Brazil (Português)'], ['CAM_SimplChinese','Chinese, Simplified (简体中文)'],
    ['CAM_Sk','Slovak (Slovenčina)'], ['CAM_Spn','Spanish (Español)'], ['CAM_Swe','Swedish (Svenska)'],
    ['CAM_Th','Thai (ไทย)'], ['CAM_Tr','Turkish (Türkçe)'], ['CAM_TradChinese','Chinese, Traditional (繁體中文)']
  ];
  var LANG_DESC = {}; LANGS.forEach(function(l){ LANG_DESC[l[0]] = l[1]; });
  // the save level descriptions (form strings, Short → Detailed)
  var SAVE_NOTES = [
    'The parameters of operations are saved only. Tool path is not saved.',
    'The operations are saved with the calculated toolpath.',
    'In addition, machine 3D models are saved into the project.',
    'The intermediate part geometry (simulation result) is saved.'
  ];
  // collision detection levels (form strings)
  var COLL = [
    {t:'Holder', h:'Holder', d:'Fast check for holder collisions. Use for quick validation during toolpath setup.'},
    {t:'Machine', h:'Holder + machine', d:'Checks holder and machine components. Balanced option for daily work.'},
    {t:'Hidden nodes', h:'Holder + machine + hidden nodes', d:'Full collision check including hidden nodes. Use for additional safety when needed.'}
  ];
  // the standard colours of ENCY's colour box (Delphi's 16)
  var COLORS = [['Black','#000000'],['Maroon','#800000'],['Green','#008000'],['Olive','#808000'],['Navy','#000080'],
    ['Purple','#800080'],['Teal','#008080'],['Gray','#808080'],['Silver','#c0c0c0'],['Red','#ff0000'],['Lime','#00ff00'],
    ['Yellow','#ffff00'],['Blue','#0000ff'],['Fuchsia','#ff00ff'],['Aqua','#00ffff'],['White','#ffffff']];
  var HEX = {}; COLORS.forEach(function(c){ HEX[c[0]] = c[1]; });
  // the colour elements (form strings); the colours themselves are sample data
  var OPC = ['Yellow','Aqua','Fuchsia','Lime','Red','Blue','Olive','Teal'];
  var CTREE = [
    {id:'gw', t:'Graphic window', bg:true, kids:[
      {id:'gw1', t:'First background color', c:'Black'}, {id:'gw2', t:'Second background color', c:'Navy'},
      {id:'gw3', t:'Tablet background color', c:'Gray'}, {id:'gw4', t:'Tablet font color', c:'White'}]},
    {id:'cs', t:'Coordinate systems axes', kids:[
      {id:'csx', t:'Axis X', c:'Red'}, {id:'csy', t:'Axis Y', c:'Lime'}, {id:'csz', t:'Axis Z', c:'Blue'}]},
    {id:'m3', t:'3D Model', kids:[
      {id:'m3s', t:'Selected objects', c:'Yellow'}, {id:'m3h', t:'Highlighted objects', c:'Aqua'}]},
    {id:'g2', t:'2D Geometry', kids:[
      {id:'g2s', t:'Selected object', c:'Yellow'}, {id:'g2h', t:'Highlighted object', c:'Aqua'},
      {id:'g2a', t:'Auxiliary object', c:'Gray'}, {id:'g2n', t:'Non active object', c:'Silver'},
      {id:'g2d', t:'Default created object', c:'White'}]},
    {id:'mc', t:'Machining', kids:[{id:'mct', t:'Toolpath', c:'Lime'}, {id:'mcr', t:'Rapid toolpath', c:'Red'}]
      .concat(Array.apply(null, Array(16)).map(function(_, i){ return {id:'mo' + (i + 1), t:'Operation ' + (i + 1), c:OPC[i % OPC.length]}; }))}
  ];
  var CNODE = {}; CTREE.forEach(function(g){ CNODE[g.id] = g; g.kids.forEach(function(k){ k.parent = g; CNODE[k.id] = k; }); });
  // colour schemes: Default, Dark and Light differ in the graphic window (sample data)
  var SCHEMES = {Default:{gw1:'Black', gw2:'Navy'}, Dark:{gw1:'Black', gw2:'Black'}, Light:{gw1:'White', gw2:'Silver'}};
  // key mapping (form strings); each preset is a base mouse button + its pan / zoom (sample data)
  var KEY_PRESETS = {
    '(TM) default':    {b:'Right mouse button', pan:'Shift + Right mouse button', zoom:'Ctrl + Right mouse button or Mouse wheel', zw:'Alt + Right mouse button'},
    'Alibre (TM)':     {b:'Ctrl + Shift + Right mouse button', pan:'Shift + Right mouse button', zoom:'Ctrl + Right mouse button', zw:'Alt + Right mouse button'},
    'Rhinoceros (TM)': {b:'Right mouse button', pan:'Shift + Right mouse button', zoom:'Ctrl + Right mouse button or Mouse wheel', zw:'Alt + Right mouse button'},
    'SolidWorks (TM)': {b:'Middle mouse button', pan:'Ctrl + Middle mouse button', zoom:'Shift + Middle mouse button', zw:'Alt + Middle mouse button'},
    'SpaceClaim (TM)': {b:'Middle mouse button', pan:'Shift + Middle mouse button', zoom:'Ctrl + Middle mouse button or Mouse wheel', zw:'Alt + Middle mouse button'},
    'WorkNC (TM)':     {b:'Left + Right mouse button', pan:'Space + Right mouse button', zoom:'Ctrl + Right mouse button or Mouse wheel', zw:'Alt + Right mouse button'}
  };
  var KEY_CMDS = [
    {t:'Rotation', f:function(p){ return p.b; }},
    {t:'Rotation around the X axis', f:function(p){ return 'X + ' + p.b; }},
    {t:'Rotation around the Y axis', f:function(p){ return 'Y + ' + p.b; }},
    {t:'Rotation around the Z axis', f:function(p){ return 'Z + ' + p.b; }},
    {t:'Rotation around the screen X axis', f:function(p){ return 'U + ' + p.b; }},
    {t:'Rotation around the screen Y axis', f:function(p){ return 'V + ' + p.b; }},
    {t:'Rotation around the screen Z axis', f:function(p){ return 'W + ' + p.b; }},
    {t:'Continued rotation', f:function(p){ return 'Shift + Alt + ' + p.b; }},
    {t:'Zoom', f:function(p){ return p.zoom; }},
    {t:'Zoom Window', f:function(p){ return p.zw; }},
    {t:'Pan', f:function(p){ return p.pan; }},
    {t:'Show all', f:function(){ return 'Double click of the middle mouse button'; }},
    {t:'Select', f:function(){ return 'Left mouse button'; }},
    {t:'Add to selected', f:function(){ return 'Shift + Selection action'; }},
    {t:'Exclude from selected', f:function(){ return 'Alt + Selection action'; }},
    {t:'Inverse selection state', f:function(){ return 'Ctrl + Selection action'; }},
    {t:'Expand highlighted object', f:function(){ return 'Double click of the left mouse button'; }},
    {t:'Up folder for highlighted object', f:function(){ return 'Shift + Double click of the left mouse button'; }}
  ];
  function keyPreset(name){ var p = KEY_PRESETS[name]; return KEY_CMDS.map(function(c){ return c.f(p); }); }
  function keyOpts(i){
    var o = [];
    Object.keys(KEY_PRESETS).forEach(function(n){ var v = KEY_CMDS[i].f(KEY_PRESETS[n]); if (o.indexOf(v) < 0) o.push(v); });
    return o;
  }
  // PLM: the extensions ENCY ships (TeamCenter/) — the parameters are sample data
  var PLM_EXT = {Teamcenter:{conn:['Server URL','Port','Web tier'], set:['Projects folder','Item type']}};
  var MONO = ['Courier New','Consolas','Lucida Console','Cascadia Mono'];
  var PATH_HIST = ['$(PROGRAM_PERSONAL)', 'D:\\ENCY', '\\\\fileserver\\cam'];   // other folders picked before (sample)

  /* ---------- pages ---------- */
  // section: h — its head (or none); row: k — value key (k2 the second one), t — title, d — description
  // (text or fn(W); may hold a link), c — control or block, v / v2 — defaults, sub — depends on the
  // switch above (indented), dis(W) — dimmed; slot — a control in the section head (a slider)
  function noAuto(W){ return !W.asTimer && !W.asEvents; }
  var PAGES = [
    {id:'folders', t:'Folders', ic:'folder', secs:[
      {h:'Folders', rows:[
        {k:'dirPrj',  t:'Project',       c:'path', v:'$(PROGRAM_PERSONAL)\\Projects'},
        {k:'dirImp',  t:'Import files',  c:'path', v:'$(PROGRAM_PERSONAL)\\Models'},
        {k:'dirNC',   t:'CNC-programs',  c:'path', v:'$(PROGRAM_PERSONAL)\\NC Programs'},
        {k:'dirPost', t:'Postprocessor', c:'path', v:'$(PROGRAM_PERSONAL)\\Postprocessors'},
        {k:'dirIpp',  t:'Interpreter',   c:'path', v:'$(PROGRAM_PERSONAL)\\Interpreters'}]},
      {h:'Languages', rows:[
        {k:'lang', t:'File', d:function(W){ return esc(LANG_DESC[W.lang] || ''); }, c:'path', v:'CAM_Eng',
          opts:LANGS.map(function(l){ return [l[0], l[0] + '  ·  ' + l[1]]; })}]},
      {h:'Project save options', slot:{k:'saveLvl', c:'level', v:2, min:0, max:3, lo:'Short', hi:'Detailed'}, rows:[
        {k:'asTimer', k2:'asTimerMin', t:'Autosaves by timer', c:'tnum', v:false, v2:15, unit:'min'},
        {k:'asEvents', t:'Autosaves by events', c:'tgl', v:true},
        {k:'asLong', t:'Long autosave time', c:'num', v:20, unit:'sec', dis:noAuto},
        {k:'asLongInt', t:'Interval between long autosaves', c:'num', v:5, unit:'min', dis:noAuto},
        {k:'snapManual', t:'Manually saved snapshots count', c:'num', v:5},
        {k:'snapAuto', t:'Autosaved snapshots count', c:'num', v:15, dis:noAuto}]},
      {h:'Confirmation', rows:[
        {k:'cfOverwrite', t:'When trying to overwrite an existing NC program', c:'tgl', v:true},
        {k:'cfWarnings', t:'On warnings before generating NC program', c:'tgl', v:true}]}
    ]},
    {id:'units', t:'Measurement units', ic:'ruler', secs:[
      {h:'Units', rows:[
        {k:'unitSys', t:'System', c:'seg', v:'Metric', opts:['Metric','Imperial']},
        {t:'Linear dimensions', c:'ro', v:function(W){ return W.unitSys === 'Metric' ? 'mm' : 'inch'; }},
        {t:'Angular values', c:'ro', v:'Degree'},
        {t:'Feedrate', c:'ro', v:function(W){ return W.unitSys === 'Metric' ? 'mm per minute' : 'inch per minute'; }},
        {t:'Cutting speed', c:'ro', v:function(W){ return W.unitSys === 'Metric' ? 'm per minute' : 'foot per minute'; }},
        {t:'Revolution', c:'ro', v:'Rev. per minute'}]},
      {rows:[
        {k:'digits', t:'Tolerance (digits)', c:'num', v:3},
        {k:'vulgar', t:'Use vulgar fraction', c:'tgl', v:false},
        {k:'timeFmt', t:'Time format', c:'dd', v:'hh:mm:ss', opts:['hh:mm:ss','hh:mm','mm:ss']}]}
    ]},
    {id:'vis', t:'Visualization', ic:'cube', secs:[
      {h:'Axes parameters', rows:[
        {k:'axActive', t:'Active coordinate system', c:'tgl', v:false},
        {k:'axActiveLen', t:'Axis length', sub:1, c:'num', v:150, unit:'px', dis:function(W){ return !W.axActive; }},
        {k:'axAdd', t:'Additional axes', c:'tgl', v:false},
        {k:'axAddLen', t:'Axis length', sub:1, c:'num', v:40, unit:'px', dis:function(W){ return !W.axAdd; }}]},
      {h:'Visualization quality', slot:{k:'visQ', c:'sl', v:100, min:0, max:100, lo:'Low', hi:'High'}, rows:[
        {k:'stitch', t:'Stitch faces together', c:'tgl', v:true}]},
      {h:'Graphic window', rows:[
        {k:'rotCenter', t:'Rotation centre', c:'dd', v:'Mouse Point',
          opts:['Screen Centre','Model Centre','CS Origin','Mouse Point','Mouse Wheel Point']},
        {k:'trap', t:'Trap size', c:'num', v:5, unit:'px'},
        {k:'mouseSens', t:'Mouse sensitivity', c:'sl', v:100, min:50, max:200, lo:'Low', hi:'High'},
        {k:'anim', k2:'animQ', t:'Animation', c:'tsl', v:true, v2:40, min:0, max:50, lo:'Low', hi:'High'},
        {k:'cursorXY', t:'Show cursor coordinates', c:'tgl', v:false}]},
      {h:'Graphic window · Visual parameters', rows:[
        {k:'renderMode', t:'Rendering mode', c:'dd', v:'Hardware Advanced',
          opts:['Hardware Advanced','Hardware Standard','Software (very slow)']},
        {k:'ao', t:'Ambient occlusion', c:'tgl', v:true},
        {k:'renderProf', t:'Rendering profile', c:'dd', v:'Auto', opts:['Auto','Full','Simplified'],
          d:function(W){ return W.renderProf !== S.renderProf ? 'Rendering profile changed! Restart the application to apply.' : 'Current profile: Full'; },
          warn:function(W){ return W.renderProf !== S.renderProf; }},
        {k:'renderQ', t:'Quality', c:'sl', v:1, min:0, max:2, stops:true, lo:'Low', hi:'High'}]},
      {h:'NC code font', rows:[
        {k:'ncFont', k2:'ncFontSize', t:'Font', c:'font', v:'Courier New', v2:9,
          d:function(W){ return '<i style="font:normal ' + (+W.ncFontSize || 9) + 'pt/16px \'' + esc(W.ncFont) + '\',monospace">G00 X100 Y100 Z100 F200</i>'; }}]},
      {h:'Key mapping', rows:[
        {k:'keyMap', t:'Mapping type', c:'dd', v:'(TM) default', opts:Object.keys(KEY_PRESETS).concat('Custom')},
        {c:'keys'}]}
    ]},
    {id:'colors', t:'Colors', ic:'palette', secs:[
      {h:'Color scheme', rows:[
        {k:'scheme', t:'Color scheme', c:'scheme', v:'Default'}]},
      {h:'Elements', rows:[{c:'colors'}]},
      {h:'Interface', rows:[
        {k:'uiTheme', t:'UI theme', c:'themes', v:''}]}
    ]},
    {id:'import', t:'Import', ic:'download', secs:[
      {h:'Import types', rows:[
        {k:'impPts', t:'Points', c:'tgl', v:true},
        {k:'impCrv', t:'Curves', c:'tgl', v:true},
        {k:'impSrf', t:'Surfaces', c:'tgl', v:true},
        {k:'impSol', t:'Solids', c:'tgl', v:true},
        {k:'impCS', t:'Coordinate systems', c:'tgl', v:true}]},
      {rows:[
        {k:'crvTol', t:'Curves approximation tolerance', c:'num', v:'0.01'},
        {k:'scale', t:'Scale', d:'Scale dimensions when measurements does not match', c:'dd', v:'Ask every time',
          opts:['Ask every time','Scale always','Scale never']},
        {k:'gsDll', t:'Ghost script Dll', d:'<a class="su-link">Installing the Ghostscript library</a>', c:'file', v:''}]}
    ]},
    {id:'additional', t:'Additional', ic:'sliders', secs:[
      {h:'Updates', rows:[
        {k:'updCheck', t:'Check for updates', c:'tgl', v:true},
        {k:'updSemi', t:'Semi-automatic update', sub:1, c:'tgl', v:false, dis:function(W){ return !W.updCheck; }}]},
      {h:'Logs', rows:[
        {k:'logUse', t:'Use logs', c:'tgl', v:true},
        {k:'logDir', t:'Log folder', sub:1, c:'file', v:'$(Log_FOLDER)', dis:function(W){ return !W.logUse; }},
        {k:'logIpp', t:'Use log interaction with the interpreter', sub:1, c:'tgl', v:false, dis:function(W){ return !W.logUse; }},
        {k:'logSend', t:'Send report after incorrectly application finish', c:'tgl', v:false},
        {k:'logPCA', t:'Check Program Compatibility Assistance items', c:'tgl', v:false}]},
      {h:'External STCX-editor', rows:[
        {k:'stcxUse', t:'Use external STCX-editor', c:'tgl', v:false},
        {k:'stcxPath', t:'External STCX-editor', sub:1, c:'file', v:'', dis:function(W){ return !W.stcxUse; }}]},
      {h:'Expert tools', rows:[
        {k:'expert', t:'Show expert tools', c:'tgl', v:true}]},
      {h:'Smart hints', rows:[
        {k:'smartHints', t:'Show smart hints', c:'tgl', v:true}]},
      {h:'Inspector', rows:[
        {k:'inspIcons', t:'Show icons', c:'tgl', v:true},
        {k:'inspCompact', t:'Compact mode', c:'tgl', v:true}]}
    ]},
    {id:'machining', t:'Machining', ic:'toolbit', secs:[
      {h:'Operations sequence behavior', rows:[
        {k:'resetDep', t:'Reset dependent operations', c:'tgl', v:true},
        {k:'autoReset', t:'Auto-reset toolpath', c:'tgl', v:false},
        {k:'bgSim', t:'Background simulation', c:'tgl', v:true},
        {k:'collDet', t:'Collision detection', c:'tgl', v:false},
        {k:'collLvl', t:'', sub:1, c:'segdesc', v:0, stops:COLL, dis:function(W){ return !W.collDet; }}]},
      {h:'Tools list', rows:[
        {k:'toolTpl', t:'Template name', c:'file', v:'$(TEMPLATE_FOLDER)\\default.odt'},
        {k:'toolShow', t:'Show Tools list', c:'tgl', v:true},
        {k:'toolShell', t:'Open with', sub:1, c:'seg', v:'Default', opts:['Default','Other'], dis:function(W){ return !W.toolShow; }},
        {k:'toolOther', t:'Other', sub:1, c:'file', v:'', dis:function(W){ return !W.toolShow || W.toolShell !== 'Other'; }}]},
      {h:'External NC-editor', rows:[
        {k:'ncEdUse', t:'Use external NC-editor', c:'tgl', v:true},
        {k:'ncEdAuto', t:'Auto run NC-editor', sub:1, c:'tgl', v:false, dis:function(W){ return !W.ncEdUse; }},
        {k:'ncEdPath', t:'External NC-editor', sub:1, c:'file', v:'Notepad.exe', dis:function(W){ return !W.ncEdUse; }}]},
      {rows:[
        {k:'drillFmt', t:'Drilling cycle output format', c:'dd', v:'EXTCYCLE (recommended)',
          opts:['EXTCYCLE (recommended)','CYCLE (for old postprocessors)']},
        {k:'skipLoadTL', t:'Don\'t add LOADTL to CLData unless there is a real tool change', d:'For old postprocessors', c:'tgl', v:false},
        {k:'oneCore', t:'Leave one core free', d:'Leave one core free in multi-core computing (restart required)', c:'tgl', v:false}]}
    ]},
    {id:'online', t:'Online features', ic:'globe', secs:[
      {h:'Online features', rows:[
        {k:'usage', t:'Usage Statistics', c:'tgl', v:true},
        {k:'clouds', t:'Clouds', c:'tgl', v:true}]},
      {h:'Authorization information', rows:[
        {k:'remember', t:'Remember me', c:'tgl', v:true},
        {k:'login', t:'Login', c:'text', v:''},
        {k:'password', t:'Password', c:'pass', v:''}]}
    ]},
    {id:'plm', t:'PLM connections', ic:'share', secs:[
      {h:'Connections', rows:[{c:'plm'}]},
      {h:'Connection parameters', rows:[{c:'ptable', part:'conn'}]},
      {h:'Settings parameters', rows:[{c:'ptable', part:'set'}]}
    ]}
  ];

  /* ---------- state ---------- */
  function defaults(){
    var d = {plm:[]};
    PAGES.forEach(function(p){ p.secs.forEach(function(s){
      (s.slot ? [s.slot] : []).concat(s.rows).forEach(function(r){
        if (r.k) d[r.k] = r.v;
        if (r.k2) d[r.k2] = r.v2;
      });
    }); });
    Object.keys(CNODE).forEach(function(id){
      var n = CNODE[id]; if (n.kids) return;
      d['col.' + id] = n.c; d['tr.' + id] = 0; d['sh.' + id] = false; d['shc.' + id] = 'White';
    });
    d.bgMode = 'Plain'; d.bgAngle = -90;
    d.bgImage = 'C:\\Program Files\\$(COMPANY_NAME)\\$(APP_NAME)\\Images\\Background.png';
    d.keys = keyPreset(d.keyMap);
    return d;
  }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function load(key){
    var d = defaults();
    try { var s = JSON.parse(localStorage.getItem(key) || 'null'); if (s) Object.keys(s).forEach(function(k){ if (k in d) d[k] = s[k]; }); } catch(e){}
    return d;
  }
  var S = load(STORE), W = null;
  // window-only state: the page, the colour list (selection, open groups), the PLM row and its message
  var U = {page:'folders', cSel:'gw', cOpen:{gw:true}, plmSel:-1, plmMsg:''};
  function dirty(){ return JSON.stringify(W) !== JSON.stringify(S); }

  /* ---------- markup ---------- */
  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function val(r){ return typeof r.v === 'function' ? r.v(W) : r.v; }
  function optLabel(r, v){
    var o = (r.opts || []).filter(function(x){ return Array.isArray(x) ? x[0] === v : x === v; })[0];
    return o === undefined ? v : Array.isArray(o) ? o[0] : o;
  }
  function dd(key, label, extra){
    return '<span class="su-dd" data-dd="' + key + '"><span class="v">' + (extra || '') + esc(label) + '</span>' + ic('chevdown') + '</span>';
  }
  function tgl(key){ return '<span class="su-tgl' + (W[key] ? ' on' : '') + '" data-tgl="' + key + '"></span>'; }
  function field(key, ph, type){
    return '<label class="su-in"><input' + (type ? ' type="' + type + '"' : '') + ' data-in="' + key + '" value="' + esc(W[key]) + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' spellcheck="false"></label>';
  }
  function num(key, unit, off){
    return '<label class="su-in n"><input data-in="' + key + '" value="' + esc(W[key]) + '"' + (off ? ' disabled' : '') + '>' +
      (unit ? '<em>' + unit + '</em>' : '') + '</label>';
  }
  function browse(){ return '<span class="su-ib" data-tip="Browse…">' + ic('folder') + '</span>'; }
  function slider(key, r, off){
    var v = +W[key], p = (v - r.min) / (r.max - r.min) * 100, dots = '';
    if (r.stops) for (var i = r.min; i <= r.max; i++) dots += '<i class="dot" style="left:' + ((i - r.min) / (r.max - r.min) * 100) + '%"></i>';
    return '<span class="su-sl"' + (off ? ' style="opacity:.4;pointer-events:none"' : '') + '>' + (r.lo ? '<span>' + r.lo + '</span>' : '') +
      '<span class="su-tr" data-sl="' + key + '" data-min="' + r.min + '" data-max="' + r.max + '"' + (r.stops ? ' data-step="1"' : '') + '>' +
      '<i class="fill" style="width:' + p + '%"></i>' + dots + '<i class="knob" style="left:' + p + '%"></i></span>' +
      (r.hi ? '<span>' + r.hi + '</span>' : '') + '</span>';
  }
  function seg(key, opts, cur, full, sw){
    return '<span class="su-seg' + (full ? ' full' : '') + '" data-seg="' + key + '">' + opts.map(function(o, i){
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<button class="' + (v === cur ? 'on' : '') + '" data-v="' + esc(v) + '">' + (sw ? '<i class="su-sw" style="background:' + sw[i] + '"></i>' : '') + esc(t) + '</button>';
    }).join('') + '</span>';
  }
  function colorDd(key){ return dd(key, W[key], '').replace('<span class="v">', '<i class="su-sw" style="background:' + HEX[W[key]] + '"></i><span class="v">'); }

  // the control on the right of a row
  function ctl(r){
    var key = r.k;
    switch (r.c){
      case 'dd':     return dd(key, optLabel(r, W[key]));
      case 'path':   return dd(key, W[key]) + browse();
      case 'file':   return field(key) + browse();
      case 'tgl':    return tgl(key);
      case 'num':    return num(key, r.unit);
      case 'tnum':   return tgl(key) + num(r.k2, r.unit, !W[key]);
      case 'tsl':    return tgl(key) + slider(r.k2, r, !W[key]);
      case 'sl':     return slider(key, r);
      case 'seg':    return seg(key, r.opts, W[key]);
      case 'segfull':return seg(key, r.opts, W[key], true);
      case 'text':   return field(key, r.t);
      case 'pass':   return field(key, r.t, 'password');
      case 'ro':     return '<span class="su-ro">' + esc(val(r)) + '</span>';
      case 'color':  return colorDd(key);
      case 'font':   return dd(key, W[key]) + num(r.k2, 'pt');
      case 'scheme': return dd('scheme', W.scheme) + '<span class="su-ib" data-scheme-menu data-tip="Fill as initial…">' + ic('more') + '</span>';
      case 'themes': return seg('uiTheme', TH.list.map(function(o){ return [o.id, o.t]; }), W.uiTheme, true, TH.list.map(function(o){ return o.base; }));
      // the collision levels: the choice, what it checks under it
      case 'segdesc':
        var st = r.stops[+W[key]];
        return '<div class="su-stack">' + seg(key, r.stops.map(function(s, i){ return [String(i), s.t]; }), String(W[key])) +
          '<span class="su-desc"><b>' + st.h + '.</b> ' + st.d + '</span></div>';
      // the save level: Short … Detailed, what it saves under it
      case 'level':
        return '<div class="su-stack">' + slider(key, {min:r.min, max:r.max, stops:true, lo:r.lo, hi:r.hi}) +
          '<span class="su-desc">' + esc(SAVE_NOTES[W[key]]) + '</span></div>';
    }
    return '';
  }

  // blocks: the full width of a card
  var BLOCKS = {
    keys:function(){
      return '<div class="su-table"><div class="su-th su-th-dd"><span>Command</span><span>Hot key</span></div>' +
        KEY_CMDS.map(function(c, i){
          return '<div class="su-trow"><span>' + c.t + '</span><span>' + dd('hk.' + i, W.keys[i]) + '</span></div>';
        }).join('') + '</div>';
    },
    colors:function(){
      var list = '';
      CTREE.forEach(function(g){
        var open = !!U.cOpen[g.id];
        list += '<div class="su-li' + (open ? ' open' : '') + (U.cSel === g.id ? ' sel' : '') + '" data-cn="' + g.id + '">' + ic('chev', 'arr') + '<span>' + g.t + '</span></div>';
        if (open) g.kids.forEach(function(k){
          list += '<div class="su-li kid' + (U.cSel === k.id ? ' sel' : '') + '" data-cn="' + k.id + '"><span>' + k.t + '</span>' +
            '<i class="su-sw" style="background:' + HEX[W['col.' + k.id]] + '"></i></div>';
        });
      });
      var n = CNODE[U.cSel], props;
      if (n.bg){
        var a = HEX[W['col.gw1']], b = HEX[W['col.gw2']];
        var bg = W.bgMode === 'Gradient' ? 'linear-gradient(' + (90 - W.bgAngle) + 'deg,' + a + ',' + b + ')' : a;
        props = rowsHTML([
          {k:'bgMode', t:'Background', c:'segfull', opts:['Plain','Gradient','Image file']},
          {k:'bgAngle', t:'Gradient angle', sub:1, c:'num', unit:'°', dis:function(W){ return W.bgMode !== 'Gradient'; }},
          {k:'bgImage', t:'Image file', sub:1, c:'file', dis:function(W){ return W.bgMode !== 'Image file'; }}
        ]) + '<div class="su-prev" style="background:' + bg + '">' + (W.bgMode === 'Image file' ? esc(W.bgImage.split('\\').pop()) : '') + '</div>';
      } else if (n.kids){
        props = '<span class="su-desc">' + n.kids.length + ' elements. Pick one in the list to set its color.</span>';
      } else {
        props = rowsHTML([
          {k:'col.' + n.id, t:'Color', c:'color'},
          {k:'tr.' + n.id, t:'Transparence', c:'sl', min:0, max:100, lo:'Solid', hi:'Transparent'},
          {k:'sh.' + n.id, t:'Shiny lighting', c:'tgl'},
          {k:'shc.' + n.id, t:'Shine color', sub:1, c:'color', dis:function(W){ return !W['sh.' + n.id]; }}
        ]);
      }
      return '<div class="su-md"><div class="su-list">' + list + '</div><div class="su-props"><div class="su-props-title">' + esc(n.t) + '</div>' + props + '</div></div>';
    },
    plm:function(){
      var sel = W.plm[U.plmSel];
      var list = W.plm.length ? W.plm.map(function(p, i){
        return '<div class="su-trow' + (i === U.plmSel ? ' sel' : '') + '" data-plm="' + i + '"><span>' + esc(p.name) + '</span><span>' + esc(p.ext) + '</span></div>';
      }).join('') : '<div class="su-empty">No connections yet</div>';
      return '<div class="su-tools"><button class="su-btn" data-pa="add">Add</button>' +
          '<button class="su-btn" data-pa="copy"' + (sel ? '' : ' disabled') + '>Copy</button>' +
          '<button class="su-btn" data-pa="remove"' + (sel ? '' : ' disabled') + '>Remove</button>' +
          '<button class="su-btn" data-pa="test"' + (sel ? '' : ' disabled') + '>Test connection</button><span class="su-gap"></span>' +
          '<button class="su-btn" data-pa="load">Load from file</button><button class="su-btn" data-pa="save"' + (W.plm.length ? '' : ' disabled') + '>Save to file</button></div>' +
        '<div class="su-table pick"><div class="su-th"><span>Name</span><span>Extension</span></div>' + list + '</div>' +
        (sel ? '<div class="su-row"><div class="su-txt"><b>Name</b>' + (U.plmMsg ? '<span class="warn">' + U.plmMsg + '</span>' : '') + '</div><div class="su-ctl">' +
            '<label class="su-in"><input data-plmf="name" value="' + esc(sel.name) + '" spellcheck="false"></label></div></div>' +
          '<div class="su-row"><div class="su-txt"><b>Extension</b></div><div class="su-ctl">' + dd('plm.ext', sel.ext) + '</div></div>' : '');
    },
    ptable:function(r){
      var p = W.plm[U.plmSel], names = p && PLM_EXT[p.ext] ? PLM_EXT[p.ext][r.part] : [];
      return '<div class="su-table"><div class="su-th"><span>' + (r.part === 'conn' ? 'Connection parameter' : 'Settings parameter') + '</span><span>Value</span></div>' +
        (names.length ? names.map(function(n){
          var key = r.part + '.' + n;
          return '<div class="su-trow"><span>' + n + '</span><span><label class="su-in"><input data-plmv="' + esc(key) + '" value="' +
            esc((p.values || {})[key] || '') + '" spellcheck="false"></label></span></div>';
        }).join('') : '<div class="su-empty">' + (p ? 'No parameters' : 'Add a connection to set it up') + '</div>') + '</div>';
    }
  };

  function rowHTML(r){
    var off = r.dis && r.dis(W), cls = (r.sub ? ' sub' : '') + (off ? ' dis' : '');
    if (BLOCKS[r.c]) return '<div class="su-block' + cls + '">' + BLOCKS[r.c](r) + '</div>';
    var d = typeof r.d === 'function' ? r.d(W) : r.d;
    return '<div class="su-row' + cls + '"><div class="su-txt"><b>' + esc(r.t) + '</b>' +
      (d ? '<span' + (r.warn && r.warn(W) ? ' class="warn"' : '') + '>' + d + '</span>' : '') +
      '</div><div class="su-ctl">' + ctl(r) + '</div></div>';
  }
  function rowsHTML(rows){ return rows.map(rowHTML).join(''); }
  function pageHTML(p){
    return p.secs.map(function(s){
      var h = typeof s.h === 'function' ? s.h() : s.h;
      return '<div class="su-sec">' + (h ? '<div class="su-sec-head"><b>' + esc(h) + '</b><div class="su-ctl">' + (s.slot ? ctl(s.slot) : '') + '</div></div>' : '') +
        rowsHTML(s.rows) + '</div>';
    }).join('');
  }

  /* ---------- window ---------- */
  var scrim = null, win, nav, pageEl, titleEl, applyBtn, menu = null, tip, tipT = 0;
  function curPage(){ return PAGES.filter(function(x){ return x.id === U.page; })[0]; }
  function render(){
    var top = pageEl.scrollTop, p = curPage();
    nav.querySelectorAll('.su-tab').forEach(function(t){ t.classList.toggle('on', t.dataset.p === U.page); });
    titleEl.textContent = p.t;
    pageEl.innerHTML = pageHTML(p);
    pageEl.scrollTop = top;
    applyBtn.disabled = !dirty();
  }
  function hasSaved(){ try { return !!localStorage.getItem(SAVED); } catch(e){ return false; } }
  function build(){
    scrim = document.createElement('div');
    scrim.className = 'su-scrim';
    scrim.innerHTML =
      '<div class="su-win" role="dialog" aria-label="System setup">' +
        '<nav class="su-nav"><div class="su-nav-head">System setup</div><div class="su-nav-body">' +
          PAGES.map(function(p){ return '<div class="su-tab" data-p="' + p.id + '">' + ic(p.ic) + '<span>' + p.t + '</span></div>'; }).join('') +
        '</div></nav>' +
        '<div class="su-main">' +
          '<div class="su-head"><span class="su-title"></span><span class="su-x" data-tip="Close">' + ic('close') + '</span></div>' +
          '<div class="su-body"><div class="su-page"></div>' +
            '<div class="su-split-line"></div><div class="su-split" title="Drag to resize"></div></div>' +
          '<div class="su-foot">' +
            '<button class="su-btn" data-act="defaults">Defaults' + ic('chevdown') + '</button>' +
            '<span class="su-gap"></span>' +
            '<button class="su-btn pri" data-act="ok">Ok</button><button class="su-btn" data-act="cancel">Cancel</button>' +
            '<button class="su-btn" data-act="apply">Apply</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    win = scrim.firstChild;
    nav = win.querySelector('.su-nav'); pageEl = win.querySelector('.su-page'); titleEl = win.querySelector('.su-title');
    applyBtn = win.querySelector('[data-act="apply"]');
    tip = document.createElement('div'); tip.className = 'su-tip'; tip.hidden = true;
    scrim.appendChild(tip);
    wire();
  }
  function open(){
    if (!scrim) build();
    S = load(STORE);
    S.uiTheme = TH.get();          // the logo menu may have changed it since
    W = clone(S);
    U.plmSel = W.plm.length ? 0 : -1; U.plmMsg = '';
    document.body.appendChild(scrim);
    pageEl.scrollTop = 0;
    render();
    var lw = LW;
    try { lw = +localStorage.getItem(SPLIT) || LW; } catch(e){}
    setLw(lw);
  }

  /* ---------- the names | controls divider (as the inspector's): drag to move the line between the
     two columns. The names column is 140px at least; the controls column keeps CTL_MIN — the room the
     widest controls need without breaking (the 4 themes, the Colors element's Solid … Transparent
     slider beside its name). Kept across sessions ---------- */
  var SPLIT = 'ency.setup.split', LW = 200, LW_MIN = 140, CTL_MIN = 270, COL_GAP = 16;
  function lwMax(){
    var cs = getComputedStyle(pageEl);
    return pageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - COL_GAP - CTL_MIN;
  }
  function setLw(w){
    w = Math.round(Math.max(LW_MIN, Math.min(lwMax(), w)));
    win.style.setProperty('--su-lw', w + 'px');
    return w;
  }
  function close(){ closeMenu(); hideTip(); if (scrim && scrim.parentNode) scrim.remove(); }
  function apply(){
    S = clone(W);
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch(e){}
    if (S.uiTheme !== TH.get()) TH.set(S.uiTheme);
    render();
  }

  /* ---------- menus (v2) ---------- */
  function closeMenu(){
    if (!menu) return;
    if (menu._owner) menu._owner.classList.remove('open');
    menu.remove(); menu = null;
  }
  // items: [{v, t, sw}] | {head}; cur — the current value (undefined: no check column); pick(v)
  function openMenu(owner, items, cur, pick, alignRight){
    closeMenu();
    menu = document.createElement('div');
    menu.className = 'su-menu';
    menu.innerHTML = items.map(function(o, i){
      if (o.head) return '<div class="su-mh">' + esc(o.head) + '</div>';
      return '<div class="su-mi' + (o.v === cur ? ' su-cur' : '') + (cur === undefined ? ' plain' : '') + '" data-i="' + i + '">' +
        (cur === undefined ? '' : ic('check', o.v === cur ? '' : 'none')) +
        (o.sw ? '<i class="su-sw" style="background:' + o.sw + '"></i>' : '') + esc(o.t) + '</div>';
    }).join('');
    menu._owner = owner; owner.classList.add('open');
    menu.addEventListener('click', function(e){
      e.stopPropagation();
      var o = e.target.closest('.su-mi'); if (!o) return;
      var it = items[+o.dataset.i]; closeMenu(); pick(it.v);
    });
    document.body.appendChild(menu);
    var r = owner.getBoundingClientRect();
    menu.style.minWidth = Math.max(160, r.width) + 'px';
    var h = menu.offsetHeight, w = menu.offsetWidth, below = innerHeight - r.bottom - 8;
    menu.style.left = Math.max(4, Math.min(alignRight ? r.right - w : r.left, innerWidth - w - 4)) + 'px';
    menu.style.top = (h <= below || r.top < h ? r.bottom + 4 : r.top - h - 4) + 'px';
    var c = menu.querySelector('.su-cur'); if (c) c.scrollIntoView({block:'nearest'});
  }
  function rowOf(key){
    var hit = null;
    PAGES.forEach(function(p){ p.secs.forEach(function(s){ (s.slot ? [s.slot] : []).concat(s.rows).forEach(function(r){ if (r.k === key) hit = r; }); }); });
    return hit;
  }

  /* ---------- tooltips ---------- */
  function hideTip(){ clearTimeout(tipT); if (tip) tip.hidden = true; }
  function showTip(el){
    tip.textContent = el.dataset.tip; tip.hidden = false;
    var r = el.getBoundingClientRect();
    tip.style.left = Math.max(4, Math.min(r.left + r.width / 2 - tip.offsetWidth / 2, innerWidth - tip.offsetWidth - 4)) + 'px';
    tip.style.top = (r.bottom + 6 + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 6 : r.bottom + 6) + 'px';
  }

  /* ---------- events ---------- */
  function set(key, v){ W[key] = v; render(); }
  function wire(){
    nav.addEventListener('click', function(e){
      var t = e.target.closest('.su-tab'); if (!t || t.dataset.p === U.page) return;
      U.page = t.dataset.p; pageEl.scrollTop = 0; render();
    });
    win.querySelector('.su-x').addEventListener('click', close);
    win.querySelector('.su-foot').addEventListener('click', function(e){
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'ok'){ apply(); close(); }
      else if (a === 'cancel') close();
      else if (a === 'apply') apply();
      else if (a === 'defaults'){
        if (menu && menu._owner === b){ closeMenu(); return; }
        var items = [{v:'reset', t:'Default settings'}, {v:'save', t:'Save defaults'}];
        if (hasSaved()) items.splice(1, 0, {v:'load', t:'Load saved defaults'});
        openMenu(b, items, undefined, function(v){
          if (v === 'reset'){ var t = W.uiTheme; W = defaults(); W.uiTheme = t; U.plmSel = -1; }
          else if (v === 'load'){ var s = load(SAVED); s.uiTheme = W.uiTheme; W = s; U.plmSel = W.plm.length ? 0 : -1; }
          else if (v === 'save'){ try { localStorage.setItem(SAVED, JSON.stringify(W)); } catch(err){} }
          render();
        });
      }
    });

    pageEl.addEventListener('click', function(e){
      var t = e.target;
      var g = t.closest('[data-tgl]');
      if (g){ set(g.dataset.tgl, !W[g.dataset.tgl]); return; }
      var sb = t.closest('.su-seg button');
      if (sb){
        var key = sb.parentNode.dataset.seg, v = sb.dataset.v;
        set(key, key === 'collLvl' ? +v : v); return;
      }
      var cn = t.closest('[data-cn]');
      if (cn){
        var id = cn.dataset.cn, n = CNODE[id];
        if (n.kids && (t.closest('.arr') || U.cSel === id)) U.cOpen[id] = !U.cOpen[id];
        U.cSel = id; render(); return;
      }
      var more = t.closest('[data-scheme-menu]');
      if (more){
        if (menu && menu._owner === more){ closeMenu(); return; }
        openMenu(more, [{v:'Default', t:'Fill as initial Default'}, {v:'Dark', t:'Fill as initial Dark'}, {v:'Light', t:'Fill as initial Light'}], undefined, function(v){
          Object.keys(SCHEMES[v]).forEach(function(id){ W['col.' + id] = SCHEMES[v][id]; });
          W.scheme = 'Custom'; render();
        }, true);
        return;
      }
      var pr = t.closest('[data-plm]');
      if (pr){ U.plmSel = +pr.dataset.plm; U.plmMsg = ''; render(); return; }
      var pa = t.closest('[data-pa]');
      if (pa){ plmAct(pa.dataset.pa); return; }
      var d = t.closest('[data-dd]');
      if (d){ ddOpen(d); return; }
    });

    pageEl.addEventListener('input', function(e){
      var t = e.target;
      if (t.dataset.in){ W[t.dataset.in] = t.value; applyBtn.disabled = !dirty(); }
      else if (t.dataset.plmf){ W.plm[U.plmSel][t.dataset.plmf] = t.value; applyBtn.disabled = !dirty(); }
      else if (t.dataset.plmv){ var p = W.plm[U.plmSel]; (p.values = p.values || {})[t.dataset.plmv] = t.value; applyBtn.disabled = !dirty(); }
    });
    // a typed number stays a number; the page re-reads its dependencies when the field is left
    pageEl.addEventListener('change', function(e){
      var t = e.target;
      if (t.dataset.in && typeof S[t.dataset.in] === 'number' && t.value.trim() !== '' && !isNaN(+t.value)) W[t.dataset.in] = +t.value;
      render();
    });

    // the column divider
    var split = win.querySelector('.su-split'), body = win.querySelector('.su-body');
    split.addEventListener('pointerdown', function(e){
      e.preventDefault();
      split.setPointerCapture(e.pointerId);
      body.classList.add('splitting');
      var x0 = pageEl.getBoundingClientRect().left + parseFloat(getComputedStyle(pageEl).paddingLeft) + COL_GAP / 2, w = 0;
      function mv(ev){ w = setLw(ev.clientX - x0); }
      function up(){
        body.classList.remove('splitting');
        split.removeEventListener('pointermove', mv); split.removeEventListener('pointerup', up);
        if (w) try { localStorage.setItem(SPLIT, w); } catch(err){}
      }
      split.addEventListener('pointermove', mv); split.addEventListener('pointerup', up);
    });

    // sliders: drag or click on the track; discrete ones snap to their stops
    pageEl.addEventListener('pointerdown', function(e){
      var tr = e.target.closest('.su-tr'); if (!tr) return;
      e.preventDefault();
      var key = tr.dataset.sl, mn = +tr.dataset.min, mx = +tr.dataset.max;
      function at(ev){
        var r = tr.getBoundingClientRect(), f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
        var v = Math.round(mn + f * (mx - mn)), p = (v - mn) / (mx - mn) * 100;
        tr.querySelector('.fill').style.width = p + '%'; tr.querySelector('.knob').style.left = p + '%';
        W[key] = v;
      }
      at(e); tr.setPointerCapture(e.pointerId);
      function up(){ tr.removeEventListener('pointermove', at); tr.removeEventListener('pointerup', up); render(); }
      tr.addEventListener('pointermove', at); tr.addEventListener('pointerup', up);
    });

    // tooltips on the icon buttons
    win.addEventListener('mouseover', function(e){
      var el = e.target.closest('[data-tip]');
      clearTimeout(tipT);
      if (!el){ tip.hidden = true; return; }
      tipT = setTimeout(function(){ showTip(el); }, 400);
    });
    win.addEventListener('mouseleave', hideTip);
    win.addEventListener('pointerdown', hideTip);

    // a click elsewhere closes the open menu (not the click that opened it, on its owner)
    document.addEventListener('click', function(e){
      if (menu && !e.target.closest('.su-menu') && !(menu._owner && menu._owner.contains(e.target))) closeMenu();
    });
    document.addEventListener('keydown', function(e){
      if (!scrim || !scrim.parentNode || e.key !== 'Escape') return;
      if (menu) closeMenu(); else close();
    });
    addEventListener('resize', function(){
      closeMenu();
      if (scrim && scrim.parentNode) setLw(parseFloat(win.style.getPropertyValue('--su-lw')) || LW);   // the controls keep their room
    });
  }

  // dropdowns: options of the row, the colour box, hot keys, folders' history, PLM extensions
  function ddOpen(d){
    var key = d.dataset.dd;
    if (menu && menu._owner === d){ closeMenu(); return; }
    function plain(list, cur, pick){ openMenu(d, list.map(function(v){ return {v:v, t:v}; }), cur, pick); }
    if (/^hk\./.test(key)){
      var i = +key.slice(3);
      plain(keyOpts(i), W.keys[i], function(v){
        W.keys[i] = v;
        if (JSON.stringify(W.keys) !== JSON.stringify(keyPreset(W.keyMap))) W.keyMap = 'Custom';
        render();
      });
      return;
    }
    if (/^(col|shc)\./.test(key)){
      openMenu(d, COLORS.map(function(c){ return {v:c[0], t:c[0], sw:c[1]}; }), W[key], function(v){ W[key] = v; W.scheme = 'Custom'; render(); });
      return;
    }
    if (key === 'scheme'){
      plain(['Custom','Default','Dark','Light'], W.scheme, function(v){
        W.scheme = v;
        if (SCHEMES[v]) Object.keys(SCHEMES[v]).forEach(function(id){ W['col.' + id] = SCHEMES[v][id]; });
        render();
      });
      return;
    }
    if (key === 'plm.ext'){ plain(Object.keys(PLM_EXT), W.plm[U.plmSel].ext, function(v){ W.plm[U.plmSel].ext = v; render(); }); return; }
    if (key === 'ncFont'){ plain(MONO, W.ncFont, function(v){ set('ncFont', v); }); return; }
    var r = rowOf(key); if (!r) return;
    var opts = r.opts;
    if (r.c === 'path' && !opts) opts = [S[key]].concat(PATH_HIST.map(function(p){ return p + '\\' + S[key].split('\\').pop(); }));
    openMenu(d, opts.map(function(o){ return Array.isArray(o) ? {v:o[0], t:o[1]} : {v:o, t:o}; }), W[key], function(v){
      W[key] = v;
      if (key === 'keyMap' && KEY_PRESETS[v]) W.keys = keyPreset(v);
      render();
    });
  }

  function plmAct(a){
    var sel = W.plm[U.plmSel];
    U.plmMsg = '';
    if (a === 'add'){ W.plm.push({name:'Connection ' + (W.plm.length + 1), ext:Object.keys(PLM_EXT)[0], values:{}}); U.plmSel = W.plm.length - 1; }
    else if (a === 'remove' && sel){ W.plm.splice(U.plmSel, 1); U.plmSel = Math.min(U.plmSel, W.plm.length - 1); }
    else if (a === 'copy' && sel){ var c = clone(sel); c.name += ' (copy)'; W.plm.splice(U.plmSel + 1, 0, c); U.plmSel++; }
    else if (a === 'test' && sel){ U.plmMsg = 'Connection test failed'; }   // nothing to connect to in the prototype
    render();
  }

  window.ENCY_SETUP = {open:open, close:close};
})();
