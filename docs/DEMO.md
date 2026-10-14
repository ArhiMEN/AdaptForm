# Interactive demo and GitHub Pages

[English](DEMO.md) · [Русский](DEMO.ru.md)

The live playground URL is **[https://arhimen.github.io/AdaptForm/](https://arhimen.github.io/AdaptForm/)**. GitHub Pages uses GitHub Actions for deployment, and the `github-pages` environment allows both `v2.1.0` and `master` to deploy.

The page is built from the `demo/` application and the library source in `src/` on the deploying branch. The initial deployment uses `v2.1.0`, so the playground exercises the code being prepared for the 2.1.0 release candidate. After this branch is merged into `master`, changes on `master` also deploy automatically. Both branches publish to the same URL; the latest successful deployment becomes the live demo.

## What the playground covers

- Live field validation, field state, and form-level validity.
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

The workflow at `.github/workflows/deploy-demo.yml` builds and deploys the site when files in `demo/`, `src/`, package metadata, or the workflow itself change on `v2.1.0` or `master`. It can also be started manually using GitHub Actions' **Deploy demo** workflow, selecting either branch once it contains the workflow.

The workflow type-checks the demo, creates the production build, and uploads the generated static site to GitHub Pages. The standard CI workflow independently type-checks and builds the demo.

### If Pages has not been enabled for this repository

In the repository's GitHub settings, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. This one-time setting requires repository-owner/admin access and cannot be changed by a commit in this branch. After saving it, rerun **Deploy demo** from branch `v2.1.0`. The workflow will then build the site and deploy it to the URL above.

Under **Settings → Environments → github-pages → Deployment branches and tags**, allow both `v2.1.0` and `master`. Enabling Pages alone may leave only `master` allowed, which blocks deployment from `v2.1.0` even when the build succeeds. These repository settings are already configured for this project.

## Updating the demo

- Maintain English and Russian demo UI text and documentation. Keep comments and code examples in English.
- Prefer importing the public API from `../src/index.ts`, not reimplementing library behavior inside the demo.
- Keep the Vite base path aligned with the repository name.
- Add meaningful interactions to `demo/main.ts` and their presentation to `demo/style.css`.
- Run `npm run lint`, `npm run check:demo`, and `npm run build:demo` before committing.
