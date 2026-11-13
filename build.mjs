// two pages: the landing (/asahi/) and the reader (/asahi/read/). node build.mjs -> dist/
import fs from 'node:fs';
import { loadBook, bookPage, setBase, TITLE, SUB, PEN, FRAME } from './lib/book.mjs';
import { landing } from './lib/landing.mjs';
import { esc, problems, problem, IMG, pic } from './lib/util.mjs';

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const B = cfg.base;
setBase(B);
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/read', { recursive: true });
fs.cpSync('assets', 'dist/assets', { recursive: true });
// the photographs are also written as AVIF and WebP next to their JPEG/PNG (kept as the fallback); pages use <picture> for the ones that exist
const PHOTOS = ['scene.jpg', 'face.png', 'book/cover.jpg', 'book/poster.jpg'];
try {
  const sharp = (await import('sharp')).default;
  for (const f of PHOTOS) {
    const src = `assets/${f}`, stem = `dist/assets/${f.replace(/\.\w+$/, '')}`;
    await sharp(src).avif({ quality: 52, effort: 5 }).toFile(stem + '.avif');
    await sharp(src).webp({ quality: 76, effort: 5 }).toFile(stem + '.webp');
    IMG.add(f);
  }
} catch (e) { console.warn('images: sharp is not installed, so no AVIF/WebP (the JPEG/PNG are served): ' + e.message); }
const book = loadBook(cfg);
if (!book) { console.error('book/the_things_we_learn_to_carry.md is missing'); process.exit(1); }

// fonts are self-hosted (assets/fonts, declared in site.css); each page preloads the two faces it shows first
const FONT = { hand: 'caveat-700', serif: 'eb-garamond', italic: 'eb-garamond-italic' };
const page = ({ title, desc, url, css, body, js, bodyClass = '', fonts = [] }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
<meta name="theme-color" content="#0b0d13">
<link rel="icon" type="image/png" sizes="48x48" href="${B}/assets/icon-48.png"><link rel="icon" type="image/png" sizes="192x192" href="${B}/assets/icon-192.png"><link rel="apple-touch-icon" href="${B}/assets/apple-touch-icon.png">
${fonts.map((f) => `<link rel="preload" href="${B}/assets/fonts/${FONT[f]}.woff2" as="font" type="font/woff2" crossorigin>`).join('')}
${css.map((c) => `<link rel="stylesheet" href="${B}/assets/${c}.css">`).join('')}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${body}
<script type="module" src="${B}/assets/${js}.js"></script>
</body></html>`;

const reader = `<div class="rd-scene" aria-hidden="true">${pic(B, 'scene.jpg', 'alt="" width="1280" height="580" decoding="async"')}<i class="rd-sun"></i></div>
<main id="main">
${bookPage(book)}
</main>`;

fs.writeFileSync('dist/index.html', page({ title: PEN, desc: `${PEN}, a pen name. ${SUB}: the things we learn to carry. ${FRAME}`, url: B + '/', css: ['site', 'landing'], body: landing(book, B), js: 'landing', fonts: ['hand', 'serif'] }));
fs.writeFileSync('dist/read/index.html', page({ title: `${TITLE} — ${PEN}`, desc: `${SUB} by ${PEN}. ${FRAME}`, url: B + '/read/', css: ['site', 'book'], body: reader, js: 'book', bodyClass: 'reader', fonts: ['serif', 'italic'] }));
fs.writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
fs.writeFileSync('dist/404.html', '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>not found</title><body style="background:#0b0d13;color:#b3ada2;font:20px Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0">nothing here. the sun is that way.</body>');
// the site is unlisted on purpose: every built page says noindex, and none may name the author or the portfolio host
const FORBIDDEN = [/Aravinth/i, /chinchoooo\.github\.io/i, /<meta[^>]+name="author"/i, /<script[^>]+(analytics|gtag|googletagmanager|plausible)/i];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
for (const f of walk('dist').filter((f) => f.endsWith('.html'))) {
  const h = fs.readFileSync(f, 'utf8');
  if (!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(h)) problem(f, 'missing <meta name="robots" content="noindex">');
  for (const re of FORBIDDEN) if (re.test(h)) problem(f, `forbidden content: ${re}`);
}
// zero third-party requests: nothing the browser loads by itself (stylesheets, scripts, images, fonts, media) may come from another host
for (const f of walk('dist').filter((f) => /\.(html|css)$/.test(f))) {
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/<(?:link|script|img|source|video|audio|iframe|track)\b[^>]*\b(?:href|src|poster|srcset)="(https?:)?\/\/[^"]*"|url\((["']?)(?:https?:)?\/\/[^)]*\)/gi)) problem(f, `third-party request: ${m[0].slice(0, 120)}`);
}
// every kanji on the pages must fall in a Shippori Mincho slice that site.css declares (else it silently falls back)
{
  const css = fs.readFileSync('assets/site.css', 'utf8');
  const ranges = [...css.matchAll(/font-family:'Shippori Mincho'[^}]*unicode-range:([^;}]+)/g)].flatMap((m) => m[1].split(',').map((r) => r.trim().slice(2).split('-').map((x) => parseInt(x, 16))));
  const html = ['dist/index.html', 'dist/read/index.html', 'dist/404.html'].map((f) => fs.readFileSync(f, 'utf8')).join('');
  for (const ch of new Set(html.match(/[　-鿿]/g) || [])) {
    const c = ch.codePointAt(0);
    if (!ranges.some(([a, z = a]) => c >= a && c <= z)) problem('assets/site.css', `kanji ${ch} (U+${c.toString(16)}) is not covered by a self-hosted Shippori Mincho slice; add the slice from fonts.gstatic.com`);
  }
}
for (const f of ['dist/sitemap.xml', 'dist/sitemap-index.xml']) if (fs.existsSync(f)) problem(f, 'no sitemap: the site is unlisted');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`built ${book.chapters.length} chapters, 2 pages`);
