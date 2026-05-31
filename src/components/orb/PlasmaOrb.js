// PlasmaOrb.js — APEX Plasma Orb, vanilla JS
// Self-contained canvas renderer. Exposes window.APEX_ORB.setState(state).
// States: 'standby' | 'listening' | 'thinking' | 'speaking'

(function () {
  'use strict';

  var W = 320, H = 320, CX = 160, CY = 160, R = 138;
  var LERP = 0.008;

  var frame = 0;
  var frameId = null;
  var ctx = null;

  var lSpMul = 1.0, lBright = 1.0, lShift = 0.0;
  var currentState = 'standby';

  var STATE_CONFIG = {
    standby:   { spMul: 1.0,  bright: 1.0,  shift:  0.0 },
    listening: { spMul: 3.8,  bright: 1.6,  shift:  0.3 },
    thinking:  { spMul: 2.2,  bright: 1.3,  shift: -0.4 },
    speaking:  { spMul: 5.0,  bright: 1.85, shift:  0.6 },
  };

  var PALETTE = [
    { r: 80,  g: 20,  b: 255 },
    { r: 110, g: 30,  b: 255 },
    { r: 20,  g: 80,  b: 255 },
    { r: 0,   g: 140, b: 255 },
    { r: 0,   g: 200, b: 255 },
    { r: 160, g: 60,  b: 255 },
    { r: 40,  g: 40,  b: 220 },
  ];

  function seededRandom(seed) {
    var s = seed;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function buildRibbons() {
    var rng = seededRandom(137);
    var ribbons = [];
    for (var i = 0; i < 26; i++) {
      ribbons.push({
        tilt:      (rng() - 0.5) * Math.PI * 1.7,
        azimuth:   rng() * Math.PI * 2,
        speed:     (0.00008 + rng() * 0.00014) * (rng() > 0.5 ? 1 : -1),
        width:     28 + rng() * 55,
        phase:     rng() * Math.PI * 2,
        wavePhase: rng() * Math.PI * 2,
        amp:       0.06 + rng() * 0.18,
        freq:      0.5  + rng() * 1.5,
        col:       PALETTE[i % PALETTE.length],
        alpha:     0.35 + rng() * 0.45,
      });
    }
    return ribbons;
  }

  var RIBBONS = buildRibbons();
  var OFF_POOL = null;

  function initOffPool() {
    OFF_POOL = [];
    for (var i = 0; i < 30; i++) {
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      OFF_POOL.push(c);
    }
  }

  function computeRibbonPoints(ribbon, T) {
    var pts = [];
    var N = 180;
    var cosTilt = Math.cos(ribbon.tilt);
    var sinTilt = Math.sin(ribbon.tilt);
    var cosAz   = Math.cos(ribbon.azimuth);
    var sinAz   = Math.sin(ribbon.azimuth);
    var phase   = ribbon.phase + T * ribbon.speed;

    for (var k = 0; k <= N; k++) {
      var u  = (k / N) * Math.PI * 2;
      var x3 = R * Math.cos(u + phase);
      var y3 = R * Math.sin(u + phase);

      // Rotate around Z by tilt
      var xRot = x3 * cosTilt - y3 * sinTilt;
      var yRot = x3 * sinTilt + y3 * cosTilt;

      // Rotate around X by azimuth
      var xFinal = xRot;
      var yFinal = yRot * cosAz;
      var zFinal = yRot * sinAz;

      // Radial sine-wave surface deformation
      var wave = ribbon.amp * R *
        Math.sin(u * ribbon.freq + T * ribbon.speed * 0.3 + ribbon.wavePhase);
      var nx = xFinal / R, ny = yFinal / R, nz = zFinal / R;
      var wx = xFinal + nx * wave * 0.25;
      var wy = yFinal + ny * wave * 0.25;
      var wz = zFinal + nz * wave * 0.25;

      pts.push({
        x:     CX + wx,
        y:     CY - wz * 0.90 + wy * 0.18,
        depth: wy,
      });
    }
    return pts;
  }

  function drawRibbonBlurred(ribbonPoints, colour, width, alpha, poolIdx) {
    var off    = OFF_POOL[poolIdx];
    var offCtx = off.getContext('2d');
    offCtx.clearRect(0, 0, W, H);

    offCtx.beginPath();
    for (var i = 0; i < ribbonPoints.length; i++) {
      var p = ribbonPoints[i];
      if (i === 0) offCtx.moveTo(p.x, p.y);
      else         offCtx.lineTo(p.x, p.y);
    }
    offCtx.lineWidth   = width;
    offCtx.lineCap     = 'round';
    offCtx.strokeStyle = colour;
    offCtx.globalAlpha = 1.0;
    offCtx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha              = alpha;
    ctx.filter                   = 'blur(' + Math.round(width * 0.28) + 'px)';
    ctx.drawImage(off, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }

  function render() {
    frameId = requestAnimationFrame(render);

    var cfg = STATE_CONFIG[currentState];
    lSpMul  += (cfg.spMul  - lSpMul)  * LERP;
    lBright += (cfg.bright - lBright) * LERP;
    lShift  += (cfg.shift  - lShift)  * LERP;

    var T = frame * 0.001 * lSpMul;

    ctx.clearRect(0, 0, W, H);

    // 1. Outer corona
    var corona = ctx.createRadialGradient(CX, CY, R * 0.5, CX, CY, R * 1.6);
    corona.addColorStop(0,    'rgba(10,30,180,' + (0.22 * lBright) + ')');
    corona.addColorStop(0.4,  'rgba(5,15,120,'  + (0.10 * lBright) + ')');
    corona.addColorStop(0.8,  'rgba(2,6,60,'    + (0.04 * lBright) + ')');
    corona.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(CX, CY, R * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = corona;
    ctx.fill();

    // 2. Sphere base (inside clip)
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();

    var base = ctx.createRadialGradient(CX - R * 0.1, CY - R * 0.18, 0, CX, CY, R);
    base.addColorStop(0,    'rgb(10,18,72)');
    base.addColorStop(0.4,  'rgb(5,10,42)');
    base.addColorStop(0.75, 'rgb(2,5,22)');
    base.addColorStop(1,    'rgb(1,2,12)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    // 3. Ribbons — sort back to front, offscreen blur per ribbon
    var sorted = RIBBONS.map(function (rib) {
      var pts = computeRibbonPoints(rib, T * rib.speed * 800);
      var sum = 0;
      for (var i = 0; i < pts.length; i++) sum += pts[i].depth;
      return { rib: rib, pts: pts, avgDepth: sum / pts.length };
    }).sort(function (a, b) { return a.avgDepth - b.avgDepth; });

    var poolIdx = 0;
    for (var si = 0; si < sorted.length; si++) {
      var rib = sorted[si].rib, pts = sorted[si].pts;

      for (var pass = 0; pass < 2; pass++) {
        var isFront = pass === 1;
        var seg = [];
        for (var pi = 0; pi < pts.length; pi++) {
          if (isFront ? pts[pi].depth >= 0 : pts[pi].depth < 0) seg.push(pts[pi]);
        }
        if (seg.length < 2 || poolIdx >= OFF_POOL.length) continue;

        var rc = rib.col.r, gc = rib.col.g, bc = rib.col.b;
        var colour = 'rgb(' +
          Math.round(Math.min(255, Math.max(0, rc + lShift * 60))) + ',' +
          Math.round(Math.min(255, Math.max(0, gc + lShift * 30))) + ',' +
          Math.round(Math.min(255, Math.max(0, bc + lShift * 15))) + ')';

        var finalAlpha = Math.min(0.9, rib.alpha * lBright * (isFront ? 1.0 : 0.18));
        drawRibbonBlurred(seg, colour, rib.width * lBright, finalAlpha, poolIdx++);
      }
    }

    // 4. Dot matrix — right-hemisphere surface texture
    var ROWS = 20, COLS = 24;
    for (var ri = 0; ri < ROWS; ri++) {
      var phi = (ri / (ROWS - 1)) * Math.PI;
      for (var ci = 0; ci < COLS; ci++) {
        var theta   = (ci / COLS) * Math.PI * 2;
        var dx      =  R * Math.sin(phi) * Math.cos(theta);
        var dy      =  R * Math.cos(phi);
        var dz      =  R * Math.sin(phi) * Math.sin(theta);
        if (dx < 15 || dy < -60) continue;
        var dpx = CX + dx;
        var dpy = CY - dz * 0.9 + dy * 0.18;
        var dAlpha = Math.max(0, dy / R) * 0.20 + 0.03;
        ctx.beginPath();
        ctx.arc(dpx, dpy, 0.85, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,160,255,' + dAlpha + ')';
        ctx.fill();
      }
    }

    // 5. Inner core glow
    ctx.globalCompositeOperation = 'screen';
    var coreBreath = (0.20 + 0.06 * Math.sin(frame * 0.006)) * lBright;
    var core = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 0.68);
    core.addColorStop(0,   'rgba(55,110,255,' + coreBreath + ')');
    core.addColorStop(0.4, 'rgba(28,60,200,'  + (coreBreath * 0.35) + ')');
    core.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // 6. Edge vignette
    var vign = ctx.createRadialGradient(CX, CY, R * 0.45, CX, CY, R);
    vign.addColorStop(0,    'rgba(0,0,0,0)');
    vign.addColorStop(0.65, 'rgba(0,0,0,0.05)');
    vign.addColorStop(1,    'rgba(0,0,0,0.65)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // 7. Specular highlight — top-left
    var spec = ctx.createRadialGradient(
      CX - R * 0.34, CY - R * 0.38, 0,
      CX - R * 0.30, CY - R * 0.30, R * 0.44
    );
    spec.addColorStop(0,    'rgba(210,235,255,0.26)');
    spec.addColorStop(0.35, 'rgba(150,210,255,0.08)');
    spec.addColorStop(0.7,  'rgba(100,170,255,0.02)');
    spec.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(0, 0, W, H);

    ctx.restore(); // end sphere clip

    // 8. Rim light — outside clip, sits on sphere edge
    ctx.beginPath();
    ctx.arc(CX, CY, R - 0.5, Math.PI * 0.72, Math.PI * 1.92);
    ctx.strokeStyle = 'rgba(140,200,255,' + (0.45 * lBright) + ')';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY, R - 0.5, Math.PI * 1.92, Math.PI * 2.72);
    ctx.strokeStyle = 'rgba(30,60,180,' + (0.12 * lBright) + ')';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // 9. State indicator rings
    var s = currentState;
    if (s === 'listening' || s === 'speaking') {
      var spd    = s === 'speaking' ? 0.14 : 0.08;
      var pulseR = R + 10 + 8 * Math.sin(frame * spd);
      var pulseA = (0.25 + 0.15 * Math.abs(Math.sin(frame * spd))) * lBright;
      ctx.beginPath();
      ctx.arc(CX, CY, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,212,255,' + pulseA + ')';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }
    if (s === 'thinking') {
      var arcStart = (frame * 0.025) % (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(CX, CY, R + 8, arcStart, arcStart + Math.PI * 1.2);
      ctx.strokeStyle = 'rgba(160,80,255,' + (0.35 * lBright) + ')';
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

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
      if (!STATE_CONFIG[state]) return;
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

    initOffPool();
    updateLabels();

    var cmdPage = document.getElementById('page-command');

    function startLoop() {
      if (!frameId) frameId = requestAnimationFrame(render);
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
