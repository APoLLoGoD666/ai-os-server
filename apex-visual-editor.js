/*!
 * Apex Visual Editor v1.0
 * Professional in-page visual editor for Apex AI OS dashboard
 * Alt+E to toggle | Ctrl+Z undo | Ctrl+Y redo | Ctrl+S save
 */
(function (global) {
  'use strict';
  if (global.__APEX_EDITOR__) return;
  global.__APEX_EDITOR__ = true;

  /* ═══════════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════════ */
  const MAX_HISTORY = 100;

  const THEME_VARS = [
    ['Background',  ['--bg','--bg2','--bg-deep']],
    ['Surfaces',    ['--surface-1','--surface-2','--surface-3','--surface-ghost']],
    ['Accent',      ['--primary','--cyan','--purple','--green','--amber','--red']],
    ['Border',      ['--border','--border-dim']],
    ['Text',        ['--text','--text-mid','--text-mute','--text-faint','--muted','--muted2']],
    ['Glow',        ['--primary-glow','--primary-dim','--glass','--glass2']],
    ['Radius',      ['--radius-sm','--radius-md','--radius-lg','--radius-full']],
    ['Spacing',     ['--space-1','--space-2','--space-3','--space-4','--space-5','--space-6','--space-8','--space-10']],
    ['Dimensions',  ['--ticker-h','--sidebar-w','--chatbar-h','--input-h','--nav-h']],
    ['Fonts',       ['--font-sans','--font-mono']],
    ['Tracking',    ['--tracking-label','--tracking-tight','--tracking-wide','--tracking-brand']],
  ];

  /* ═══════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════ */
  const S = {
    on: false,
    el: null,
    undoStack: [],
    redoStack: [],
    idCounter: 0,
    styles: {},
    themeOpen: false,
  };

  /* ═══════════════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════════════ */
  const $  = id  => document.getElementById(id);
  const cs = el => getComputedStyle(el);

  function mk(tag, props) {
    const el = document.createElement(tag);
    if (!props) return el;
    for (const [k, v] of Object.entries(props)) {
      if (k === 'cls')   el.className  = v;
      else if (k === 'html')  el.innerHTML  = v;
      else if (k === 'txt')   el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    return el;
  }

  function edId(el) {
    if (!el.dataset.apexEd) el.dataset.apexEd = ++S.idCounter;
    return el.dataset.apexEd;
  }

  function isEditorEl(el) {
    return el && (el.closest('#_ed-root') || el.id === '_ed-toggle' || el.id === '_ed-hover' || el.id === '_ed-sel');
  }

  function rgbToHex(v) {
    if (!v) return '';
    v = v.trim();
    if (v.startsWith('#')) return v;
    const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '';
    return '#' + [m[1],m[2],m[3]].map(n => (+n).toString(16).padStart(2,'0')).join('');
  }

  function kebab(s) {
    return s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ═══════════════════════════════════════════════
     HISTORY
  ═══════════════════════════════════════════════ */
  function pushHistory(el, prop, prev, next) {
    S.undoStack.push({ el, prop, prev, next });
    if (S.undoStack.length > MAX_HISTORY) S.undoStack.shift();
    S.redoStack = [];
    syncHistoryBtns();
  }

  function undo() {
    const e = S.undoStack.pop();
    if (!e) return;
    applyStyle(e.el, e.prop, e.prev, false);
    S.redoStack.push(e);
    if (e.el === S.el) renderProps();
    syncHistoryBtns();
  }

  function redo() {
    const e = S.redoStack.pop();
    if (!e) return;
    applyStyle(e.el, e.prop, e.next, false);
    S.undoStack.push(e);
    if (e.el === S.el) renderProps();
    syncHistoryBtns();
  }

  function syncHistoryBtns() {
    const u = $('_ed-undo'), r = $('_ed-redo');
    if (u) u.disabled = !S.undoStack.length;
    if (r) r.disabled = !S.redoStack.length;
  }

  /* ═══════════════════════════════════════════════
     STYLE APPLICATION
  ═══════════════════════════════════════════════ */
  function applyStyle(el, prop, value, track) {
    const prev = el.style[prop] || '';
    el.style[prop] = value;
    const id = edId(el);
    if (!S.styles[id]) S.styles[id] = {};
    if (!value) delete S.styles[id][prop];
    else S.styles[id][prop] = value;
    if (track !== false) pushHistory(el, prop, prev, value);
  }

  function set(prop, val) {
    if (S.el) applyStyle(S.el, prop, val);
  }

  /* ═══════════════════════════════════════════════
     SELECTION
  ═══════════════════════════════════════════════ */
  function select(el) {
    if (!S.on || isEditorEl(el)) return;
    S.el = el;
    positionSel(el);
    renderProps();
    renderLayers();
    const lbl = $('_ed-curtag');
    if (lbl) lbl.textContent = tagLabel(el);
  }

  function deselect() {
    S.el = null;
    const sel = $('_ed-sel');
    if (sel) sel.style.display = 'none';
    const pb = $('_ed-props-body');
    if (pb) pb.innerHTML = '<div class="_ed-empty">Click any element on the page to edit its styles.</div>';
    const lbl = $('_ed-curtag');
    if (lbl) lbl.textContent = 'Nothing selected';
  }

  function positionSel(el) {
    const ov = $('_ed-sel');
    if (!ov) return;
    const r = el.getBoundingClientRect();
    ov.style.cssText = `display:block;top:${r.top+scrollY}px;left:${r.left+scrollX}px;width:${r.width}px;height:${r.height}px;`;
    const lbl = ov.querySelector('._ed-sel-lbl');
    if (lbl) lbl.textContent = tagLabel(el);
  }

  function tagLabel(el) {
    const tag = el.tagName.toLowerCase();
    const id  = el.id ? '#'+el.id : '';
    const cls = el.classList.length ? '.'+[...el.classList][0] : '';
    return tag + (id || cls);
  }

  /* ═══════════════════════════════════════════════
     PROPERTIES PANEL
  ═══════════════════════════════════════════════ */
  function renderProps() {
    const body = $('_ed-props-body');
    if (!body || !S.el) return;
    const el = S.el;
    const c  = cs(el);
    body.innerHTML = '';

    body.append(
      sec('Typography', [
        row('Font Family',    inp('fontFamily', c.fontFamily)),
        row('Font Size',      inp('fontSize', el.style.fontSize||'')),
        row('Font Weight',    sel('fontWeight', c.fontWeight, ['100','200','300','400','500','600','700','800','900'])),
        row('Line Height',    inp('lineHeight', el.style.lineHeight||'')),
        row('Letter Spacing', inp('letterSpacing', el.style.letterSpacing||'')),
        row('Color',          clr('color', c.color)),
        row('Text Align',     sel('textAlign', c.textAlign, ['left','center','right','justify'])),
        row('Transform',      sel('textTransform', c.textTransform, ['none','uppercase','lowercase','capitalize'])),
        row('Decoration',     sel('textDecoration', c.textDecoration.split(' ')[0]||'none', ['none','underline','line-through','overline'])),
        row('White Space',    sel('whiteSpace', c.whiteSpace, ['normal','nowrap','pre','pre-wrap','pre-line'])),
      ]),

      sec('Background', [
        row('Color',    clr('backgroundColor', c.backgroundColor)),
        row('Image',    inp('backgroundImage', el.style.backgroundImage||'')),
        row('Position', inp('backgroundPosition', el.style.backgroundPosition||'')),
        row('Size',     sel('backgroundSize', c.backgroundSize, ['auto','cover','contain','100% 100%','100%'])),
        row('Repeat',   sel('backgroundRepeat', c.backgroundRepeat, ['repeat','no-repeat','repeat-x','repeat-y'])),
      ]),

      sec('Spacing', [boxModel(el, c)]),

      sec('Size', [
        row('Width',      inp('width', el.style.width||'')),
        row('Height',     inp('height', el.style.height||'')),
        row('Min Width',  inp('minWidth', el.style.minWidth||'')),
        row('Max Width',  inp('maxWidth', el.style.maxWidth||'')),
        row('Min Height', inp('minHeight', el.style.minHeight||'')),
        row('Max Height', inp('maxHeight', el.style.maxHeight||'')),
      ]),

      sec('Border', [
        row('Radius',  inp('borderRadius', el.style.borderRadius||'')),
        row('Width',   inp('borderWidth',  el.style.borderWidth||'')),
        row('Style',   sel('borderStyle',  c.borderStyle, ['none','solid','dashed','dotted','double','groove','ridge'])),
        row('Color',   clr('borderColor',  c.borderColor)),
        row('Outline', inp('outline',       el.style.outline||'')),
      ]),

      sec('Effects', [
        row('Opacity',      rng('opacity', Math.round(parseFloat(c.opacity||1)*100))),
        row('Box Shadow',   inp('boxShadow',      el.style.boxShadow||'')),
        row('Backdrop',     inp('backdropFilter',  el.style.backdropFilter||'')),
        row('Filter',       inp('filter',           el.style.filter||'')),
        row('Transform',    inp('transform',        el.style.transform||'')),
        row('Transition',   inp('transition',       el.style.transition||'')),
        row('Mix Blend',    sel('mixBlendMode', c.mixBlendMode, ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','difference','exclusion','hue','saturation','color','luminosity'])),
        row('Cursor',       sel('cursor', c.cursor, ['auto','default','pointer','text','move','not-allowed','grab','crosshair','zoom-in'])),
        row('Visibility',   sel('visibility', c.visibility, ['visible','hidden','collapse'])),
        row('User Select',  sel('userSelect', c.userSelect||'auto', ['auto','none','text','all'])),
      ]),

      sec('Layout', [
        row('Display',    sel('display', c.display, ['block','flex','grid','inline','inline-block','inline-flex','inline-grid','none','contents'])),
        row('Position',   sel('position', c.position, ['static','relative','absolute','fixed','sticky'])),
        row('Z-Index',    inp('zIndex', el.style.zIndex||'')),
        row('Top',        inp('top',    el.style.top||'')),
        row('Right',      inp('right',  el.style.right||'')),
        row('Bottom',     inp('bottom', el.style.bottom||'')),
        row('Left',       inp('left',   el.style.left||'')),
        row('Float',      sel('float', c.float, ['none','left','right'])),
        row('Clear',      sel('clear', c.clear, ['none','left','right','both'])),
        row('Overflow',   sel('overflow', c.overflow, ['visible','hidden','scroll','auto','clip'])),
        row('Overflow X', sel('overflowX', c.overflowX, ['visible','hidden','scroll','auto'])),
        row('Overflow Y', sel('overflowY', c.overflowY, ['visible','hidden','scroll','auto'])),
      ]),

      sec('Flexbox', [
        row('Direction',   sel('flexDirection', c.flexDirection, ['row','column','row-reverse','column-reverse'])),
        row('Wrap',        sel('flexWrap', c.flexWrap, ['nowrap','wrap','wrap-reverse'])),
        row('Align Items', sel('alignItems', c.alignItems, ['stretch','flex-start','flex-end','center','baseline','start','end'])),
        row('Justify',     sel('justifyContent', c.justifyContent, ['flex-start','flex-end','center','space-between','space-around','space-evenly','start','end'])),
        row('Align Self',  sel('alignSelf', c.alignSelf, ['auto','stretch','flex-start','flex-end','center','baseline'])),
        row('Align Content', sel('alignContent', c.alignContent, ['normal','flex-start','flex-end','center','space-between','space-around','stretch'])),
        row('Flex',        inp('flex', el.style.flex||'')),
        row('Flex Grow',   inp('flexGrow', el.style.flexGrow||'')),
        row('Flex Shrink', inp('flexShrink', el.style.flexShrink||'')),
        row('Flex Basis',  inp('flexBasis', el.style.flexBasis||'')),
        row('Order',       inp('order', el.style.order||'')),
        row('Gap',         inp('gap', el.style.gap||'')),
        row('Row Gap',     inp('rowGap', el.style.rowGap||'')),
        row('Column Gap',  inp('columnGap', el.style.columnGap||'')),
      ]),

      sec('Grid', [
        row('Template Cols', inp('gridTemplateColumns', el.style.gridTemplateColumns||'')),
        row('Template Rows', inp('gridTemplateRows', el.style.gridTemplateRows||'')),
        row('Template Areas', inp('gridTemplateAreas', el.style.gridTemplateAreas||'')),
        row('Grid Column',   inp('gridColumn', el.style.gridColumn||'')),
        row('Grid Row',      inp('gridRow', el.style.gridRow||'')),
        row('Grid Area',     inp('gridArea', el.style.gridArea||'')),
        row('Grid Gap',      inp('gap', el.style.gap||'')),
        row('Auto Cols',     inp('gridAutoColumns', el.style.gridAutoColumns||'')),
        row('Auto Rows',     inp('gridAutoRows', el.style.gridAutoRows||'')),
        row('Auto Flow',     sel('gridAutoFlow', c.gridAutoFlow, ['row','column','dense','row dense','column dense'])),
      ]),

      sec('Raw CSS', [rawCSS(el)]),
    );
  }

  /* ── Helpers ── */

  function sec(title, children) {
    const wrap = mk('div', {cls:'_ed-sec'});
    const hdr  = mk('div', {cls:'_ed-sec-hdr'});
    const body = mk('div', {cls:'_ed-sec-body'});
    hdr.innerHTML = `<span class="_ed-caret">▾</span><span>${title}</span>`;
    hdr.onclick = () => { body.classList.toggle('_ed-hidden'); hdr.querySelector('._ed-caret').textContent = body.classList.contains('_ed-hidden') ? '▸' : '▾'; };
    children.forEach(c => c && body.appendChild(c));
    wrap.append(hdr, body);
    return wrap;
  }

  function row(label, input) {
    const r = mk('div', {cls:'_ed-row'});
    r.append(mk('label',{cls:'_ed-lbl',txt:label}), input);
    return r;
  }

  function inp(prop, value) {
    const i = mk('input', {cls:'_ed-inp', type:'text', value: value||''});
    i.onchange = e => set(prop, e.target.value);
    return i;
  }

  function sel(prop, value, options) {
    const s = mk('select', {cls:'_ed-inp _ed-sel'});
    s.onchange = e => set(prop, e.target.value);
    options.forEach(o => {
      const opt = mk('option', {value:o, txt:o});
      if (value && (value === o || value.startsWith(o + ' '))) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function clr(prop, value) {
    const wrap = mk('div', {cls:'_ed-clr-wrap'});
    const hex  = rgbToHex(value) || '#000000';
    const sw   = mk('input', {cls:'_ed-clr-sw', type:'color', value:hex});
    const txt  = mk('input', {cls:'_ed-inp _ed-clr-txt', type:'text', value:value||''});
    sw.oninput  = e => { txt.value = e.target.value; set(prop, e.target.value); };
    txt.onchange = e => { const h = rgbToHex(e.target.value); if (h) sw.value = h; set(prop, e.target.value); };
    wrap.append(sw, txt);
    return wrap;
  }

  function rng(prop, value) {
    const wrap = mk('div', {cls:'_ed-rng-wrap'});
    const num  = mk('span', {cls:'_ed-rng-num', txt:(value||100)+'%'});
    const r    = mk('input', {cls:'_ed-rng', type:'range', min:'0', max:'100', value:String(value||100)});
    r.oninput = e => { num.textContent = e.target.value+'%'; set(prop, e.target.value/100); };
    wrap.append(r, num);
    return wrap;
  }

  function boxModel(el, c) {
    const wrap = mk('div', {cls:'_ed-box'});
    const sides = ['Top','Right','Bottom','Left'];
    const props = [
      ['Margin',  'margin',  sides.map(s => c['margin'+s])],
      ['Padding', 'padding', sides.map(s => c['padding'+s])],
    ];
    props.forEach(([label, prefix, vals]) => {
      const grp = mk('div', {cls:'_ed-box-grp'});
      grp.appendChild(mk('div',{cls:'_ed-box-grp-lbl',txt:label}));
      const cells = mk('div',{cls:'_ed-box-cells'});
      sides.forEach((side, i) => {
        const cell = mk('div',{cls:'_ed-box-cell'});
        cell.appendChild(mk('div',{cls:'_ed-box-side',txt:side[0]}));
        const input = mk('input',{cls:'_ed-inp _ed-box-inp', type:'text', value:vals[i]||'0'});
        input.onchange = e => set(prefix+side, e.target.value);
        cell.appendChild(input);
        cells.appendChild(cell);
      });
      grp.appendChild(cells);
      wrap.appendChild(grp);
    });
    return wrap;
  }

  function rawCSS(el) {
    const ta = mk('textarea', {cls:'_ed-raw'});
    ta.value = el.getAttribute('style') || '';
    ta.onchange = e => {
      el.setAttribute('style', e.target.value);
      edId(el);
    };
    return ta;
  }

  /* ═══════════════════════════════════════════════
     LAYERS PANEL
  ═══════════════════════════════════════════════ */
  function renderLayers() {
    const tree = $('_ed-layer-tree');
    if (!tree) return;
    tree.innerHTML = '';
    const root = document.querySelector('.page.active') || document.querySelector('#pageWrap') || document.body;
    const node = buildNode(root, 0);
    if (node) tree.appendChild(node);
  }

  function buildNode(el, depth) {
    if (isEditorEl(el)) return null;
    if (depth > 7) return null;

    const tag  = el.tagName ? el.tagName.toLowerCase() : null;
    if (!tag) return null;

    const id   = el.id ? '#'+el.id : '';
    const cls  = el.classList&&el.classList.length ? '.'+[...el.classList][0] : '';
    const lbl  = tag + (id || cls);
    const hasCh = el.children && el.children.length > 0;

    const item = mk('div', {cls:'_ed-li'+(el===S.el?' _ed-li-sel':'')});
    item.style.paddingLeft = (depth*14+6)+'px';

    const caret = mk('span',{cls:'_ed-li-caret',txt: hasCh ? '▾' : ' '});
    const ico   = mk('span',{cls:'_ed-li-ico',  txt: tagIcon(tag)});
    const name  = mk('span',{cls:'_ed-li-name', txt: lbl});

    item.append(caret, ico, name);
    item.onclick = e => { e.stopPropagation(); select(el); item.classList.add('_ed-li-sel'); };
    item.onmouseenter = () => { if (el !== S.el) el.classList.add('_ed-hi'); };
    item.onmouseleave = () => el.classList.remove('_ed-hi');

    const wrap = mk('div');
    wrap.appendChild(item);

    if (hasCh && depth < 7) {
      const childWrap = mk('div');
      const kids = [...el.children].filter(c => !isEditorEl(c)).slice(0, 40);
      kids.forEach(child => {
        const n = buildNode(child, depth+1);
        if (n) childWrap.appendChild(n);
      });
      if (el.children.length > 40) {
        childWrap.appendChild(mk('div',{cls:'_ed-li-more',txt:`+${el.children.length-40} more`}));
      }
      caret.onclick = e => {
        e.stopPropagation();
        const hidden = childWrap.style.display === 'none';
        childWrap.style.display = hidden ? '' : 'none';
        caret.textContent = hidden ? '▾' : '▸';
      };
      wrap.appendChild(childWrap);
    }
    return wrap;
  }

  function tagIcon(tag) {
    return { div:'⬜',span:'▪',p:'¶',a:'🔗',button:'⬡',input:'▭',select:'▾',
             textarea:'≡',img:'🖼',ul:'≡',li:'•',h1:'H1',h2:'H2',h3:'H3',
             h4:'H4',section:'▤',nav:'⬒',header:'⊤',footer:'⊥',
             canvas:'◻',table:'⊞',svg:'◈',form:'⬦' }[tag] || '◈';
  }

  /* ═══════════════════════════════════════════════
     THEME EDITOR
  ═══════════════════════════════════════════════ */
  function openTheme() {
    S.themeOpen = true;
    const body = $('_ed-theme-body');
    if (!body) return;
    body.innerHTML = '';

    THEME_VARS.forEach(([group, vars]) => {
      const grp  = mk('div',{cls:'_ed-tgrp'});
      grp.appendChild(mk('div',{cls:'_ed-tgrp-lbl',txt:group}));
      const grid = mk('div',{cls:'_ed-tgrid'});

      vars.forEach(varName => {
        const current = getCSSVar(varName);
        const isColor = /bg|surface|primary|cyan|purple|green|amber|red|border|text|muted|glass|glow|color/.test(varName);
        const cell = mk('div',{cls:'_ed-tcell'});
        const lbl  = mk('div',{cls:'_ed-tvar-lbl',txt:varName.replace('--','')});
        cell.appendChild(lbl);

        if (isColor) {
          const wrap = mk('div',{cls:'_ed-clr-wrap'});
          const hex  = rgbToHex(current) || (current.startsWith('#') ? current : '');
          const sw   = mk('input',{cls:'_ed-clr-sw', type:'color', value:hex||'#000000'});
          const txt  = mk('input',{cls:'_ed-inp _ed-clr-txt', type:'text', value:current});
          sw.oninput  = e => { txt.value = e.target.value; document.documentElement.style.setProperty(varName, e.target.value); };
          txt.onchange = e => { const h = rgbToHex(e.target.value); if(h) sw.value=h; document.documentElement.style.setProperty(varName, e.target.value); };
          wrap.append(sw, txt);
          cell.appendChild(wrap);
        } else {
          const i = mk('input',{cls:'_ed-inp', type:'text', value:current});
          i.onchange = e => document.documentElement.style.setProperty(varName, e.target.value);
          cell.appendChild(i);
        }
        grid.appendChild(cell);
      });
      grp.appendChild(grid);
      body.appendChild(grp);
    });

    $('_ed-theme').style.display = 'flex';
  }

  function closeTheme() {
    S.themeOpen = false;
    const t = $('_ed-theme');
    if (t) t.style.display = 'none';
  }

  /* ═══════════════════════════════════════════════
     SAVE
  ═══════════════════════════════════════════════ */
  async function saveStyles() {
    let css = `/* Apex Visual Editor — Custom Styles */\n/* ${new Date().toISOString()} */\n\n`;

    // CSS var overrides
    const rootStyle = document.documentElement.style;
    const rootProps = [...rootStyle].filter(p => p.startsWith('--'));
    if (rootProps.length) {
      css += ':root {\n';
      rootProps.forEach(p => { css += `  ${p}: ${rootStyle.getPropertyValue(p).trim()};\n`; });
      css += '}\n\n';
    }

    // Element style overrides
    for (const [id, props] of Object.entries(S.styles)) {
      if (!Object.keys(props).length) continue;
      const el = document.querySelector(`[data-apex-ed="${id}"]`);
      if (!el) continue;
      const selector = el.id ? '#'+el.id : `[data-apex-ed="${id}"]`;
      css += `${selector} {\n`;
      Object.entries(props).forEach(([prop, val]) => { css += `  ${kebab(prop)}: ${val};\n`; });
      css += '}\n\n';
    }

    localStorage.setItem('_apex_editor_css',  css);
    localStorage.setItem('_apex_editor_map',  JSON.stringify(S.styles));
    localStorage.setItem('_apex_editor_root', JSON.stringify(rootProps.reduce((a,p) => { a[p]=rootStyle.getPropertyValue(p).trim(); return a; }, {})));

    try {
      const res = await fetch('/api/editor/save-styles', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ css }),
      });
      toast(res.ok ? '✓ Saved to apex-custom.css' : '✓ Saved to localStorage');
    } catch {
      toast('✓ Saved to localStorage');
    }
  }

  function loadSavedStyles() {
    // Restore element styles
    const map = localStorage.getItem('_apex_editor_map');
    if (map) {
      try {
        const parsed = JSON.parse(map);
        S.styles = parsed;
        Object.entries(parsed).forEach(([id, props]) => {
          const el = document.querySelector(`[data-apex-ed="${id}"]`);
          if (!el) return;
          Object.entries(props).forEach(([prop, val]) => { el.style[prop] = val; });
        });
      } catch {}
    }
    // Restore CSS vars
    const rootVars = localStorage.getItem('_apex_editor_root');
    if (rootVars) {
      try {
        Object.entries(JSON.parse(rootVars)).forEach(([prop, val]) => {
          document.documentElement.style.setProperty(prop, val);
        });
      } catch {}
    }
  }

  function clearSaved() {
    localStorage.removeItem('_apex_editor_css');
    localStorage.removeItem('_apex_editor_map');
    localStorage.removeItem('_apex_editor_root');
    toast('✓ Cleared saved styles — reload to reset');
  }

  /* ═══════════════════════════════════════════════
     TOAST
  ═══════════════════════════════════════════════ */
  function toast(msg) {
    let t = $('_ed-toast');
    if (!t) { t = mk('div',{id:'_ed-toast',cls:'_ed-toast'}); document.body.appendChild(t); }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.style.opacity = '0'; }, 2200);
  }

  /* ═══════════════════════════════════════════════
     EVENT HANDLERS
  ═══════════════════════════════════════════════ */
  function onPageClick(e) {
    if (!S.on || isEditorEl(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    select(e.target);
  }

  function onMouseover(e) {
    if (!S.on || isEditorEl(e.target)) return;
    const ov = $('_ed-hover');
    if (!ov) return;
    const r = e.target.getBoundingClientRect();
    ov.style.cssText = `display:block;top:${r.top+scrollY}px;left:${r.left+scrollX}px;width:${r.width}px;height:${r.height}px;`;
  }

  function onMouseout() {
    const ov = $('_ed-hover');
    if (ov) ov.style.display = 'none';
  }

  function onScroll() {
    if (S.el) positionSel(S.el);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (S.themeOpen) { closeTheme(); return; }
      if (S.el) { deselect(); return; }
      if (S.on) { toggle(); return; }
    }
    if (e.altKey && e.key === 'e') { e.preventDefault(); toggle(); return; }
    if (!S.on) return;
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='z'))) { e.preventDefault(); redo(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveStyles(); }
  }

  /* ═══════════════════════════════════════════════
     TOGGLE
  ═══════════════════════════════════════════════ */
  function toggle() {
    S.on = !S.on;
    document.body.classList.toggle('_ed-active', S.on);
    if (S.on) {
      document.addEventListener('click',     onPageClick, true);
      document.addEventListener('mouseover', onMouseover);
      document.addEventListener('mouseout',  onMouseout);
      document.addEventListener('scroll',    onScroll, true);
      renderLayers();
      toast('Editor ON — click any element');
    } else {
      document.removeEventListener('click',     onPageClick, true);
      document.removeEventListener('mouseover', onMouseover);
      document.removeEventListener('mouseout',  onMouseout);
      document.removeEventListener('scroll',    onScroll, true);
      deselect(); closeTheme();
      const ov = $('_ed-hover');
      if (ov) ov.style.display = 'none';
    }
  }

  /* ═══════════════════════════════════════════════
     BUILD UI
  ═══════════════════════════════════════════════ */
  function buildUI() {
    // Hover outline
    const hover = mk('div',{id:'_ed-hover'}); document.body.appendChild(hover);
    // Selection outline
    const selOv = mk('div',{id:'_ed-sel'});
    selOv.innerHTML = '<div class="_ed-sel-lbl"></div>';
    document.body.appendChild(selOv);

    // Root
    const root = mk('div',{id:'_ed-root'});

    // Toolbar
    const tb = mk('div',{id:'_ed-toolbar'});
    tb.innerHTML = `
      <div class="_ed-tb-l">
        <span class="_ed-brand">⬡ APEX EDITOR</span>
        <span class="_ed-curtag" id="_ed-curtag">Nothing selected</span>
      </div>
      <div class="_ed-tb-c">
        <button class="_ed-btn" id="_ed-undo" onclick="__APEX_EDITOR__.undo()" disabled>↩ Undo</button>
        <button class="_ed-btn" id="_ed-redo" onclick="__APEX_EDITOR__.redo()" disabled>↪ Redo</button>
        <div class="_ed-sep"></div>
        <button class="_ed-btn _ed-btn-theme" onclick="__APEX_EDITOR__.openTheme()">🎨 Theme Vars</button>
        <button class="_ed-btn _ed-btn-clear" onclick="if(confirm('Clear all saved style overrides?'))__APEX_EDITOR__.clearSaved()">🗑 Clear</button>
        <button class="_ed-btn _ed-btn-save"  onclick="__APEX_EDITOR__.saveStyles()">💾 Save</button>
      </div>
      <div class="_ed-tb-r">
        <span class="_ed-hint">Alt+E toggle · Ctrl+Z undo · Ctrl+S save</span>
        <button class="_ed-btn _ed-btn-exit" onclick="__APEX_EDITOR__.toggle()">✕ Exit</button>
      </div>`;

    // Left: layers
    const left = mk('div',{id:'_ed-left'});
    left.innerHTML = `
      <div class="_ed-ph">
        <span class="_ed-ptitle">LAYERS</span>
        <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.renderLayers()" title="Refresh">↻</button>
      </div>
      <div id="_ed-layer-tree" class="_ed-ltree"></div>`;

    // Right: properties
    const right = mk('div',{id:'_ed-right'});
    right.innerHTML = `
      <div class="_ed-ph">
        <span class="_ed-ptitle">PROPERTIES</span>
        <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.deselect()" title="Deselect">✕</button>
      </div>
      <div id="_ed-props-body" class="_ed-pbody">
        <div class="_ed-empty">Click any element on the page to edit its styles.</div>
      </div>`;

    // Theme overlay
    const theme = mk('div',{id:'_ed-theme'});
    theme.innerHTML = `
      <div class="_ed-ph">
        <span class="_ed-ptitle">🎨 CSS VARIABLES — GLOBAL THEME</span>
        <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.closeTheme()">✕ Close</button>
      </div>
      <div id="_ed-theme-body" class="_ed-theme-body"></div>`;

    root.append(tb, left, right, theme);
    document.body.appendChild(root);

    // Toggle button (always visible)
    const btn = mk('div',{id:'_ed-toggle', title:'Visual Editor (Alt+E)', onclick:toggle});
    btn.textContent = '✏';
    document.body.appendChild(btn);
  }

  /* ═══════════════════════════════════════════════
     INJECT STYLES
  ═══════════════════════════════════════════════ */
  function injectStyles() {
    const s = mk('style',{id:'_apex-editor-css'});
    s.textContent = `
/* ══════ Apex Visual Editor ══════ */
#_ed-root,#_ed-hover,#_ed-sel,#_ed-toggle,#_ed-toast{font-family:'Inter',-apple-system,sans-serif;}

/* Toggle button */
#_ed-toggle{position:fixed;bottom:76px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(76,200,255,.1);border:1px solid rgba(76,200,255,.25);color:#4cc8ff;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:99990;transition:all 180ms;user-select:none;}
#_ed-toggle:hover{background:rgba(76,200,255,.22);transform:scale(1.08);}
body._ed-active #_ed-toggle{background:rgba(76,200,255,.28);border-color:#4cc8ff;box-shadow:0 0 10px rgba(76,200,255,.3);}

/* Toolbar */
#_ed-toolbar{display:none;position:fixed;top:0;left:0;right:0;height:46px;background:#080c14;border-bottom:1px solid rgba(76,160,255,.15);z-index:99999;padding:0 14px;align-items:center;justify-content:space-between;gap:10px;backdrop-filter:blur(16px);}
body._ed-active #_ed-toolbar{display:flex;}
._ed-tb-l,._ed-tb-c,._ed-tb-r{display:flex;align-items:center;gap:7px;}
._ed-brand{font-size:9px;font-weight:700;letter-spacing:.34em;color:#4cc8ff;text-transform:uppercase;white-space:nowrap;}
._ed-curtag{font-size:9px;color:rgba(180,205,240,.45);font-family:'JetBrains Mono',monospace;background:rgba(255,255,255,.04);padding:2px 8px;border-radius:4px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
._ed-hint{font-size:8px;color:rgba(180,205,240,.25);letter-spacing:.06em;white-space:nowrap;}
._ed-sep{width:1px;height:22px;background:rgba(76,160,255,.15);margin:0 2px;}
._ed-btn{background:rgba(255,255,255,.04);border:1px solid rgba(76,160,255,.15);color:rgba(220,235,255,.75);padding:4px 9px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;transition:all 120ms;white-space:nowrap;}
._ed-btn:hover{background:rgba(76,200,255,.1);border-color:#4cc8ff;color:#4cc8ff;}
._ed-btn:disabled{opacity:.3;cursor:default;}
._ed-btn-save{background:rgba(70,231,179,.07);border-color:rgba(70,231,179,.22);color:#46e7b3;}
._ed-btn-save:hover{background:rgba(70,231,179,.18);}
._ed-btn-theme{background:rgba(124,111,255,.07);border-color:rgba(124,111,255,.22);color:#7c6fff;}
._ed-btn-theme:hover{background:rgba(124,111,255,.18);}
._ed-btn-clear{background:rgba(255,183,71,.05);border-color:rgba(255,183,71,.18);color:#ffb547;}
._ed-btn-clear:hover{background:rgba(255,183,71,.15);}
._ed-btn-exit{background:rgba(255,93,122,.06);border-color:rgba(255,93,122,.18);color:#ff5d7a;}
._ed-btn-exit:hover{background:rgba(255,93,122,.18);}
._ed-icon-btn{background:none;border:none;color:rgba(180,205,240,.38);cursor:pointer;font-size:13px;padding:2px 5px;border-radius:3px;transition:color 120ms;}
._ed-icon-btn:hover{color:rgba(220,235,255,.85);}

/* Left panel */
#_ed-left{display:none;position:fixed;top:46px;left:0;bottom:0;width:220px;background:#08090f;border-right:1px solid rgba(76,160,255,.13);z-index:99998;flex-direction:column;overflow:hidden;}
body._ed-active #_ed-left{display:flex;}

/* Right panel */
#_ed-right{display:none;position:fixed;top:46px;right:0;bottom:0;width:300px;background:#08090f;border-left:1px solid rgba(76,160,255,.13);z-index:99998;flex-direction:column;overflow:hidden;}
body._ed-active #_ed-right{display:flex;}

/* Panel header */
._ed-ph{padding:9px 11px;border-bottom:1px solid rgba(76,160,255,.09);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
._ed-ptitle{font-size:8px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:#4cc8ff;}

/* Layer tree */
._ed-ltree{flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 0;}
._ed-li{display:flex;align-items:center;gap:3px;height:25px;cursor:pointer;border-radius:4px;border:1px solid transparent;margin:1px 4px;transition:background 90ms;}
._ed-li:hover{background:rgba(76,200,255,.06);}
._ed-li-sel{background:rgba(76,200,255,.13)!important;border-color:rgba(76,200,255,.22)!important;}
._ed-li-caret{font-size:7px;color:rgba(180,205,240,.3);width:9px;text-align:center;flex-shrink:0;}
._ed-li-ico{font-size:10px;flex-shrink:0;}
._ed-li-name{font-size:10px;color:rgba(180,205,240,.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
._ed-li-more{font-size:9px;color:rgba(180,205,240,.28);padding:3px 14px;}

/* Props panel */
._ed-pbody{flex:1;overflow-y:auto;overflow-x:hidden;}
._ed-empty{font-size:11px;color:rgba(180,205,240,.3);padding:22px 14px;text-align:center;line-height:1.9;}

/* Sections */
._ed-sec{border-bottom:1px solid rgba(76,160,255,.06);}
._ed-sec-hdr{padding:7px 11px;font-size:8px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:rgba(180,205,240,.38);cursor:pointer;user-select:none;display:flex;align-items:center;gap:5px;transition:color 120ms;}
._ed-sec-hdr:hover{color:rgba(220,235,255,.7);}
._ed-caret{font-size:7px;}
._ed-sec-body{padding:3px 11px 8px;}
._ed-hidden{display:none!important;}

/* Rows & inputs */
._ed-row{display:flex;align-items:center;margin-bottom:4px;gap:7px;}
._ed-lbl{font-size:9px;color:rgba(180,205,240,.38);width:84px;flex-shrink:0;letter-spacing:.03em;}
._ed-inp{flex:1;min-width:0;background:rgba(255,255,255,.04);border:1px solid rgba(76,160,255,.11);border-radius:4px;color:rgba(220,235,255,.82);font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 7px;outline:none;transition:border-color 130ms;}
._ed-inp:focus{border-color:#4cc8ff;}
._ed-sel{background:#090c15!important;cursor:pointer;}
._ed-clr-wrap{display:flex;align-items:center;gap:4px;flex:1;}
._ed-clr-sw{width:24px;height:24px;border:none;border-radius:3px;cursor:pointer;padding:1px;background:rgba(255,255,255,.06);flex-shrink:0;}
._ed-clr-txt{font-size:9px!important;}
._ed-rng-wrap{display:flex;align-items:center;gap:8px;flex:1;}
._ed-rng{flex:1;accent-color:#4cc8ff;cursor:pointer;}
._ed-rng-num{font-size:9px;color:rgba(180,205,240,.4);width:30px;text-align:right;flex-shrink:0;}

/* Box model */
._ed-box{padding:2px 0;}
._ed-box-grp{margin-bottom:8px;}
._ed-box-grp-lbl{font-size:7.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(76,200,255,.45);margin-bottom:5px;}
._ed-box-cells{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;}
._ed-box-cell{display:flex;flex-direction:column;align-items:center;gap:2px;}
._ed-box-side{font-size:7px;color:rgba(180,205,240,.3);}
._ed-box-inp{text-align:center!important;padding:3px 2px!important;font-size:9px!important;}

/* Raw CSS textarea */
._ed-raw{width:100%;box-sizing:border-box;background:rgba(0,0,0,.3);border:1px solid rgba(76,160,255,.11);border-radius:4px;color:rgba(220,235,255,.8);font-family:'JetBrains Mono',monospace;font-size:9.5px;padding:6px;min-height:72px;resize:vertical;outline:none;}
._ed-raw:focus{border-color:#4cc8ff;}

/* Theme panel */
#_ed-theme{display:none;position:fixed;top:46px;left:220px;right:300px;bottom:0;z-index:99997;background:#08090f;border-left:1px solid rgba(76,160,255,.13);flex-direction:column;overflow:hidden;}
._ed-theme-body{flex:1;overflow-y:auto;padding:12px 14px;}
._ed-tgrp{margin-bottom:16px;}
._ed-tgrp-lbl{font-size:8px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#4cc8ff;margin-bottom:8px;}
._ed-tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:7px;}
._ed-tcell{display:flex;flex-direction:column;gap:3px;}
._ed-tvar-lbl{font-size:9px;color:rgba(180,205,240,.38);font-family:'JetBrains Mono',monospace;}

/* Hover outline */
#_ed-hover{display:none;pointer-events:none;position:absolute;z-index:99995;border:1px dashed rgba(76,200,255,.38);border-radius:2px;}

/* Selection outline */
#_ed-sel{display:none;pointer-events:none;position:absolute;z-index:99996;border:2px solid #4cc8ff;border-radius:2px;}
._ed-sel-lbl{position:absolute;top:-20px;left:-1px;font-size:9px;font-weight:600;letter-spacing:.06em;background:#4cc8ff;color:#000;padding:1px 7px;border-radius:3px;white-space:nowrap;}

/* Page offset when editor active */
body._ed-active{padding-top:46px!important;}
body._ed-active .page-wrap,body._ed-active #pageWrap{margin-left:220px!important;margin-right:300px!important;}

/* Hover highlight (from layer panel hover) */
._ed-hi{outline:1px dashed rgba(76,200,255,.45)!important;}

/* Toast */
#_ed-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:rgba(70,231,179,.12);border:1px solid rgba(70,231,179,.35);color:#46e7b3;font-size:11px;font-weight:600;padding:8px 18px;border-radius:6px;z-index:999999;opacity:0;transition:opacity 280ms;pointer-events:none;white-space:nowrap;}
`;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════ */
  function init() {
    injectStyles();
    buildUI();
    document.addEventListener('keydown', onKeyDown);
    loadSavedStyles();
    global.__APEX_EDITOR__ = {
      toggle, undo, redo, openTheme, closeTheme,
      saveStyles, clearSaved, deselect, renderLayers,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

}(window));
