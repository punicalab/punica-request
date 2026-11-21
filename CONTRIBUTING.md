# Contributing

**Working on your first Pull Request?** You can learn how from this _free_
series
[How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

## Project setup

The repository is a [pnpm](https://pnpm.io) workspace and needs Node 22.18
or later.

1.  `Fork` and `Clone` the repo
2.  Run `pnpm install` to install dependencies
3.  Create a branch from `develop` for your pull request

| Command          |                                                       |
| ---------------- | ----------------------------------------------------- |
| `pnpm build`     | Builds every package, as ES modules and as CommonJS   |
| `pnpm test`      | The unit tests, then the tests against the builds     |
| `pnpm typecheck` | Builds, then type-checks every package                |
| `pnpm lint`      | ESLint                                                |
| `pnpm changeset` | Describes a change for the changelog and the versions |

> Tip: Keep your `main` branch pointing at the original repository and make pull
> requests from branches on your fork. To do this, run:
>
> ```
> git remote add upstream https://github.com/punicalab/punica-request.git
> git fetch upstream
> git branch --set-upstream-to=upstream/main main
> ```
>
> This will add the original repository as a "remote" called "upstream," Then
> fetch the git information from that remote, then set your local `main` branch
> to use the upstream main branch whenever you run `git pull`. Then you can make
> all of your pull request branches based on this `main` branch. Whenever you
> want to update your version of `main`, do a regular `git pull`.

## Committing and Pushing changes

Run `pnpm lint && pnpm build && pnpm test` before you commit. The first line
of a commit message is `type: subject` (`feat`, `fix`, `docs`, `chore`, …)
and at most 88 characters; a hook checks it.

A change that reaches users needs a changeset: run `pnpm changeset`, pick the
packages and whether it is a patch, a minor or a major change, and commit the
file it writes. `@punica/request`, `@punica/request-fetch` and
`@punica/request-middleware` share one version.

## Releases

Pull requests go to `develop`. When `develop` is merged into `main`, the
release workflow opens a "version packages" pull request from the pending
changesets; merging that one publishes to npm.

## Help needed

Please checkout the [open issues][issues]

[issues]: https://github.com/punicalab/punica-request/issues
