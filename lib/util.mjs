export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const problems = [];
export const problem = (where, msg) => problems.push(`${where}: ${msg}`);

// photographs that were also written as AVIF/WebP at build (filled by build.mjs): path under assets/, e.g. 'scene.jpg'
export const IMG = new Set();
// <picture> with AVIF and WebP sources when they exist, else a plain <img>; `attrs` go on the <img> (give width and height)
export const pic = (base, file, attrs) => {
  const img = `<img src="${base}/assets/${file}" ${attrs}>`;
  if (!IMG.has(file)) return img;
  const stem = `${base}/assets/${file.replace(/\.\w+$/, '')}`;
  return `<picture><source type="image/avif" srcset="${stem}.avif"><source type="image/webp" srcset="${stem}.webp">${img}</picture>`;
};
