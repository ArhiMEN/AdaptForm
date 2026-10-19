# Interactive demo and GitHub Pages

[English](DEMO.md) · [Русский](DEMO.ru.md)

The live **2.2.0** playground is **[https://arhimen.github.io/AdaptForm/](https://arhimen.github.io/AdaptForm/)**. This version is [published to npm](https://www.npmjs.com/package/adaptform/v/2.2.0). GitHub Pages deploys the demo from **`master` only**.

The page is built from `demo/` and the library source in `src/` at the deploying `master` commit; it demonstrates the 2.2.0 public API. It is not a separate application or npm registry client. Deploying only `master` prevents older release branches from overwriting the live playground.

## What the playground covers

- Live field validation, field state, and form-level validity, plus a separate 2.2.0 headless state lab demonstrating `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()` reference stability and `Form.batch()` notifications.
- Required fields, string patterns and lengths, numeric bounds, date limits, boolean constraints, and conditional-required fields.
- `ArrayField` item addition/removal and collection constraints.
- `ArrayFormField` nested form editing and validation.
- Simulated server errors through `Form.errors` and the default `ErrorsSchema` mapping.
- `MaskPlugin` input transformation.
- `toJSON()` and a readable preview of `toFormData()`.
- Reset behavior and the distinction between pristine, pending, valid, and invalid state.

All example values remain in the current browser page. The playground does not submit them to a server.

## Languages

Use the **Language** selector to choose English or Russian. The choice is saved in browser storage when available. A `?lang=en` or `?lang=ru` URL parameter takes precedence over the saved choice; otherwise, the demo uses the saved language or the browser language, falling back to English.

Switching languages preserves values, validation state, collection items, and the selected serialization tab. Demo validation and simulated server messages are translated for display; the library's built-in validation messages and public API remain unchanged. Documentation and changelog links open the selected language.

Direct links: [English demo](https://arhimen.github.io/AdaptForm/?lang=en) · [Russian demo](https://arhimen.github.io/AdaptForm/?lang=ru).

## Run locally

Use Node.js 22 and npm, matching the CI environment:

```bash
npm ci
npm run check:demo
npm run build:demo
npm run dev -- --config demo/vite.config.ts
```

The Vite development server uses the root path locally, while production builds use the GitHub Pages base path, `/AdaptForm/`. The production build is written to `dist-demo/`, which is intentionally excluded from the npm package.

## Automatic deployment

The workflow at `.github/workflows/deploy-demo.yml` builds and deploys the site when files in `demo/`, `src/`, package metadata, or the workflow itself change on `master`. Manual **Deploy demo** runs should also select **`master`**, because older branches are not release-current.

The workflow type-checks the demo, creates the production build, and uploads the generated static site to GitHub Pages. The standard CI workflow independently type-checks and builds the demo.

### If Pages has not been enabled for this repository

In the repository's GitHub settings, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. This one-time setting requires repository-owner/admin access and cannot be changed by a commit in this branch. After saving it, rerun **Deploy demo** from branch `master`. The workflow will then build the site and deploy it to the URL above.

Under **Settings → Environments → github-pages → Deployment branches and tags**, permit **`master`**. Older release branches need not deploy to Pages; the historical `v2.1.0` branch is retained, but must not overwrite the current demo.

## Updating the demo

- Maintain English and Russian demo UI text and documentation. Keep comments and code examples in English.
- Prefer importing the public API from `../src/index.ts`, not reimplementing library behavior inside the demo.
- Keep the Vite base path aligned with the repository name.
- Add meaningful interactions to `demo/main.ts` and their presentation to `demo/style.css`.
- Run `npm run lint`, `npm run check:demo`, and `npm run build:demo` before committing.
