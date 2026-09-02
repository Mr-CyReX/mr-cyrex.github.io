/* ═══════════════════════════════════════════════════════════════
   /Cy — CUTROOM · glm-v1 · engine
   vanilla, zero deps, zero build — runs from file:// directly
   systems: boot · reveals · desk/playhead · lab · clapper · sound
   ═══════════════════════════════════════════════════════════════ */

/* ── CONFIG — paste your real links here, they plug into the CTAs ── */
const CY_LINKS = {
  sample: '',   // e.g. 'mailto:you@domain.com?subject=free%20sample%20edit'
  hi: '',       // e.g. 'mailto:you@domain.com' or discord invite
};

'use strict';

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a, b) => a + Math.random() * (b - a);

const root = document.documentElement;
const body = document.body;
const reels = $$('.cut');
const TOTAL_FRAMES = 32 * 24;             // fake comp: 32s @ 24fps
const FPS = 24;

/* ── error trap: catches everything, badge copies a relay report ── */
const ErrTrap = (() => {
  const btn = $('#errtrap');
  const errs = [];
  let copied = false;
  const grab = (e) => {
    errs.push({
      msg: e.message || String(e.reason || 'unknown'),
      src: (e.filename || '') + ':' + (e.lineno ?? '') + ':' + (e.colno ?? ''),
      stack: (e.error && e.error.stack) ? String(e.error.stack).slice(0, 900) : '',
      at: new Date().toISOString(),
    });
    btn.hidden = false;
    btn.textContent = 'ERR ×' + errs.length;
  };
  window.addEventListener('error', grab);
  window.addEventListener('unhandledrejection', grab);
  btn.addEventListener('click', () => {
    if (copied) return;
    const report = [
      'glm-v1 error report',
      'ua: ' + navigator.userAgent,
      'viewport: ' + innerWidth + 'x' + innerHeight + ' dpr ' + devicePixelRatio,
      'grade: ' + root.dataset.grade + ' · theme: ' + root.dataset.theme + ' · accent: ' + root.dataset.accent,
      'scroll%: ' + Math.round(scrollProgress() * 100),
      'errors(' + errs.length + '): ' + JSON.stringify(errs, null, 1),
    ].join('\n');
    const done = () => { copied = true; btn.textContent = 'copied ✓'; setTimeout(() => { btn.textContent = 'ERR ×' + errs.length; copied = false; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(report).then(done, done);
    else {
      const ta = document.createElement('textarea');
      ta.value = report; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove(); done();
    }
  });
  return { count: () => errs.length };
})();

function scrollProgress() {
  const max = Math.max(1, root.scrollHeight - innerHeight);
  return clamp(scrollY / max, 0, 1);
}

/* ── persistence ─────────────────────────────────────────────── */
const store = {
  get(k, d) { try { const v = localStorage.getItem('glm1-' + k); return v === null ? d : v; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem('glm1-' + k, v); } catch (_) {} },
};
root.dataset.theme  = store.get('theme', 'dark');
root.dataset.accent = store.get('accent', 'cobalt');
history.scrollRestoration = 'scrollRestoration' in history ? 'manual' : 'auto';
scrollTo(0, 0);

const ACCENTS = ['cobalt', 'ice', 'violet', 'lime'];

/* ── grade — cheaper path on weak devices; motion is NEVER removed ─ */
(function grade() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lite = (coarse && cores <= 6) || cores <= 3 || mem <= 4 || innerWidth < 560;
  root.dataset.grade = lite ? 'lite' : 'full';
})();

/* ── toast ───────────────────────────────────────────────────── */
const toast = (() => {
  let el = null, t = 0;
  return (msg) => {
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(t);
    t = setTimeout(() => el.classList.remove('is-on'), 2400);
  };
})();

/* ── flash — the 1-frame retro hit ───────────────────────────── */
const flashEl = $('#flash');
function flash(op, ms) {
  flashEl.animate(
    [{ opacity: op || .13 }, { opacity: 0 }],
    { duration: ms || 130, easing: 'linear' }
  );
}

/* ── sound — synthesized, zero assets, off by default ────────── */
const Sound = (() => {
  let ctx = null, master = null, ambient = null, on = false;
  const ensure = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = .9;
    master.connect(ctx.destination);
  };
  const noise = (sec) => {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };
  const env = (g, t0, peak, dec) => {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + .008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec);
  };
  const api = {
    get on() { return on; },
    tick() {
      if (!on) return;
      ensure(); if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sine'; o.frequency.value = 1750;
      f.type = 'lowpass'; f.frequency.value = 3200;
      env(g, t, .05, .07);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + .09);
    },
    whoosh() {
      if (!on) return;
      ensure(); if (!ctx) return;
      const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noise(.32);
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 1.1;
      f.frequency.setValueAtTime(420, t);
      f.frequency.exponentialRampToValueAtTime(1500, t + .26);
      env(g, t, .05, .3);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t);
    },
    clap() {
      if (!on) return;
      ensure(); if (!ctx) return;
      const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noise(.06);
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 1100;
      env(g, t, .17, .07);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t);
      const o = ctx.createOscillator(), g2 = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(60, t + .12);
      env(g2, t, .2, .14);
      o.connect(g2); g2.connect(master);
      o.start(t); o.stop(t + .16);
    },
    ambientSet(state) {
      ensure(); if (!ctx) return;
      if (state) {
        if (ambient) return;
        const t = ctx.currentTime;
        const g = ctx.createGain(); g.gain.value = 0;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 850;
        const os = [[110, -4], [164.8, 3], [220.5, 6]].map(([hz, det]) => {
          const o = ctx.createOscillator();
          o.type = 'triangle'; o.frequency.value = hz; o.detune.value = det;
          o.connect(f); o.start(t);
          return o;
        });
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = .06; lg.gain.value = .011;
        lfo.connect(lg); lg.connect(g.gain); lfo.start(t);
        g.gain.linearRampToValueAtTime(.028, t + 2.2);
        f.connect(g); g.connect(master);
        ambient = { g, os, lfo };
      } else if (ambient) {
        const t = ctx.currentTime;
        ambient.g.gain.linearRampToValueAtTime(0.0001, t + .6);
        const dying = ambient;
        setTimeout(() => { dying.os.forEach(o => { try { o.stop(); } catch (_) {} }); try { dying.lfo.stop(); } catch (_) {} }, 700);
        ambient = null;
      }
    },
    setEnabled(v) {
      on = v;
      store.set('snd', v ? 'on' : 'off');
      if (v) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); api.ambientSet(true); api.tick(); }
      else api.ambientSet(false);
      const b = $('#sndBtn'), s = $('#sndState');
      if (b) b.setAttribute('aria-pressed', String(v));
      if (s) s.textContent = v ? 'on' : 'off';
    },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume()  { if (ctx && ctx.state === 'suspended') ctx.resume(); },
  };
  return api;
})();

/* ── boot — terminal roll + VHS stutter bar + shutter exit ───── */
const Boot = (() => {
  const boot = $('#boot'), term = $('#bootTerm'), fill = $('#bootFill'),
        pct = $('#bootPct'), msg = $('#bootMsg'), mark = $('#bootMark'),
        tc = $('#bootTc');
  const LINES = [
    '> cy.cutroom --roll',
    '> mounting layers .... ok',
    '> grading room · ' + root.dataset.accent,
    '> threading playhead .. locked',
  ];
  const MSGS = ['warming the room', 'threading the reel', 'jamming — vintage', 'ok — rolling'];
  let jams, order;
  const seed = () => {
    jams = [
      { at: rand(.28, .4), hold: 0 },
      { at: rand(.62, .78), hold: 0 },
    ];
    order = [0, 1, 2, 3];
    if (Math.random() < .5) { const t = order[2]; order[2] = order[3]; order[3] = t; }
  };
  let running = false;

  function typeLine(el, text, done) {
    el.classList.add('t-cursor');
    let i = 0;
    (function step() {
      if (!running) return;
      if (i >= text.length) { el.classList.remove('t-cursor'); done(); return; }
      const ch = text[i++];
      el.textContent += ch;
      const r = Math.random();
      let d = rand(13, 34);
      if (r < .1) d = rand(80, 190);            // believable pause
      else if (r < .16) { el.textContent += text[i++] || ''; d = rand(4, 9); } // frame-skip pop
      setTimeout(step, d);
    })();
  }

  function run(onExitStart) {
    running = true;
    seed();
    boot.classList.add('run');
    const t0 = performance.now();
    let jamUntil = 0;
    const jamAt = jams;

    // terminal — lines type in seeded order
    let li = 0;
    (function nextLine() {
      if (li >= order.length) return;
      const el = document.createElement('div');
      term.appendChild(el);
      const idx = order[li++];
      typeLine(el, LINES[idx], () => {
        el.innerHTML += ' <span class="t-ok">' + (idx === 3 ? '▸' : '✓') + '</span>';
        setTimeout(nextLine, rand(60, 160));
      });
    })();

    // stutter bar — struggle, jam, struggle, done (VHS truth)
    const DUR = 1650;
    (function barTick() {
      if (!running) return;
      const now = performance.now() - t0;
      const p = clamp(now / DUR, 0, 1);
      let shown = p * 100;
      for (const j of jams) {
        if (!j.hold && shown >= j.at * 100) j.hold = j.at * DUR + rand(120, 260);
        if (j.hold && now < j.hold) shown = j.at * 100 + rand(-.5, .5);
      }
      fill.style.width = clamp(shown, 0, 100) + '%';
      pct.textContent = Math.round(clamp(shown, 0, 100)) + '%';
      msg.textContent = MSGS[shown >= 90 ? 3 : shown >= 55 ? 2 : shown >= 20 ? 1 : 0];
      if (p < 1) setTimeout(barTick, 34);
      else finish();
    })();

    function finish() {
      pct.textContent = '100%'; msg.textContent = MSGS[3]; fill.style.width = '100%';
      setTimeout(() => {
        // anticipation handoff: the room starts forming behind the shutters,
        // THEN the door opens — reveal begins before the door finishes
        boot.classList.add('exit');
        if (onExitStart) onExitStart();
        setTimeout(() => { boot.remove(); running = false; body.classList.remove('is-booting'); onBootGone(); }, 680);
      }, 240);
    }

    // boot timecode
    (function bootTc() {
      if (!running && !boot.isConnected) return;
      const f = Math.floor(((performance.now() - t0) / 1000) * FPS) % FPS;
      const s = Math.floor((performance.now() - t0) / 1000);
      tc.textContent = '00:00:' + String(s).padStart(2, '0') + ':' + String(f).padStart(2, '0');
      if (boot.isConnected) requestAnimationFrame(bootTc);
    })();
  }
  return { run };
})();

function onBootGone() {
  Desk.measure();
}

/* ── cut activation — class-gated reveals, restart on re-entry ── */
const Cuts = (() => {
  let booting = true;
  const active = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const el = en.target;
      const id = el.id;
      if (en.isIntersecting && en.intersectionRatio >= .18) {
        if (booting) return;                    // cut 1 is handed off by the boot itself
        if (!active.has(id)) { active.add(id); el.classList.add('is-live'); Cuts.entered(el); }
      } else if (!en.isIntersecting) {
        if (active.has(id)) { active.delete(id); el.classList.remove('is-live'); Cuts.left(el); }
      }
    });
  }, { threshold: [0, .18, .55] });

  return {
    arm() { reels.forEach((el) => io.observe(el)); },
    openDoors() {
      booting = false;
      const first = $('#cut1');
      active.add(first.id); first.classList.add('is-live');
      Cuts.entered(first);
      reels.forEach((el) => { if (!active.has(el.id)) io.observe(el); });
    },
    isLive: (id) => active.has(id),
    entered(el) {
      if (el.id === 'cut2') Lab.play();
      if (el.id === 'cut5') Clapper.arm();
      Sound.whoosh();
    },
    left(el) {
      if (el.id === 'cut5') Clapper.disarm();
    },
    setBooting(v) { booting = v; },
  };
})();

/* ── the desk — rows, playhead, scrub, fold ──────────────────── */
const Desk = (() => {
  const desk = $('#desk'), rows = $('#deskRows'), ph = $('#playhead'),
        tc = $('#deskTc'), foldBtn = $('#deskFold');
  let trackL = 92, trackW = 300, maxScroll = 1, phX = 0, targetX = 0;
  let dragging = false, dragMoved = 0;

  function build() {
    reels.forEach((sec, i) => {
      const row = document.createElement('div');
      row.className = 'desk-row'; row.dataset.for = sec.id;
      const start = (i / reels.length) * 100, span = 100 / reels.length;
      row.innerHTML =
        '<span class="r-name">L' + (i + 1) + ' · ' + sec.dataset.cut.toLowerCase() + '</span>' +
        '<span class="r-track">' +
          '<i class="r-bar" style="left:' + start + '%;width:' + span + '%;opacity:' + (1 - i * .16) + '"></i>' +
          '<i class="r-kf" style="left:' + start + '%"></i>' +
          '<i class="r-kf" style="left:' + (start + span) + '%"></i>' +
          (i === 2 ? '<i class="r-kf" style="left:' + (start + span / 2) + '%"></i>' : '') +
        '</span>';
      rows.appendChild(row);
    });
    $$('.desk-row', rows).forEach((row) => {
      row.addEventListener('click', () => {
        if (dragMoved > 5) return;
        const sec = $('#' + row.dataset.for);
        scrollTo({ top: sec.offsetTop, behavior: 'smooth' });
        Sound.tick();
      });
    });
  }

  function measure() {
    maxScroll = Math.max(1, root.scrollHeight - innerHeight);
    const tr = $('.r-track', rows);
    if (tr) { trackL = tr.offsetLeft; trackW = tr.offsetWidth; }
    tops = reels.map((r) => r.offsetTop);
  }
  let tops = [];

  function setProgress(p) {
    targetX = trackL + p * trackW;
  }

  // drag anywhere on rows = scrub; plain click = handled by rows
  rows.addEventListener('pointerdown', (e) => {
    dragging = true; dragMoved = 0;
    rows.setPointerCapture(e.pointerId);
    root.classList.add('dragging');
  });
  rows.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = rows.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, trackL, trackL + trackW);
    dragMoved++;
    if (dragMoved > 3) {
      const p = (x - trackL) / Math.max(1, trackW);
      scrollTo({ top: p * maxScroll, behavior: 'auto' });
    }
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('dragging');
    try { rows.releasePointerCapture(e.pointerId); } catch (_) {}
    if (dragMoved > 5) Sound.tick();
  };
  rows.addEventListener('pointerup', endDrag);
  rows.addEventListener('pointercancel', endDrag);

  function fold(v, silent) {
    desk.classList.toggle('is-folded', v);
    foldBtn.setAttribute('aria-expanded', String(!v));
    foldBtn.textContent = v ? 'u — unfold' : 'u — fold';
    if (!silent) Sound.tick();
  }
  foldBtn.addEventListener('click', () => fold(!desk.classList.contains('is-folded')));

  function syncReadout(name, idx) {
    $('#cutReadout').textContent = 'CUT 0' + (idx + 1) + ' · ' + name;
    $$('.desk-row', rows).forEach((r, i) => r.classList.toggle('is-here', i === idx));
  }

  function frame(p, liveT) {
    // lerped playhead
    phX = lerp(phX, targetX, .17);
    if (Math.abs(phX - targetX) < .05) phX = targetX;
    ph.style.transform = 'translateX(' + phX.toFixed(2) + 'px)';
    // timecode @24fps
    const f = Math.round(p * TOTAL_FRAMES);
    const s = Math.floor(f / FPS), ff = f % FPS;
    tc.textContent = '00:00:' + String(s).padStart(2, '0') + ':' + String(ff).padStart(2, '0');
    const stamp = $('#frameStamp');
    if (stamp && stamp.textContent !== 'frame ' + String(f).padStart(4, '0')) {
      stamp.textContent = 'frame ' + String(f).padStart(4, '0');
    }
    // current cut readout — viewport center decides
    if (tops.length) {
      const probe = scrollY + innerHeight / 2;
      let idx = 0;
      for (let i = 0; i < tops.length; i++) if (probe >= tops[i]) idx = i;
      if (idx !== lastIdx) {
        lastIdx = idx;
        syncReadout(reels[idx].dataset.cut, idx);
      }
    }
  }
  let lastIdx = -1;

  return { build, measure, setProgress, fold, syncReadout, frame,
    isFolded: () => desk.classList.contains('is-folded') };
})();

/* ── the lab — easing tiles, curve dot, runner ────────────────── */
const Lab = (() => {
  const curve = $('#labCurve'), ball = $('#labBall'), runner = $('.lab-runner'),
        box = $('.lab-curvebox'), track = $('.lab-track'), tiles = $('#labTiles');
  let raf = 0, playing = false;

  function samplePath(u) {
    const len = curve.getTotalLength();
    const pt = curve.getPointAtLength(clamp(u, 0, 1) * len);
    const r = box.getBoundingClientRect();
    return { x: (pt.x / 120) * r.width, y: (pt.y / 100) * r.height };
  }
  function play() {
    clearTimeout(playT);
    playT = setTimeout(doPlay, 520);   // let the wipe land first — anticipation
  }
  function doPlay() {
    cancelAnimationFrame(raf);
    const t0 = performance.now(), D = 780;
    (function tick(now) {
      const u = clamp((now - t0) / D, 0, 1);
      const p = samplePath(u);
      ball.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) translate(-50%,-50%)';
      if (u < 1) raf = requestAnimationFrame(tick);
    })(t0);
    runRunner();
  }
  let playT = 0;
  function runRunner() {
    const w = track.getBoundingClientRect().width - 28;
    runner.classList.remove('is-land');
    runner.style.setProperty('--tx', '0px');
    const anim = runner.animate(
      [{ transform: 'translateX(0px)' }, { transform: 'translateX(' + w + 'px)' }],
      { duration: 820, easing: 'cubic-bezier(' + (tiles.querySelector('.is-on').dataset.bezier) + ')' }
    );
    anim.onfinish = () => {
      runner.style.setProperty('--tx', w + 'px');
      anim.cancel();
      runner.classList.add('is-land');
    };
  }
  tiles.addEventListener('click', (e) => {
    const t = e.target.closest('.lab-tile');
    if (!t) return;
    $$('.lab-tile', tiles).forEach((x) => x.classList.toggle('is-on', x === t));
    curve.setAttribute('d', CURVES[t.dataset.ease] || curve.getAttribute('d'));
    Sound.tick();
    play();
  });
  const CURVES = {
    power3: 'M4,96 C30,96 44,4 116,4',
    expo:   'M4,96 C14,96 20,4 116,4',
    back:   'M4,96 C28,102 42,-6 116,4',
    lin:    'M4,96 L116,4',
  };
  return { play };
})();

/* ── clapper — anticipation hold, slam, flash, snap ──────────── */
const Clapper = (() => {
  let t1 = 0, t2 = 0;
  return {
    arm() {
      this.disarm();
      t1 = setTimeout(() => { flash(.14, 120); Sound.clap(); }, 1310);
      t2 = setTimeout(() => {}, 10);
    },
    disarm() { clearTimeout(t1); clearTimeout(t2); },
  };
})();

/* ── bars — bass-reactive strip, procedural, no audio file ───── */
const Bars = (() => {
  const wrap = $('#bars');
  let n = 26;
  if (root.dataset.grade === 'lite') n = 14;
  const els = [];
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    wrap.appendChild(b); els.push(b);
  }
  function frame(t) {
    const beat = 60 / 140, phase = (t % beat) / beat;
    const kick = Math.exp(-7 * phase);
    for (let i = 0; i < n; i++) {
      const bass = kick * (1 - (i / n) * .7);
      const wob = .17 * (1 + Math.sin(t * (2.1 + (i % 5) * .7) + i * .55));
      const y = clamp(.12 + bass * .82 + wob, .08, 1);
      els[i].style.transform = 'scaleY(' + y.toFixed(3) + ')';
    }
  }
  return { frame };
})();

/* ── pointer parallax — subtle, fine pointers only ───────────── */
const Parallax = (() => {
  const els = $$('[data-px]');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  const fine = matchMedia('(pointer: fine)').matches && root.dataset.grade !== 'lite';
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - .5) * 2;
      ty = (e.clientY / innerHeight - .5) * 2;
      Cuts.hot();
    }, { passive: true });
  }
  function frame() {
    if (!fine || !els.length) return;
    cx = lerp(cx, tx, .06); cy = lerp(cy, ty, .06);
    for (const el of els) {
      const d = parseFloat(el.dataset.depth || 4);
      el.style.transform = 'translate3d(' + (cx * d).toFixed(2) + 'px,' + (cy * d).toFixed(2) + 'px,0)';
    }
  }
  return { frame };
})();

/* ── grid crosses + activity heat ────────────────────────────── */
const Heat = (() => {
  [['14%', '30%'], ['82%', '22%'], ['24%', '76%'], ['86%', '68%']].forEach(([x, y]) => {
    const c = document.createElement('i');
    c.className = 'grid-x';
    c.style.left = 'calc(' + x + ' - 7px)';
    c.style.top = 'calc(' + y + ' - 7px)';
    body.appendChild(c);
  });
  let t = 0;
  const warm = () => {
    root.classList.add('is-hot');
    clearTimeout(t);
    t = setTimeout(() => root.classList.remove('is-hot'), 1100);
  };
  ['scroll', 'pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, warm, { passive: true }));
  return { warm };
})();
Cuts.hot = Heat.warm;

/* ── topbar controls ─────────────────────────────────────────── */
$('#thmBtn').addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  store.set('theme', root.dataset.theme);
  $('#thmState').textContent = root.dataset.theme === 'dark' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', root.dataset.theme === 'dark' ? '#0a0e17' : '#f2f5fa');
  Sound.tick();
});
$('#accBtn').addEventListener('click', () => {
  const next = ACCENTS[(ACCENTS.indexOf(root.dataset.accent) + 1) % ACCENTS.length];
  root.dataset.accent = next;
  store.set('accent', next);
  $('#accState').textContent = next;
  Sound.tick();
});
$('#sndBtn').addEventListener('click', () => Sound.setEnabled(!Sound.on));
if (store.get('snd', 'off') === 'on') {
  // persisted on — but wait for a gesture (autoplay policy); first click anywhere wakes it
  const wake = () => { Sound.setEnabled(true); document.removeEventListener('pointerdown', wake); };
  document.addEventListener('pointerdown', wake, { once: true });
  $('#sndState').textContent = 'on';
  $('#sndBtn').setAttribute('aria-pressed', 'true');
}
$('#brandBtn').addEventListener('click', () => { scrollTo({ top: 0, behavior: 'smooth' }); Sound.tick(); });
[['#ctaSample', 'sample'], ['#ctaHi', 'hi']].forEach(([sel, key]) => {
  $(sel).addEventListener('click', (e) => {
    if (!CY_LINKS[key]) {
      e.preventDefault();
      toast('cy — wire your real link in app.js → CY_LINKS.' + key);
    }
  });
});

/* ── keyboard — U folds the desk, T theme, A accent, S sound ─── */
let typeBuf = '';
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'u') Desk.fold(!Desk.isFolded());
  else if (k === 't') $('#thmBtn').click();
  else if (k === 'a') $('#accBtn').click();
  else if (k === 's') $('#sndBtn').click();
  typeBuf = (typeBuf + k).slice(-2);
  if (typeBuf === 'cy') {
    typeBuf = '';
    flash(.1, 140);
    $('#accBtn').click();
    $('#footWhisper').textContent = 'you typed "cy", didn\u2019t you.';
    try { console.log('%c</Cy> — you found the hatch.', 'color:#6f9cf5;font-family:monospace;font-size:14px'); } catch (_) {}
  }
});

/* ── main loop — one rAF to rule them all ────────────────────── */
let rafId = 0, liveT0 = performance.now();
function loop(now) {
  rafId = requestAnimationFrame(loop);
  const t = (now - liveT0) / 1000;
  const p = scrollProgress();
  Desk.setProgress(p);
  Desk.frame(p, t);
  if (Cuts.isLive('cut1') && !document.hidden) Bars.frame(t);
  Parallax.frame();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(rafId); Sound.suspend(); }
  else { liveT0 = performance.now() - 0; rafId = requestAnimationFrame(loop); Sound.resume(); }
});
addEventListener('resize', () => Desk.measure(), { passive: true });

/* ── init ────────────────────────────────────────────────────── */
(function syncChrome() {
  $('#thmState').textContent = root.dataset.theme;
  $('#accState').textContent = root.dataset.accent;
  document.querySelector('meta[name="theme-color"]').setAttribute('content',
    root.dataset.theme === 'dark' ? '#0a0e17' : '#f2f5fa');
})();
Desk.build();
Desk.measure();
if (matchMedia('(max-width: 700px), (pointer: coarse)').matches) Desk.fold(true, true);
Cuts.arm();
Cuts.setBooting(true);
Boot.run(() => {
  // shutters start moving: the room begins forming behind them
  Cuts.openDoors();
});
rafId = requestAnimationFrame(loop);
