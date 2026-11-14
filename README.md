# asahi

Landing page for the pen name (`/asahi/`) and the immersive reader for "the things we learn to carry" (`/asahi/read/`).
`npm ci && npm run build` -> `dist/`, deployed by GitHub Pages. Film: `book.FILM_URL` in `config.json`.
Unlisted on purpose: noindex, no links to or from anything else.

## What updates itself
- You edit only the manuscript (`book/the_things_we_learn_to_carry.md`) and, when you have them, drop the audio and captions into `assets/book/`.
- At build, everything else is derived from those: chapter ids, labels, titles, contents, audio chapter times (from the captions), narration length, word count, title, year, and the AVIF/WebP copies of the photographs.
- The build refuses to finish if a page lacks `noindex`, names the author, loads anything from another host, or uses a kanji the self-hosted font does not cover.
- Pushing to `main` runs the Pages workflow (`npm ci && npm run build`) and deploys `dist/`; there is nothing to run or upload by hand.
- Film link and date live in `config.json`; the mp3 is only requested when someone presses play.
