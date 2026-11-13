// "the things we learn to carry", a disguised memoir by asahi.
// The manuscript (book/the_things_we_learn_to_carry.md) is split on its `##` headings and rendered as written;
// nothing in it is edited. Everything around it (cover, contents, film, colophon) is the book's own furniture.
// Large media never live in git: the film is read from book.FILM_URL, the audio from assets/book/ or book.AUDIO_URL.
import fs from 'node:fs';
import { Marked } from 'marked';
import { esc, problem, pic } from './util.mjs';
export let BASE = '';
export const setBase = (b) => { BASE = b; };
const U = (p) => BASE + p;

export const MS = 'book/the_things_we_learn_to_carry.md';
const A = '/assets/book/';
export const FILES = { cover: A + 'cover.jpg', poster: A + 'poster.jpg', og: A + 'thumbnail.png', vtt: A + 'the_things_we_learn_to_carry.vtt', mp3: A + 'the_things_we_learn_to_carry_audiobook.mp3' };

// Everything about the chapters is read from the manuscript: each `## Prologue: …`, `## Chapter IV: …`, `## Epilogue: …`
// heading gives an id, a label and a title. Chapter start times come from aligning each chapter's first words with
// the captions (.vtt); the narration's length comes from the mp3 header. Nothing here is kept by hand.
const exists = (u) => fs.existsSync('.' + u);
export const clock = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const lower = (s) => s.trim().toLowerCase();

function heading(h, i) {
  const m = h.match(/^(?:chapter\s+)?([ivxlcdm]+|\d+)\s*[:.—–-]\s*(.+)$/i);
  if (m) return { id: m[1].toLowerCase(), label: m[1].toLowerCase(), title: lower(m[2]) };
  const n = h.match(/^([^:]+):\s*(.+)$/);
  if (n) return { id: norm(n[1]) || `ch${i}`, label: lower(n[1]), title: lower(n[2]) };
  return { id: norm(h).slice(0, 24) || `ch${i}`, label: String(i + 1), title: lower(h) };
}

export function parseVTT(txt) {
  const ts = (x) => x.replace(',', '.').split(':').map(parseFloat).reduce((a, b) => a * 60 + b, 0);
  return txt.replace(/\r/g, '').split(/\n\n+/).map((b) => {
    const L = b.split('\n'), i = L.findIndex((l) => l.includes('-->')); if (i < 0) return null;
    const m = L[i].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/); if (!m) return null;
    return { s: ts(m[1]), e: ts(m[2]), text: L.slice(i + 1).join(' ').replace(/<[^>]+>/g, '') };
  }).filter(Boolean).sort((a, b) => a.s - b.s);
}

// each chapter starts where its first words are spoken: a moment before the voice, never before the last line of the previous chapter
function chapterTimes(bodies, cues) {
  let from = 0;
  return bodies.map((body) => {
    const head = norm(body.replace(/[*_]/g, '').split(/\s+/).slice(0, 12).join(' '));
    for (let k = from; k < cues.length; k++) {
      const c = norm(cues[k].text).slice(0, 24);
      if (c.length >= 6 && head.startsWith(c)) { from = k + 1; return Math.floor(Math.max(k ? cues[k - 1].e : 0, cues[k].s - 3)); }
    }
    return null;
  });
}

// duration of the mp3 from its Xing/Info header (frames × samples ÷ rate), or from the constant bitrate
export function mp3Duration(file) {
  try {
    const fd = fs.openSync(file, 'r'), size = fs.fstatSync(fd).size, b = Buffer.alloc(8192);
    fs.readSync(fd, b, 0, 10, 0);
    const o = b.toString('latin1', 0, 3) === 'ID3' ? 10 + ((b[6] & 127) << 21 | (b[7] & 127) << 14 | (b[8] & 127) << 7 | (b[9] & 127)) : 0;
    fs.readSync(fd, b, 0, b.length, o); fs.closeSync(fd);
    let i = 0; while (i < b.length - 4 && !(b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0)) i++;
    const h = b.readUInt32BE(i), ver = (h >>> 19) & 3, br = (h >>> 12) & 15, sr = (h >>> 10) & 3, ch = (h >>> 6) & 3;
    const rate = [[11025, 12000, 8000], null, [22050, 24000, 16000], [44100, 48000, 32000]][ver][sr], spf = ver === 3 ? 1152 : 576;
    const x = i + 4 + (ver === 3 ? (ch === 3 ? 17 : 32) : (ch === 3 ? 9 : 17)), tag = b.toString('latin1', x, x + 4);
    if ((tag === 'Xing' || tag === 'Info') && (b.readUInt32BE(x + 4) & 1)) return b.readUInt32BE(x + 8) * spf / rate;
    const kbps = (ver === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[br];
    return kbps ? (size - o - i) * 8 / (kbps * 1000) : 0;
  } catch (e) { return 0; }
}

// title and subtitle are the manuscript's own first lines (`# Title`, then `*subtitle*`), set lowercase like the rest of the site
const MS_HEAD = fs.existsSync(MS) ? fs.readFileSync(MS, 'utf8').split(/^## /m)[0] : '';
export const TITLE = lower((MS_HEAD.match(/^# (.+)$/m) || [, 'the book'])[1]);
export const SUB = lower((MS_HEAD.match(/^\*([^*\n]+)\*\s*$/m) || [, ''])[1]);
export const PEN = 'asahi';
export const FRAME = 'a personal book about grief. narrated by the author.';
const md = new Marked();

export function loadBook(cfg) {
  if (!fs.existsSync(MS)) { console.warn(`book: ${MS} not found, so the book section is skipped.`); return null; }
  const raw = fs.readFileSync(MS, 'utf8').replace(/\r\n/g, '\n');
  const heads = [...raw.matchAll(/^## (.*)$/gm)].map((m) => m[1].trim());
  const bodies = raw.split(/^## .*$/m).slice(1).map((p) => p.trim());
  if (!heads.length) problem(MS, 'no "##" chapter headings found');
  const vtt = exists(FILES.vtt) ? U(FILES.vtt) : '';
  if (!vtt) console.warn(`book: ${FILES.vtt} is missing, so read-along, captions and chapter times are off.`);
  const cues = vtt ? parseVTT(fs.readFileSync('.' + FILES.vtt, 'utf8')) : [];
  const times = chapterTimes(bodies, cues);
  const seen = new Set();
  const chapters = heads.map((h, i) => {
    const c = heading(h, i); if (seen.has(c.id)) c.id += '-' + i; seen.add(c.id);
    const body = bodies[i], t = times[i];
    if (cues.length && t == null) console.warn(`book: could not find the start of "${h}" in the captions, so it has no time.`);
    const words = body.replace(/[*_#>]/g, ' ').split(/\s+/).filter(Boolean).length;
    return { ...c, ts: t == null ? '' : clock(t), t: t == null ? -1 : t, words, html: md.parse(body), text: body.replace(/[*_]/g, '').replace(/\s+/g, ' ') };
  });
  // times must rise through the book, or the narration would be split wrongly; drop any that do not
  let last = -1; for (const c of chapters) { if (c.t >= 0 && c.t <= last) { console.warn(`book: "${c.label}" starts before the chapter above it in the captions; time dropped.`); c.t = -1; c.ts = ''; } if (c.t >= 0) last = c.t; }
  const b = cfg.book || {};
  const film = parseFilm(String(b.FILM_URL || '').trim());
  const audio = String(b.AUDIO_URL || '').trim() || (exists(FILES.mp3) ? U(FILES.mp3) : '');
  if (!film.kind) console.warn('book: FILM_URL is empty in config.json, so the film shows "coming soon".');
  if (!audio) console.warn(`book: no audio (drop ${FILES.mp3} in, or set AUDIO_URL), so the player is hidden.`);
  const duration = Math.round((exists(FILES.mp3) && mp3Duration('.' + FILES.mp3)) || (cues.length ? cues.at(-1).e : 0));
  const words = chapters.reduce((a, c) => a + c.words, 0);
  const date = String(b.date || new Date().toISOString().slice(0, 10));
  return { chapters, film, audio, vtt, duration, words, year: date.slice(0, 4), cover: exists(FILES.cover), poster: exists(FILES.poster) ? U(FILES.poster) : exists(FILES.og) ? U(FILES.og) : '', og: exists(FILES.og) ? U(FILES.og) : '', date, url: U('/') };
}

// "about 5,300 words", "33 minutes": rounded the way a person would say them
export const aboutWords = (n) => `about ${(Math.round(n / 100) * 100).toLocaleString('en-US')} words`;
export const minutes = (s) => `${Math.max(1, Math.round(s / 60))} minutes`;

// FILM_URL: a YouTube or Vimeo link (embedded privacy-friendly) or a direct mp4 URL; empty means "coming soon"
export function parseFilm(u) {
  if (!u) return { kind: '' };
  let m = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: 'youtube', id: m[1] };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { kind: 'vimeo', id: m[1] };
  return { kind: 'mp4', src: u };
}

// ───────── the book page ─────────
const chip = (t) => `<span class="t">${t}</span>`;
const playIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 2.5v11l9-5.5z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';

export function filmBox(bk) {
  const f = bk.film, poster = bk.poster ? pic(BASE, bk.poster.endsWith('poster.jpg') ? 'book/poster.jpg' : 'book/thumbnail.png', 'alt="" width="1280" height="720" loading="lazy" decoding="async"') : '';
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
  const tocRows = C.map((c) => `<li><a class="toc-a" href="#${c.id}">${chip(c.ts)}<span class="nm">${esc(c.label)}</span><span class="d">${esc(c.title)}</span></a>${hasAudio && c.t >= 0 ? `<button type="button" class="ch-play" data-t="${c.t}" aria-label="play ${esc(c.label)} from ${c.ts}">${playIcon}</button>` : ''}</li>`).join('');
  const filmRows = C.map((c) => `<li><button type="button" class="fc" data-t="${Math.max(0, c.t)}"${hasFilm ? '' : ' disabled'}>${chip(c.ts)}<span class="nm">${esc(c.label)}</span><span class="d">${esc(c.title)}</span></button></li>`).join('');
  const chapters = C.map((c, i) => `<section class="ch" id="${c.id}" data-ch="${i}" data-t="${c.t}" data-k="c${i}" aria-labelledby="${c.id}-h">
<header class="ch-h"><h2 id="${c.id}-h"><span class="lbl">${esc(c.label)}</span><span class="sr"> — </span><span class="ttl">${esc(c.title)}</span></h2>${hasAudio && c.t >= 0 ? `<button type="button" class="ch-listen" data-t="${c.t}" aria-label="listen to ${esc(c.label)} from ${c.ts}">${playIcon}<span>listen · ${c.ts}</span></button>` : ''}</header>
<div class="prose">${c.html}</div></section>`).join('\n');
  const cfg = { audio: bk.audio, vtt: bk.vtt, film: bk.film, title: TITLE, pen: PEN, cover: bk.cover ? U(FILES.cover) : '' };
  const jump = `<span class="bk-jump"><a href="#contents">contents</a><a href="#film">the film</a>${hasAudio ? '<a href="#listen">listen</a>' : ''}</span>`;
  return `<div class="rd-top"><a class="rd-home" href="${U('/')}" aria-label="back to asahi, the landing page">asahi</a><p class="bk-frame">${FRAME}</p>
<span class="rd-btns"><button type="button" class="rd-b" id="rd-aa" aria-expanded="false" aria-controls="sh-aa">Aa</button><button type="button" class="rd-b" id="rd-menu" aria-expanded="false" aria-controls="sh-menu">menu</button></span></div>
<div class="bk" id="bk" data-mode="scroll" data-cfg="${esc(JSON.stringify(cfg))}">
<div class="bk-bar"><div class="sheet" id="sh-aa" role="group" aria-label="reading settings"><button type="button" id="bk-mode" aria-pressed="false">scroll mode</button><button type="button" id="bk-paper" aria-pressed="false">day paper</button><button type="button" id="bk-flat" aria-pressed="false">flat page turn</button><span class="bk-size" role="group" aria-label="text size"><button type="button" data-size="0" aria-label="small text" aria-pressed="true">A</button><button type="button" data-size="1" aria-label="medium text" aria-pressed="false">A</button><button type="button" data-size="2" aria-label="large text" aria-pressed="false">A</button></span></div><span class="bk-pos" id="bk-pos" aria-hidden="true"></span><div class="sheet" id="sh-menu" role="group" aria-label="menu"><p class="bk-frame sheet-frame">${FRAME}</p>${jump}</div></div>
<div class="bk-book" id="bk-book"><i class="ed el" aria-hidden="true"></i><i class="ed er" aria-hidden="true"></i><i class="ed eb" aria-hidden="true"></i><i class="rib" aria-hidden="true"></i>
<div class="bk-stage" id="bk-stage">
<button type="button" class="bk-turn prev" id="bk-prev" aria-label="previous page" hidden><svg viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2L2 10l8 8"/></svg></button>
<div class="bk-view" id="bk-view" tabindex="-1" aria-label="the book"><div class="bk-flow" id="bk-flow" aria-live="off">
<div class="pg blank" aria-hidden="true"></div>
<section class="pg cover" id="cover" data-k="cover" aria-label="cover"><div class="cvr">${bk.cover ? pic(BASE, 'book/cover.jpg', 'alt="" width="410" height="590" decoding="async"') : ''}<div class="cv-t"><h1>${esc(TITLE)}</h1><p class="cv-s">${SUB}</p></div><p class="cv-a">${PEN}</p></div></section>
<div class="pg endpaper" data-k="endpaper" aria-hidden="true"></div>
<section class="pg title" id="title" data-k="title" aria-label="title page"><div class="tp"><p class="tp-t">${esc(TITLE)}</p><p class="tp-s">${SUB}</p><i class="tp-r"></i><p class="tp-a">${PEN}</p><p class="tp-y">${bk.year}</p></div></section>
<section class="pg film" id="film" data-k="film" aria-labelledby="film-h"><div class="pg-in"><h2 class="pg-h" id="film-h">the film</h2>${filmBox(bk)}<p class="film-n">the film and the audiobook share one timeline, so the chapter times below are the same.</p></div></section>
<section class="pg filmch" data-k="filmch" aria-labelledby="filmch-h"><div class="pg-in"><h3 class="pg-h" id="filmch-h">chapters of the film</h3><ol class="film-ch">${filmRows}</ol></div></section>
<section class="pg contents" id="contents" data-k="contents" aria-labelledby="toc-h"><div class="pg-in"><h2 class="pg-h" id="toc-h">contents</h2><ol class="toc-l">${tocRows}</ol>${hasAudio ? '<p class="toc-n" id="listen-n">the narration is built into the book: press play beside any chapter.</p>' : ''}</div></section>
${chapters}
<section class="pg colophon" id="colophon" data-k="colophon" aria-labelledby="col-h"><div class="pg-in"><h2 class="pg-h" id="col-h">colophon</h2>
<p>written &amp; narrated by ${PEN}</p><p>film &amp; book design: ${PEN}</p>
<p>music: schumann · beethoven · mozart · debussy (public-domain compositions; score encodings from the dcml corpora, cc by-nc-sa 4.0)</p>
<p class="col-y">${bk.year}</p><p class="col-j jp" lang="ja">諸行無常</p><p><button type="button" class="col-back" data-go="cover">back to the cover</button></p></div></section>
<div class="pg endpaper back" data-k="end" aria-hidden="true"></div>
</div></div>
<button type="button" class="bk-turn next" id="bk-next" aria-label="next page" hidden><svg viewBox="0 0 12 20" aria-hidden="true"><path d="M2 2l8 8-8 8"/></svg></button>
<div class="bk-run" id="bk-run" aria-hidden="true"><span class="rl"></span><span class="rr"></span><span class="fl"></span><span class="fr"></span></div>
</div>
</div>
<p class="sr" id="bk-status" role="status"></p>
</div>
${hasAudio ? `<aside class="bk-player" id="bk-player" aria-label="audiobook" hidden>
<input class="bp-seek" type="range" min="0" max="${bk.duration || 1}" step="1" value="0" aria-label="narration position">
<div class="bp-row">
<button type="button" class="bp-b bp-back" aria-label="back 15 seconds">−15</button>
<button type="button" class="bp-play" aria-label="play" data-play="${esc(playIcon)}" data-pause="${esc(pauseIcon)}">${playIcon}</button>
<button type="button" class="bp-b bp-fwd" aria-label="forward 15 seconds">+15</button>
<span class="bp-info"><span class="bp-ch"><span>prologue</span></span><span class="bp-time">0:00</span></span>
<button type="button" class="bp-b bp-rate" aria-label="playback speed">1×</button>
<button type="button" class="bp-b bp-ra" aria-pressed="false"${bk.vtt ? '' : ' hidden'}>read along</button>
</div>
<audio preload="none" src="${esc(bk.audio)}"></audio>
</aside>` : ''}`;
}
