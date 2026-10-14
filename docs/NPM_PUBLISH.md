# Automatic npm publication

[English](NPM_PUBLISH.md) · [Русский](NPM_PUBLISH.ru.md)

The [Publish npm package](../.github/workflows/publish-npm.yml) workflow runs after a successful `CI` run caused by a push to `master`. A merged pull request pushes a commit to `master` and follows this path. A direct push to `master` does too. Failed CI, pull-request runs, and runs from another repository cannot publish.

The workflow checks the exact `name` and `version` in `package.json` against the public npm registry. If that version is already published, it exits successfully without publishing. It does **not** change the version. A new release requires a new version in both `package.json` and `package-lock.json`, plus its changelog entry, before merging. npm versions cannot be overwritten.

## One-time setup

Choose one authentication method before enabling the workflow:

**Trusted Publisher (preferred).** Enable two-factor authentication for the npm account that maintains [`adaptform`](https://www.npmjs.com/package/adaptform). npm requires this to configure a Trusted Publisher. After `.github/workflows/publish-npm.yml` is present on `master`, configure the npm package's GitHub Actions Trusted Publisher with owner `ArhiMEN`, repository `AdaptForm`, workflow filename `publish-npm.yml`, and permission for **npm publish** (not only staging). The equivalent npm CLI command is:

```bash
npm trust github adaptform --repo ArhiMEN/AdaptForm --file publish-npm.yml --allow-publish
```

**Granular npm token.** In the npm website, create a granular access token restricted to package `adaptform`, with **Read and write (publish and stage)** and **Bypass 2FA**. Then save it directly to the repository secret `NPM_TOKEN` from your own terminal:

```bash
gh secret set NPM_TOKEN --repo ArhiMEN/AdaptForm
```

The command prompts for the value; never paste a token into chat, a command argument, or a tracked file. A token with a limited lifetime must be rotated before expiry. npm plans to discontinue direct publishing with bypass-2FA tokens in January 2027, so migrate to Trusted Publisher before then. If the package disallows token publishing, use Trusted Publisher.

After either method is configured, set the GitHub Actions variable `NPM_PUBLISH_ENABLED` to `true`:

```bash
gh variable set NPM_PUBLISH_ENABLED --repo ArhiMEN/AdaptForm --body true
```

Trusted Publisher uses GitHub's short-lived OIDC identity and needs no npm token. When `NPM_TOKEN` exists, the publication step supplies it as `NODE_AUTH_TOKEN`. Until the variable is enabled, the publication job is skipped. To pause future publication, set the variable to `false`; published versions remain on npm.

The first eligible merge after setup publishes the current `package.json` version if absent from npm. Check the [Actions runs](https://github.com/ArhiMEN/AdaptForm/actions/workflows/publish-npm.yml) and the [npm package versions](https://www.npmjs.com/package/adaptform?activeTab=versions) after enabling.
