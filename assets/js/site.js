/* WeberQ site behaviour. No dependencies and no build step. */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const map01 = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  /* Runs `onFrame` only while `target` is on screen and the tab is visible. */
  function whileVisible(target, onFrame) {
    let visible = false;
    let raf = 0;
    const loop = (time) => {
      onFrame(time);
      raf = requestAnimationFrame(loop);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(target);
    document.addEventListener('visibilitychange', sync);
  }

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = $('[data-nav]');
    const toggle = $('[data-menu]');
    const sheet = $('[data-sheet]');
    const onScroll = () => nav.classList.toggle('is-stuck', scrollY > 12);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      sheet.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(sheet.hidden));
    $$('a', sheet).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    const links = $$('.nav-links a');
    const targets = links.map((a) => $(a.getAttribute('href')));
    const unlinked = [$('#top'), $('#contact')];
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a, i) => a.classList.toggle('is-on', targets[i] === entry.target));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.concat(unlinked).forEach((t) => spy.observe(t));
  }

  /* ---------- Reveal and counters ---------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Hero viewport ---------- */
  function initHero() {
    const vp = $('[data-vp]');
    if (!vp) return;
    const views = {
      board: { commands: ['PLACE', 'ROUTE', 'VIA', 'POUR', 'DRC'], note: '2 layers shown' },
      box: { commands: ['EXTRUDE', 'SHELL', 'FILLET', 'ASSEMBLE'], note: 'Drag to orbit' },
      app: { commands: ['INVOICE', 'POST', 'RECONCILE', 'REPORT'], note: 'Sample data' },
    };
    const tabMs = 9000;
    vp.style.setProperty('--tab-ms', tabMs + 'ms');

    const tabs = $$('[data-tab]', vp);
    const panes = $$('[data-pane]', vp);
    const cmd = $('[data-cmd]', vp);
    const note = $('[data-vp-note]', vp);
    const hud = $('[data-hud]', vp);
    const snap = $('[data-snap]', vp);
    let active = 'board';
    let pinned = reduced;
    let timer = 0;
    let cmdIndex = 0;

    const hooks = {
      board: initHeroBoard(vp),
      box: initHeroBox(vp),
      app: initHeroDash(vp),
    };
    if (pinned) vp.setAttribute('data-pinned', '');

    function show(name) {
      active = name;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
      panes.forEach((p) => {
        const on = p.dataset.pane === name;
        p.hidden = !on;
        requestAnimationFrame(() => p.classList.toggle('is-on', on));
      });
      hud.hidden = name !== 'board';
      snap.hidden = name !== 'board';
      note.textContent = views[name].note;
      cmdIndex = 0;
      cmd.textContent = views[name].commands[0];
      hooks[name]();
    }

    function schedule() {
      clearTimeout(timer);
      if (pinned) return;
      timer = setTimeout(() => {
        const i = tabs.findIndex((t) => t.dataset.tab === active);
        show(tabs[(i + 1) % tabs.length].dataset.tab);
        schedule();
      }, tabMs);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        pinned = true;
        vp.setAttribute('data-pinned', '');
        clearTimeout(timer);
        show(tab.dataset.tab);
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        next.click();
      });
    });

    if (!reduced) {
      setInterval(() => {
        if (document.hidden) return;
        const list = views[active].commands;
        cmdIndex = (cmdIndex + 1) % list.length;
        cmd.textContent = list[cmdIndex];
      }, 2200);
    }

    show('board');
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) schedule();
      else clearTimeout(timer);
    }).observe(vp);
  }

  function initHeroBoard(vp) {
    const svg = $('[data-hero-board]', vp);
    const host = svgEl('g', {}, svg);
    const board = WeberBoard.render(host, { id: 'hero' });
    const { W, H } = WeberBoard;

    const dims = svgEl('g', {}, svg);
    svgEl('path', { class: 'dim', d: `M0 -26H${W}M0 -32V-20M${W} -32V-20` }, dims);
    svgEl('text', { class: 'dim-text', x: W / 2, y: -11, 'text-anchor': 'middle' }, dims).textContent = '160.00';
    svgEl('path', { class: 'dim', d: `M${W + 26} 0V${H}M${W + 20} 0H${W + 32}M${W + 20} ${H}H${W + 32}` }, dims);
    svgEl('text', {
      class: 'dim-text', x: 0, y: 0, 'text-anchor': 'middle', transform: `translate(${W + 18} ${H / 2}) rotate(-90)`,
    }, dims).textContent = '110.00';

    /* Signals keep moving along the finished board. */
    const pulses = svgEl('g', {}, host);
    const pickNets = ['PW1', 'PW3', 'CANH', 'ISO', 'TX2', 'A2', 'B4'];
    pickNets.forEach((net, i) => {
      const item = board.groups.signal.find((t) => t.net === net && t.len > 60);
      if (!item) return;
      const path = svgEl('path', {
        class: 'b-pulse', d: item.node.getAttribute('d'), 'stroke-dasharray': `10 ${item.len + 10}`,
      }, pulses);
      path.style.setProperty('--len', item.len + 10);
      path.style.animationDelay = `${i * 0.37}s`;
      path.style.animationPlayState = 'paused';
    });
    const setPulses = (on) => $$('.b-pulse', pulses).forEach((p) => {
      p.style.animationPlayState = on ? 'running' : 'paused';
    });

    /* Live coordinates and component names under the pointer. */
    const hudX = $('[data-hud-x]', vp);
    const hudY = $('[data-hud-y]', vp);
    const snapLabel = $('[data-snap-label]', vp);
    svg.addEventListener('pointermove', (e) => {
      const m = svg.getScreenCTM();
      if (!m) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      hudX.textContent = clamp(pt.x / 4, 0, 160).toFixed(2);
      hudY.textContent = clamp(pt.y / 4, 0, 110).toFixed(2);
      const part = e.target.closest ? e.target.closest('[data-ref]') : null;
      snapLabel.textContent = part ? `${part.dataset.ref} ${part.dataset.label}` : 'Hover a component';
    });

    let raf = 0;
    return function play() {
      cancelAnimationFrame(raf);
      if (reduced) {
        board.seek(1);
        return;
      }
      setPulses(false);
      board.seek(0);
      const start = performance.now();
      const step = (now) => {
        const t = map01(now - start, 0, 3600);
        board.seek(t);
        if (t < 1) raf = requestAnimationFrame(step);
        else setPulses(true);
      };
      raf = requestAnimationFrame(step);
    };
  }

  function initHeroBox(vp) {
    const canvas = $('[data-hero-box]', vp);
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink-soft').trim();
    const blue = css.getPropertyValue('--accent').trim();
    const copper = css.getPropertyValue('--copper-ink').trim();

    /* An enclosure as polylines in mm: base, lid, board and hardware. `lift` is
       how far a part rises as the box opens. */
    const W = 170, D = 120, BASE = 38, LID = 20;
    const parts = [];
    const add = (pts, color, lift) => parts.push({ pts, color, lift });
    const loop = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]];
    const box = (x0, y0, x1, y1, z0, z1, color, lift) => {
      add(loop(x0, y0, x1, y1, z0), color, lift);
      add(loop(x0, y0, x1, y1, z1), color, lift);
      [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y]) => add([[x, y, z0], [x, y, z1]], color, lift));
    };
    const circleXY = (cx, cy, r, z, color, lift) => {
      const pts = [];
      for (let i = 0; i <= 18; i += 1) {
        const a = (i / 18) * Math.PI * 2;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
      }
      add(pts, color, lift);
    };
    const circleXZ = (cx, y, cz, r, color) => {
      const pts = [];
      for (let i = 0; i <= 18; i += 1) {
        const a = (i / 18) * Math.PI * 2;
        pts.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
      }
      add(pts, color, 0);
    };

    box(-W / 2, -D / 2, W / 2, D / 2, 0, BASE, ink, 0);
    add(loop(-W / 2 + 4, -D / 2 + 4, W / 2 - 4, D / 2 - 4, BASE), ink, 0);
    box(-W / 2, -D / 2, W / 2, D / 2, BASE, BASE + LID, blue, 1);
    for (let i = 0; i < 9; i += 1) {
      const x = -48 + i * 12;
      add([[x, -32, BASE + LID], [x, 32, BASE + LID]], blue, 1);
    }
    box(-62, -44, 62, 44, 12, 15, copper, 0);
    [[-60, 28], [-30, 28], [10, 16], [48, 26]].forEach(([x, y]) => box(x, y - 8, x + 12, y + 4, 15, 24, copper, 0));
    box(-14, -22, 14, 6, 15, 18, copper, 0);
    [[-78, -53], [78, -53], [78, 53], [-78, 53]].forEach(([x, y]) => {
      circleXY(x, y, 3.2, BASE + LID, blue, 1.5);
      add([[x, y, BASE + LID], [x, y, BASE + LID + 16]], blue, 1.5);
      circleXY(x, y, 3.2, BASE + LID + 16, blue, 1.5);
    });
    [-46, 0, 46].forEach((x) => circleXZ(x, D / 2, 19, 8, ink));

    let width = 0, height = 0, angle = -0.72, dragging = false, lastX = 0, velocity = 0;
    const tilt = 0.72;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(open) {
      if (!width) resize();
      if (!width) return;
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width / 300, height / 262);
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const project = (p, lift) => {
        const z = p[2] - 34 + lift * open;
        const x = p[0] * cos - p[1] * sin;
        const y = p[0] * sin + p[1] * cos;
        return [width / 2 + x * scale, height / 2 + 26 + (y * sinT - z * cosT) * scale, y * cosT + z * sinT];
      };
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const part of parts) {
        const points = part.pts.map((p) => project(p, part.lift * 46));
        const depth = points.reduce((sum, p) => sum + p[2], 0) / points.length;
        ctx.globalAlpha = clamp(0.62 + depth / 240, 0.22, 1);
        ctx.strokeStyle = part.color;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      velocity = (e.clientX - lastX) * 0.008;
      angle += velocity;
      lastX = e.clientX;
      if (reduced) draw(0.6);
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    addEventListener('resize', () => { width = 0; });

    if (!reduced) {
      whileVisible(canvas, (time) => {
        if (canvas.parentElement.hidden) return;
        if (!dragging) {
          velocity *= 0.94;
          angle += 0.0032 + velocity;
        }
        draw(ease(0.5 - 0.5 * Math.cos(time / 1900)));
      });
    }
    return () => {
      width = 0;
      requestAnimationFrame(() => draw(0.6));
    };
  }

  function initHeroDash(vp) {
    const line = $('[data-dash-line]', vp);
    const area = $('[data-dash-area]', vp);
    const tick = $('[data-dash-tick]', vp);
    const kpis = {
      sales: $('[data-kpi="sales"]', vp),
      invoices: $('[data-kpi="invoices"]', vp),
      due: $('[data-kpi="due"]', vp),
    };
    const rupees = (v) => '\u20B9' + Math.round(v).toLocaleString('en-IN');
    const state = { sales: 842600, invoices: 126, due: 194300, next: 1043 };
    const seed = (i) => 95 + Math.sin(i * 0.5) * 22 + Math.sin(i * 0.17) * 18 - i * 0.7;
    const series = Array.from({ length: 44 }, (_, i) => seed(i));
    let n = series.length;

    function paint() {
      const step = 480 / (series.length - 1);
      const pts = series.map((v, i) => `${(i * step).toFixed(1)} ${v.toFixed(1)}`);
      const d = 'M' + pts.join('L');
      line.setAttribute('d', d);
      area.setAttribute('d', `${d}L480 170L0 170Z`);
    }
    paint();

    /* Sample ERP activity: invoices raised and payments collected. */
    if (!reduced) {
      setInterval(() => {
        if (document.hidden || $('[data-pane="app"]', vp).hidden) return;
        const amount = Math.round((1800 + Math.random() * 16000) / 100) * 100;
        const invoice = Math.random() > 0.38;
        if (invoice) {
          state.sales += amount;
          state.invoices += 1;
          state.due += amount;
          tick.textContent = `Invoice INV-${state.next} raised, ${rupees(amount)}`;
          state.next += 1;
        } else {
          const paid = Math.min(amount, state.due);
          state.due -= paid;
          tick.textContent = `Payment received, ${rupees(paid)}`;
        }
        kpis.sales.textContent = rupees(state.sales);
        kpis.invoices.textContent = state.invoices.toLocaleString('en-IN');
        kpis.due.textContent = rupees(state.due);
        n += 1;
        series.shift();
        series.push(clamp(series[series.length - 1] + (invoice ? -1 : 1) * (amount / 1400) + Math.sin(n) * 3, 16, 158));
        paint();
      }, 1300);
    }
    return () => {};
  }

  /* ---------- Board to box, scrubbed by scroll ---------- */
  function initStage() {
    const wrap = $('[data-stage]');
    const svg = $('[data-stage-svg]');
    if (!wrap || !svg) return;

    const { W, H } = WeberBoard;
    const VW = 1000, VH = 680;
    const S = 0.6;
    const C = Math.cos(Math.PI / 6) * S;
    const N = Math.sin(Math.PI / 6) * S;
    const CY = 332;

    /* Isometric projection of a board-space point at height z. */
    const P = (x, y, z) => [
      VW / 2 + (x - W / 2) * C - (y - H / 2) * C,
      CY + (x - W / 2) * N + (y - H / 2) * N - (z || 0) * S,
    ];
    const poly = (pts) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');

    const FLAT = 1.26;
    const flat = [FLAT, 0, 0, FLAT, (VW - W * FLAT) / 2, (VH - H * FLAT) / 2];
    const origin = P(0, 0, 0);
    const iso = [C, N, -C, N, origin[0], origin[1]];
    const matrix = (t, dy) => {
      const m = flat.map((v, i) => v + (iso[i] - v) * t);
      m[5] += dy || 0;
      return `matrix(${m.map((v) => v.toFixed(4)).join(' ')})`;
    };

    /* Enclosure dimensions in board units, 1 unit = 0.25 mm. */
    const B = { x0: -22, y0: -22, x1: W + 22, y1: H + 22, wall: 12, bottom: -58, floor: -46, rim: 36, top: 72 };
    const ix0 = B.x0 + B.wall, iy0 = B.y0 + B.wall, ix1 = B.x1 - B.wall, iy1 = B.y1 - B.wall;

    const trayBack = svgEl('g', {}, svg);
    const boardHost = svgEl('g', {}, svg);
    const trayFront = svgEl('g', {}, svg);
    const gasket = svgEl('g', {}, svg);
    const lid = svgEl('g', {}, svg);
    const screws = svgEl('g', {}, svg);
    const labels = svgEl('g', {}, svg);
    const dims = svgEl('g', {}, svg);

    const face = (parent, cls, pts) => svgEl('polygon', { class: `${cls} box-edge`, points: poly(pts) }, parent);

    /* Inside of the tray, behind the board. */
    face(trayBack, 'box-floor', [P(ix0, iy0, B.floor), P(ix1, iy0, B.floor), P(ix1, iy1, B.floor), P(ix0, iy1, B.floor)]);
    face(trayBack, 'box-inner', [P(ix0, iy0, B.floor), P(ix1, iy0, B.floor), P(ix1, iy0, B.rim), P(ix0, iy0, B.rim)]);
    face(trayBack, 'box-right', [P(ix0, iy0, B.floor), P(ix0, iy1, B.floor), P(ix0, iy1, B.rim), P(ix0, iy0, B.rim)]);

    /* Outside of the tray, in front of the board. */
    face(trayFront, 'box-left', [P(B.x0, B.y1, B.bottom), P(B.x1, B.y1, B.bottom), P(B.x1, B.y1, B.rim), P(B.x0, B.y1, B.rim)]);
    face(trayFront, 'box-right', [P(B.x1, B.y0, B.bottom), P(B.x1, B.y1, B.bottom), P(B.x1, B.y1, B.rim), P(B.x1, B.y0, B.rim)]);
    const rimOuter = [P(B.x0, B.y0, B.rim), P(B.x1, B.y0, B.rim), P(B.x1, B.y1, B.rim), P(B.x0, B.y1, B.rim)];
    const rimInner = [P(ix0, iy0, B.rim), P(ix0, iy1, B.rim), P(ix1, iy1, B.rim), P(ix1, iy0, B.rim)];
    const ring = (pts) => 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z';
    svgEl('path', { class: 'box-top box-edge', 'fill-rule': 'evenodd', d: ring(rimOuter) + ring(rimInner) }, trayFront);

    /* Cable glands on the front face. Local x runs along the wall, y runs up. */
    const faceOrigin = P(B.x0, B.y1, 0);
    const glands = svgEl('g', { transform: `matrix(${C} ${N} 0 ${-S} ${faceOrigin[0]} ${faceOrigin[1]})` }, trayFront);
    [150, 342, 534].forEach((x) => {
      svgEl('circle', { class: 'box-gland', cx: x, cy: -12, r: 28 }, glands);
      svgEl('circle', { class: 'box-gland-in', cx: x, cy: -12, r: 14 }, glands);
    });

    const gx0 = (B.x0 + ix0) / 2, gy0 = (B.y0 + iy0) / 2, gx1 = (B.x1 + ix1) / 2, gy1 = (B.y1 + iy1) / 2;
    const gasketPts = [P(gx0, gy0, B.rim), P(gx1, gy0, B.rim), P(gx1, gy1, B.rim), P(gx0, gy1, B.rim)];
    const gasketPath = svgEl('path', { class: 'box-gasket', d: ring(gasketPts) }, gasket);
    const gasketLen = 2 * Math.hypot(gasketPts[1][0] - gasketPts[0][0], gasketPts[1][1] - gasketPts[0][1])
      + 2 * Math.hypot(gasketPts[2][0] - gasketPts[1][0], gasketPts[2][1] - gasketPts[1][1]);
    gasketPath.setAttribute('stroke-dasharray', gasketLen);

    /* Lid */
    face(lid, 'box-left', [P(B.x0, B.y1, B.rim + 2), P(B.x1, B.y1, B.rim + 2), P(B.x1, B.y1, B.top), P(B.x0, B.y1, B.top)]);
    face(lid, 'box-right', [P(B.x1, B.y0, B.rim + 2), P(B.x1, B.y1, B.rim + 2), P(B.x1, B.y1, B.top), P(B.x1, B.y0, B.top)]);
    face(lid, 'box-top', [P(B.x0, B.y0, B.top), P(B.x1, B.y0, B.top), P(B.x1, B.y1, B.top), P(B.x0, B.y1, B.top)]);
    const topOrigin = P(0, 0, B.top);
    const lidTop = svgEl('g', { transform: `matrix(${C} ${N} ${-C} ${N} ${topOrigin[0]} ${topOrigin[1]})` }, lid);
    for (let x = 60; x <= 330; x += 30) svgEl('line', { class: 'box-fin', x1: x, y1: 70, x2: x, y2: 370 }, lidTop);
    svgEl('text', { class: 'box-logo', x: 440, y: 240 }, lidTop).textContent = 'WeberQ';

    const screwNodes = [[B.x0 + 26, B.y0 + 26], [B.x1 - 26, B.y0 + 26], [B.x1 - 26, B.y1 - 26], [B.x0 + 26, B.y1 - 26]].map(([x, y]) => {
      const g = svgEl('g', {}, screws);
      const [cx, cy] = P(x, y, B.top);
      svgEl('ellipse', { class: 'box-screw', cx, cy, rx: 10, ry: 5.8 }, g);
      return g;
    });

    /* Board */
    const board = WeberBoard.render(boardHost, { id: 'stage' });
    const layers = board.layers;
    const plates = [layers.back, layers.front, layers.silk].map((layer) => {
      const plate = svgEl('rect', { class: 'iso-plate', x: 0, y: 0, width: W, height: H, rx: 14 });
      layer.insertBefore(plate, layer.firstChild);
      return plate;
    });

    /* Layer callouts for the exploded view */
    const offsets = { silk: -138, front: -46, substrate: 46, back: 138 };
    const names = [['silk', 'Silkscreen'], ['front', 'Top copper'], ['substrate', 'Core'], ['back', 'Bottom copper']];
    const corner = P(0, H, 0);
    names.forEach(([key, name]) => {
      const y = corner[1] + offsets[key];
      svgEl('path', { class: 'leader', d: `M${corner[0] - 8} ${y}H${corner[0] - 46}` }, labels);
      svgEl('text', { class: 'leader-text', x: corner[0] - 54, y: y + 5, 'text-anchor': 'end' }, labels).textContent = name;
    });

    /* Overall dimensions, in mm, on the closed box */
    const dimPath = (a, b, out) => {
      const ax = a[0] + out[0], ay = a[1] + out[1], bx = b[0] + out[0], by = b[1] + out[1];
      const node = svgEl('path', {
        class: 'dim', d: `M${a[0]} ${a[1]}L${ax} ${ay}M${b[0]} ${b[1]}L${bx} ${by}M${ax} ${ay}L${bx} ${by}`,
      }, dims);
      const len = Math.hypot(bx - ax, by - ay) + 2 * Math.hypot(out[0], out[1]);
      node.setAttribute('stroke-dasharray', len);
      node.setAttribute('data-len', len);
      return { node, mid: [(ax + bx) / 2, (ay + by) / 2] };
    };
    const dimX = dimPath(P(B.x0, B.y1, B.bottom), P(B.x1, B.y1, B.bottom), [-16, 28]);
    const dimY = dimPath(P(B.x1, B.y1, B.bottom), P(B.x1, B.y0, B.bottom), [16, 28]);
    const mm = (u) => `${(u * 0.25).toFixed(0)} mm`;
    const text = (at, dy, value) => {
      const node = svgEl('text', { class: 'dim-text', x: at.mid[0], y: at.mid[1] + dy, 'text-anchor': 'middle' }, dims);
      node.textContent = value;
      return node;
    };
    const dimTexts = [text(dimX, 22, mm(B.x1 - B.x0)), text(dimY, 22, mm(B.y1 - B.y0))];

    /* ---------- Timeline ---------- */
    const steps = $$('[data-steps] li');
    const marks = [0, 0.15, 0.3, 0.44, 0.56, 0.74];
    const commands = ['PLACE', 'ROUTE POWER', 'ROUTE SIGNALS', 'POUR', 'EXPORT', 'ASSEMBLE'];
    const chips = ['PLACE', 'POWER', 'SIGNAL', 'COPPER', 'LAYERS', 'ENCLOSURE'];
    const cmd = $('[data-stage-cmd]');
    const chip = $('[data-stage-chip]');
    const pct = $('[data-stage-pct]');
    let lastStep = -1;
    let lastSeek = -1;
    let backFirst = false;

    const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };

    function apply(p) {
      /* Build the board up to the end of the copper stage. */
      const seekP = clamp(
        p < marks[1] ? map01(p, 0, marks[1]) * 0.26
          : p < marks[2] ? 0.26 + map01(p, marks[1], marks[2]) * 0.24
            : p < marks[3] ? 0.5 + map01(p, marks[2], marks[3]) * 0.28
              : 0.78 + map01(p, marks[3], marks[4]) * 0.22,
        0, 1,
      );
      if (seekP !== lastSeek) {
        board.seek(seekP);
        lastSeek = seekP;
      }

      const tilt = ease(map01(p, 0.56, 0.635));
      const spread = ease(map01(p, 0.615, 0.7)) * (1 - ease(map01(p, 0.75, 0.81)));
      const tray = ease(map01(p, 0.775, 0.85));
      const seal = ease(map01(p, 0.845, 0.885));
      const close = ease(map01(p, 0.875, 0.94));
      const fasten = map01(p, 0.93, 0.975);
      const dimT = map01(p, 0.965, 1);

      layers.substrate.setAttribute('transform', matrix(tilt, offsets.substrate * spread));
      layers.back.setAttribute('transform', matrix(tilt, offsets.back * spread));
      layers.front.setAttribute('transform', matrix(tilt, offsets.front * spread));
      layers.silk.setAttribute('transform', matrix(tilt, offsets.silk * spread));

      /* Physically, B.Cu sits under the core; flat on screen it shows through. */
      const wantBackFirst = spread > 0.02;
      if (wantBackFirst !== backFirst) {
        backFirst = wantBackFirst;
        boardHost.insertBefore(backFirst ? layers.back : layers.substrate, backFirst ? layers.substrate : layers.back);
      }

      plates.forEach((plate) => { plate.style.opacity = spread; });
      layers.silk.classList.toggle('is-exploded', spread > 0.02);
      board.pourWrap.style.opacity = 1 - spread;
      board.body.style.fillOpacity = 1 - 0.7 * spread;
      labels.style.opacity = map01(spread, 0.65, 1);

      const trayY = (1 - tray) * 300;
      trayBack.setAttribute('transform', `translate(0 ${trayY})`);
      trayFront.setAttribute('transform', `translate(0 ${trayY})`);
      trayBack.style.opacity = tray;
      trayFront.style.opacity = tray;
      show(trayBack, tray > 0);
      show(trayFront, tray > 0);

      gasketPath.setAttribute('stroke-dashoffset', gasketLen * (1 - seal));
      gasket.style.opacity = close > 0.99 ? 0 : seal > 0 ? 1 : 0;

      lid.setAttribute('transform', `translate(0 ${-(1 - close) * 250})`);
      lid.style.opacity = map01(close, 0, 0.25);
      show(lid, close > 0);

      screwNodes.forEach((node, i) => {
        const local = ease(map01(fasten, i * 0.16, 0.5 + i * 0.16));
        node.setAttribute('transform', `translate(0 ${-(1 - local) * 110})`);
        node.style.opacity = map01(local, 0, 0.3);
      });
      show(screws, fasten > 0);

      $$('[data-len]', dims).forEach((node) => {
        node.setAttribute('stroke-dashoffset', Number(node.dataset.len) * (1 - dimT));
      });
      dimTexts.forEach((node) => { node.style.opacity = map01(dimT, 0.7, 1); });
      show(dims, dimT > 0);

      let step = 0;
      marks.forEach((mark, i) => { if (p >= mark) step = i; });
      if (step !== lastStep) {
        lastStep = step;
        steps.forEach((li, i) => li.classList.toggle('is-on', i === step));
        cmd.textContent = commands[step];
        chip.textContent = chips[step];
      }
      pct.textContent = Math.round(p * 100);
    }

    if (reduced) {
      wrap.classList.add('is-static');
      apply(1);
      return;
    }

    /* A phone held sideways is too short to pin the sheet and read the steps. */
    const tooShort = () => innerHeight < 520;

    let ticking = false;
    const update = () => {
      ticking = false;
      wrap.classList.toggle('is-static', tooShort());
      if (tooShort()) {
        apply(1);
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const span = rect.height - innerHeight;
      apply(span > 0 ? clamp(-rect.top / span, 0, 1) : 1);
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    update();
  }

  /* ---------- Scope console ---------- */
  const JOBS = {
    custom: {
      slug: 'custom-pcb',
      type: 'PCB design',
      need: 'What the board must do, supply and power levels, inputs and outputs, interfaces, size and mounting limits, target standards.',
      get: 'Schematic, PCB layout, design calculations, BOM, Gerbers, assembly drawings and a 3D STEP model.',
    },
    automation: {
      slug: 'automation-or-iot-board',
      type: 'PCB design',
      need: 'The machine or process it controls, sensors and actuators, connectivity, processor preference, supply voltage, enclosure limits.',
      get: 'Schematic, PCB layout, BOM, Gerbers, assembly drawings, a 3D STEP model and firmware if you need it.',
    },
    bms: {
      slug: 'bms',
      type: 'PCB design',
      need: 'Cell chemistry, series and parallel count, pack current, balancing method, communication bus, safety targets.',
      get: 'Schematic, PCB layout, design calculations, BOM, Gerbers, assembly drawings and a 3D STEP model.',
    },
    mechanical: {
      slug: 'enclosure-or-mechanism',
      type: 'Mechanical design',
      need: 'What it holds or moves, dimensions and loads, indoor or outdoor use, mounting, quantity and preferred manufacturing process.',
      get: '3D CAD, 2D manufacturing drawings, DXF flat patterns, BOM, exploded views and renders.',
    },
    erp: {
      slug: 'erp',
      type: 'ERP',
      need: 'What you sell and bill, how accounts are kept today, branches and users, existing software and records to move.',
      get: 'An ERP set up for how your organisation works, with your records moved in and your team trained.',
    },
    software: {
      slug: 'software-or-app',
      type: 'Software or app',
      need: 'What users must be able to do, platforms, data sources, integrations, login and payment needs, expected users.',
      get: 'Web, Android or iOS software, backend and APIs, source code and deployment.',
    },
  };

  function initScope() {
    const list = $('[data-scope-list]');
    const out = $('[data-scope-out]');
    const cta = $('[data-scope-cta]');
    if (!list || !out) return;
    const buttons = $$('button', list);
    const typeField = $('[data-brief-type]');
    const msgField = $('[data-brief-msg]');
    let current = 'custom';
    let run = 0;

    function typeInto(node, value, id) {
      return new Promise((resolve) => {
        if (reduced) {
          node.textContent = value;
          resolve();
          return;
        }
        let i = 0;
        const tick = () => {
          if (id !== run) return;
          i += 3;
          node.textContent = value.slice(0, i);
          if (i < value.length) setTimeout(tick, 12);
          else resolve();
        };
        tick();
      });
    }

    async function select(key) {
      current = key;
      const job = JOBS[key];
      const id = ++run;
      buttons.forEach((b) => {
        const on = b.dataset.job === key;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      out.innerHTML = '';
      const line = (cls) => {
        const p = document.createElement('p');
        if (cls) p.className = cls;
        out.appendChild(p);
        return p;
      };
      const cmdLine = line('scope-cmd');
      cmdLine.innerHTML = '<i>$</i> ';
      const cmdText = document.createElement('span');
      cmdLine.appendChild(cmdText);
      await typeInto(cmdText, `scope ${job.slug}`, id);
      if (id !== run) return;
      line('scope-label').textContent = 'We need';
      await typeInto(line(), job.need, id);
      if (id !== run) return;
      line('scope-label').textContent = 'You get';
      await typeInto(line(), job.get, id);
    }

    buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.job)));

    cta.addEventListener('click', () => {
      const job = JOBS[current];
      const label = $(`[data-job="${current}"]`, list).textContent;
      typeField.value = job.type;
      if (!msgField.value.trim()) {
        msgField.value = `Project: ${label}\n\nDetails we have so far:\n`
          + job.need.replace(/\.$/, '').split(', ')
            .map((item) => `- ${item.charAt(0).toUpperCase()}${item.slice(1)}: `).join('\n');
      }
      setTimeout(() => $('input[name="name"]').focus({ preventScroll: true }), 650);
    });
  }

  /* ---------- Brief form. GitHub Pages has no backend, so FormSubmit relays
     the brief to our inbox. If that fails, or the relay is not activated yet,
     the visitor gets the same brief ready to send by email. ---------- */
  function initBrief() {
    const form = $('[data-brief]');
    if (!form) return;
    const TO = 'samachar@weberq.in';
    // Public access key from web3forms.com (it only lets the form email TO).
    const WEB3FORMS_KEY = 'a72a3e46-831b-4b14-81e0-f3ba7d2262b4';
    // Tried in order until one delivers; if none does, the brief is handed
    // back to the visitor to send by email.
    const RELAYS = [
      WEB3FORMS_KEY && {
        url: 'https://api.web3forms.com/submit',
        body: (b) => ({
          access_key: WEB3FORMS_KEY,
          subject: b.subject,
          from_name: 'weberq.in',
          name: b.name,
          email: b.email,
          ...(b.company && { company: b.company }),
          project_type: b.type,
          message: b.message,
        }),
      },
      {
        url: `https://formsubmit.co/ajax/${TO}`,
        body: (b) => ({
          name: b.name,
          email: b.email,
          ...(b.company && { company: b.company }),
          project_type: b.type,
          message: b.message,
          _subject: b.subject,
          _replyto: b.email,
          _template: 'table',
        }),
      },
    ].filter(Boolean);
    const TIMEOUT = 10000;

    async function relay(r, brief) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
      try {
        const res = await fetch(r.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(r.body(brief)),
          signal: ctrl.signal,
        });
        const reply = await res.json().catch(() => ({}));
        if (!res.ok || String(reply.success) !== 'true' || /activat/i.test(reply.message || '')) {
          throw new Error(reply.message || `HTTP ${res.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    const error = $('[data-brief-error]', form);
    const sent = $('[data-brief-sent]', form);
    const fallback = $('[data-brief-fallback]', form);
    const send = $('[data-brief-send]', form);
    const mailto = $('[data-brief-mailto]', form);
    const gmail = $('[data-brief-gmail]', form);
    const copy = $('[data-brief-copy]', form);
    const sendLabel = send.innerHTML;
    const required = ['name', 'email', 'message'];
    let lastBody = '';

    form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const value = (k) => String(data.get(k) || '').trim();
      const invalid = required.filter((k) => !value(k) || !form.elements[k].checkValidity());
      required.forEach((k) => {
        if (invalid.includes(k)) form.elements[k].setAttribute('aria-invalid', 'true');
      });
      if (invalid.length) {
        error.textContent = invalid.includes('email') && value('email')
          ? 'That email address does not look right.'
          : 'Please fill in your name, email and what you are building.';
        error.hidden = false;
        form.elements[invalid[0]].focus();
        return;
      }
      error.hidden = true;
      sent.hidden = true;
      fallback.hidden = true;

      const company = value('company');
      const subject = `Project brief: ${value('type')}${company ? ` (${company})` : ''}`;
      lastBody = [value('message'), '', '--', value('name'), company, value('email')]
        .filter((line, i) => line || i < 3).join('\n');

      // A filled honeypot means a bot: look done, send nothing.
      if (value('_honey')) {
        sent.hidden = false;
        form.reset();
        return;
      }

      const brief = {
        name: value('name'), email: value('email'), company,
        type: value('type'), message: value('message'), subject,
      };
      send.disabled = true;
      send.textContent = 'Sending...';
      try {
        let delivered = false;
        for (const r of RELAYS) {
          try {
            await relay(r, brief);
            delivered = true;
            break;
          } catch { /* try the next relay */ }
        }
        if (!delivered) throw new Error('no relay delivered');
        sent.hidden = false;
        form.reset();
      } catch {
        const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastBody)}`;
        mailto.href = `mailto:${TO}?${query}`;
        gmail.href = `https://mail.google.com/mail/?view=cm&to=${TO}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastBody)}`;
        copy.textContent = 'Copy the brief';
        fallback.hidden = false;
      } finally {
        send.disabled = false;
        send.innerHTML = sendLabel;
      }
    });

    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`To: ${TO}\n\n${lastBody}`);
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = `Send it to ${TO}`;
      }
    });
  }

  function init() {
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    initNav();
    initReveal();
    initHero();
    initStage();
    initScope();
    initBrief();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
