# Interactive demo and GitHub Pages

The intended live playground URL is **[https://arhimen.github.io/AdaptForm/](https://arhimen.github.io/AdaptForm/)**. The build and type-check pass in CI, but the first deployment is currently blocked because GitHub Pages is not enabled for the repository and the workflow token cannot change that repository setting.

The page is built from the `demo/` application and the library source in `src/` on branch `v2.1.0`. It does not load the published npm package, so the playground exercises the code being prepared for the 2.1.0 release candidate.

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

## Run locally

Use Node.js 22 and npm, matching the CI environment:

```bash
npm ci
npm run check:demo
npm run build:demo
npm run dev -- --config demo/vite.config.ts
```

The Vite configuration uses the project Pages base path, `/AdaptForm/`. The production build is written to `dist-demo/`, which is intentionally excluded from the npm package.

## Automatic deployment

The workflow at `.github/workflows/deploy-demo.yml` builds and deploys the site when files in `demo/`, `src/`, package metadata, or the workflow itself change on branch `v2.1.0`. It can also be started manually using GitHub Actions' **Deploy demo** workflow.

The workflow type-checks the demo, creates the production build, and uploads the generated static site to GitHub Pages. The standard CI workflow independently type-checks and builds the demo.

### If Pages has not been enabled for this repository

In the repository's GitHub settings, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. This one-time setting requires repository-owner/admin access and cannot be changed by a commit in this branch. After saving it, rerun **Deploy demo** from branch `v2.1.0`. The workflow will then build the site and deploy it to the URL above.

## Updating the demo

- Keep all demo UI text, comments, and documentation in English.
- Prefer importing the public API from `../src/index.ts`, not reimplementing library behavior inside the demo.
- Keep the Vite base path aligned with the repository name.
- Add meaningful interactions to `demo/main.ts` and their presentation to `demo/style.css`.
- Run `npm run lint`, `npm run check:demo`, and `npm run build:demo` before committing.
