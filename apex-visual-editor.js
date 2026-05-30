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
    drag: { active: false, startX: 0, startY: 0, baseTx: 0, baseTy: 0 },
    clipboard: null,
    multi: new Set(),
    autoSaveTimer: null,
    panelState: JSON.parse(localStorage.getItem('_apex_ed_panels')||'{}'),
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
    return el && (el.closest('#_ed-root') || el.id === '_ed-toggle' || el.id === '_ed-hover' || el.closest('#_ed-sel'));
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
    if (e.type === 'delete-multi') {
      e.snapshot.forEach(({ el, parent, nextSibling }) => parent.insertBefore(el, nextSibling));
      S.redoStack.push(e); renderLayers();
    } else if (e.type === 'paste-multi') {
      e.nodes.forEach(n => n.remove());
      if (e.nodes.includes(S.el)) deselect();
      S.redoStack.push(e); renderLayers();
    } else if (e.type === 'delete' || e.type === 'paste') {
      if (e.type === 'delete') e.parent.insertBefore(e.el, e.nextSibling);
      else e.el.remove();
      if (S.el === e.el) deselect();
      S.redoStack.push(e);
      renderLayers();
    } else {
      applyStyle(e.el, e.prop, e.prev, false);
      S.redoStack.push(e);
      if (e.el === S.el) renderProps();
    }
    syncHistoryBtns();
  }

  function redo() {
    const e = S.redoStack.pop();
    if (!e) return;
    if (e.type === 'delete-multi') {
      e.snapshot.forEach(({ el }) => el.remove());
      S.undoStack.push(e); renderLayers();
    } else if (e.type === 'paste-multi') {
      const parent = e.nodes[0] && e.nodes[0].parentNode;
      e.nodes.forEach(n => { if (parent) parent.appendChild(n); });
      S.undoStack.push(e); renderLayers();
    } else if (e.type === 'delete' || e.type === 'paste') {
      if (e.type === 'paste') e.parent.insertBefore(e.el, e.nextSibling);
      else e.el.remove();
      if (S.el === e.el) deselect();
      S.undoStack.push(e);
      renderLayers();
    } else {
      applyStyle(e.el, e.prop, e.next, false);
      S.undoStack.push(e);
      if (e.el === S.el) renderProps();
    }
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
    if (prop === 'transform') {
      const m = value && value.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      el.dataset.apexTx = m ? m[1] : 0;
      el.dataset.apexTy = m ? m[2] : 0;
    }
    const id = edId(el);
    if (!S.styles[id]) S.styles[id] = {};
    if (!value) delete S.styles[id][prop];
    else S.styles[id][prop] = value;
    if (track !== false) pushHistory(el, prop, prev, value);
  }

  function set(prop, val) {
    if (S.multi.size > 1) [...S.multi].forEach(el => applyStyle(el, prop, val));
    else if (S.el) applyStyle(S.el, prop, val);
  }

  function deleteEl() {
    const targets = S.multi.size > 1 ? [...S.multi] : (S.el ? [S.el] : []);
    if (!targets.length) return;

    if (targets.length > 1) {
      const snapshot = targets.map(el => ({ el, parent: el.parentNode, nextSibling: el.nextSibling }));
      S.undoStack.push({ type: 'delete-multi', snapshot });
      if (S.undoStack.length > MAX_HISTORY) S.undoStack.shift();
      S.redoStack = [];
      syncHistoryBtns();
      targets.forEach(el => el.remove());
      deselect();
      renderLayers();
      toast(`Deleted ${targets.length} elements — Ctrl+Z to undo`);
    } else {
      const el = targets[0];
      const parent = el.parentNode;
      const nextSibling = el.nextSibling;
      if (!parent) return;
      S.undoStack.push({ type: 'delete', el, parent, nextSibling });
      if (S.undoStack.length > MAX_HISTORY) S.undoStack.shift();
      S.redoStack = [];
      syncHistoryBtns();
      el.remove();
      deselect();
      renderLayers();
      toast('Deleted — Ctrl+Z to undo');
    }
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
    renderBreadcrumb(el);
    const curtag = $('_ed-curtag');
    if (curtag) curtag.textContent = tagLabel(el);
  }

  function renderBreadcrumb(el) {
    const bar = $('_ed-crumb');
    if (!bar) return;
    bar.innerHTML = '';
    const chain = [];
    let cur = el;
    while (cur && cur !== document.body && chain.length < 8) {
      if (!isEditorEl(cur)) chain.unshift(cur);
      cur = cur.parentElement;
    }
    chain.forEach((node, i) => {
      const span = mk('span', {cls:'_ed-crumb-item', txt: tagLabel(node)});
      span.onclick = () => select(node);
      bar.appendChild(span);
      if (i < chain.length - 1) bar.appendChild(mk('span', {cls:'_ed-crumb-sep', txt:' › '}));
    });
  }

  function deselect() {
    S.el = null;
    clearMulti();
    const sel = $('_ed-sel');
    if (sel) sel.style.display = 'none';
    const pb = $('_ed-props-body');
    if (pb) pb.innerHTML = '<div class="_ed-empty">Click any element to edit · Shift+click to multi-select</div>';
    const curtag = $('_ed-curtag');
    if (curtag) curtag.textContent = 'Nothing selected';
  }

  function clearMulti() {
    S.multi.forEach(el => el.classList.remove('_ed-multi-sel'));
    S.multi.clear();
  }

  function addToMulti(el) {
    if (isEditorEl(el)) return;
    // First shift-click: pull the current single selection in too
    if (S.multi.size === 0 && S.el && S.el !== el) {
      S.multi.add(S.el);
      S.el.classList.add('_ed-multi-sel');
    }
    if (S.multi.has(el)) {
      S.multi.delete(el);
      el.classList.remove('_ed-multi-sel');
    } else {
      S.multi.add(el);
      el.classList.add('_ed-multi-sel');
    }
    S.el = el;
    positionSel(el);
    renderMultiPanel();
    renderLayers();
    const curtag = $('_ed-curtag');
    if (curtag) curtag.textContent = `${S.multi.size} selected`;
  }

  function renderMultiPanel() {
    const body = $('_ed-props-body');
    if (!body) return;
    const count = S.multi.size;
    body.innerHTML = `
      <div class="_ed-multi-info">
        <div class="_ed-multi-count">✦ ${count} element${count !== 1 ? 's' : ''} selected</div>
        <div class="_ed-multi-hint">Shift+click to add/remove · click without shift to switch to single</div>
        <div class="_ed-multi-btns">
          <button class="_ed-btn" onclick="__APEX_EDITOR__.copyEl()" title="Ctrl+C">⎘ Copy All</button>
          <button class="_ed-btn" onclick="__APEX_EDITOR__.cutEl()"  title="Ctrl+X">✂ Cut All</button>
          <button class="_ed-btn _ed-btn-clear" onclick="__APEX_EDITOR__.selectChildren()" title="Select all children of primary">⊞ Children</button>
          <button class="_ed-btn _ed-btn-exit"  onclick="__APEX_EDITOR__.deleteEl()" title="Del">🗑 Delete All</button>
        </div>
      </div>`;
  }

  function positionSel(el) {
    const ov = $('_ed-sel');
    if (!ov) return;
    const r = el.getBoundingClientRect();
    ov.style.cssText = `display:block;top:${r.top+scrollY}px;left:${r.left+scrollX}px;width:${r.width}px;height:${r.height}px;`;
    const tag = ov.querySelector('._ed-sel-tag');
    if (tag) tag.textContent = tagLabel(el);
  }

  function tagLabel(el) {
    const tag = el.tagName.toLowerCase();
    const id  = el.id ? '#'+el.id : '';
    const cls = el.classList.length ? '.'+[...el.classList][0] : '';
    return tag + (id || cls);
  }

  /* ═══════════════════════════════════════════════
     COPY / CUT / PASTE
  ═══════════════════════════════════════════════ */
  function copyEl() {
    const targets = S.multi.size > 1 ? [...S.multi] : (S.el ? [S.el] : []);
    if (!targets.length) return;
    S.clipboard = targets.map(el => el.outerHTML);
    try { navigator.clipboard.writeText(S.clipboard.join('\n')); } catch {}
    syncClipboardBtn();
    toast(targets.length > 1 ? `Copied ${targets.length} elements` : 'Copied — Ctrl+V to paste');
  }

  function cutEl() {
    if (!S.el && !S.multi.size) return;
    copyEl();
    deleteEl();
  }

  function selectChildren() {
    if (!S.el) return;
    const kids = [...S.el.children].filter(c => !isEditorEl(c));
    if (!kids.length) { toast('No children'); return; }
    clearMulti();
    kids.forEach(k => { S.multi.add(k); k.classList.add('_ed-multi-sel'); });
    S.el = kids[kids.length - 1];
    positionSel(S.el);
    renderMultiPanel();
    renderLayers();
    const curtag = $('_ed-curtag');
    if (curtag) curtag.textContent = `${S.multi.size} selected`;
    toast(`Selected ${kids.length} children`);
  }

  function pasteEl() {
    if (!S.clipboard || !S.clipboard.length) { toast('Nothing copied yet'); return; }

    const insertParent = (S.el && S.el.parentNode) || document.querySelector('.page.active') || document.querySelector('#pageWrap') || document.body;
    const insertRef    = S.el ? S.el.nextSibling : null;
    const pastedNodes  = [];

    S.clipboard.forEach(html => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const node = tmp.firstElementChild;
      if (!node) return;
      node.removeAttribute('data-apex-ed');
      node.querySelectorAll('[data-apex-ed]').forEach(el => el.removeAttribute('data-apex-ed'));
      insertParent.insertBefore(node, insertRef);
      pastedNodes.push(node);
    });

    if (!pastedNodes.length) return;

    S.undoStack.push({ type: 'paste-multi', nodes: pastedNodes });
    if (S.undoStack.length > MAX_HISTORY) S.undoStack.shift();
    S.redoStack = [];
    syncHistoryBtns();

    // Select pasted nodes
    clearMulti();
    if (pastedNodes.length === 1) {
      S.el = pastedNodes[0];
      positionSel(S.el);
      renderProps();
      renderBreadcrumb(S.el);
    } else {
      pastedNodes.forEach(n => { S.multi.add(n); n.classList.add('_ed-multi-sel'); });
      S.el = pastedNodes[pastedNodes.length - 1];
      positionSel(S.el);
      renderMultiPanel();
    }
    renderLayers();
    toast(`Pasted ${pastedNodes.length} element${pastedNodes.length !== 1 ? 's' : ''} — Ctrl+Z to undo`);
  }

  function syncClipboardBtn() {
    const btn = $('_ed-paste-btn');
    if (btn) btn.disabled = !S.clipboard;
  }

  /* ═══════════════════════════════════════════════
     NUDGE / DUPLICATE / GROUP / VISIBILITY / MISC
  ═══════════════════════════════════════════════ */
  function nudge(dx, dy) {
    const targets = S.multi.size > 1 ? [...S.multi] : (S.el ? [S.el] : []);
    if (!targets.length) return;
    targets.forEach(el => {
      const tx = parseFloat(el.dataset.apexTx || 0) + dx;
      const ty = parseFloat(el.dataset.apexTy || 0) + dy;
      applyStyle(el, 'transform', `translate(${tx}px,${ty}px)`);
      el.dataset.apexTx = tx; el.dataset.apexTy = ty;
    });
    if (S.el) positionSel(S.el);
  }

  function duplicateEl() {
    if (!S.el && !S.multi.size) return;
    copyEl();
    pasteEl();
  }

  function toggleVisibility() {
    if (!S.el) return;
    const hidden = S.el.style.display === 'none';
    applyStyle(S.el, 'display', hidden ? '' : 'none');
    const btn = $('_ed-vis-btn');
    if (btn) btn.title = hidden ? 'Hide element' : 'Show element';
    if (btn) btn.textContent = hidden ? '👁' : '🙈';
  }

  function groupEls() {
    const targets = S.multi.size > 1 ? [...S.multi] : (S.el ? [S.el] : []);
    if (targets.length < 2) { toast('Select 2+ elements to group'); return; }
    const parent = targets[0].parentNode;
    const ref    = targets[0];
    const wrap   = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:contents;';
    parent.insertBefore(wrap, ref);
    targets.forEach(el => wrap.appendChild(el));
    clearMulti();
    select(wrap);
    renderLayers();
    toast('Grouped — Ctrl+Z to undo');
  }

  function showShortcuts() {
    const ov = $('_ed-shortcuts');
    if (ov) ov.style.display = 'flex';
  }
  function hideShortcuts() {
    const ov = $('_ed-shortcuts');
    if (ov) ov.style.display = 'none';
  }

  function toggleBeforeAfter() {
    const link = document.querySelector('link[href="/apex-custom.css"]');
    if (!link) { toast('No apex-custom.css link found'); return; }
    link.disabled = !link.disabled;
    toast(link.disabled ? 'Showing ORIGINAL (custom styles off)' : 'Showing EDITED (custom styles on)');
    const btn = $('_ed-ba-btn');
    if (btn) { btn.textContent = link.disabled ? '◑ Original' : '◑ Edited'; btn.style.color = link.disabled ? '#ffb547' : ''; }
  }

  function startAutoSave() {
    if (S.autoSaveTimer) clearInterval(S.autoSaveTimer);
    S.autoSaveTimer = setInterval(() => {
      if (S.on && (Object.keys(S.styles).length || document.documentElement.style.cssText)) {
        saveStyles().catch(()=>{});
      }
    }, 120000);
  }

  /* ═══════════════════════════════════════════════
     RESIZE HANDLES
  ═══════════════════════════════════════════════ */
  const RESIZE_CURSORS = { tl:'nwse-resize', t:'ns-resize', tr:'nesw-resize', r:'ew-resize', br:'nwse-resize', b:'ns-resize', bl:'nesw-resize', l:'ew-resize' };
  let resizing = null;

  function onResizeStart(e, handle) {
    if (!S.el || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const el = S.el;
    resizing = {
      handle, el,
      startX: e.clientX, startY: e.clientY,
      startW: el.offsetWidth, startH: el.offsetHeight,
      startTx: parseFloat(el.dataset.apexTx||0),
      startTy: parseFloat(el.dataset.apexTy||0),
    };
    document.body.classList.add('_ed-grabbing');
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup',   onResizeEnd);
  }

  function onResizeMove(e) {
    if (!resizing) return;
    const { handle, el, startX, startY, startW, startH, startTx, startTy } = resizing;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    let w = startW, h = startH, tx = startTx, ty = startTy;
    if (handle.includes('r'))  w = Math.max(20, startW + dx);
    if (handle.includes('b'))  h = Math.max(20, startH + dy);
    if (handle.includes('l')) { w = Math.max(20, startW - dx); tx = startTx + (startW - w); }
    if (handle.includes('t')) { h = Math.max(20, startH - dy); ty = startTy + (startH - h); }
    el.style.width  = w + 'px';
    el.style.height = h + 'px';
    el.style.transform = `translate(${tx}px,${ty}px)`;
    el.dataset.apexTx = tx; el.dataset.apexTy = ty;
    positionSel(el);
  }

  function onResizeEnd() {
    if (!resizing) return;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup',   onResizeEnd);
    document.body.classList.remove('_ed-grabbing');
    const { el } = resizing;
    const id = edId(el);
    if (!S.styles[id]) S.styles[id] = {};
    S.styles[id].width     = el.style.width;
    S.styles[id].height    = el.style.height;
    S.styles[id].transform = el.style.transform;
    resizing = null;
  }

  /* ═══════════════════════════════════════════════
     SNAP / ALIGN GUIDES
  ═══════════════════════════════════════════════ */
  const SNAP_THRESHOLD = 7;
  let snapTargets = [];

  function buildSnapTargets() {
    const page = document.querySelector('.page.active') || document.body;
    snapTargets = [];
    const all = page.querySelectorAll('*');
    all.forEach(el => {
      if (el === S.el || isEditorEl(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const ax = r.left + scrollX, ay = r.top + scrollY;
      const aw = r.width, ah = r.height;
      snapTargets.push({ lx: ax, rx: ax+aw, cx: ax+aw/2, ty: ay, by: ay+ah, cy: ay+ah/2 });
    });
    // Add viewport center
    snapTargets.push({ lx: innerWidth/2, rx: innerWidth/2, cx: innerWidth/2, ty: innerHeight/2, by: innerHeight/2, cy: innerHeight/2 });
  }

  function computeSnap(el, nx, ny) {
    const r   = el.getBoundingClientRect();
    const elW = r.width, elH = r.height;
    // Current absolute position after translate
    const base = el.getBoundingClientRect();
    const absL = base.left + scrollX - parseFloat(el.dataset.apexTx||0) + nx;
    const absT = base.top  + scrollY - parseFloat(el.dataset.apexTy||0) + ny;
    const absR = absL + elW, absB = absT + elH, absCX = absL+elW/2, absCY = absT+elH/2;

    let snapX = null, snapY = null, guideX = null, guideY = null;

    for (const t of snapTargets) {
      if (snapX === null) {
        if (Math.abs(absL  - t.lx) < SNAP_THRESHOLD) { snapX = nx + (t.lx - absL);  guideX = t.lx; }
        else if (Math.abs(absR  - t.rx) < SNAP_THRESHOLD) { snapX = nx + (t.rx - absR);  guideX = t.rx; }
        else if (Math.abs(absCX - t.cx) < SNAP_THRESHOLD) { snapX = nx + (t.cx - absCX); guideX = t.cx; }
      }
      if (snapY === null) {
        if (Math.abs(absT  - t.ty) < SNAP_THRESHOLD) { snapY = ny + (t.ty - absT);  guideY = t.ty; }
        else if (Math.abs(absB  - t.by) < SNAP_THRESHOLD) { snapY = ny + (t.by - absB);  guideY = t.by; }
        else if (Math.abs(absCY - t.cy) < SNAP_THRESHOLD) { snapY = ny + (t.cy - absCY); guideY = t.cy; }
      }
      if (snapX !== null && snapY !== null) break;
    }
    return { nx: snapX !== null ? snapX : nx, ny: snapY !== null ? snapY : ny, guideX, guideY };
  }

  function showGuides(gx, gy) {
    const vl = $('_ed-guide-v'), hl = $('_ed-guide-h');
    if (vl) { vl.style.display = gx !== null ? 'block' : 'none'; if (gx !== null) vl.style.left = gx+'px'; }
    if (hl) { hl.style.display = gy !== null ? 'block' : 'none'; if (gy !== null) hl.style.top  = gy+'px'; }
  }

  function hideGuides() {
    const vl = $('_ed-guide-v'), hl = $('_ed-guide-h');
    if (vl) vl.style.display = 'none';
    if (hl) hl.style.display = 'none';
  }

  /* ═══════════════════════════════════════════════
     DRAG TO REPOSITION
  ═══════════════════════════════════════════════ */
  function onDragStart(e) {
    if (!S.el || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    // Snapshot base translate for every selected element
    const targets = S.multi.size > 1 ? [...S.multi] : [S.el];
    S.drag.active   = true;
    S.drag.startX   = e.clientX;
    S.drag.startY   = e.clientY;
    S.drag.baseTx   = parseFloat(S.el.dataset.apexTx || 0);
    S.drag.baseTy   = parseFloat(S.el.dataset.apexTy || 0);
    S.drag.targets  = targets.map(el => ({ el, bx: parseFloat(el.dataset.apexTx||0), by: parseFloat(el.dataset.apexTy||0) }));
    buildSnapTargets();
    const sel = $('_ed-sel');
    if (sel) sel.classList.add('_ed-dragging');
    document.body.classList.add('_ed-grabbing');
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
  }

  function onDragMove(e) {
    if (!S.drag.active || !S.el) return;
    const dx = e.clientX - S.drag.startX;
    const dy = e.clientY - S.drag.startY;
    const rawNx = S.drag.baseTx + dx;
    const rawNy = S.drag.baseTy + dy;
    const { nx, ny, guideX, guideY } = computeSnap(S.el, rawNx, rawNy);
    const snapDx = nx - rawNx, snapDy = ny - rawNy;
    showGuides(guideX, guideY);
    S.drag.targets.forEach(({ el, bx, by }) => {
      const ex = bx + dx + snapDx, ey = by + dy + snapDy;
      el.style.transform = `translate(${ex}px,${ey}px)`;
      el.dataset.apexTx  = ex;
      el.dataset.apexTy  = ey;
    });
    positionSel(S.el);
  }

  function onDragEnd(e) {
    if (!S.drag.active) return;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup',   onDragEnd);
    document.body.classList.remove('_ed-grabbing');
    hideGuides();
    const sel = $('_ed-sel');
    if (sel) sel.classList.remove('_ed-dragging');
    S.drag.active = false;

    const dx = e.clientX - S.drag.startX;
    const dy = e.clientY - S.drag.startY;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

    // Suppress the click event that fires after mouseup to prevent element interaction
    const suppressClick = ev => { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', suppressClick, true); };
    document.addEventListener('click', suppressClick, true);

    S.drag.targets.forEach(({ el, bx, by }) => {
      const nx = parseFloat(el.dataset.apexTx || 0);
      const ny = parseFloat(el.dataset.apexTy || 0);
      const prev = `translate(${bx}px,${by}px)`;
      const next = `translate(${nx}px,${ny}px)`;
      const id = edId(el);
      if (!S.styles[id]) S.styles[id] = {};
      S.styles[id].transform = next;
      pushHistory(el, 'transform', prev, next);
    });
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

      sec('Position Override', [
        row('Translate X', inp('--tx-display', (parseFloat(el.dataset.apexTx||0)).toFixed(0)+'px (drag handle to move)')),
        (() => {
          const btn = mk('button',{cls:'_ed-btn _ed-btn-clear'});
          btn.textContent = '↺ Reset Position';
          btn.style.cssText = 'width:100%;margin-top:4px;';
          btn.onclick = () => {
            applyStyle(el, 'transform', '');
            el.dataset.apexTx = 0; el.dataset.apexTy = 0;
            renderProps();
          };
          return btn;
        })(),
      ]),

      sec('Element Identity', [
        row('ID',      identInput('id', el.id || '')),
        row('Classes', classTagInput(el)),
      ]),

      sec('Inner HTML', [innerHTMLWidget(el)]),

      sec('Raw CSS', [rawCSS(el)]),
    );
  }

  /* ── Identity / Class helpers ── */
  function identInput(attr, value) {
    const i = mk('input', {cls:'_ed-inp', type:'text', value});
    i.onchange = e => {
      if (!S.el) return;
      if (attr === 'id') S.el.id = e.target.value;
    };
    return i;
  }

  function classTagInput(el) {
    const wrap = mk('div', {cls:'_ed-cls-wrap'});
    const render = () => {
      wrap.innerHTML = '';
      [...el.classList].filter(c => !c.startsWith('_ed')).forEach(cls => {
        const tag = mk('span', {cls:'_ed-cls-tag'});
        tag.innerHTML = `${cls}<span class="_ed-cls-x" data-cls="${cls}">×</span>`;
        tag.querySelector('._ed-cls-x').onclick = () => { el.classList.remove(cls); render(); };
        wrap.appendChild(tag);
      });
      const addInp = mk('input', {cls:'_ed-inp _ed-cls-inp', type:'text', placeholder:'+ class'});
      addInp.onkeydown = e => {
        if (e.key === 'Enter' && addInp.value.trim()) {
          addInp.value.trim().split(/\s+/).forEach(c => c && el.classList.add(c));
          render();
        }
      };
      wrap.appendChild(addInp);
    };
    render();
    return wrap;
  }

  function innerHTMLWidget(el) {
    const ta = mk('textarea', {cls:'_ed-raw'});
    ta.style.minHeight = '60px';
    ta.value = el.innerHTML;
    ta.onchange = e => {
      const prev = el.innerHTML;
      el.innerHTML = e.target.value;
      pushHistory(el, '_html_', prev, e.target.value);
    };
    return ta;
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
     PANEL VISIBILITY
  ═══════════════════════════════════════════════ */
  function togglePanel(side) {
    const panel = $(side === 'left' ? '_ed-left' : '_ed-right');
    const btn   = $(side === 'left' ? '_ed-hide-left' : '_ed-hide-right');
    if (!panel) return;
    const hidden = panel.classList.toggle('_ed-panel-hidden');
    if (btn) btn.classList.toggle('_ed-btn-panel-off', hidden);
    S.panelState[side] = hidden;
    localStorage.setItem('_apex_ed_panels', JSON.stringify(S.panelState));
    syncPageMargins();
  }

  function syncPageMargins() {
    const leftHidden  = $('_ed-left')  && $('_ed-left').classList.contains('_ed-panel-hidden');
    const rightHidden = $('_ed-right') && $('_ed-right').classList.contains('_ed-panel-hidden');
    const wrap = document.querySelector('.page-wrap, #pageWrap');
    if (wrap) {
      wrap.style.marginLeft  = leftHidden  ? '0' : '220px';
      wrap.style.marginRight = rightHidden ? '0' : '300px';
    }
    const aiBar = $('_ed-ai-bar');
    if (aiBar) {
      aiBar.style.left  = leftHidden  ? '0'     : '220px';
      aiBar.style.right = rightHidden ? '0'     : '300px';
    }
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
     AI PROMPT
  ═══════════════════════════════════════════════ */
  async function runAIPrompt(prompt) {
    if (!prompt.trim()) return;
    const inp = $('_ed-ai-inp');
    const btn = $('_ed-ai-send');
    if (inp) inp.disabled = true;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    setAIStatus('thinking…');

    try {
      const el = S.el;
      const c  = el ? cs(el) : {};
      const payload = {
        prompt,
        page: (document.querySelector('.page.active')||{}).id || 'unknown',
        element: el ? {
          tag:          el.tagName.toLowerCase(),
          id:           el.id || '',
          classes:      [...el.classList].filter(x => !x.startsWith('_ed')),
          inlineStyles: Object.fromEntries([...el.style].map(p => [p, el.style[p]])),
          width:        Math.round(el.offsetWidth),
          height:       Math.round(el.offsetHeight),
          parentTag:    el.parentElement ? el.parentElement.tagName.toLowerCase() : '',
        } : {},
      };

      const res = await fetch('/api/editor/ai', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      let applied = 0;
      (data.actions || []).forEach(action => {
        if (action.type === 'style' && el) {
          applyStyle(el, action.prop, action.value);
          applied++;
        } else if (action.type === 'delete' && el) {
          deleteEl();
          applied++;
        } else if (action.type === 'text' && el) {
          const prev = el.textContent;
          el.textContent = action.value;
          pushHistory(el, '_text_', prev, action.value);
          applied++;
        }
      });

      if (el && applied > 0) { positionSel(el); renderProps(); }
      setAIStatus(data.explanation || `Applied ${applied} change${applied !== 1 ? 's' : ''}`);
      if (inp) inp.value = '';
    } catch (err) {
      setAIStatus('Error: ' + err.message);
    } finally {
      if (inp) inp.disabled = false;
      if (btn) { btn.disabled = false; btn.textContent = '↵'; }
    }
  }

  function setAIStatus(msg) {
    const s = $('_ed-ai-status');
    if (s) { s.textContent = msg; s.style.opacity = '1'; clearTimeout(s._t); s._t = setTimeout(() => { s.style.opacity = '0'; }, 4000); }
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
    if (e.shiftKey) addToMulti(e.target);
    else { clearMulti(); select(e.target); }
  }

  function onPageMousedown(e) {
    if (!S.on || !S.el || isEditorEl(e.target) || e.button !== 0) return;
    if (S.el === e.target || S.el.contains(e.target)) {
      onDragStart(e);
    }
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
    const notInput = !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);
    if ((e.key==='Delete'||e.key==='Backspace') && S.el && notInput) { e.preventDefault(); deleteEl(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='c' && S.el && notInput) { e.preventDefault(); copyEl(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='x' && S.el && notInput) { e.preventDefault(); cutEl(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='v' && notInput) { e.preventDefault(); pasteEl(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='d' && notInput) { e.preventDefault(); duplicateEl(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='g' && notInput) { e.preventDefault(); groupEls(); }
    if (e.key === '?' && notInput) { e.preventDefault(); showShortcuts(); }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && (S.el||S.multi.size) && notInput) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      nudge(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0, e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0);
    }
  }

  /* ═══════════════════════════════════════════════
     TOGGLE
  ═══════════════════════════════════════════════ */
  function toggle() {
    S.on = !S.on;
    document.body.classList.toggle('_ed-active', S.on);
    if (S.on) {
      document.addEventListener('click',     onPageClick, true);
      document.addEventListener('mousedown', onPageMousedown, true);
      document.addEventListener('mouseover', onMouseover);
      document.addEventListener('mouseout',  onMouseout);
      document.addEventListener('scroll',    onScroll, true);
      syncPageMargins();
      renderLayers();
      toast('Editor ON — click any element');
    } else {
      document.removeEventListener('click',     onPageClick, true);
      document.removeEventListener('mousedown', onPageMousedown, true);
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
    // Snap guides
    const guideV = mk('div',{id:'_ed-guide-v'}); document.body.appendChild(guideV);
    const guideH = mk('div',{id:'_ed-guide-h'}); document.body.appendChild(guideH);

    // Hover outline
    const hover = mk('div',{id:'_ed-hover'}); document.body.appendChild(hover);
    // Selection outline
    const selOv = mk('div',{id:'_ed-sel'});
    selOv.innerHTML = `
      <div class="_ed-sel-lbl" title="Drag to move">⠿</div>
      <div class="_ed-sel-tag"></div>
      <div class="_ed-rh _ed-rh-tl" data-h="tl"></div>
      <div class="_ed-rh _ed-rh-t"  data-h="t"></div>
      <div class="_ed-rh _ed-rh-tr" data-h="tr"></div>
      <div class="_ed-rh _ed-rh-r"  data-h="r"></div>
      <div class="_ed-rh _ed-rh-br" data-h="br"></div>
      <div class="_ed-rh _ed-rh-b"  data-h="b"></div>
      <div class="_ed-rh _ed-rh-bl" data-h="bl"></div>
      <div class="_ed-rh _ed-rh-l"  data-h="l"></div>`;
    selOv.querySelector('._ed-sel-lbl').addEventListener('mousedown', onDragStart);
    selOv.querySelectorAll('._ed-rh').forEach(h => h.addEventListener('mousedown', e => onResizeStart(e, h.dataset.h)));
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
        <button class="_ed-btn _ed-btn-panel" id="_ed-hide-left"  onclick="__APEX_EDITOR__.togglePanel('left')"  title="Hide/show Layers panel">◧ Layers</button>
        <button class="_ed-btn _ed-btn-panel" id="_ed-hide-right" onclick="__APEX_EDITOR__.togglePanel('right')" title="Hide/show Properties panel">Properties ◨</button>
        <button class="_ed-btn" id="_ed-ba-btn" onclick="__APEX_EDITOR__.toggleBeforeAfter()" title="Toggle before/after">◑ Edited</button>
        <button class="_ed-btn" onclick="__APEX_EDITOR__.showShortcuts()" title="Keyboard shortcuts">?</button>
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
        <div style="display:flex;gap:4px;">
          <button class="_ed-icon-btn" id="_ed-vis-btn" onclick="__APEX_EDITOR__.toggleVisibility()" title="Hide element">👁</button>
          <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.duplicateEl()" title="Duplicate (Ctrl+D)">⧉</button>
          <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.copyEl()" title="Copy (Ctrl+C)">⎘</button>
          <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.cutEl()"  title="Cut (Ctrl+X)">✂</button>
          <button class="_ed-icon-btn" id="_ed-paste-btn" onclick="__APEX_EDITOR__.pasteEl()" title="Paste after (Ctrl+V)" disabled>⎙</button>
          <button class="_ed-icon-btn _ed-del-btn" onclick="__APEX_EDITOR__.deleteEl()" title="Delete (Del)">🗑</button>
          <button class="_ed-icon-btn" onclick="__APEX_EDITOR__.deselect()" title="Deselect">✕</button>
        </div>
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

    // AI prompt bar
    const aiBar = mk('div',{id:'_ed-ai-bar'});
    aiBar.innerHTML = `
      <span class="_ed-ai-icon">✦</span>
      <input id="_ed-ai-inp" class="_ed-ai-inp" type="text" placeholder="Ask AI — &quot;center this&quot;, &quot;make font 18px&quot;, &quot;delete it&quot;, &quot;align left edge with header&quot;…" autocomplete="off"/>
      <button id="_ed-ai-send" class="_ed-ai-send" title="Send (Enter)">↵</button>
      <span id="_ed-ai-status" class="_ed-ai-status"></span>`;
    aiBar.querySelector('#_ed-ai-inp').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runAIPrompt(e.target.value); } });
    aiBar.querySelector('#_ed-ai-send').addEventListener('click', () => runAIPrompt($('_ed-ai-inp').value));

    // Breadcrumb bar
    const crumb = mk('div',{id:'_ed-crumb'});
    crumb.innerHTML = '<span class="_ed-crumb-label">—</span>';

    // Shortcut overlay
    const shortcuts = mk('div',{id:'_ed-shortcuts', onclick:'if(event.target===this)__APEX_EDITOR__.hideShortcuts()'});
    shortcuts.innerHTML = `
      <div class="_ed-sc-box">
        <div class="_ed-sc-hdr"><span class="_ed-ptitle">⌨ KEYBOARD SHORTCUTS</span><button class="_ed-icon-btn" onclick="__APEX_EDITOR__.hideShortcuts()">✕</button></div>
        <div class="_ed-sc-body">
          <div class="_ed-sc-group"><div class="_ed-sc-glbl">Navigation</div>
            <div class="_ed-sc-row"><kbd>Alt+E</kbd><span>Toggle editor on/off</span></div>
            <div class="_ed-sc-row"><kbd>Esc</kbd><span>Deselect / close panel / exit editor</span></div>
            <div class="_ed-sc-row"><kbd>Shift+Click</kbd><span>Add to multi-selection</span></div>
            <div class="_ed-sc-row"><kbd>↑ ↓ ← →</kbd><span>Nudge 1px</span></div>
            <div class="_ed-sc-row"><kbd>Shift+Arrow</kbd><span>Nudge 10px</span></div>
          </div>
          <div class="_ed-sc-group"><div class="_ed-sc-glbl">Edit</div>
            <div class="_ed-sc-row"><kbd>Ctrl+Z</kbd><span>Undo</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+Y</kbd><span>Redo</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+S</kbd><span>Save styles</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+C</kbd><span>Copy element</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+X</kbd><span>Cut element</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+V</kbd><span>Paste element</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+D</kbd><span>Duplicate element</span></div>
            <div class="_ed-sc-row"><kbd>Ctrl+G</kbd><span>Group selected elements</span></div>
            <div class="_ed-sc-row"><kbd>Del / Backspace</kbd><span>Delete element</span></div>
          </div>
          <div class="_ed-sc-group"><div class="_ed-sc-glbl">View</div>
            <div class="_ed-sc-row"><kbd>?</kbd><span>Show this reference</span></div>
            <div class="_ed-sc-row"><kbd>Drag ⠿ handle</kbd><span>Move element</span></div>
            <div class="_ed-sc-row"><kbd>Drag corner/edge</kbd><span>Resize element</span></div>
          </div>
        </div>
      </div>`;

    root.append(tb, crumb, left, right, theme, aiBar, shortcuts);
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
._ed-btn-panel{background:rgba(255,255,255,.03);border-color:rgba(76,160,255,.18);color:rgba(180,205,240,.55);}
._ed-btn-panel:hover{background:rgba(76,200,255,.1);color:#4cc8ff;}
._ed-btn-panel-off{opacity:.4;text-decoration:line-through;}
._ed-icon-btn{background:none;border:none;color:rgba(180,205,240,.38);cursor:pointer;font-size:13px;padding:2px 5px;border-radius:3px;transition:color 120ms;}
._ed-icon-btn:hover{color:rgba(220,235,255,.85);}
._ed-del-btn{color:rgba(255,93,122,.45)!important;}
._ed-del-btn:hover{color:#ff5d7a!important;background:rgba(255,93,122,.1)!important;}

/* Left panel */
#_ed-left{display:none;position:fixed;top:46px;left:0;bottom:0;width:220px;background:#08090f;border-right:1px solid rgba(76,160,255,.13);z-index:99998;flex-direction:column;overflow:hidden;transition:transform 200ms ease;}
body._ed-active #_ed-left{display:flex;}
#_ed-left._ed-panel-hidden{transform:translateX(-100%);}

/* Right panel */
#_ed-right{display:none;position:fixed;top:46px;right:0;bottom:0;width:300px;background:#08090f;border-left:1px solid rgba(76,160,255,.13);z-index:99998;flex-direction:column;overflow:hidden;transition:transform 200ms ease;}
body._ed-active #_ed-right{display:flex;}
#_ed-right._ed-panel-hidden{transform:translateX(100%);}

/* Page margins */
body._ed-active .page-wrap,body._ed-active #pageWrap{transition:margin 200ms ease;}

/* Snap guides */
#_ed-guide-v{display:none;pointer-events:none;position:absolute;top:0;bottom:0;width:1px;background:#46e7b3;z-index:99994;box-shadow:0 0 4px rgba(70,231,179,.6);}
#_ed-guide-h{display:none;pointer-events:none;position:absolute;left:0;right:0;height:1px;background:#46e7b3;z-index:99994;box-shadow:0 0 4px rgba(70,231,179,.6);}

/* AI bar */
#_ed-ai-bar{display:none;position:fixed;bottom:0;left:220px;right:300px;height:50px;background:#08090f;border-top:1px solid rgba(76,160,255,.15);z-index:99999;align-items:center;gap:10px;padding:0 14px;}
body._ed-active #_ed-ai-bar{display:flex;}
body._ed-active #_ed-left._ed-panel-hidden ~ * #_ed-ai-bar,
body._ed-active._ed-left-hidden #_ed-ai-bar{left:0;}
._ed-ai-icon{font-size:15px;color:#7c6fff;flex-shrink:0;}
._ed-ai-inp{flex:1;background:rgba(124,111,255,.07);border:1px solid rgba(124,111,255,.22);border-radius:6px;color:rgba(220,235,255,.88);font-family:'Inter',-apple-system,sans-serif;font-size:12px;padding:8px 12px;outline:none;transition:border-color 150ms;}
._ed-ai-inp:focus{border-color:#7c6fff;box-shadow:0 0 0 2px rgba(124,111,255,.12);}
._ed-ai-inp::placeholder{color:rgba(180,205,240,.28);}
._ed-ai-inp:disabled{opacity:.5;}
._ed-ai-send{background:rgba(124,111,255,.15);border:1px solid rgba(124,111,255,.3);color:#7c6fff;width:32px;height:32px;border-radius:5px;font-size:14px;cursor:pointer;flex-shrink:0;transition:all 130ms;display:flex;align-items:center;justify-content:center;}
._ed-ai-send:hover{background:rgba(124,111,255,.3);}
._ed-ai-send:disabled{opacity:.4;cursor:default;}
._ed-ai-status{font-size:10px;color:rgba(180,205,240,.45);white-space:nowrap;opacity:0;transition:opacity 300ms;max-width:300px;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;}

/* Shift page up to make room for AI bar */
body._ed-active{padding-bottom:50px!important;}

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
#_ed-sel._ed-dragging{border-color:#46e7b3;border-style:dashed;}
._ed-sel-lbl{position:absolute;top:-22px;left:-2px;pointer-events:auto;cursor:grab;background:#4cc8ff;color:#000;padding:1px 7px;border-radius:3px 0 0 3px;font-size:13px;line-height:20px;height:20px;display:flex;align-items:center;user-select:none;}
._ed-sel-lbl:hover{background:#7de3ff;}
._ed-sel-tag{position:absolute;top:-22px;left:26px;pointer-events:none;font-size:9px;font-weight:600;letter-spacing:.06em;background:rgba(0,0,0,.7);color:#4cc8ff;border:1px solid #4cc8ff;padding:1px 7px;border-radius:0 3px 3px 0;white-space:nowrap;height:20px;line-height:18px;}
body._ed-grabbing,body._ed-grabbing *{cursor:grabbing!important;}

/* Page offset when editor active */
body._ed-active{padding-top:46px!important;}
body._ed-active .page-wrap,body._ed-active #pageWrap{margin-left:220px!important;margin-right:300px!important;}

/* Hover highlight (from layer panel hover) */
._ed-hi{outline:1px dashed rgba(76,200,255,.45)!important;}

/* Multi-select highlight */
._ed-multi-sel{outline:2px solid #7c6fff!important;outline-offset:1px;}

/* Multi-select panel */
._ed-multi-info{padding:16px 14px;}
._ed-multi-count{font-size:13px;font-weight:600;color:#7c6fff;margin-bottom:6px;}
._ed-multi-hint{font-size:9px;color:rgba(180,205,240,.35);margin-bottom:12px;line-height:1.6;}
._ed-multi-btns{display:flex;flex-direction:column;gap:6px;}
._ed-multi-btns ._ed-btn{width:100%;justify-content:center;padding:7px;font-size:9px;}

/* Toast */
#_ed-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:rgba(70,231,179,.12);border:1px solid rgba(70,231,179,.35);color:#46e7b3;font-size:11px;font-weight:600;padding:8px 18px;border-radius:6px;z-index:999999;opacity:0;transition:opacity 280ms;pointer-events:none;white-space:nowrap;}

/* Resize handles */
._ed-rh{display:none;position:absolute;width:8px;height:8px;background:#4cc8ff;border:1px solid rgba(0,0,0,.4);border-radius:1px;pointer-events:auto;z-index:1;}
#_ed-sel:hover ._ed-rh,#_ed-sel._ed-dragging ._ed-rh{display:block;}
._ed-rh-tl{top:-4px;left:-4px;cursor:nwse-resize;}
._ed-rh-t{top:-4px;left:calc(50% - 4px);cursor:ns-resize;}
._ed-rh-tr{top:-4px;right:-4px;cursor:nesw-resize;}
._ed-rh-r{top:calc(50% - 4px);right:-4px;cursor:ew-resize;}
._ed-rh-br{bottom:-4px;right:-4px;cursor:nwse-resize;}
._ed-rh-b{bottom:-4px;left:calc(50% - 4px);cursor:ns-resize;}
._ed-rh-bl{bottom:-4px;left:-4px;cursor:nesw-resize;}
._ed-rh-l{top:calc(50% - 4px);left:-4px;cursor:ew-resize;}

/* Breadcrumb bar */
#_ed-crumb{display:none;position:fixed;top:46px;left:220px;right:300px;height:26px;background:#08090f;border-bottom:1px solid rgba(76,160,255,.1);z-index:99997;align-items:center;padding:0 12px;gap:2px;overflow:hidden;}
body._ed-active #_ed-crumb{display:flex;}
._ed-crumb-item{font-size:9px;color:rgba(76,200,255,.55);cursor:pointer;white-space:nowrap;font-family:'JetBrains Mono',monospace;padding:1px 4px;border-radius:3px;transition:color 100ms;}
._ed-crumb-item:hover{color:#4cc8ff;background:rgba(76,200,255,.08);}
._ed-crumb-sep{font-size:9px;color:rgba(180,205,240,.2);}
._ed-crumb-label{font-size:9px;color:rgba(180,205,240,.2);}
body._ed-active .page-wrap,body._ed-active #pageWrap{margin-top:26px;}
#_ed-theme{top:72px!important;}
#_ed-left,#_ed-right{top:72px!important;}

/* Class tag editor */
._ed-cls-wrap{display:flex;flex-wrap:wrap;gap:3px;flex:1;align-items:center;}
._ed-cls-tag{display:inline-flex;align-items:center;gap:3px;background:rgba(76,200,255,.08);border:1px solid rgba(76,200,255,.18);color:#4cc8ff;font-size:9px;padding:1px 5px;border-radius:3px;}
._ed-cls-x{cursor:pointer;color:rgba(255,93,122,.6);font-size:11px;line-height:1;}
._ed-cls-x:hover{color:#ff5d7a;}
._ed-cls-inp{min-width:60px!important;flex:0 1 80px!important;}

/* Shortcut overlay */
#_ed-shortcuts{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999998;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
._ed-sc-box{background:#0a0f1a;border:1px solid rgba(76,160,255,.18);border-radius:10px;width:540px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;}
._ed-sc-hdr{padding:12px 16px;border-bottom:1px solid rgba(76,160,255,.1);display:flex;align-items:center;justify-content:space-between;}
._ed-sc-body{padding:14px 16px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:0 24px;}
._ed-sc-group{margin-bottom:14px;}
._ed-sc-glbl{font-size:8px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#4cc8ff;margin-bottom:7px;}
._ed-sc-row{display:flex;align-items:center;gap:10px;margin-bottom:5px;}
kbd{background:rgba(255,255,255,.07);border:1px solid rgba(76,160,255,.2);border-radius:3px;padding:1px 6px;font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(220,235,255,.7);white-space:nowrap;}
._ed-sc-row span{font-size:10px;color:rgba(180,205,240,.5);}
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
    // Restore panel state from last session
    if (S.panelState.left)  togglePanel('left');
    if (S.panelState.right) togglePanel('right');
    startAutoSave();
    global.__APEX_EDITOR__ = {
      toggle, undo, redo, openTheme, closeTheme,
      saveStyles, clearSaved, deselect, renderLayers,
      deleteEl, copyEl, cutEl, pasteEl, duplicateEl, selectChildren,
      togglePanel, toggleVisibility, groupEls, showShortcuts, hideShortcuts,
      toggleBeforeAfter, nudge,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

}(window));
