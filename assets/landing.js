// asahi landing: pointer parallax, the sun cursor, the sun toggle, the opening book, turning cards, small jokes.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
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

  // the book: it follows the pointer, opens when pressed, then you step inside
  const book = $('.b3');
  if (book) {
    const go = book.dataset.href;
    if (fine && !calm()) {
      book.addEventListener('pointermove', (e) => {
        const r = book.getBoundingClientRect();
        book.style.setProperty('--rx', ((e.clientX - r.left) / r.width - .5) * 50);
        book.style.setProperty('--ry', ((e.clientY - r.top) / r.height - .5) * 30);
        book.classList.add('live');
      });
      book.addEventListener('pointerleave', () => { book.classList.remove('live'); book.style.removeProperty('--rx'); book.style.removeProperty('--ry'); });
    }
    book.addEventListener('click', () => {
      if (book.classList.contains('open')) return;
      book.classList.add('open', 'live');
      if (calm()) { location.href = go; return; }
      setTimeout(() => document.body.classList.add('leaving'), 1500);
      setTimeout(() => { location.href = go; }, 2100);
    });
  }
  // the lede link takes the same way in
  $$('[data-enter]').forEach((a) => a.addEventListener('click', (e) => {
    if (calm() || e.metaKey || e.ctrlKey || e.shiftKey || !book) return;
    e.preventDefault(); book.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => book.click(), 700);
  }));

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
