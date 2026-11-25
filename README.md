# ternent.dev

The project landing page, document inspector and public demos for Ternent's five libraries. The website
consumes published npm packages and exercises their current contracts; core source
is not aliased into the application.

## Development

Use Node 26.13.1 and pnpm 12.21.0, pinned in the version files and package manifest.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm check
pnpm preview --port 4174
```

`pnpm check` runs formatting, lint, Vue/TypeScript, website unit tests, actual-library
runtime tests and the production build. The build also verifies generated pages,
manifest links, icons, initial navigation scripts and service-worker precache assets.
Browser interaction and accessibility walkthroughs are Sam's; `pnpm test:e2e` provides
Playwright checks for the current routes and production preview.

Vue, Vue Router, Tailwind and Vite SSG provide the site. Vite+ supplies the shared
Vite/Vitest, formatter and linter. The Vite/Vitest package overrides match Vite+'s
bundled versions; Vue SFC checks use `vue-tsc` with the maintained TypeScript 6 API.
Website markup, brand SVG and palette values are owned here. No Ternent UI package
or theme generator is required.

## Published package baseline

| Package             | Reviewed version |
| ------------------- | ---------------- |
| `@ternent/identity` | `0.6.0-alpha.1`  |
| `@ternent/armour`   | `0.3.0-alpha.1`  |
| `@ternent/ledger`   | `0.2.0-alpha.1`  |
| `@ternent/concord`  | `0.3.0-alpha.1`  |
| `@ternent/seal`     | `0.5.0-alpha.1`  |

These are exact pins with a committed lockfile. `renovate.json` follows the `next`
dist-tag for the five libraries, groups their updates and requires review. Enable the
Renovate GitHub App for `ternent/www` to activate those update PRs; configuration alone
does not run an updater. The website CI checks the resulting contracts before a
release is accepted. No npm access token is needed to install these public packages.

## Pages

| Path                                                                             | Content                                               |
| -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/`, `/idea`, `/architecture`                                                    | Overview, the idea and architecture                   |
| `/identity`, `/armour`, `/seal`, `/ledger`, `/concord`                           | Building-block sections                               |
| `/open-source`, `/about`                                                         | Source and working together                           |
| `/examples`                                                                      | Signed document, reader identities and privacy groups |
| `/examples/json`, `/examples/history`, `/examples/verification`                  | Legacy redirects to standalone Inspector              |
| `/examples/seal`                                                                 | Sign-once Seal proof verification example             |
| `/inspect`                                                                       | Standalone JSON document inspector                    |
| `/inspect/entries`, `/inspect/history`, `/inspect/json`, `/inspect/verification` | Read-only document views                              |
| `/demo/identity`                                                                 | Local identity demo                                   |
| `/demo/identity/create`, `/demo/identity/recover`, `/demo/identity/login`        | Identity modes                                        |

Story routes share one page and navigate to its sections. Scrolling replaces the URL
without accumulating history entries. Legacy hashes resolve to clean paths. Unknown
routes return to `/`. Tool navigation retains the current example session and unfinished work.

Earlier `/playground` URLs redirect to `/examples`. Former playground/examples inspector paths and hashes redirect to the standalone `/inspect` views.

## Examples ownership and review

`/examples` shares the site header, footer, content width and tool-page heading with Inspector. Its contained notes app comes with readers, privacy groups, an entry list and an editor. A compact bottom strip owns auto-commit, staged changes, Commit and Discard. JSON, history and verification live in the standalone Inspector. Inspect document transfers a committed snapshot and the selected reader's inspection in memory; unfinished editor text and drafts stay in Examples.

`src/modules/examples/model.ts` owns note command validation, domain events and a
pure projection. Note identifiers are scoped to their privacy group.
`session.ts` supplies host capabilities, document bytes, authoring cadence and file
operations. Concord owns command/authority/encryption replay and composes the
Ledger-owned container and signed history. The UI renders actual projection,
inspection and verification results. No crypto or history engine is duplicated here.
See [core's common-container decision](https://github.com/ternent/core/blob/main/docs/adr/0018-use-one-ledger-container-for-concord.md).

Suggested review:

1. Read Shared notes as Alice and Bob; both can edit the default group.
2. Read Alice's independent group as Bob. Membership of the default group grants no
   access here. Eve and No identity see no readable notes, while public membership,
   history, timing, event counts and ciphertext remain inspectable.
3. Disable automatic commit, stage changes and inspect the unchanged committed JSON.
   Commit creates a signed history boundary; discard leaves that history unchanged.
4. Use Inspect document to follow the selected entry into its stored record and history. Return to Examples without resetting the reader or unfinished work.
5. Export and open the downloaded file in Inspector. It must verify without the example reader context. Edit a copy externally and reopen it to inspect actual verification failures.
6. Remove Bob, append another event and read as Bob. Previously shared history stays
   readable; future events use a new group key. Readmission grants that group's history.

The three demo identities and staged work stay in memory. This is a single-tab host
simulating several readers, not isolation between real user sessions. Reload clears
the keys and current work. Exports contain committed history and no identity secrets;
opening an exported file separately supplies no reader keys or application model. Use Inspect document for the existing reader's snapshot inspection. It transfers no private keys.

Readable replay reports its limited coverage. Locked events never get invented titles
or contents, and their count is not a count of distinct notes. Integrity, replay,
freshness and other recipients' decryptability are reported separately.

The notes example uses Ledger's common container. Earlier `concord-ledger` demo
exports are not converted or replayed as trusted documents; their raw input remains
inspectable. This is the same accepted alpha container break as the core libraries.

## Homepage destinations

Homepage calls to action open a working scenario rather than an empty tool:

- Identity → `/demo/identity` for the existing create/recover/unlock flow.
- Armour → `/inspect/entries?example=notes&focus=encrypted-payload`.
- Ledger → `/inspect/history?example=notes&focus=latest-commit`.
- Concord → `/examples` for editable encrypted notes.
- Seal → `/examples/seal` for a real `@ternent/seal` file proof.

The Notes inspection preset generates a separate signed document in this tab and opens
it as a public reader. Semantic focus resolves to the generated record IDs. Tabs and
browser navigation keep the preset; selecting another record clears its preset focus.
Refresh/new tabs create a fresh instance of the same scenario, not the same signed bytes.
URLs contain only known preset/view/focus names, not file contents, signing keys or
reader reports. Unknown presets cannot load code or remote documents.

The preset and the ordinary file inspector have two separate in-memory contexts.
“Your files” returns to the current imported file; opening a homepage preset does not
replace that file or change unfinished edits/staged events in the notes application.
Close on the preset returns to Your files. Ordinary `/inspect` stays a file-opening tool.

The Seal example signs the initial UTF-8 bytes once with a disposable local identity.
Editing the text invalidates the displayed result until verification runs again.
Verification calls Seal's public API and reports content-hash and proof-signature checks
separately, without treating the included key as a trusted person. Restore never re-signs.
Its content/proof stay in memory across navigation and clear on reload. This does not add
Seal proof import/verification to the Ledger document inspector.

## Standalone document inspector

Open `/inspect` to drag in a JSON file, choose a file or paste JSON. It shares the
site header, footer and content width. Once opened, the document has a compact
file toolbar and view navigation. File details live in Overview; document views
use normal page scrolling with bounded source previews. The tool accepts
UTF-8 text up to 16 MiB and keeps it in memory. Navigation between tools retains the
opened file; Close or reload clears the session. File contents are not uploaded,
stored in browser storage or executed. Download original returns the original bytes.

The JSON browser supports arbitrary JSON, with lazy expansion, bounded value previews
and paged children. The parsed view uses JavaScript number semantics and last-value
duplicate-key handling; Source always retains the exact input. Malformed JSON remains
available as source, without a parsed or trusted view.

Current `ledger` containers, including Concord documents, use the published Ledger
protocol verifier on **original bytes**. Hashes, signatures, schema and linkage results
are separate from runtime findings. Valid signatures establish integrity against the
included public keys; they do not establish personal trust, freshness or application
validity. Unsupported suites and versions are distinguished from failed verification.
Structurally checked but invalid history stays inspectable as untrusted evidence.

Concord's signed declarations and unavailable requirements are reported through its
published read-only runtime. No application model, system implementation, private key
or executable plugin from a file is loaded. Missing requirements mean system and model
replay are **not run**, even when Ledger integrity passes. Encrypted application content
stays encrypted; public metadata and original stored records remain available. Legacy
or other JSON formats get generic inspection with no signature-verification claim.

`src/modules/inspector` owns file inspection and shared record/history/source/
verification presentation. Examples can supply their existing reader inspection for the exact matching verified document/head. A stale, invalid or unrelated report is not applied. The Inspector labels supplied snapshot context and never puts it into the exported file. Independently opened files use public inspection. The tool exposes no mutation controls. Both tools share the record presentation styles, ToolPage layout and standard site header and footer. The header Tools menu links to Examples and Document inspector on every page, with contextual and footer links retained. Meaningful tests cover real signed inputs, foreign models,
tampering, duplicate keys, source/byte preservation, escaped content, failed and racing
file opens, route navigation and preservation of unfinished example work.

## Local identity demo

The separate identity demo keeps an encrypted identity in browser local storage.
Identity supplies mnemonic recovery and key derivation; Armour supplies age-compatible
passphrase encryption. Explicit unlock is used in both development and production.
Existing envelopes with the earlier `rage` metadata label remain readable; new
writes use `age`. No identity material is sent to a server.

## Editing the website

| Area                                | Files                                                        |
| ----------------------------------- | ------------------------------------------------------------ |
| Landing copy and sections           | `src/routes/home/RouteHome.vue`                              |
| Architecture diagram                | `src/routes/home/ArchitectureMap.vue`                        |
| Header, footer and section tracking | `src/App.vue`                                                |
| Route paths and subdomain mappings  | `src/routes/home/navigation.ts`                              |
| Examples                            | `src/modules/examples`, `src/routes/home/RouteExamples.vue`  |
| Local identity                      | `src/modules/demo-identity`, `src/routes/demo/identity`      |
| Site palettes and styles            | `src/themes.css`, `src/style.css`, `src/story.css`           |
| App metadata and package pins       | `src/app/config/app.config.ts`, `src/app/config/packages.ts` |
| Titles and canonical URLs           | `src/app/config/page-seo.ts`                                 |
| Static build and PWA                | `vite.config.ts`, `scripts/verify-dist.mjs`                  |

## Hosting

GitHub Actions runs one `pnpm check` job on pull requests and `main`. Cloudflare
Workers Builds installs the frozen lockfile, runs `pnpm build`, then uploads `dist/`.
Wrangler uses `wrangler.jsonc` for an assets-only deployment with clean HTML URLs
and the application's unknown-route fallback. It does not detect a framework or
rebuild the site. No Cloudflare Vite plugin or server Worker is needed.

Use these Workers Builds settings with the repository root as the root directory:

| Setting         | Production                                      | Staging                                              |
| --------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Worker          | `ternentdotdev`                                 | `staging`                                            |
| Build command   | `pnpm build`                                    | `pnpm build`                                         |
| Deploy command  | `npx wrangler@4.168.0 deploy --env ""`          | `npx wrangler@4.168.0 deploy --env staging`          |
| Preview command | `npx wrangler@4.168.0 versions upload --env ""` | `npx wrangler@4.168.0 versions upload --env staging` |

Check the deployment configuration without publishing:

```sh
npx wrangler@4.168.0 deploy --env "" --dry-run
npx wrangler@4.168.0 deploy --env staging --dry-run
```

`vercel.json` retains that host's clean URLs, application fallbacks, security
headers and service-worker revalidation. Other hosts need equivalent handling.
Publishing the live site is a separate review action.

The suite subdomains (`identity`, `armour`, `seal`, `ledger`, `concord`) replace their
root URLs with the matching route on `https://ternent.dev`. Explicit paths, queries
and hashes carry across; localhost and preview hosts are untouched. This redirect
runs before rendering. Initial navigation preserves direct section links and saved
scroll positions without a visible jump.

The production service worker precaches site assets and generated pages and checks
for updates. Offline availability depends on the browser's existing cache.
