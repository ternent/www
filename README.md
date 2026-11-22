# ternent.dev

The website for Ternent's open-source tools for local-first, encrypted, verifiable software. It includes an architecture walkthrough, an interactive Concord playground, and a local identity demo.

Built with Vue 3, TypeScript, Vue Router, Tailwind CSS, and `@ternent/ui`. Vite SSG generates static pages, with client-side navigation and a production service worker.

## Local development

Install Node.js and pnpm, then run:

```sh
pnpm install
pnpm dev
```

Use the local URL printed by Vite. The site and demos run without a backend or environment variables.

To build and preview the production site:

```sh
pnpm build
pnpm preview
```

The build writes `dist/` and verifies the web manifest, icons, service-worker precache assets, and manifest links in the generated pages. Service-worker registration runs in production builds.

## Pages

| Path | Content |
| --- | --- |
| `/` | Overview |
| `/idea` | The idea |
| `/architecture` | Architecture and building blocks |
| `/identity`, `/armour`, `/seal`, `/ledger`, `/concord` | Individual building-block sections |
| `/open-source` | Source repositories |
| `/about` | Work together |
| `/playground` | Rebuild application state from encrypted, signed history |
| `/playground/json`, `/playground/history`, `/playground/verification` | Playground inspectors |
| `/demo/identity` | Create or unlock a local identity |
| `/demo/identity/create`, `/demo/identity/recover`, `/demo/identity/login` | Identity demo modes |

The story routes share one page and navigate to their corresponding sections. Scrolling updates the URL without adding history entries. Legacy section hashes, such as `/#history`, resolve to clean paths such as `/ledger`. Unknown routes return to `/`.

The playground uses the published Identity, Armour, Ledger, and Concord packages for encryption, signatures, verification, and replay. Its disposable identity and state stay in memory; reloading clears the session. The separate identity demo stores an encrypted identity in browser local storage.

## Subdomains

The five suite subdomains serve the app through Cloudflare Workers. On page load, the browser replaces the subdomain URL with its destination on `https://ternent.dev`:

| Subdomain | Destination |
| --- | --- |
| `seal.ternent.dev` | `/seal` |
| `identity.ternent.dev` | `/identity` |
| `concord.ternent.dev` | `/concord` |
| `ledger.ternent.dev` | `/ledger` |
| `armour.ternent.dev` | `/armour` |

Root URLs map to the suite route. Explicit paths, query strings, and hashes carry across to the main host; the router then applies its usual legacy-hash handling. Other hosts, including localhost and preview hosts, are untouched.

This is a JavaScript redirect using `location.replace`, so Back does not revisit the subdomain entry. The mappings live in [navigation.ts](src/routes/home/navigation.ts); the redirect runs in [index.html](index.html) before the app bundle loads. Direct section links and saved refresh positions are set before the page becomes visible. Fade-in effects change opacity without moving the text. DNS and Worker routing are configured separately.

## Editing the site

| Area | Files |
| --- | --- |
| Story copy and sections | [RouteHome.vue](src/routes/home/RouteHome.vue) |
| Architecture diagram | [ArchitectureMap.vue](src/routes/home/ArchitectureMap.vue) |
| Header, footer, and section tracking | [App.vue](src/App.vue) |
| Route paths and subdomain mappings | [navigation.ts](src/routes/home/navigation.ts) |
| Playground interface and runtime | [src/modules/playground](src/modules/playground) |
| Identity demo | [src/modules/demo-identity](src/modules/demo-identity) and [its routes](src/routes/demo/identity) |
| Layout and motion styles | [story.css](src/story.css) |
| App metadata and base theme | [app.generated.ts](src/app/config/app.generated.ts) and [theme.generated.ts](src/app/config/theme.generated.ts) |
| Building-block themes | [suite-themes.ts](src/app/config/suite-themes.ts) |
| Page titles, descriptions, and canonical URLs | [page-seo.ts](src/app/config/page-seo.ts) |
| Static generation, PWA, and build configuration | [vite.config.ts](vite.config.ts) |

Story copy is authored in Vue components. [app.yaml](app.yaml) includes template landing content that does not drive the story page; this package has no manifest-sync or scaffolding command.

## Checks

```sh
pnpm test:unit
pnpm test:runtime
pnpm build
```

Unit tests cover routing, subdomain mappings, page metadata, themes, and components. Runtime tests exercise encrypted history replay, tamper detection, and access with an unrelated identity. Use `pnpm test:unit:watch` while developing.

Playwright specs and `pnpm test:e2e` are also present. For manual browser verification, check the story links and scroll tracking, playground replay and inspectors, identity create/recover/login modes, light and dark themes, mobile navigation, and reduced-motion behavior. Subdomain redirects need a host serving the app under the relevant subdomain.

## Hosting

Publish the contents of `dist/` to a static host. [vercel.json](vercel.json) configures clean URLs, an app fallback, security headers, and service-worker revalidation for Vercel. Other hosts need equivalent route handling for direct links.

The production service worker precaches site assets and generated pages and checks for updates automatically. Offline behavior depends on the assets already cached by the browser.
