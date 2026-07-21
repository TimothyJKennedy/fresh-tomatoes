/**
 * Fresh Tomatoes
 *
 * Replaces the audience score shown on a Rotten Tomatoes movie page with an
 * "unverified" audience score derived from the page's embedded score data:
 *
 *   unverifiedLikedCount    = audienceAll.likedCount    - audienceVerified.likedCount
 *   unverifiedNotLikedCount = audienceAll.notLikedCount - audienceVerified.notLikedCount
 *   unverifiedAudienceScore = unverifiedLikedCount /
 *                             (unverifiedLikedCount + unverifiedNotLikedCount) * 100
 *
 * If the data is missing or the calculation is invalid, the original score is
 * left untouched and a diagnostic is logged to the console.
 */
(function () {
  "use strict";

  var LOG_PREFIX = "[Fresh Tomatoes]";
  var MARK = "data-fresh-tomatoes";

  // Selectors for the visible audience-score text element, scoped to the
  // score card so the other tiles that reuse the same slot are not touched.
  var AUDIENCE_SELECTORS = [
    'media-scorecard rt-text[slot="audience-score"]',
    'media-scorecard rt-text[slot="audienceScore"]'
  ];

  var computedScore = null; // Cached once successfully calculated.
  var loggedFailure = false; // Suppress repeated diagnostics across observer ticks.
  var lastUrl = location.href; // Detect client-side navigation between movies.

  function parseCount(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      var n = Number(value.replace(/,/g, "").trim());
      return isFinite(n) ? n : NaN;
    }
    return NaN;
  }

  // Recursively locate the object that holds both audience buckets. On the RT
  // page these live nested under an `overlay` object, so a search is simplest.
  function findAudienceData(node, depth) {
    if (!node || typeof node !== "object" || depth > 8) {
      return null;
    }
    if (node.audienceAll && node.audienceVerified) {
      return node;
    }
    for (var key in node) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        var found = findAudienceData(node[key], depth + 1);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  function extractAudienceData() {
    var scripts = document.querySelectorAll(
      'script#media-scorecard-json, script[type="application/json"]'
    );
    for (var i = 0; i < scripts.length; i++) {
      var text = scripts[i].textContent;
      if (!text || text.indexOf("audienceAll") === -1) {
        continue;
      }
      var parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        continue;
      }
      var data = findAudienceData(parsed, 0);
      if (data) {
        return data;
      }
    }
    return null;
  }

  function logFailure(message, details) {
    if (loggedFailure) {
      return;
    }
    loggedFailure = true;
    if (details !== undefined) {
      console.warn(LOG_PREFIX, message, details);
    } else {
      console.warn(LOG_PREFIX, message);
    }
  }

  function calculateScore() {
    if (computedScore !== null) {
      return computedScore;
    }

    var data = extractAudienceData();
    if (!data) {
      logFailure(
        "Could not find embedded audience score data; leaving the original score unchanged."
      );
      return null;
    }

    var all = data.audienceAll || {};
    var verified = data.audienceVerified || {};

    var allLiked = parseCount(all.likedCount);
    var allNotLiked = parseCount(all.notLikedCount);
    var verifiedLiked = parseCount(verified.likedCount);
    var verifiedNotLiked = parseCount(verified.notLikedCount);

    // Verified counts can legitimately be absent; treat missing as zero.
    if (!isFinite(verifiedLiked)) {
      verifiedLiked = 0;
    }
    if (!isFinite(verifiedNotLiked)) {
      verifiedNotLiked = 0;
    }

    if (!isFinite(allLiked) || !isFinite(allNotLiked)) {
      logFailure("Audience count fields are missing or non-numeric; leaving the original score unchanged.", {
        allLiked: all.likedCount,
        allNotLiked: all.notLikedCount
      });
      return null;
    }

    var unverifiedLiked = allLiked - verifiedLiked;
    var unverifiedNotLiked = allNotLiked - verifiedNotLiked;
    var total = unverifiedLiked + unverifiedNotLiked;

    if (unverifiedLiked < 0 || unverifiedNotLiked < 0 || total <= 0) {
      logFailure("Unverified audience counts are invalid; leaving the original score unchanged.", {
        unverifiedLiked: unverifiedLiked,
        unverifiedNotLiked: unverifiedNotLiked
      });
      return null;
    }

    var score = Math.round((unverifiedLiked / total) * 100);
    if (!isFinite(score)) {
      logFailure("Computed score is not a finite number; leaving the original score unchanged.");
      return null;
    }

    computedScore = score;
    console.info(
      LOG_PREFIX,
      "Unverified audience score = " + score + "% (" + unverifiedLiked + " liked of " + total + ")."
    );
    return computedScore;
  }

  function applyScore(score) {
    var desiredText = String(score) + "%";
    for (var i = 0; i < AUDIENCE_SELECTORS.length; i++) {
      var elements = document.querySelectorAll(AUDIENCE_SELECTORS[i]);
      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        // Skip if we already rendered this exact value onto this element.
        if (el.getAttribute(MARK) === String(score) && el.textContent.trim() === desiredText) {
          continue;
        }
        var hasPercent = /%/.test(el.textContent);
        el.textContent = hasPercent ? desiredText : String(score);
        el.setAttribute(MARK, String(score));
      }
    }
  }

  // Rotten Tomatoes can swap movies via client-side navigation without a full
  // reload. When the URL changes, discard the cached score so the next movie is
  // recalculated from its own embedded data rather than reusing the old value.
  function resetIfNavigated() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      computedScore = null;
      loggedFailure = false;
    }
  }

  function update() {
    resetIfNavigated();
    var score = calculateScore();
    if (score === null) {
      return;
    }
    applyScore(score);
  }

  function start() {
    update();

    var scheduled = false;
    var observer = new MutationObserver(function () {
      // RT renders/updates content dynamically; coalesce bursts of mutations.
      if (scheduled) {
        return;
      }
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        update();
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  start();
})();
