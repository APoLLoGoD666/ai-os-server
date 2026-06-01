// PlasmaOrb.js — APEX Intelligence Core v3
// Holographic AI viz: wireframe sphere, orbit rings, particles, HUD brackets
// No ctx.filter — shadowBlur only

(function () {
  'use strict';

  var W = 360, H = 360, CX = 180, CY = 180;
  var LERP = 0.006;
  var frame = 0, frameId = null, ctx = null;
  var lSpMul = 1.0, lBright = 0.85, lShift = 0.0;
  var currentState = 'standby';

  var STATE_CFG = {
    standby:   { spMul: 1.0, bright: 0.85, shift:  0.0 },
    listening: { spMul: 2.8, bright: 1.45, shift:  0.3 },
    thinking:  { spMul: 3.8, bright: 1.25, shift: -0.3 },
    speaking:  { spMul: 4.5, bright: 1.65, shift:  0.5 },
  };

  // ── 3-D rotation helpers ──────────────────────────────────────────────
  function rotX(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [v[0], v[1]*c - v[2]*s, v[1]*s + v[2]*c];
  }
  function rotY(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [v[0]*c + v[2]*s, v[1], -v[0]*s + v[2]*c];
  }
  function rotZ(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [v[0]*c - v[1]*s, v[0]*s + v[1]*c, v[2]];
  }
  function project(v) {
    return [CX + v[0], CY - v[1]];   // orthographic, Y-up
  }
  function applyRots(v, rots) {
    for (var i = 0; i < rots.length; i++) {
      var r = rots[i];
      if (r.ax === 'x') v = rotX(v, r.a);
      else if (r.ax === 'y') v = rotY(v, r.a);
      else v = rotZ(v, r.a);
    }
    return v;
  }

  // ── Wireframe sphere ─────────────────────────────────────────────────
  function drawWireframeSphere(R, spinY, tiltX, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = 0.55;

    // Latitude circles
    var lats = [-55, -28, 0, 28, 55];
    for (var li = 0; li < lats.length; li++) {
      var lat  = lats[li] * Math.PI / 180;
      var r2   = R * Math.cos(lat);
      var yOff = R * Math.sin(lat);
      ctx.beginPath();
      for (var i = 0; i <= 90; i++) {
        var a  = (i / 90) * Math.PI * 2;
        var v  = [r2 * Math.cos(a + spinY), yOff, r2 * Math.sin(a + spinY)];
        v = rotX(v, tiltX);
        var p  = project(v);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    // Meridians
    for (var mi = 0; mi < 9; mi++) {
      var lon = (mi / 9) * Math.PI * 2 + spinY;
      ctx.beginPath();
      for (var i = 0; i <= 60; i++) {
        var lat2 = (i / 60) * Math.PI - Math.PI / 2;
        var v    = [R * Math.cos(lat2) * Math.cos(lon), R * Math.sin(lat2), R * Math.cos(lat2) * Math.sin(lon)];
        v = rotX(v, tiltX);
        var p = project(v);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
  }

  // ── Ring in 3-D space ─────────────────────────────────────────────────
  function drawRing3D(R, rots, color, lw, dash, glow) {
    var N   = 100;
    var pts = [];
    for (var i = 0; i <= N; i++) {
      var a = (i / N) * Math.PI * 2;
      var v = applyRots([R * Math.cos(a), R * Math.sin(a), 0], rots);
      pts.push(project(v));
    }
    if (glow) { ctx.shadowBlur = glow; ctx.shadowColor = color; }
    if (dash)  ctx.setLineDash(dash);
    ctx.lineWidth   = lw;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    if (dash)  ctx.setLineDash([]);
    if (glow) ctx.shadowBlur = 0;
  }

  // ── Tick marks on a ring in 3-D ───────────────────────────────────────
  function drawTicks3D(R, rots, color, count, tickOut, lw) {
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    for (var i = 0; i < count; i++) {
      var a  = (i / count) * Math.PI * 2;
      var v1 = applyRots([R * Math.cos(a), R * Math.sin(a), 0], rots);
      var v2 = applyRots([(R + tickOut) * Math.cos(a), (R + tickOut) * Math.sin(a), 0], rots);
      var p1 = project(v1), p2 = project(v2);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }
  }

  // ── Hexagon ───────────────────────────────────────────────────────────
  function drawHex(r, angle, color, lw, glow) {
    if (glow) { ctx.shadowBlur = glow; ctx.shadowColor = color; }
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.beginPath();
    for (var i = 0; i <= 6; i++) {
      var a = angle + (i / 6) * Math.PI * 2;
      if (i === 0) ctx.moveTo(CX + r * Math.cos(a), CY + r * Math.sin(a));
      else         ctx.lineTo(CX + r * Math.cos(a), CY + r * Math.sin(a));
    }
    ctx.stroke();
    if (glow) ctx.shadowBlur = 0;
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render() {
    var cfg = STATE_CFG[currentState];
    lSpMul  += (cfg.spMul  - lSpMul)  * LERP;
    lBright += (cfg.bright - lBright) * LERP;
    lShift  += (cfg.shift  - lShift)  * LERP;

    var T  = frame * 0.0007 * lSpMul;
    var lb = lBright;
    ctx.clearRect(0, 0, W, H);

    // 1. Background corona
    var cor = ctx.createRadialGradient(CX, CY, 20, CX, CY, 185);
    cor.addColorStop(0,   'rgba(0,90,200,'  + (0.14 * lb) + ')');
    cor.addColorStop(0.5, 'rgba(0,30,90,'   + (0.07 * lb) + ')');
    cor.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, W, H);

    // 2. Wireframe sphere
    ctx.globalAlpha = 0.18 * lb;
    drawWireframeSphere(88, T * 0.12, 0.32, '#00aaff');
    ctx.globalAlpha = 1;

    // 3. Orbiting particle field — 32 dots on spherical shell
    for (var i = 0; i < 32; i++) {
      var phi   = Math.acos(1 - 2 * (i + 0.5) / 32);  // Fibonacci sphere
      var theta = i * 2.39996 + T * (0.35 + (i % 5) * 0.04);
      var pr    = 90 + (i % 4) * 5;
      var vp    = [pr * Math.sin(phi) * Math.cos(theta),
                   pr * Math.cos(phi),
                   pr * Math.sin(phi) * Math.sin(theta)];
      var pp    = project(vp);
      var depth = (vp[2] + pr) / (2 * pr);
      var da    = (depth * 0.55 + 0.08) * lb;
      var ds    = depth * 1.8 + 0.5;
      ctx.beginPath();
      ctx.arc(pp[0], pp[1], ds, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(0,212,255,' + da + ')';
      ctx.shadowBlur  = depth * 7;
      ctx.shadowColor = '#00c8ff';
      ctx.fill();
      ctx.shadowBlur  = 0;
    }

    // 4. Three tilted orbit rings
    var rA = [{ ax: 'x', a: 0.52  }, { ax: 'z', a: T * 0.38 }];
    var rB = [{ ax: 'x', a: 1.12  }, { ax: 'y', a: T * 0.24 }];
    var rC = [{ ax: 'x', a: 0.22  }, { ax: 'z', a: -T * 0.17 }];

    drawRing3D(116, rA, 'rgba(0,212,255,'   + (0.52 * lb) + ')', 0.85, [18, 5, 3, 5], 5);
    drawRing3D(124, rB, 'rgba(120,50,255,'  + (0.44 * lb) + ')', 0.85, [12, 6, 2, 6], 4);
    drawRing3D(110, rC, 'rgba(0,100,255,'   + (0.38 * lb) + ')', 0.65, [6, 3],        2);

    // 5. Tick marks + data ring
    var tickRots = [{ ax: 'x', a: 0.28 }, { ax: 'y', a: T * 0.10 }];
    drawTicks3D(130, tickRots, 'rgba(0,212,255,' + (0.28 * lb) + ')', 36, 4,  0.55);
    drawTicks3D(130, tickRots, 'rgba(0,212,255,' + (0.55 * lb) + ')', 12, 7,  0.9);

    // 6. Scanner arc (flat, rotates fast)
    var sc  = T * 1.8;
    ctx.beginPath();
    ctx.arc(CX, CY, 133, sc, sc + Math.PI * 0.38);
    ctx.strokeStyle = 'rgba(0,212,255,' + (0.72 * lb) + ')';
    ctx.lineWidth   = 1.6;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#00d4ff';
    ctx.stroke();
    ctx.shadowBlur  = 0;

    ctx.beginPath();
    ctx.arc(CX, CY, 133, sc + Math.PI, sc + Math.PI + Math.PI * 0.18);
    ctx.strokeStyle = 'rgba(0,212,255,' + (0.18 * lb) + ')';
    ctx.lineWidth   = 0.7;
    ctx.stroke();

    // 7. HUD corner brackets (4 × rotating)
    var bR  = 148;
    var bL  = 13;
    var bS  = T * 0.055;
    ctx.strokeStyle = 'rgba(0,212,255,' + (0.44 * lb) + ')';
    ctx.lineWidth   = 1.1;
    ctx.shadowBlur  = 5;
    ctx.shadowColor = '#00d4ff';
    for (var bi = 0; bi < 4; bi++) {
      var ba  = bS + bi * Math.PI * 0.5;
      var bx  = CX + bR * Math.cos(ba);
      var by  = CY + bR * Math.sin(ba);
      var b1a = ba + Math.PI * 0.72;
      var b2a = ba - Math.PI * 0.72;
      ctx.beginPath();
      ctx.moveTo(bx + bL * Math.cos(b1a), by + bL * Math.sin(b1a));
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + bL * Math.cos(b2a), by + bL * Math.sin(b2a));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 8. Inner hexagon trio
    var hA = T * 0.28;
    drawHex(44,  hA,                  'rgba(0,212,255,'  + (0.42 * lb) + ')', 1.0, 7);
    drawHex(37,  hA + Math.PI / 6,   'rgba(120,50,255,' + (0.36 * lb) + ')', 0.8, 4);
    drawHex(27, -hA * 0.65,          'rgba(0,130,255,'  + (0.50 * lb) + ')', 0.9, 6);

    // 9. Fast inner data ring
    ctx.beginPath();
    ctx.arc(CX, CY, 54, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,140,255,' + (0.22 * lb) + ')';
    ctx.lineWidth   = 0.6;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    var fi = -T * 3.2;
    ctx.beginPath();
    ctx.arc(CX, CY, 54, fi, fi + Math.PI * 0.28);
    ctx.strokeStyle = 'rgba(0,212,255,' + (0.85 * lb) + ')';
    ctx.lineWidth   = 1.6;
    ctx.shadowBlur  = 7;
    ctx.shadowColor = '#00d4ff';
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // 10. Solid core sphere
    var breath  = Math.sin(frame * 0.038);
    var coreR   = 72 + breath * 2.4;

    // Outer halo behind the sphere
    var halo = ctx.createRadialGradient(CX, CY, coreR * 0.4, CX, CY, coreR * 2.6);
    halo.addColorStop(0,   'rgba(0,140,255,' + (0.38 * lb) + ')');
    halo.addColorStop(0.5, 'rgba(0,60,180,'  + (0.12 * lb) + ')');
    halo.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(CX, CY, coreR * 2.6, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // Solid fill — dark navy sphere with subtle off-centre light source
    var coreFill = ctx.createRadialGradient(
      CX - coreR * 0.22, CY - coreR * 0.28, 0,
      CX, CY, coreR
    );
    coreFill.addColorStop(0,    'rgb(22,55,145)');
    coreFill.addColorStop(0.45, 'rgb(8,20,72)');
    coreFill.addColorStop(0.82, 'rgb(3,8,38)');
    coreFill.addColorStop(1,    'rgb(1,3,18)');
    ctx.beginPath();
    ctx.arc(CX, CY, coreR, 0, Math.PI * 2);
    ctx.fillStyle = coreFill;
    ctx.fill();

    // Top-left specular glint (clipped to sphere)
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, coreR, 0, Math.PI * 2);
    ctx.clip();
    var spec2 = ctx.createRadialGradient(CX - coreR*0.3, CY - coreR*0.32, 0, CX - coreR*0.1, CY - coreR*0.1, coreR*0.7);
    spec2.addColorStop(0,   'rgba(180,225,255,0.32)');
    spec2.addColorStop(0.5, 'rgba(80,160,255,0.06)');
    spec2.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = spec2;
    ctx.fillRect(CX - coreR, CY - coreR, coreR * 2, coreR * 2);
    ctx.restore();

    // Thin glowing rim
    ctx.beginPath();
    ctx.arc(CX, CY, coreR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,190,255,' + (0.55 * lb) + ')';
    ctx.lineWidth   = 0.9;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#00d4ff';
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // APEX text — drawn on top of core, manually letter-spaced
    ctx.save();
    ctx.font         = 'bold 11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'left';
    var letters  = ['A','P','E','X'];
    var charW    = ctx.measureText('A').width;
    var gap      = 3.5;
    var totalTW  = letters.length * charW + (letters.length - 1) * gap;
    var startLX  = CX - totalTW / 2;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#00d4ff';
    for (var li = 0; li < letters.length; li++) {
      ctx.fillStyle = 'rgba(215,245,255,' + (0.94 * lb) + ')';
      ctx.fillText(letters[li], startLX + li * (charW + gap), CY);
    }
    ctx.shadowBlur = 0;

    // Flanking tick lines beside text
    ctx.strokeStyle = 'rgba(0,180,255,' + (0.48 * lb) + ')';
    ctx.lineWidth   = 0.8;
    var tw2 = totalTW / 2 + 4;
    ctx.beginPath(); ctx.moveTo(CX - tw2 - 7, CY); ctx.lineTo(CX - tw2 - 1, CY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX + tw2 + 1, CY); ctx.lineTo(CX + tw2 + 7, CY); ctx.stroke();

    // Small status dot below text (blinks on non-standby)
    var dotAlpha = currentState === 'standby'
      ? 0.22 * lb
      : (0.5 + 0.35 * Math.abs(Math.sin(frame * 0.08))) * lb;
    ctx.beginPath();
    ctx.arc(CX, CY + 12, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,212,255,' + dotAlpha + ')';
    ctx.fill();
    ctx.restore();

    // 11. Floating data readouts
    var hx = '0123456789ABCDEF';
    function fhex(seed, n) {
      var s = '';
      for (var i = 0; i < n; i++) s += hx[(frame * 0.06 + seed * 17 + i * 7 | 0) % 16];
      return s;
    }
    ctx.font      = '7px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(0,212,255,' + (0.32 * lb) + ')';
    ctx.fillText(fhex(1,4) + ':' + fhex(2,4), CX + 155, CY - 6);
    ctx.fillText(fhex(3,4) + ':' + fhex(4,4), CX - 184, CY - 6);
    ctx.fillText(fhex(5,4), CX - 14, CY - 158);
    ctx.fillText(fhex(6,4), CX - 14, CY + 168);

    // Status label (small, below brackets)
    ctx.font      = '6.5px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(0,212,255,' + (0.22 * lb) + ')';
    ctx.fillText('SYS:' + (currentState === 'standby' ? 'IDLE' : currentState.toUpperCase().slice(0,4)), CX + 155, CY + 10);

    // 12. State-specific effects
    var s = currentState;

    if (s === 'listening') {
      // Two offset expanding pulse rings
      [0, 0.5].forEach(function(offset) {
        var ph = ((frame * 0.035) + offset) % 1;
        var pr = 95 + ph * 58;
        var pa = (1 - ph) * 0.48 * lb;
        ctx.beginPath();
        ctx.arc(CX, CY, pr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,212,255,' + pa + ')';
        ctx.lineWidth   = 1.4;
        ctx.stroke();
      });
    }

    if (s === 'speaking') {
      // Waveform ring
      ctx.beginPath();
      for (var wi = 0; wi <= 120; wi++) {
        var wa = (wi / 120) * Math.PI * 2;
        var wr = 104 + 7 * Math.sin(wa * 8 + frame * 0.14) * Math.sin(wa * 3 + frame * 0.09);
        var wx = CX + wr * Math.cos(wa);
        var wy = CY + wr * Math.sin(wa);
        if (wi === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0,212,255,' + (0.48 * lb) + ')';
      ctx.lineWidth   = 1;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#00d4ff';
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    if (s === 'thinking') {
      // Three staggered violet scanning arcs
      for (var ti = 0; ti < 3; ti++) {
        var ts = T * 4.5 + ti * Math.PI * 0.67;
        ctx.beginPath();
        ctx.arc(CX, CY, 99 + ti * 8, ts, ts + Math.PI * 0.32);
        ctx.strokeStyle = 'rgba(120,50,255,' + (0.48 * lb) + ')';
        ctx.lineWidth   = 1.1;
        ctx.shadowBlur  = 5;
        ctx.shadowColor = 'rgba(120,50,255,0.8)';
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }
    }
  }

  function loop() {
    frameId = requestAnimationFrame(loop);
    render();
    frame++;
  }

  // ── Labels ────────────────────────────────────────────────────────────
  var LABELS = {
    standby:   'STANDBY · TAP TO SPEAK',
    listening: '● LISTENING',
    thinking:  '⟳ PROCESSING',
    speaking:  '◆ SPEAKING',
  };

  function updateLabels() {
    var lbl = document.getElementById('plasmaOrbSubLabel');
    if (lbl) {
      lbl.textContent = LABELS[currentState] || '';
      lbl.style.color = currentState === 'standby' ? '#1a3050' : '#00d4ff';
    }
    var cs = document.getElementById('cmdOrbState');
    if (cs) cs.textContent = currentState.toUpperCase();
  }

  // ── Public API ────────────────────────────────────────────────────────
  window.APEX_ORB = {
    setState: function (state) {
      if (!STATE_CFG[state]) return;
      currentState = state;
      updateLabels();
    },
    getState: function () { return currentState; },
  };

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    var canvas = document.getElementById('plasmaOrb');
    if (!canvas) return;
    canvas.width  = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    updateLabels();

    var cmdPage = document.getElementById('page-command');
    function startLoop() { if (!frameId) loop(); }
    function stopLoop()  { if (frameId) { cancelAnimationFrame(frameId); frameId = null; } }

    if (cmdPage) {
      var obs = new MutationObserver(function () {
        if (cmdPage.classList.contains('active')) startLoop(); else stopLoop();
      });
      obs.observe(cmdPage, { attributes: true, attributeFilter: ['class'] });
      if (cmdPage.classList.contains('active')) startLoop();
    } else {
      startLoop();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
