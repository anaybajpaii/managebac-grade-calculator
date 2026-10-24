# Grade Calculator for ManageBac

A Chrome extension that adds an overlay to your ManageBac grades page and predicts your IB grade (1-7) using the official IB grade boundaries.

- Weightings are editable and saved separately for each class
- Boundaries default to the IB May 2026 (M26) session and are user-adjustable
- Scores and settings are handled locally in your browser. The only thing ever sent is feedback you choose to write and send

Not affiliated with or endorsed by ManageBac or the International Baccalaureate.

## Development

```bash
npm install
npm run build       # bundles to dist/
npm run watch       # rebuild on change
npm run typecheck
npm test
npm run package     # builds and zips dist/ into release/ for the Chrome Web Store
```

Load it in Chrome: `chrome://extensions` → enable Developer mode → Load unpacked → select the `dist/` folder.

## Stack

TypeScript (bundled with esbuild), Manifest V3, Vitest for tests. A Python script (added later) converts the IB boundaries PDF into JSON at build time; it is not part of the shipped extension.

## Feedback form

The in-panel feedback screen posts to the endpoint set in `FEEDBACK_URL` in `src/config.ts` (a Formspree form). Leave it empty to hide the feedback link.

## Chrome Web Store

Listing text and permission justifications are in `store/LISTING.md`, the privacy policy is in `store/PRIVACY.md` (fill in your name and email, then host it at a public URL), and screenshots are in `store/screenshots/`.
