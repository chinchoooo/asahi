// the book reader (/book/ only)
// The page is plain semantic HTML first (scroll mode). This script lays the same HTML out as pages: CSS columns,
// one column = one page, two pages per view on wide screens. Narration, read-along and the film hang off the same markup.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const bk = $('#bk'); if (!bk) return;
  const root = document.documentElement;
  let cfg = {}; try { cfg = JSON.parse(bk.dataset.cfg); } catch (e) {}
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('motion-ok');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };

  // reader state survives reloads: where you were, how far the narration got, and your switches
  const KEY = 'book.v1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const keep = (patch) => { Object.assign(saved, patch); try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} };

  const stage = $('#bk-stage'), view = $('#bk-view'), flow = $('#bk-flow'), prevB = $('#bk-prev'), nextB = $('#bk-next');
  const modeB = $('#bk-mode'), posEl = $('#bk-pos'), status = $('#bk-status'), run = $('#bk-run');
  const [rl, rr, fl, fr] = ['.rl', '.rr', '.fl', '.fr'].map((s) => $(s, run));
  const chapters = $$('.ch', flow).map((el, i) => ({ el, i, id: el.id, t: +el.dataset.t, label: $('.lbl', el).textContent, title: $('.ttl', el).textContent, words: [] }));
  const keyEls = [];
  $$('.ch', flow).forEach((ch, i) => $$('.prose p', ch).forEach((p, j) => { p.dataset.k = `c${i}.${j}`; }));
  $$('[data-k]', flow).forEach((el) => keyEls.push(el));
  const byKey = (k) => keyEls.find((el) => el.dataset.k === k);

  // ───────── paged layout ─────────
  const S = { mode: 'scroll', n: 2, pw: 0, ph: 0, gap: 0, stride: 1, total: 1, cur: 0, secs: [], nudged: false };
  // page of an element, measured from rects so positioned descendants and the flow's own transform don't matter
  const pageOf = (el) => { const r = el.getClientRects()[0] || el.getBoundingClientRect(); return Math.max(0, Math.floor((r.left - flow.getBoundingClientRect().left + 2) / S.stride)); };
  const keyNow = () => { for (const el of keyEls) if (pageOf(el) >= S.cur) return el.dataset.k; return keyEls[0].dataset.k; };

  function measure() {
    const W = stage.clientWidth;
    S.n = W >= 900 ? 2 : 1;
    const padX = S.n === 2 ? 48 : W < 480 ? 30 : 40;
    S.gap = S.n === 2 ? 96 : 0;
    S.pw = Math.min(580, Math.floor((W - 2 * padX - (S.n - 1) * S.gap) / S.n));
    S.ph = clamp(innerHeight - 280, 420, 760);
    S.stride = S.pw + S.gap;
    const v = S.n * S.pw + (S.n - 1) * S.gap;
    const set = (k, x) => bk.style.setProperty(k, x + 'px');
    set('--padX', padX); set('--pw', S.pw); set('--ph', S.ph); set('--gap', S.gap); set('--vw', v);
    bk.dataset.n = S.n;
    S.total = Math.max(1, Math.round((flow.scrollWidth + S.gap) / S.stride));
    S.secs = $$(':scope > [data-k]', flow).map((el) => ({ el, k: el.dataset.k, page: pageOf(el), ch: /^c\d+$/.test(el.dataset.k) ? +el.dataset.k.slice(1) : -1 }));
  }

  function chrome() {
    const folio0 = (S.secs.find((s) => s.ch === 0) || { page: 0 }).page;
    const secAt = (i) => { let r = null; for (const s of S.secs) if (s.page <= i) r = s; return r; };
    const info = (i) => {
      if (i < 0 || i >= S.total) return { head: '', foot: '', sec: null };
      const s = secAt(i), isCh = s && s.ch >= 0;
      return { sec: s, head: isCh && i !== s.page ? chapters[s.ch].title : '', foot: isCh ? String(i - folio0 + 1) : '', isCh };
    };
    const a = info(S.cur), b = info(S.cur + 1);
    if (S.n === 2) {
      rl.textContent = a.isCh && a.head ? 'asahi' : ''; rr.textContent = b.head;
      fl.textContent = a.foot; fr.textContent = b.foot;
    } else {
      rl.textContent = a.head ? 'asahi' : ''; rr.textContent = a.head; fl.textContent = ''; fr.textContent = a.foot;
    }
    const useB = S.n === 2 && b.sec && b.sec.page === S.cur + 1, s = useB ? b.sec : a.sec || b.sec, foot = useB ? b.foot : a.foot || b.foot, nm = { cover: 'cover', endpaper: 'endpaper', end: 'endpaper', title: 'title page', film: 'the film', filmch: 'the film', contents: 'contents', colophon: 'colophon' };
    posEl.textContent = s ? (s.ch >= 0 ? `${chapters[s.ch].label} · p. ${foot || ''}`.replace(/ · p\. $/, '') : nm[s.k] || '') : '';
  }

  function show(p, o = {}) {
    if (S.mode !== 'paged') return;
    p = clamp(p, 0, S.total - 1);
    if (S.n === 2) p -= p % 2;
    const old = S.cur; S.cur = p;
    const shift = S.n === 2 ? (p === 0 ? -S.stride / 2 : p >= S.total - 1 ? S.stride / 2 : 0) : 0;
    const move = !o.instant && !calm() && p !== old;
    flow.classList.toggle('snap', !move);
    flow.style.transform = `translate3d(${-p * S.stride + shift}px,0,0)`;
    bk.classList.toggle('single', shift !== 0);
    if (move) {
      view.classList.remove('turn-n', 'turn-p'); void view.offsetWidth;
      view.classList.add(p > old ? 'turn-n' : 'turn-p');
      clearTimeout(S.tt); S.tt = setTimeout(() => view.classList.remove('turn-n', 'turn-p'), 520);
    }
    prevB.disabled = p <= 0; nextB.disabled = p + S.n >= S.total;
    chrome();
    if (o.user) { status.textContent = `page ${p + 1}${S.n === 2 && p + 2 <= S.total ? ' and ' + (p + 2) : ''} of ${S.total}`; nudge(); }
    if (!o.noSave) keep({ loc: keyNow() });
  }
  // after the first manual turn, bring the whole book into view once
  function nudge() {
    if (S.nudged) return; S.nudged = true;
    const r = stage.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight - 70) scrollTo({ top: scrollY + r.top - 64, behavior: calm() ? 'auto' : 'smooth' });
  }
  const goKey = (k, o) => { const el = byKey(k); if (el) show(pageOf(el), o); };

  function relayout(key) {
    if (S.mode !== 'paged') return;
    key = key || keyNow();
    flow.classList.add('snap');
    measure();
    const el = byKey(key);
    show(el ? pageOf(el) : 0, { instant: true, noSave: true });
  }

  function setMode(m, o = {}) {
    const key = S.mode === 'paged' ? keyNow() : null;
    S.mode = m; bk.dataset.mode = m;
    modeB.setAttribute('aria-pressed', String(m === 'scroll'));
    [prevB, nextB].forEach((b) => (b.hidden = m !== 'paged'));
    if (m === 'paged') {
      flow.style.transform = '';
      measure();
      const k = o.key || saved.loc;
      const el = k && byKey(k);
      show(el ? pageOf(el) : 0, { instant: true, noSave: true });
    } else {
      flow.style.transform = ''; bk.classList.remove('single');
      ['--padX', '--pw', '--ph', '--gap', '--vw'].forEach((p) => bk.style.removeProperty(p));
      const el = key && byKey(key);
      if (el && o.scroll !== false) el.scrollIntoView({ block: 'start' });
    }
    if (!o.init) keep({ mode: m });
  }

  // ───────── turning pages: click, keys, swipe, links, focus ─────────
  prevB.addEventListener('click', () => show(S.cur - S.n, { user: true }));
  nextB.addEventListener('click', () => show(S.cur + S.n, { user: true }));
  modeB.addEventListener('click', () => setMode(S.mode === 'paged' ? 'scroll' : 'paged'));
  addEventListener('keydown', (e) => {
    if (S.mode !== 'paged' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/INPUT|TEXTAREA|SELECT|VIDEO|AUDIO/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
    const pal = $('.pal'); if (pal && !pal.hidden) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') show(S.cur + S.n, { user: true });
    else if (k === 'ArrowLeft' || k === 'PageUp') show(S.cur - S.n, { user: true });
    else if (k === 'Home') show(0, { user: true });
    else if (k === 'End') show(S.total, { user: true });
    else return;
    e.preventDefault();
  });
  let sw = null;
  view.addEventListener('pointerdown', (e) => { sw = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  view.addEventListener('pointerup', (e) => {
    if (!sw || S.mode !== 'paged') return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y; const quick = e.timeStamp - sw.t < 900; sw = null;
    if (quick && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(S.cur + (dx < 0 ? S.n : -S.n), { user: true });
  });
  view.addEventListener('pointercancel', () => { sw = null; });
  view.addEventListener('scroll', () => { view.scrollLeft = 0; view.scrollTop = 0; });
  flow.addEventListener('focusin', (e) => {
    if (S.mode !== 'paged') return;
    const p = pageOf(e.target); if (p < S.cur || p >= S.cur + S.n) show(p);
    view.scrollLeft = 0;
  });
  bk.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]'); if (go) { goKey(go.dataset.go, { user: true }); return; }
    const a = e.target.closest('a[href^="#"]'); if (!a || S.mode !== 'paged') return;
    e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); goHash(true);
  });
  function goHash(user) {
    const id = decodeURIComponent(location.hash.slice(1)); if (!id) return false;
    if (id === 'listen') {
      const to = $('#contents'); if (S.mode === 'paged' && to) show(pageOf(to), { user });
      const pl = $('#bk-player'); if (pl && !pl.hidden) $('.bp-play', pl).focus({ preventScroll: true });
      return true;
    }
    const el = document.getElementById(id); if (!el || !flow.contains(el)) return false;
    if (S.mode === 'paged') show(pageOf(el), { user }); else el.scrollIntoView({ block: 'start' });
    return true;
  }
  addEventListener('hashchange', () => goHash(true));
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => relayout(), 140); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => relayout());

  // ───────── the bookmark: narration ─────────
  const player = $('#bk-player'), audio = player && $('audio', player);
  const A = { ra: false, cues: [], ready: null, active: -1, lastPage: -1, rates: [1, 1.25, 1.5, 0.75], ri: 0, saveAt: 0, pend: 0 };
  const film = $('.film-box'), video = film && $('video', film);
  let syncUI = () => {};
  if (audio) {
    player.hidden = false;
    const seek = $('.bp-seek', player), playB = $('.bp-play', player), chEl = $('.bp-ch', player), timeEl = $('.bp-time', player), rateB = $('.bp-rate', player), raB = $('.bp-ra', player);
    const ICON = { play: playB.dataset.play, pause: playB.dataset.pause };
    const dur = () => (isFinite(audio.duration) && audio.duration > 0 ? audio.duration : +seek.max || 1974);
    const chAt = (t) => { let c = chapters[0]; for (const x of chapters) if (t >= x.t - 0.5) c = x; return c; };
    const label = () => (audio.paused ? 'play' : 'pause');
    A.ri = Math.max(0, A.rates.indexOf(saved.rate || 1));
    audio.defaultPlaybackRate = audio.playbackRate = A.rates[A.ri]; rateB.textContent = A.rates[A.ri] + '×';
    const t0 = +saved.t > 0 ? +saved.t : 0;
    if (t0) { A.pend = t0; try { audio.currentTime = t0; } catch (e) {} }

    syncUI = () => {
      const t = A.pend && audio.paused && !audio.currentTime ? A.pend : audio.currentTime, d = dur();
      seek.max = d; seek.value = t; seek.style.setProperty('--p', (t / d * 100) + '%');
      timeEl.textContent = `${fmt(t)} / ${fmt(d)}`;
      const c = chAt(t); chEl.textContent = `${c.label} — ${c.title}`;
      seek.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(d)}, ${c.label}`);
      if (performance.now() - A.saveAt > 2000) { A.saveAt = performance.now(); keep({ t }); }
      if (A.ra) follow(t);
    };
    const setPlayIcon = () => { playB.innerHTML = audio.paused ? ICON.play : ICON.pause; playB.setAttribute('aria-label', label()); };
    let raf = 0;
    const tick = () => { raf = 0; syncUI(); if (!audio.paused) raf = requestAnimationFrame(tick); };
    audio.addEventListener('play', () => { setPlayIcon(); if (video) video.pause(); if (!raf) raf = requestAnimationFrame(tick); });
    audio.addEventListener('pause', () => { setPlayIcon(); syncUI(); keep({ t: audio.currentTime }); });
    audio.addEventListener('ended', () => { setPlayIcon(); keep({ t: 0 }); });
    audio.addEventListener('timeupdate', () => { if (audio.paused) syncUI(); });
    audio.addEventListener('loadedmetadata', () => { if (A.pend && !audio.currentTime) audio.currentTime = A.pend; A.pend = 0; syncUI(); });
    audio.addEventListener('error', () => { chEl.textContent = 'the narration could not be loaded'; });

    const skip = (d) => { A.pend = 0; A.lastPage = -1; audio.currentTime = clamp(audio.currentTime + d, 0, dur()); syncUI(); };
    const playFrom = (t) => {
      A.pend = 0; A.lastPage = -1;
      try { audio.currentTime = t; } catch (e) {}
      audio.play().catch(() => {}); syncUI();
    };
    playB.addEventListener('click', () => { if (audio.paused) { A.pend = 0; audio.play().catch(() => {}); } else audio.pause(); });
    $('.bp-back', player).addEventListener('click', () => skip(-15));
    $('.bp-fwd', player).addEventListener('click', () => skip(15));
    seek.addEventListener('input', () => { A.pend = 0; A.lastPage = -1; try { audio.currentTime = +seek.value; } catch (e) {} syncUI(); });
    rateB.addEventListener('click', () => { A.ri = (A.ri + 1) % A.rates.length; audio.playbackRate = audio.defaultPlaybackRate = A.rates[A.ri]; rateB.textContent = A.rates[A.ri] + '×'; keep({ rate: A.rates[A.ri] }); });
    bk.addEventListener('click', (e) => { const b = e.target.closest('.ch-play,.ch-listen'); if (b) playFrom(+b.dataset.t); });
    player.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target === document.body) e.preventDefault(); });

    // read-along: highlight the narrated line, and turn the page when the narration reaches the next one
    const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const ts = (x) => x.replace(',', '.').split(':').map(parseFloat).reduce((a, b) => a * 60 + b, 0);
    const parseVTT = (txt) => txt.replace(/\r/g, '').split(/\n\n+/).map((b) => {
      const L = b.split('\n'), i = L.findIndex((l) => l.includes('-->')); if (i < 0) return null;
      const m = L[i].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/); if (!m) return null;
      return { s: ts(m[1]), e: ts(m[2]), text: L.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').trim() };
    }).filter(Boolean).sort((a, b) => a.s - b.s);
    function wrap() {
      for (const ch of chapters) {
        if (ch.words.length) continue;
        const w = document.createTreeWalker($('.prose', ch.el), NodeFilter.SHOW_TEXT), nodes = [];
        while (w.nextNode()) nodes.push(w.currentNode);
        for (const node of nodes) {
          const parts = node.nodeValue.split(/(\S+\s*)/); if (parts.length < 2) continue;
          const frag = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/\S/.test(part)) { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s); ch.words.push(s); } else frag.append(part);
          }
          node.replaceWith(frag);
        }
        ch.tok = []; ch.idx = [];
        ch.words.forEach((s, i) => { const n = norm(s.textContent); if (n) { ch.tok.push(n); ch.idx.push(i); } });
      }
    }
    function align() {
      const ptr = chapters.map(() => 0);
      for (const cue of A.cues) {
        let ci = 0; chapters.forEach((c, i) => { if (cue.s >= c.t - 0.5) ci = i; });
        const ch = chapters[ci], toks = cue.text.split(/\s+/).map(norm).filter(Boolean), k = toks.length;
        cue.ch = ci; cue.a = cue.b = -1;
        if (!k) continue;
        const probe = Math.min(k, 3), win = k < 3 ? 12 : 90;
        let found = -1;
        for (let d = 0; d <= win && found < 0; d++) {
          const p = ptr[ci] + d; if (p >= ch.tok.length) break;
          let miss = 0; for (let j = 0; j < probe; j++) if (ch.tok[p + j] !== toks[j]) miss++;
          if (miss === 0 || (probe >= 3 && miss <= 1 && d <= 8)) found = p;
        }
        if (found < 0) continue;
        const end = Math.min(ch.tok.length - 1, found + k - 1);
        cue.a = ch.idx[found]; cue.b = ch.idx[end]; ptr[ci] = end + 1;
      }
    }
    function prepare() {
      if (A.ready) return A.ready;
      A.ready = fetch(cfg.vtt).then((r) => r.text()).then((txt) => {
        A.cues = parseVTT(txt); const key = S.mode === 'paged' ? keyNow() : null;
        wrap(); align(); if (key) relayout(key);
      }).catch(() => { A.ready = null; raB.hidden = true; });
      return A.ready;
    }
    function follow(t) {
      if (!A.cues.length) return;
      let lo = 0, hi = A.cues.length - 1, f = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (A.cues[m].s <= t) { f = m; lo = m + 1; } else hi = m - 1; }
      if (f >= 0 && t > A.cues[f].e + 1.2) f = -1;
      if (f === A.active) return;
      const mark = (i, on) => { const c = A.cues[i]; if (!c || c.a < 0) return; const w = chapters[c.ch].words; for (let j = c.a; j <= c.b; j++) w[j].classList.toggle('on', on); };
      mark(A.active, false); A.active = f; mark(f, true);
      const c = A.cues[f]; if (!c || c.a < 0) return;
      const el = chapters[c.ch].words[c.a];
      if (S.mode === 'paged') {
        const p = pageOf(el);
        if (p !== A.lastPage) { A.lastPage = p; if (p < S.cur || p >= S.cur + S.n) show(p); }
      } else {
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > innerHeight - 130) el.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
      }
    }
    const setRA = (on) => {
      A.ra = on; raB.setAttribute('aria-pressed', String(on)); keep({ ra: on });
      if (on) { prepare().then(() => { A.lastPage = -1; A.active = -1; syncUI(); }); }
      else { $$('.w.on', flow).forEach((w) => w.classList.remove('on')); A.active = -1; }
    };
    raB.addEventListener('click', () => setRA(!A.ra));
    if (saved.ra && cfg.vtt) setRA(true);

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: cfg.title, artist: cfg.pen, album: 'a disguised memoir', artwork: cfg.cover ? [{ src: cfg.cover, sizes: '410x590', type: 'image/jpeg' }] : [] });
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
        navigator.mediaSession.setActionHandler('seekforward', () => skip(15));
      } catch (e) {}
    }
    setPlayIcon(); syncUI();
  }

  // ───────── the film ─────────
  if (film) {
    const kind = film.dataset.kind, id = film.dataset.id;
    const embed = (t) => {
      const src = kind === 'youtube'
        ? `https://www.youtube-nocookie.com/embed/${id}?start=${Math.floor(t)}&autoplay=1&rel=0&cc_load_policy=1&playsinline=1`
        : `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1#t=${Math.floor(t)}s`;
      let f = $('iframe', film);
      if (!f) { f = document.createElement('iframe'); f.title = `${cfg.title}, the film`; f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); const g = $('.film-go', film); if (g) g.remove(); film.append(f); }
      f.src = src;
      if (audio) audio.pause();
    };
    const go = $('.film-go', film);
    if (go) go.addEventListener('click', (e) => { e.preventDefault(); embed(0); });
    if (video) video.addEventListener('play', () => { if (audio) audio.pause(); });
    $$('.fc').forEach((b) => b.addEventListener('click', () => {
      const t = +b.dataset.t;
      if (kind === 'mp4' && video) { if (audio) audio.pause(); video.currentTime = t; video.play().catch(() => {}); }
      else if (kind) embed(t);
    }));
  }

  // ───────── open ─────────
  const wantPaged = saved.mode !== 'scroll';
  const hashKey = (() => { const id = decodeURIComponent(location.hash.slice(1)); const el = id && document.getElementById(id); return el && flow.contains(el) && el.dataset.k ? el.dataset.k : ''; })();
  if (wantPaged) {
    setMode('paged', { init: true, key: hashKey });
    if (location.hash) { goHash(false); requestAnimationFrame(() => scrollTo({ top: Math.max(0, scrollY + stage.getBoundingClientRect().top - 64) })); }
  } else {
    setMode('scroll', { init: true, scroll: false });
    modeB.setAttribute('aria-pressed', 'true');
  }
})();
