// "the things we learn to carry", a disguised memoir by asahi.
// The manuscript (book/the_things_we_learn_to_carry.md) is split on its `##` headings and rendered as written;
// nothing in it is edited. Everything around it (cover, contents, film, colophon) is the book's own furniture.
// Large media never live in git: the film is read from book.FILM_URL, the audio from assets/book/ or book.AUDIO_URL.
import fs from 'node:fs';
import { Marked } from 'marked';
import { esc, problem } from './util.mjs';
export let BASE = '';
export const setBase = (b) => { BASE = b; };
const U = (p) => BASE + p;

export const MS = 'book/the_things_we_learn_to_carry.md';
const A = '/assets/book/';
export const FILES = { cover: A + 'cover.jpg', poster: A + 'poster.jpg', og: A + 'thumbnail.png', vtt: A + 'the_things_we_learn_to_carry.vtt', mp3: A + 'the_things_we_learn_to_carry_audiobook.mp3' };

// [id, label, title, audio timestamp]; the order matches the manuscript's twelve `##` sections
const TOC = [
  ['prologue', 'prologue', 'a boy who thought the world was small', '0:15'],
  ['i', 'i', 'the year the telephone became frightening', '2:45'],
  ['ii', 'ii', 'the boy everyone had already decided to become', '5:28'],
  ['iii', 'iii', 'the university that was chosen for him', '7:58'],
  ['iv', 'iv', 'the woman who used to sit beside him', '11:42'],
  ['v', 'v', 'the forty-six days', '14:10'],
  ['vi', 'vi', 'the people in the same house', '16:40'],
  ['vii', 'vii', 'the grandmother and the boy she remembered', '19:16'],
  ['viii', 'viii', 'the rock', '21:08'],
  ['ix', 'ix', 'the future he was trying to build', '24:15'],
  ['x', 'x', 'at least one of us', '26:29'],
  ['epilogue', 'epilogue', 'the shore', '28:51'],
];
const secs = (s) => s.split(':').reduce((a, b) => a * 60 + +b, 0);
const exists = (u) => fs.existsSync('.' + u);

export const TITLE = 'the things we learn to carry', SUB = 'a disguised memoir', PEN = 'asahi';
export const FRAME = 'a personal book about grief. narrated by the author.';
// two lines from the closing pages, verbatim (set in lowercase by the stylesheet)
const EXCERPT = ['He did not know what he was.', 'He only knew that he was still rowing.'];

const md = new Marked();

export function loadBook(cfg) {
  if (!fs.existsSync(MS)) { console.warn(`book: ${MS} not found, so the book section is skipped.`); return null; }
  const raw = fs.readFileSync(MS, 'utf8').replace(/\r\n/g, '\n');
  const parts = raw.split(/^## .*$/m).slice(1);
  if (parts.length !== TOC.length) problem(MS, `expected ${TOC.length} "##" sections (prologue, i to x, epilogue) and found ${parts.length}`);
  const chapters = TOC.map(([id, label, title, ts], i) => {
    const body = (parts[i] || '').trim();
    return { id, label, title, ts, t: secs(ts), html: md.parse(body), text: body.replace(/[*_]/g, '').replace(/\s+/g, ' ') };
  });
  const b = cfg.book || {};
  const film = parseFilm(String(b.FILM_URL || '').trim());
  const audio = String(b.AUDIO_URL || '').trim() || (exists(FILES.mp3) ? U(FILES.mp3) : '');
  if (!film.kind) console.warn('book: FILM_URL is empty in config.json, so the film shows "coming soon".');
  if (!audio) console.warn(`book: no audio (drop ${FILES.mp3} in, or set AUDIO_URL), so the player is hidden.`);
  const vtt = exists(FILES.vtt) ? U(FILES.vtt) : '';
  if (!vtt) console.warn(`book: ${FILES.vtt} is missing, so read-along and captions are off.`);
  return { chapters, film, audio, vtt, cover: exists(FILES.cover), poster: exists(FILES.poster) ? U(FILES.poster) : exists(FILES.og) ? U(FILES.og) : '', og: exists(FILES.og) ? U(FILES.og) : '', date: String(b.date || '2026-11-06'), url: U('/') };
}

// FILM_URL: a YouTube or Vimeo link (embedded privacy-friendly) or a direct mp4 URL; empty means "coming soon"
export function parseFilm(u) {
  if (!u) return { kind: '' };
  let m = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: 'youtube', id: m[1] };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { kind: 'vimeo', id: m[1] };
  return { kind: 'mp4', src: u };
}

// ───────── home: a closed book resting on the page ─────────
export const homeBlock = (bk) => {
  const cover = bk.cover ? `<img src="${FILES.cover}" alt="" width="410" height="590" loading="lazy" decoding="async">` : '';
  const face = `<div class="bk-cv">${cover}<span class="bk-cv-t">${esc(TITLE)}</span><span class="bk-cv-a">${PEN}</span></div>`;
  return `<section class="wrap sec bkh-sec" id="book" aria-labelledby="bkh-t">
<h2 class="sec-h rv" id="bkh-t"><span class="jp" aria-hidden="true">書</span>${esc(TITLE)}<small>${SUB} · ${PEN} · 2026</small></h2>
<div class="bkh rv">
<a class="bkh-obj" href="/book/" aria-label="open the book: ${esc(TITLE)}, ${SUB} by ${PEN}">
<span class="bk3d" aria-hidden="true">
<span class="bk3d-f">${face}</span><span class="bk3d-s"><b>${esc(TITLE)} — ${PEN}</b></span><span class="bk3d-p"></span><span class="bk3d-t"></span><span class="bk3d-k"></span>
</span></a>
<div class="bkh-copy">
<blockquote class="bkh-q"><p>${EXCERPT.map((l) => `<span>${esc(l)}</span>`).join('')}</p></blockquote>
<p class="bkh-links"><a href="/book/">open the book →</a><a href="/book/#film">watch the film ↗</a><a href="/book/#listen">listen ↗</a></p>
</div></div></section>`;
};

// ───────── the book page ─────────
const chip = (t) => `<span class="t">${t}</span>`;
const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 2.5v11l9-5.5z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';

export function filmBox(bk) {
  const f = bk.film, poster = bk.poster ? `<img src="${bk.poster}" alt="" width="1280" height="720" loading="lazy" decoding="async">` : '';
  if (f.kind === 'mp4') {
    return `<div class="film-box" data-kind="mp4"><video controls preload="none" playsinline${bk.poster ? ` poster="${bk.poster}"` : ''}><source src="${esc(f.src)}" type="video/mp4">${bk.vtt ? `<track kind="captions" srclang="en" label="english" src="${bk.vtt}">` : ''}<p>your browser can't play this video. <a href="${esc(f.src)}">open the file</a></p></video></div>`;
  }
  if (f.kind) {
    const href = f.kind === 'youtube' ? `https://www.youtube.com/watch?v=${f.id}` : `https://vimeo.com/${f.id}`;
    return `<div class="film-box" data-kind="${f.kind}" data-id="${f.id}"><a class="film-go" href="${href}" rel="noopener" aria-label="play the film">${poster}<span class="film-pl">${playIcon}</span></a></div>`;
  }
  return `<div class="film-box soon" data-kind="">${poster}<p class="film-soon"><span>the film</span>coming soon</p></div>`;
}

export function bookPage(bk) {
  const C = bk.chapters, hasFilm = !!bk.film.kind, hasAudio = !!bk.audio;
  const tocRows = C.map((c) => `<li><a class="toc-a" href="#${c.id}">${chip(c.ts)}<span class="nm">${esc(c.label)}</span><span class="d">${esc(c.title)}</span></a>${hasAudio ? `<button type="button" class="ch-play" data-t="${c.t}" aria-label="play ${esc(c.label)} from ${c.ts}">${playIcon}</button>` : ''}</li>`).join('');
  const filmRows = C.map((c) => `<li><button type="button" class="fc" data-t="${c.t}"${hasFilm ? '' : ' disabled'}>${chip(c.ts)}<span class="nm">${esc(c.label)}</span><span class="d">${esc(c.title)}</span></button></li>`).join('');
  const chapters = C.map((c, i) => `<section class="ch" id="${c.id}" data-ch="${i}" data-t="${c.t}" data-k="c${i}" aria-labelledby="${c.id}-h">
<header class="ch-h"><h2 id="${c.id}-h"><span class="lbl">${esc(c.label)}</span><span class="sr"> — </span><span class="ttl">${esc(c.title)}</span></h2>${hasAudio ? `<button type="button" class="ch-listen" data-t="${c.t}" aria-label="listen to ${esc(c.label)} from ${c.ts}">${playIcon}<span>listen · ${c.ts}</span></button>` : ''}</header>
<div class="prose">${c.html}</div></section>`).join('\n');
  const cfg = { audio: bk.audio, vtt: bk.vtt, film: bk.film, title: TITLE, pen: PEN, cover: bk.cover ? U(FILES.cover) : '' };
  return `<div class="wrap bk-top"><p class="bk-frame">${FRAME}</p></div>
<div class="bk" id="bk" data-mode="scroll" data-cfg="${esc(JSON.stringify(cfg))}">
<div class="bk-bar"><button type="button" id="bk-mode" aria-pressed="false">scroll mode</button><span class="bk-pos" id="bk-pos" aria-hidden="true"></span><span class="bk-jump"><a href="#contents">contents</a><a href="#film">the film</a>${hasAudio ? '<a href="#listen">listen</a>' : ''}</span></div>
<div class="bk-stage" id="bk-stage">
<button type="button" class="bk-turn prev" id="bk-prev" aria-label="previous page" hidden><svg viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2L2 10l8 8"/></svg></button>
<div class="bk-view" id="bk-view"><div class="bk-flow" id="bk-flow" aria-live="off">
<div class="pg blank" aria-hidden="true"></div>
<section class="pg cover" id="cover" data-k="cover" aria-label="cover"><div class="cvr">${bk.cover ? `<img src="${U(FILES.cover)}" alt="" width="410" height="590">` : ''}<div class="cv-t"><h1>${esc(TITLE)}</h1><p class="cv-s">${SUB}</p></div><p class="cv-a">${PEN}</p></div></section>
<div class="pg endpaper" data-k="endpaper" aria-hidden="true"></div>
<section class="pg title" id="title" data-k="title" aria-label="title page"><div class="tp"><p class="tp-t">${esc(TITLE)}</p><p class="tp-s">${SUB}</p><i class="tp-r"></i><p class="tp-a">${PEN}</p><p class="tp-y">2026</p></div></section>
<section class="pg film" id="film" data-k="film" aria-labelledby="film-h"><div class="pg-in"><h2 class="pg-h" id="film-h">the film</h2>${filmBox(bk)}<p class="film-n">the film and the audiobook share one timeline, so the chapter times below are the same.</p></div></section>
<section class="pg filmch" data-k="filmch" aria-labelledby="filmch-h"><div class="pg-in"><h3 class="pg-h" id="filmch-h">chapters of the film</h3><ol class="film-ch">${filmRows}</ol></div></section>
<section class="pg contents" id="contents" data-k="contents" aria-labelledby="toc-h"><div class="pg-in"><h2 class="pg-h" id="toc-h">contents</h2><ol class="toc-l">${tocRows}</ol>${hasAudio ? '<p class="toc-n" id="listen-n">the narration is built into the book: press play beside any chapter.</p>' : ''}</div></section>
${chapters}
<section class="pg colophon" id="colophon" data-k="colophon" aria-labelledby="col-h"><div class="pg-in"><h2 class="pg-h" id="col-h">colophon</h2>
<p>written &amp; narrated by ${PEN}</p><p>film &amp; book design: ${PEN}</p>
<p>music: schumann · beethoven · mozart · debussy (public-domain compositions; score encodings from the dcml corpora, cc by-nc-sa 4.0)</p>
<p class="col-y">2026</p><p class="col-j jp" lang="ja">諸行無常</p><p><button type="button" class="col-back" data-go="cover">back to the cover</button></p></div></section>
<div class="pg endpaper back" data-k="end" aria-hidden="true"></div>
</div></div>
<button type="button" class="bk-turn next" id="bk-next" aria-label="next page" hidden><svg viewBox="0 0 12 20" aria-hidden="true"><path d="M2 2l8 8-8 8"/></svg></button>
<div class="bk-run" id="bk-run" aria-hidden="true"><span class="rl"></span><span class="rr"></span><span class="fl"></span><span class="fr"></span></div>
</div>
<p class="sr" id="bk-status" role="status"></p>
</div>
${hasAudio ? `<aside class="bk-player" id="bk-player" aria-label="audiobook" hidden>
<input class="bp-seek" type="range" min="0" max="1974" step="1" value="0" aria-label="narration position">
<div class="bp-row">
<button type="button" class="bp-b bp-back" aria-label="back 15 seconds">−15</button>
<button type="button" class="bp-play" aria-label="play" data-play="${esc(playIcon)}" data-pause="${esc(pauseIcon)}">${playIcon}</button>
<button type="button" class="bp-b bp-fwd" aria-label="forward 15 seconds">+15</button>
<span class="bp-info"><span class="bp-ch">prologue</span><span class="bp-time">0:00</span></span>
<button type="button" class="bp-b bp-rate" aria-label="playback speed">1×</button>
<button type="button" class="bp-b bp-ra" aria-pressed="false"${bk.vtt ? '' : ' hidden'}>read along</button>
</div>
<audio preload="none" src="${esc(bk.audio)}"></audio>
</aside>` : ''}`;
}

export const searchItems = (bk) => [
  { title: `${TITLE} — ${SUB}`, url: '/book/', kind: 'book', desc: `${FRAME} ${PEN}`, tags: ['book', 'memoir', PEN] },
  { title: 'the film', url: '/book/#film', kind: 'book', desc: `${TITLE} · film`, tags: ['video'] },
  { title: 'contents', url: '/book/#contents', kind: 'book', desc: `${TITLE} · contents`, tags: [] },
  ...bk.chapters.map((c) => ({ title: `${c.label} — ${c.title}`, url: `/book/#${c.id}`, kind: 'book chapter', desc: `${TITLE} · ${c.ts}`, tags: ['book', 'chapter', PEN] })),
  { title: 'colophon', url: '/book/#colophon', kind: 'book', desc: `${TITLE} · credits`, tags: [] },
];
