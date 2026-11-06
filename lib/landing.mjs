// the landing page for the pen name. Copy stays small, lowercase and true to the book.
import { esc } from './util.mjs';

const A = (b, p) => b + '/assets/' + p;

export function landing(bk, base) {
  const read = base + '/read/';
  const f = bk.film;
  const film = f.kind === 'youtube' ? `https://youtu.be/${f.id}` : f.kind === 'vimeo' ? `https://vimeo.com/${f.id}` : f.kind === 'mp4' ? read + '#film' : '';
  const ext = f.kind === 'youtube' || f.kind === 'vimeo';
  const first = bk.chapters[0].html.match(/<p>([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, '');
  const belt = ['no newsletter', 'no popups', 'no personality quiz', '諸行無常', 'everything changes, including this page', 'still here', 'still rowing', 'one very small website'];
  const beltHTML = belt.map((t) => `<span>${esc(t)}</span>`).join('<i>✶</i>');
  return `<a class="skip" href="#main">skip to content</a>
<div class="cur" aria-hidden="true"><i></i></div>
<header class="hero" id="top" style="--x:0;--y:0">
<div class="hero-scene" aria-hidden="true"><img class="sky" src="${A(base, 'scene.jpg')}" alt="" width="1280" height="580" fetchpriority="high"><i class="stars"></i></div>
<button class="sun" type="button" aria-pressed="false" aria-label="the sun. press it to switch between night and dawn"></button>
<p class="sun-note" aria-hidden="true"><svg viewBox="0 0 60 40"><path d="M54 4C40 2 24 8 8 30M8 30l2-11M8 30l11-3"/></svg>you can press the sun</p>
<div class="wrap hero-in" id="main">
<div class="hero-copy">
<h1 class="word">asahi</h1>
<p class="jp kanji" lang="ja" aria-hidden="true">朝日</p>
<p class="lede"><em>the morning sun.</em> a pen name, and the only name on this website. i write about the heavy things, slowly. sometimes i read them out loud.</p>
<p class="cta"><a class="btn" href="${read}" data-enter>open the book</a>${film ? `<a class="alt" href="${esc(film)}"${ext ? ' rel="noopener"' : ''}>watch the film${ext ? ' ↗' : ''}</a>` : ''}</p>
</div>
<figure class="face"><div class="face-in"><img src="${A(base, 'face.png')}" alt="a black and white illustration of a girl with a heavy fringe, looking up at you through half-closed eyes" width="512" height="512" loading="eager"><i class="tape" aria-hidden="true"></i></div>
<figcaption class="note" aria-hidden="true"><svg viewBox="0 0 60 40"><path d="M56 22C40 26 24 22 6 8M6 8l11 1M6 8l2 11"/></svg>she is the face of this website. unimpressed.</figcaption></figure>
</div>
<a class="down" href="#book" aria-label="scroll to the book"><svg viewBox="0 0 20 28"><path d="M10 2v22M3 17l7 8 7-8"/></svg></a>
</header>

<div class="belt" aria-hidden="true"><div class="belt-in"><p>${beltHTML}<i>✶</i></p><p>${beltHTML}<i>✶</i></p></div></div>

<section class="room" id="book" aria-labelledby="bk-h">
<h2 id="bk-h" class="hand">the book</h2>
<p class="hint hand" aria-hidden="true">press the cover</p>
<button class="b3" type="button" aria-label="open the book: the things we learn to carry, a disguised memoir" data-href="${read}" style="--w:clamp(200px,40vw,320px)">
<span class="b3-i" aria-hidden="true">
<span class="b3-bk"></span><span class="b3-pg"><span class="b3-txt">${esc(first)}</span></span><span class="b3-ed"></span><span class="b3-tp"></span><span class="b3-sp"><b>the things we learn to carry — asahi</b></span>
<span class="b3-cv"><span class="b3-f"><img src="${A(base, 'book/cover.jpg')}" alt="" width="410" height="590" loading="lazy"><em>the things we learn to carry</em><small>asahi</small></span><span class="b3-in"></span></span>
</span></button>
<p class="blurb">a personal book about grief. narrated by the author.</p>
<p class="cta"><a class="alt" href="${read}">or skip the drama and just read it</a></p>
</section>

<section class="wrap desk" aria-labelledby="th-h">
<h2 id="th-h" class="hand">things on the desk</h2>
<p class="hint hand" aria-hidden="true">turn them over</p>
<ul class="things">
<li class="thing t1" style="--r:-2.5deg"><div class="thing-in"><div class="face-f"><img src="${A(base, 'book/cover.jpg')}" alt="" loading="lazy" width="410" height="590"><h3>the book</h3></div><div class="face-b"><p>about 5,400 words. read it, or let it be read to you. the narration is 33 minutes.</p><a href="${read}">open it</a></div></div><button class="turn" type="button" aria-pressed="false" aria-label="turn over: the book"></button></li>
<li class="thing t2" style="--r:1.8deg"><div class="thing-in"><div class="face-f"><img src="${A(base, 'book/poster.jpg')}" alt="" loading="lazy" width="1280" height="720"><h3>the film</h3></div><div class="face-b"><p>the same words and the same voice, with music. 33 minutes. headphones help.</p>${film ? `<a href="${esc(film)}"${ext ? ' rel="noopener"' : ''}>watch${ext ? ' ↗' : ''}</a>` : '<span class="soon">coming soon</span>'}</div></div><button class="turn" type="button" aria-pressed="false" aria-label="turn over: the film"></button></li>
<li class="thing t3" style="--r:-1.2deg"><div class="thing-in"><div class="face-f"><div class="wave" aria-hidden="true">${Array.from({ length: 21 }, (_, i) => `<i style="--i:${i};--h:${(24 + Math.abs(Math.sin(i * 1.7) * 62) + (i % 3) * 8).toFixed(0)}%"></i>`).join('')}</div><h3>the voice</h3></div><div class="face-b"><p>narrated by the author. press play beside any chapter and the book finds the line.</p><a href="${read}#listen">listen</a></div></div><button class="turn" type="button" aria-pressed="false" aria-label="turn over: the voice"></button></li>
<li class="thing t4" style="--r:2.2deg"><div class="thing-in"><div class="face-f"><p class="jp big" lang="ja" aria-hidden="true">音</p><h3>the music</h3></div><div class="face-b"><p>schumann, beethoven, mozart, debussy. public-domain compositions, with score encodings from the dcml corpora (cc by-nc-sa 4.0).</p></div></div><button class="turn" type="button" aria-pressed="false" aria-label="turn over: the music"></button></li>
<li class="thing t5" style="--r:-2deg"><div class="thing-in"><div class="face-f"><img class="pf" src="${A(base, 'face.png')}" alt="" loading="lazy" width="512" height="512"><h3>the face</h3></div><div class="face-b"><p>she does not speak. she is judging how fast you scrolled to get here.</p></div></div><button class="turn" type="button" aria-pressed="false" aria-label="turn over: the face"></button></li>
</ul>
</section>

<footer class="foot wrap"><p class="hand">nothing lasts. <span class="jp" lang="ja">諸行無常</span></p><p class="small">© asahi, 2026 · <a href="#top">back to the sun</a></p></footer>`;
}
