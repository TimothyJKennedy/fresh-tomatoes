# Fresh Tomatoes

A minimal Google Chrome (Manifest V3) extension that replaces the audience score
shown on a Rotten Tomatoes movie page with a recalculated **unverified** audience
score.

- **Name:** Fresh Tomatoes
- **Description:** Replaces the Rotten Tomatoes audience score with the calculated unverified audience score.
- **Version:** 0.1.0

## What it does

On any page matching `https://www.rottentomatoes.com/m/*`, the extension:

1. Reads the audience score counts embedded in the page.
2. Subtracts the *verified* audience counts from the *all* audience counts to get
   the *unverified* counts.
3. Calculates the unverified audience score as a percentage.
4. Rounds it to the nearest whole percent.
5. Replaces the audience score value displayed on the page with that number.

Nothing else on the page is changed: critic scores, movie details, reviews, page
layout, and unrelated text are all left as-is. There is no popup, options page,
badge, toolbar UI, or comparison panel — the only visible effect is the swapped
audience-score number.

## How it works

### Which element is replaced

Rotten Tomatoes renders the movie score card with a `<media-scorecard>` custom
element. The visible audience score lives in a light-DOM slotted text node:

```html
<media-scorecard>
  ...
  <rt-text slot="audience-score">91%</rt-text>
</media-scorecard>
```

The extension only rewrites the text of that element
(`media-scorecard rt-text[slot="audience-score"]`). The critic-score element and
every other tile are left untouched. Because the node is in the light DOM, a
content script can read and update it directly.

### How the audience data is extracted

The counts are embedded in a JSON blob in the page:

```html
<script id="media-scorecard-json" type="application/json"> ... </script>
```

Within that JSON, the audience buckets are nested (under an `overlay` object) as
`audienceAll` and `audienceVerified`, each containing `likedCount` and
`notLikedCount` (unquoted integers). The extension parses the JSON and searches
recursively for the object that contains both `audienceAll` and `audienceVerified`,
so it keeps working even if the exact nesting shifts. If the verified bucket is
missing, its counts are treated as zero.

### How the score is calculated

```
unverifiedLikedCount    = audienceAll.likedCount    - audienceVerified.likedCount
unverifiedNotLikedCount = audienceAll.notLikedCount - audienceVerified.notLikedCount

unverifiedAudienceScore = unverifiedLikedCount
                          / (unverifiedLikedCount + unverifiedNotLikedCount)
                          * 100
```

The result is rounded to the nearest whole percent with `Math.round` and rendered
as e.g. `91%`.

### Dynamic pages and de-duplication

Rotten Tomatoes loads and updates content dynamically, so a `MutationObserver`
(debounced with `requestAnimationFrame`) re-applies the replacement if the score
element is re-rendered. Each updated element is tagged with a
`data-fresh-tomatoes` attribute and the value is only written when it differs from
what is already shown, preventing duplicate work or render loops.

### When data is missing or invalid

If the embedded data cannot be found, the counts are non-numeric, or the
calculation would be invalid (e.g. a zero or negative denominator), the extension
leaves the original Rotten Tomatoes audience score unchanged and logs a single
diagnostic message to the browser console. No error is shown to the user.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this project folder.
4. Visit a movie page such as `https://www.rottentomatoes.com/m/inception`.

## Files

- `manifest.json` — Manifest V3 definition and content-script registration.
- `content.js` — Extraction, calculation, and replacement logic.
- `README.md` — This document.
