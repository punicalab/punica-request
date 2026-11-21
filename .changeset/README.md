# Changesets

Every change that reaches users comes with a changeset: `pnpm changeset`
asks which packages changed and how (patch, minor, major) and writes a file
here. When `main` receives changesets, the release workflow opens a
"version packages" pull request; merging it publishes to npm.

`@punica/request`, `@punica/request-fetch`, `@punica/request-http` and
`@punica/request-middleware` share one version.
