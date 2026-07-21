<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Fresh Tomatoes icon" />

# 🍅 Fresh Tomatoes

**See the _unverified_ audience score on Rotten Tomatoes.**

A tiny, zero-permission Chrome/Brave/Edge extension that quietly swaps the
Rotten Tomatoes audience score for the score of the **unverified** crowd —
the people who _didn't_ buy a ticket through Fandango.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![No permissions](https://img.shields.io/badge/permissions-none-success)](manifest.json)
![Version](https://img.shields.io/badge/version-0.1.0-orange)

</div>

---

## Why?

Rotten Tomatoes prominently shows an **audience score**. That number blends two
groups it already tracks separately in the page's own data:

- **Verified** ratings — people RT confirmed bought a ticket.
- **Everyone else** — the unverified crowd.

Fresh Tomatoes recomputes the score using **only the unverified ratings** and
shows _that_ number in place of the headline audience score. Same data, already
on the page — just a different slice of it.

> The math uses Rotten Tomatoes' own embedded numbers. Nothing is fetched,
> scraped from elsewhere, or made up.

## How the score is calculated

```
unverifiedLikedCount    = audienceAll.likedCount    − audienceVerified.likedCount
unverifiedNotLikedCount = audienceAll.notLikedCount − audienceVerified.notLikedCount

unverifiedAudienceScore = unverifiedLikedCount
                          ÷ (unverifiedLikedCount + unverifiedNotLikedCount)
                          × 100        (rounded to the nearest whole percent)
```

## Install

Fresh Tomatoes is an unpacked extension — no store account or build step needed.
It works in any Chromium browser (Chrome, Brave, Edge, Arc, Opera, …).

1. **Download the code**
   - `git clone https://github.com/TimothyJKennedy/fresh-tomatoes.git`
   - …or click **Code → Download ZIP** on GitHub and unzip it.
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - **Brave: `brave://extensions`**
   - Edge: `edge://extensions`
3. Turn on **Developer mode** (top-right in Chrome/Brave, left sidebar in Edge).
4. Click **Load unpacked** and select the `fresh-tomatoes` folder.
5. Visit any movie page, e.g. <https://www.rottentomatoes.com/m/inception>.

The audience score now shows the unverified value. That's it — there's no popup,
button, or settings to fiddle with.

### Updating after a code change

Because it runs straight from the folder on disk, just edit the files, click the
**reload ↻** icon on the Fresh Tomatoes card in your extensions page, then
refresh the Rotten Tomatoes tab.

## Privacy

Fresh Tomatoes is about as private as an extension gets:

- **Zero permissions requested.** Check `manifest.json` — there's no
  `permissions` block.
- **Runs only on `https://www.rottentomatoes.com/m/*`** and nowhere else.
- **No network requests, no tracking, no analytics, no data collection.** It
  reads numbers already on the page and edits the on-page text locally.

## How it works (under the hood)

- **Which element changes:** the audience score lives in a light-DOM slotted
  node inside Rotten Tomatoes' `<media-scorecard>` element
  (`media-scorecard rt-text[slot="audience-score"]`). Only that element's text is
  rewritten — critic scores, details, reviews, layout, and everything else are
  untouched.
- **Where the data comes from:** the counts are embedded in a
  `<script id="media-scorecard-json" type="application/json">` blob. The script
  parses it and searches recursively for the object holding both `audienceAll`
  and `audienceVerified` (they're nested), so it keeps working even if the
  nesting shifts. Missing verified counts are treated as zero.
- **Dynamic pages & SPA navigation:** a debounced `MutationObserver` re-applies
  the swap when RT re-renders, and the cache resets on client-side navigation so
  browsing from one movie to another always recalculates.
- **No duplicates:** each updated element is tagged with `data-fresh-tomatoes`
  and only rewritten when the value actually changes — no flicker, no loops.
- **Fails safe:** if the data is missing or the math is invalid (e.g. no
  unverified ratings), the original score is left untouched and a single
  diagnostic is logged to the console. Users never see an error.

Open DevTools → **Console** on a movie page to see it working:

```
[Fresh Tomatoes] Unverified audience score = 91% (168315 liked of 184128).
```

## Project layout

| File | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 definition + content-script registration |
| `content.js` | Extraction, calculation, and replacement logic |
| `icons/` | Extension icons (16/32/48/128) |
| `README.md` | This document |
| `LICENSE` | MIT license |

## Contributing

Issues and PRs welcome. If Rotten Tomatoes changes its markup and the score
stops updating, open an issue with the movie URL — the console diagnostic
(above) is the most useful thing to include.

## Disclaimer

Fresh Tomatoes is an unofficial, fan-made tool. It is **not affiliated with,
endorsed by, or connected to Rotten Tomatoes or Fandango.** "Rotten Tomatoes" is
a trademark of its respective owner. All score data belongs to Rotten Tomatoes;
this extension only re-slices numbers the page already ships to your browser.

## License

[MIT](LICENSE) © 2026 TimothyJKennedy
