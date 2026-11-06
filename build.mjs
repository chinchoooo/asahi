// one page: the book. node build.mjs -> dist/ (served under /asahi/ by GitHub Pages)
import fs from 'node:fs';
import path from 'node:path';
import { loadBook, bookPage, setBase, TITLE, SUB, PEN, FRAME } from './lib/book.mjs';
import { esc, problems } from './lib/util.mjs';

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
setBase(cfg.base);
const book = loadBook(cfg);
if (!book) { console.error('book/the_things_we_learn_to_carry.md is missing'); process.exit(1); }
const abs = (u) => cfg.url + u;
const full = `${TITLE} — ${PEN}`, desc = `${SUB} by ${PEN}. ${FRAME}`;
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${PEN}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="book">
${book.og ? `<meta property="og:image" content="${abs(book.og)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${abs(book.og)}">` : ''}
<meta name="theme-color" content="#0e0e0d"><link rel="icon" href="data:,">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400..500&family=DM+Mono:wght@400;500&family=Shippori+Mincho:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cfg.base}/assets/site.css">
<link rel="stylesheet" href="${cfg.base}/assets/book.css">
</head>
<body>
<main id="main">
${bookPage(book)}
</main>
<script type="module" src="${cfg.base}/assets/book.js"></script>
</body></html>`;
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });
fs.cpSync('assets', 'dist/assets', { recursive: true });
fs.writeFileSync('dist/index.html', html);
fs.writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
fs.writeFileSync('dist/404.html', '<!DOCTYPE html><meta charset="utf-8"><meta name="robots" content="noindex"><title>not found</title><body style="background:#0e0e0d;color:#b2ac9f;font:16px monospace;padding:3rem">nothing here.</body>');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`built ${book.chapters.length} chapters`);
