// two pages: the landing (/asahi/) and the reader (/asahi/read/). node build.mjs -> dist/
import fs from 'node:fs';
import { loadBook, bookPage, setBase, TITLE, SUB, PEN, FRAME } from './lib/book.mjs';
import { landing } from './lib/landing.mjs';
import { esc, problems } from './lib/util.mjs';

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const B = cfg.base;
setBase(B);
const book = loadBook(cfg);
if (!book) { console.error('book/the_things_we_learn_to_carry.md is missing'); process.exit(1); }
const abs = (u) => cfg.url + u;

const FONTS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=EB+Garamond:ital,wght@0,400..600;1,400..500&family=Shippori+Mincho:wght@400&family=Space+Mono&display=swap';
const page = ({ title, desc, url, css, body, js, bodyClass = '' }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${PEN}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${abs(url)}">
${book.og ? `<meta property="og:image" content="${abs(book.og)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${abs(book.og)}">` : ''}
<meta name="theme-color" content="#0b0d13">
<link rel="icon" type="image/png" sizes="48x48" href="${B}/assets/icon-48.png"><link rel="icon" type="image/png" sizes="192x192" href="${B}/assets/icon-192.png"><link rel="apple-touch-icon" href="${B}/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
${css.map((c) => `<link rel="stylesheet" href="${B}/assets/${c}.css">`).join('')}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${body}
<script type="module" src="${B}/assets/${js}.js"></script>
</body></html>`;

const reader = `<div class="rd-scene" aria-hidden="true"><img src="${B}/assets/scene.jpg" alt="" width="1280" height="580"><i class="rd-sun"></i></div>
<main id="main">
${bookPage(book)}
</main>`;

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/read', { recursive: true });
fs.cpSync('assets', 'dist/assets', { recursive: true });
fs.writeFileSync('dist/index.html', page({ title: PEN, desc: `${PEN}, a pen name. ${SUB}: the things we learn to carry. ${FRAME}`, url: B + '/', css: ['site', 'landing'], body: landing(book, B), js: 'landing' }));
fs.writeFileSync('dist/read/index.html', page({ title: `${TITLE} — ${PEN}`, desc: `${SUB} by ${PEN}. ${FRAME}`, url: B + '/read/', css: ['site', 'book'], body: reader, js: 'book', bodyClass: 'reader' }));
fs.writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
fs.writeFileSync('dist/404.html', '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>not found</title><body style="background:#0b0d13;color:#b3ada2;font:20px Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0">nothing here. the sun is that way.</body>');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`built ${book.chapters.length} chapters, 2 pages`);
