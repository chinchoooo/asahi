// asahi landing: pointer parallax, the sun cursor, the sun toggle, a book that opens as you scroll, a curtain into the reader, turning cards.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hero = $('.hero');

  // pointer parallax for the hero, eased; the portrait and scene lean toward you
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08;
    hero.style.setProperty('--x', cx.toFixed(3)); hero.style.setProperty('--y', cy.toFixed(3));
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .002 ? requestAnimationFrame(loop) : 0;
  };
  if (!calm()) addEventListener('pointermove', (e) => {
    if (scrollY > innerHeight) return;
    tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  // the cursor is a small sun
  if (fine && !calm()) {
    const cur = $('.cur');
    root.classList.add('cursor');
    addEventListener('pointermove', (e) => { cur.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`; }, { passive: true });
    document.addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a,button,.thing')));
  }

  // press the sun: night / dawn
  const sun = $('.sun');
  try { if (localStorage.getItem('asahi.dawn') === '1') { root.classList.add('dawn'); sun.setAttribute('aria-pressed', 'true'); } } catch (e) {}
  sun.addEventListener('click', () => {
    const on = root.classList.toggle('dawn');
    sun.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('asahi.dawn', on ? '1' : '0'); } catch (e) {}
  });

  // reading progress, and the book that opens as the page scrolls past it
  const prog = $('.prog'), story = $('.story'), beats = $$('.beat');
  const scrub = () => {
    const max = root.scrollHeight - innerHeight;
    prog.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (!story || calm()) return;
    const r = story.getBoundingClientRect(), span = story.offsetHeight - innerHeight;
    const p = clamp(-r.top / span, 0, 1);
    story.style.setProperty('--o', clamp((p - .1) / .5, 0, 1).toFixed(3));
    const b = p < .24 ? 0 : p < .58 ? 1 : 2;
    beats.forEach((el, i) => el.classList.toggle('on', i === b));
  };
  addEventListener('scroll', () => requestAnimationFrame(scrub), { passive: true });
  addEventListener('resize', scrub);
  if (calm()) story && story.style.setProperty('--o', '.7');
  scrub();

  // the book also leans toward the pointer
  const book = $('.b3');
  if (book && fine && !calm()) {
    book.addEventListener('pointermove', (e) => {
      const r = book.getBoundingClientRect();
      book.style.setProperty('--rx', ((e.clientX - r.left) / r.width - .5) * 30);
      book.style.setProperty('--ry', ((e.clientY - r.top) / r.height - .5) * 20);
    });
    book.addEventListener('pointerleave', () => { book.style.removeProperty('--rx'); book.style.removeProperty('--ry'); });
  }

  // entering the book: a peach circle grows from where you pressed, then the reader's sun shrinks away
  let going = false;
  const enter = (href, x, y) => {
    if (going) return; going = true;
    if (calm()) { location.href = href; return; }
    const v = document.createElement('div'); v.className = 'veil';
    v.style.setProperty('--vx', x + 'px'); v.style.setProperty('--vy', y + 'px');
    document.body.append(v); void v.offsetWidth; v.classList.add('go');
    setTimeout(() => { location.href = href; }, 900);
  };
  $$('[data-enter]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault(); enter(a.href, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
  }));
  if (book) book.addEventListener('click', (e) => enter(book.dataset.href, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2));
  addEventListener('pageshow', (e) => { if (e.persisted) { going = false; $$('.veil').forEach((v) => v.remove()); } });

  // things on the desk: hover turns them; touch turns them with a tap
  $$('.thing').forEach((t) => {
    const b = $('.turn', t);
    b.addEventListener('click', () => { const on = t.classList.toggle('on'); b.setAttribute('aria-pressed', String(on)); });
  });

  // small jokes
  const title = document.title;
  document.addEventListener('visibilitychange', () => { document.title = document.hidden ? 'still here…' : title; });
  console.log('%c朝日', 'font-size:28px', '\nhello. there is nothing hidden in here. the sun is clickable, though.');
})();
