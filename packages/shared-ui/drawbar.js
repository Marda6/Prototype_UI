/* ENCY drawing bar — the shared tools for drawing on the 3D view (trim regions, cut lines, …).
   [wand] [Line] [Normal] [Polyline] [Spline] [Free ▾ | On Surface]
   Floats on the 3D view without a surface, like the view cube and the view bar.
   The wand is an on / off switch whose action is not defined yet — it only keeps its state.
   Glyphs are placeholders (blue strokes, red points, as in the ENCY toolbar) until the Figma icons.

   var bar = ENCY_DRAWBAR.create(hostEl, {tool, tools, onTool(id), onSurface(on), onWand(on)});
   bar.el · bar.state {tool, surface, wand} · bar.show(on) · bar.setTool(id) · bar.render() */
(function(){
  // colours through the theme tokens (light themes darken them), with the dark values as fallbacks;
  // set as style, since presentation attributes don't take var()
  var BL = 'var(--th-blue-text, #46acff)', RD = 'var(--th-red, #ff5c5e)', FG = 'var(--ec-fg-100, #f5f5f5)';
  function svg(body){ return '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'; }
  function dot(x, y){ return '<circle cx="' + x + '" cy="' + y + '" r="1.7" style="fill:' + RD + '"/>'; }
  var ICONS = {
    wand:     svg('<path d="M4 16 11.5 8.5" style="stroke:' + FG + '" stroke-opacity=".8" stroke-width="2"/><path d="M11.5 8.5 14 6" style="stroke:' + BL + '" stroke-width="2"/>' +
              '<path d="M15.5 9.5v3M14 11h3M7.5 2.5v3M6 4h3M16 2v2M15 3h2" style="stroke:' + BL + '" stroke-width="1.2"/>'),
    line:     svg('<path d="M4.5 15.5 15.5 4.5" style="stroke:' + BL + '" stroke-width="1.6"/>' + dot(4.5, 15.5) + dot(15.5, 4.5)),
    normal:   svg('<path d="M3.5 16.5V10a6 6 0 0 1 6-6h7" style="stroke:' + BL + '" stroke-width="1.6"/><path d="M11 11 15.5 15.5M15.5 11.5v4h-4" style="stroke:' + RD + '" stroke-width="1.6"/>'),
    polyline: svg('<path d="M3.5 15.5h5v-11h8" style="stroke:' + BL + '" stroke-width="1.6"/>' + dot(3.5, 15.5) + dot(8.5, 15.5) + dot(8.5, 4.5) + dot(16.5, 4.5)),
    spline:   svg('<path d="M4 16c0-5 6-3 6-7.5S16 5 16 3.5" style="stroke:' + BL + '" stroke-width="1.6"/>' + dot(4, 16) + dot(16, 3.5)),
    free:     svg('<path d="M2.5 13 7 8.5h10.5L13 13Z" style="stroke:' + FG + '" stroke-opacity=".8" stroke-width="1.3"/><path d="M8 11.5 12 7" style="stroke:' + BL + '" stroke-width="1.6"/>'),
    surface:  svg('<path d="M2.5 14c3-4 6-4 8-2.5s4 1.5 7-2.5" style="stroke:' + FG + '" stroke-opacity=".8" stroke-width="1.3"/><path d="M8 11 12 5" style="stroke:' + BL + '" stroke-width="1.6"/>' + dot(8, 11)),
    chev:     '<svg class="ency-draw__chev" viewBox="0 0 8 8" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 3 4 5.5 6.5 3"/></svg>'
  };
  var TOOLS = {line:'Line', normal:'Normal', polyline:'Polyline', spline:'Spline'};

  function create(host, o){
    o = o || {};
    var tools = o.tools || ['line', 'normal', 'polyline', 'spline'];
    var st = {tool:o.tool || 'polyline', surface:false, wand:false};
    var el = document.createElement('div'); el.className = 'ency-draw'; el.hidden = true;
    function btn(id, cls, title, icon, extra){
      return '<button class="ency-draw__b' + (cls ? ' ' + cls : '') + '" data-draw="' + id + '" title="' + title + '">' + icon + (extra || '') + '</button>';
    }
    function render(){
      el.innerHTML =
        btn('wand', 'ency-draw__wand' + (st.wand ? ' on' : ''), 'Similar features together · ' + (st.wand ? 'on' : 'off'), ICONS.wand) +
        tools.map(function(t){ return btn(t, st.tool === t ? 'on' : '', TOOLS[t], ICONS[t]); }).join('') +
        btn('surf', 'ency-draw__dd', st.surface ? 'On Surface' : 'Free', st.surface ? ICONS.surface : ICONS.free, ICONS.chev);
    }
    el.addEventListener('click', function(ev){
      var b = ev.target.closest('[data-draw]'); if(!b) return;
      ev.stopPropagation();
      var id = b.dataset.draw, M = window.ENCY_MENU;
      if(id === 'wand'){ st.wand = !st.wand; render(); if(o.onWand) o.onWand(st.wand); return; }
      if(id === 'surf'){
        if(!M) return;
        if(b.classList.contains('dd-open')){ M.close(); return; }
        M.show(b.getBoundingClientRect(), [
          {label:'Free', icon:ICONS.free, cur:!st.surface, onPick:function(){ st.surface = false; render(); if(o.onSurface) o.onSurface(false); }},
          {label:'On Surface', icon:ICONS.surface, cur:st.surface, onPick:function(){ st.surface = true; render(); if(o.onSurface) o.onSurface(true); }}
        ], b, 140);
        return;
      }
      if(TOOLS[id]){ if(M) M.close(); st.tool = id; render(); if(o.onTool) o.onTool(id); }
    });
    host.appendChild(el);
    render();
    return {
      el:el, state:st, render:render,
      show:function(on){ el.hidden = !on; },
      setTool:function(id){ if(TOOLS[id]){ st.tool = id; render(); } }
    };
  }
  window.ENCY_DRAWBAR = {create:create, icons:ICONS, tools:TOOLS};
})();
