# Ternent website

`www` is the landing page and public demonstration consumer for the five published
Ternent libraries. Keep it current with `@ternent/*` releases and the accepted core
contracts. Use exact reviewed versions and the lockfile, with Renovate following
`next` for the Ternent suite. Do not import core source or reinstate retired UI,
Tooling, Workspace or Seal CLI packages.

Preserve landing-page copy, route behavior, branding and light/dark palettes during
library migrations. Website markup and CSS are owned here; no internal design-system
package is required. Remove superseded source rather than keeping legacy folders.

The examples page delegates history, cryptography and replay to published packages.
Its keys and drafts stay in memory. Inspect public metadata honestly and never invent
contents for locked events. Invalid history cannot expose trusted application state.
Changing inspector routes must retain the session and unfinished work.
Examples use a full-width notes application with reader/group controls, a note list,
an editor and a compact commit strip. Keep JSON/history/verification in the standalone
Inspector instead of inline demo panes. "Inspect document" hands committed bytes and
the selected reader's inspection over in memory. Keep drafts in the example and apply
provided inspection only to the matching verified document/head; never export keys or
reader context in the file. Keep longer explanations in contextual help.

`/inspect` is a standalone, read-only tool for user files. Keep record/history/
verification presentation in `src/modules/inspector`; do not tie
it to the notes model or demo identities. Verify original bytes through Ledger's
published protocol API. Never normalize JSON before signature verification. Keep
integrity, application replay, unavailable requirements and unknown formats distinct.
Files stay in memory; do not upload, persist or execute their content. Preserve tool
sessions during in-app navigation. The explicit file limit is 16 MiB; JSON tree and
history rendering are incremental. Browser and visual review remain Sam's.

Run `pnpm check` before delivery. It checks formatting, lint, Vue/TypeScript, website
unit tests, real-library runtime tests and the static/PWA build. Browser and
accessibility walkthroughs are Sam's. Deliver changes as a draft PR; publishing the
live site is a separate action.
