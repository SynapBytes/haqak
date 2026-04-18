# Performance Baseline and Quick Wins

## Applied quick wins in this PR

- Added image fallback handling for critical header and support assets.
- Added lazy loading + async decoding for non-critical payment method icons.
- Preserved route-level code splitting (already present in `src/App.tsx`).
- Added FAQ search ranking/token normalization to improve result quality without server round trips.

## Reproducible local measurement method

1. Build production bundle:
   - `npm run build`
2. Preview locally:
   - `npm run preview`
3. Measure with Lighthouse (Chrome DevTools):
   - Capture FCP, LCP, TTFB, Total Blocking Time.
4. Run two passes:
   - Before changes (base branch)
   - After changes (current branch)
5. Compare:
   - Landing page (`/`)
   - FAQ page (`/faq`)
   - Auth page (`/auth`)

## Recommended next optimization PRs

1. Split large dashboard modules into finer lazy chunks.
2. Add explicit preconnects for API/analytics domains in `index.html`.
3. Add image width/height hints and responsive `srcset` for large static media.
4. Configure CDN/browser cache headers for immutable hashed assets.
