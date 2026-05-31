// PlasmaOrb.js — APEX Plasma Orb v2 (shadowBlur layered strokes, no ctx.filter)
// Exposes window.APEX_ORB.setState(state).
// States: 'standby' | 'listening' | 'thinking' | 'speaking'

(function () {
  'use strict';

  var W = 320, H = 320, CX = 160, CY = 160, R = 138;
  var LERP = 0.007;
  var frame = 0, frameId = null, ctx = null;
  var lSpMul = 1, lBright = 1, lShift = 0;
  var currentState = 'standby';

  var STATE_CFG = {
    standby:   { spMul: 1.0,  bright: 1.0,  shift:  0.0 },
    listening: { spMul: 4.0,  bright: 1.6,  shift:  0.3 },
    thinking:  { spMul: 2.4,  bright: 1.3,  shift: -0.5 },
    speaking:  { spMul: 5.5,  bright: 1.9,  shift:  0.6 },
  };

  var COLS = [
    [80,  20,  255],
    [110, 30,  255],
    [20,  80,  255],
    [0,   140, 255],
    [0,   210, 255],
    [160, 60,  255],
    [40,  40,  220],
    [130, 10,  255],
  ];

  function srng(seed) {
    var s = seed;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  var rng = srng(137);
  var RIBBONS = (function () {
    var arr = [];
    for (var i = 0; i < 28; i++) {
      arr.push({
        tilt:      (rng() - 0.5) * Math.PI * 1.75,
        azimuth:   rng() * Math.PI * 2,
        speed:     (0.00006 + rng() * 0.00012) * (rng() > 0.5 ? 1 : -1),
        width:     22 + rng() * 52,
        phase:     rng() * Math.PI * 2,
        wavePhase: rng() * Math.PI * 2,
        amp:       0.04 + rng() * 0.16,
        freq:      0.4  + rng() * 1.6,
        col:       COLS[i % COLS.length],
        alpha:     0.28 + rng() * 0.42,
      });
    }
    return arr;
  })();

  function computePoints(rib, T) {
    var pts = [];
    var N   = 200;
    var ct  = Math.cos(rib.tilt),    st = Math.sin(rib.tilt);
    var ca  = Math.cos(rib.azimuth), sa = Math.sin(rib.azimuth);

    for (var k = 0; k <= N; k++) {
      var u  = (k / N) * Math.PI * 2;
      var ph = rib.phase + T;

      var x = R * Math.cos(u + ph);
      var y = R * Math.sin(u + ph);

      // Rotation 1 — tilt around Z
      var xr = x * ct - y * st;
      var yr = x * st + y * ct;

      // Rotation 2 — azimuth around X
      var xf = xr;
      var yf = yr * ca;
      var zf = yr * sa;

      // Surface wave deformation
      var wave = rib.amp * R *
        Math.sin(u * rib.freq + T * 0.3 + rib.wavePhase);
      var nx = xf / R, ny = yf / R, nz = zf / R;
      xf += nx * wave * 0.22;
      yf += ny * wave * 0.22;
      zf += nz * wave * 0.22;

      pts.push({
        x:     CX + xf,
        y:     CY - zf * 0.9 + yf * 0.16,
        depth: yf,
      });
    }
    return pts;
  }

  // 4-layer shadowBlur stroke — replaces ctx.filter blur
  function drawRibbon(pts, colR, colG, colB, width, alpha, isFront) {
    var seg = [];
    for (var i = 0; i < pts.length; i++) {
      if (isFront ? pts[i].depth >= 0 : pts[i].depth < 0) seg.push(pts[i]);
    }
    if (seg.length < 3) return;

    var depthMul  = isFront ? 1.0 : 0.15;
    var baseAlpha = alpha * depthMul;
    if (baseAlpha < 0.01) return;

    function stroke(lw, sa, blurW, blurA, brightBoost) {
      var br = brightBoost ? Math.min(255, colR + 80) : colR;
      var bg = brightBoost ? Math.min(255, colG + 60) : colG;
      var bb = brightBoost ? 255 : colB;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      for (var i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.strokeStyle = 'rgba(' + Math.round(br) + ',' + Math.round(bg) + ',' + Math.round(bb) + ',' + (baseAlpha * sa) + ')';
      ctx.shadowBlur  = blurW;
      ctx.shadowColor = 'rgba(' + Math.round(colR) + ',' + Math.round(colG) + ',' + Math.round(colB) + ',' + (baseAlpha * blurA) + ')';
      ctx.stroke();
      ctx.restore();
    }

    // Layer 1 — ultra-wide outer feather
    stroke(width * 3.2, 0.06, width * 2.5, 0.12, false);
    // Layer 2 — wide mid feather
    stroke(width * 1.6, 0.18, width * 1.2, 0.25, false);
    // Layer 3 — main ribbon body
    stroke(width * 0.7, 0.55, width * 0.6, 0.60, false);
    // Layer 4 — thin bright core line
    stroke(width * 0.18, 0.85, width * 0.4, 0.4, true);
  }

  function render() {
    var cfg = STATE_CFG[currentState];
    lSpMul  += (cfg.spMul  - lSpMul)  * LERP;
    lBright += (cfg.bright - lBright) * LERP;
    lShift  += (cfg.shift  - lShift)  * LERP;

    var T = frame * 0.001 * lSpMul;
    ctx.clearRect(0, 0, W, H);

    // 1. Outer corona halo
    var corona = ctx.createRadialGradient(CX, CY, R * 0.5, CX, CY, R * 1.58);
    corona.addColorStop(0,    'rgba(12,30,180,'  + (0.22 * lBright) + ')');
    corona.addColorStop(0.45, 'rgba(6,15,110,'   + (0.09 * lBright) + ')');
    corona.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(CX, CY, R * 1.58, 0, Math.PI * 2);
    ctx.fillStyle = corona;
    ctx.fill();

    // 2. Sphere clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();

    // 3. Deep navy base
    var base = ctx.createRadialGradient(CX - R * 0.1, CY - R * 0.18, 0, CX, CY, R);
    base.addColorStop(0,    'rgb(9,16,68)');
    base.addColorStop(0.42, 'rgb(4,9,38)');
    base.addColorStop(0.78, 'rgb(2,4,20)');
    base.addColorStop(1,    'rgb(1,2,11)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    // 4. Ribbons with screen blend
    ctx.globalCompositeOperation = 'screen';

    var computed = RIBBONS.map(function (rib) {
      var speed = rib.speed * lSpMul;
      var ribWithSpeed = { tilt: rib.tilt, azimuth: rib.azimuth, speed: speed,
        width: rib.width, phase: rib.phase, wavePhase: rib.wavePhase,
        amp: rib.amp, freq: rib.freq, col: rib.col, alpha: rib.alpha };
      var pts  = computePoints(ribWithSpeed, T);
      var sum  = 0;
      for (var i = 0; i < pts.length; i++) sum += pts[i].depth;
      return { rib: rib, pts: pts, avgD: sum / pts.length };
    });
    computed.sort(function (a, b) { return a.avgD - b.avgD; });

    for (var si = 0; si < computed.length; si++) {
      var rib = computed[si].rib, pts = computed[si].pts;
      var c   = rib.col;
      var cs  = lShift * 55;
      var colR = Math.min(255, Math.max(0, c[0] + cs));
      var colG = Math.min(255, Math.max(0, c[1] + cs * 0.4));
      var colB = Math.min(255, Math.max(0, c[2] + cs * 0.15));
      var w    = rib.width * (0.85 + 0.15 * lBright);
      drawRibbon(pts, colR, colG, colB, w, rib.alpha * lBright, false);
      drawRibbon(pts, colR, colG, colB, w, rib.alpha * lBright, true);
    }

    ctx.globalCompositeOperation = 'source-over';

    // 5. Dot matrix — right hemisphere surface texture
    for (var ri = 0; ri < 20; ri++) {
      for (var ci = 0; ci < 24; ci++) {
        var phi   = (ri / 19) * Math.PI;
        var theta = (ci / 24) * Math.PI * 2;
        var x3 =  R * Math.sin(phi) * Math.cos(theta);
        var y3 =  R * Math.cos(phi);
        var z3 =  R * Math.sin(phi) * Math.sin(theta);
        if (x3 < 12 || y3 < -55) continue;
        var dpx = CX + x3;
        var dpy = CY - z3 * 0.9 + y3 * 0.16;
        var da  = Math.max(0, y3 / R) * 0.18 + 0.03;
        ctx.beginPath();
        ctx.arc(dpx, dpy, 0.85, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,160,255,' + da + ')';
        ctx.fill();
      }
    }

    // 6. Inner volumetric core glow
    ctx.globalCompositeOperation = 'screen';
    var cb   = (0.18 + 0.055 * Math.sin(frame * 0.006)) * lBright;
    var core = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 0.7);
    core.addColorStop(0,   'rgba(55,110,255,' + cb + ')');
    core.addColorStop(0.4, 'rgba(28,58,200,'  + (cb * 0.35) + ')');
    core.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // 7. Edge vignette
    var vign = ctx.createRadialGradient(CX, CY, R * 0.45, CX, CY, R);
    vign.addColorStop(0,    'rgba(0,0,0,0)');
    vign.addColorStop(0.68, 'rgba(0,0,0,0.06)');
    vign.addColorStop(1,    'rgba(0,0,0,0.68)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // 8. Specular highlight top-left
    var spec = ctx.createRadialGradient(
      CX - R * 0.34, CY - R * 0.38, 0,
      CX - R * 0.30, CY - R * 0.30, R * 0.44
    );
    spec.addColorStop(0,   'rgba(210,235,255,0.24)');
    spec.addColorStop(0.4, 'rgba(150,210,255,0.07)');
    spec.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, W, H);

    ctx.restore(); // end sphere clip

    // 9. Rim light
    ctx.beginPath();
    ctx.arc(CX, CY, R - 0.5, Math.PI * 0.72, Math.PI * 1.95);
    ctx.strokeStyle = 'rgba(140,200,255,' + (0.42 * lBright) + ')';
    ctx.lineWidth   = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY, R - 0.5, Math.PI * 1.95, Math.PI * 2.72);
    ctx.strokeStyle = 'rgba(30,60,180,' + (0.11 * lBright) + ')';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // 10. State rings
    var s = currentState;
    if (s === 'listening' || s === 'speaking') {
      var spd = s === 'speaking' ? 0.13 : 0.07;
      var pr  = R + 10 + 8 * Math.sin(frame * spd);
      var pa  = (0.22 + 0.14 * Math.abs(Math.sin(frame * spd))) * lBright;
      ctx.beginPath();
      ctx.arc(CX, CY, pr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,212,255,' + pa + ')';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }
    if (s === 'thinking') {
      var arcStart = (frame * 0.022) % (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(CX, CY, R + 9, arcStart, arcStart + Math.PI * 1.3);
      ctx.strokeStyle = 'rgba(160,80,255,' + (0.32 * lBright) + ')';
      ctx.lineWidth   = 1.0;
      ctx.stroke();
    }
  }

  function loop() {
    frameId = requestAnimationFrame(loop);
    render();
    frame++;
  }

  // ── Label updates ─────────────────────────────────────────────────────
  var STATE_LABELS = {
    standby:   'STANDBY · TAP TO SPEAK',
    listening: '● LISTENING',
    thinking:  '⟳ PROCESSING',
    speaking:  '◆ SPEAKING',
  };

  function updateLabels() {
    var lbl = document.getElementById('plasmaOrbSubLabel');
    if (lbl) {
      lbl.textContent = STATE_LABELS[currentState] || '';
      lbl.style.color = currentState === 'standby' ? '#1a3050' : '#00d4ff';
    }
    var cmdState = document.getElementById('cmdOrbState');
    if (cmdState) cmdState.textContent = currentState.toUpperCase();
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

    function startLoop() {
      if (!frameId) loop();
    }
    function stopLoop() {
      if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    }

    if (cmdPage) {
      var obs = new MutationObserver(function () {
        if (cmdPage.classList.contains('active')) startLoop();
        else stopLoop();
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
