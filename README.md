# Pagelove demo apps

Working apps built on Pagelove: a platform that stores HTML natively and lets
you read and write individual elements over plain HTTP, addressed with CSS
selectors. There is no backend, no database, and no build step in any of
this: the page you are looking at *is* the data store.

Each demo is seeded with real content, wired to real writes, and denied by
default until a rule says otherwise. Every one leans on a different Pagelove
mechanic, and every one stands on its own: deploy just one, and it works
without any of the others being present.

| # | Demo | What it shows |
|---|---|---|
| 1 | [`demo-01-event`](demo-01-event/) | RSVP, capacity, and a waitlist nobody has to manage |
| 2 | [`demo-02-show-and-tell`](demo-02-show-and-tell/) | Publish a project, react to one, leave a comment |
| 3 | [`demo-03-resource-exchange`](demo-03-resource-exchange/) | Claim a tool, and only one person can |
| 4 | [`demo-04-accountability`](demo-04-accountability/) | One check-in a day, on a members-only feed |
| 5 | [`demo-05-professional`](demo-05-professional/) | A directory, discussions and resources in one view |

Deploy them to your own Pagelove host to see them running: see
[Deploy to your Pagelove host](#deploy-to-your-pagelove-host).

## Key Concepts Used in These Demos

Each demo exercises a different slice of the Pagelove platform:

| Demo | Core mechanic | Reference |
|------|---------------|-----------|
| `demo-01-event` | **Schema** with a `unique` property (`rsvpKey` = event + attendee, so one RSVP per member per event is enforced on the server), plus selector-scoped **AuthorizationRule**s that open only `#pl-rsvps` to writes | [Schema](https://docs.pagelove.com/reference/modeling-data/Schema/), [AuthorizationRule](https://docs.pagelove.com/reference/permissions/AuthorizationRule/) |
| `demo-02-show-and-tell` | **ShapeConstraint** governing what may be appended to each collection, plus a `unique` `reactionKey` so a person can react to a submission only once | [ShapeConstraint](https://docs.pagelove.com/reference/modeling-data/ShapeConstraint/), [Schema](https://docs.pagelove.com/reference/modeling-data/Schema/) |
| `demo-03-resource-exchange` | **TransitionConstraint** as a real state machine (`open → claimed → completed`, and `claimed → open` to release), so a second claim on a held listing is rejected at the storage layer | [TransitionConstraint](https://docs.pagelove.com/reference/reacting-to-changes/TransitionConstraint/), [Schema](https://docs.pagelove.com/reference/modeling-data/Schema/) |
| `demo-04-accountability` | **AuthorizationRule** Deny-then-Allow pair gating `feed.html` to signed-in accounts, plus a `unique` `checkInKey` (date + member) for one check-in per person per day | [AuthorizationRule](https://docs.pagelove.com/reference/permissions/AuthorizationRule/), [Permissions](https://docs.pagelove.com/reference/permissions/) |
| `demo-05-professional` | **ShapeConstraint** across three independent collections on one page (directory, discussions, resources), each with its own selector-scoped write rule | [ShapeConstraint](https://docs.pagelove.com/reference/modeling-data/ShapeConstraint/), [Permissions](https://docs.pagelove.com/reference/permissions/) |

One thing these demos deliberately do *not* claim: capacity and waitlist
placement in `demo-01-event` are computed in the browser, not enforced by the
platform. A Trigger sees only the incoming request, never the count of
existing RSVPs, so it cannot compare against a capacity. The waitlist is a
courtesy label; the `unique` `rsvpKey` is the part the server actually
guarantees. The demo says so in its own comments too.

See the [Recipes](https://docs.pagelove.com/recipes/) for task-oriented guides and the [full Reference](https://docs.pagelove.com/reference/) for wire-level details.

`demo-04-accountability` gates its `feed.html` to members only: anonymous GET
returns a real 401 from the storage layer, not a client-side redirect. A
"member" here is Pagelove's built-in `users` group: any account signed in to
this host, the same one you'd sign in with to deploy over WebDAV, not a
roster this demo curates itself. The rule is declared right in `feed.html`:

```html
<meta itemprop="actor" content="*">
<meta itemprop="resource" content="/demo-04-accountability/feed.html">
<meta itemprop="method" content="GET">
<meta itemprop="action" content="Deny">
```

paired with a second rule granting `users` an `Allow` on the same method and
resource. Deny-then-Allow, evaluated together, is what makes the feed
readable to any signed-in account and closed to everyone else.

The "Working as" picker on the page is unrelated to this and grants nothing:
it's a plain `<select>`, stored in `localStorage`, that only labels which
seeded name a check-in is attributed to. Posting a check-in doesn't require
real sign-in at all (`feed.html` allows anonymous `POST` to `#pl-checkins`);
only *reading* the feed does.

## Structure

```
demo-0N-name/    one folder per demo: app.js, index.html, styles.css,
                 motion.js, schema/ (Schema/ShapeConstraint definitions),
                 and any gated sub-pages
index.html       public gallery entry point
gallery.css      gallery styles
favicon.svg      shared favicon
robots.txt       crawler policy for the public gallery and demo routes
sitemap.xml      public gallery and demo-route sitemap
assets/          shared runtime: motion-core.js (entrance-animation guard),
                 ui-enhance.js (a11y hardening), fonts/,
                 vendor/anime.umd.min.js, and the OG image
scripts/         prepare-deploy.py (rewrite the host token for your own),
                 check-repo.py (the checks CI runs), and og-card.html
                 (the source the Open Graph image is rendered from)
```

Every demo references its assets by absolute path (`/assets/...`,
`/demo-02-show-and-tell/...`). That's load-bearing, not incidental: see
[Deploy to your Pagelove host](#deploy-to-your-pagelove-host) below.

## Demo Conventions

Every demo folder contains:

```
demo-0N-name/
├── index.html          # Entry page (references absolute paths: /assets/..., /demo-0N-name/...)
├── app.js              # Client-side logic (plain fetch to absolute paths, no framework)
├── styles.css          # Demo-specific styles
├── motion.js           # Entrance animations (uses /assets/motion-core.js)
└── schema/             # Schema & ShapeConstraint declarations (itemtype URLs register globally)
    ├── *.html          # One file per governed type
```

Assets in `/assets/` are shared; push once regardless of demo count.

## Deploy to Your Pagelove Host

Every file is a live Pagelove document. Deploy via WebDAV `PUT`, with no build step.

### Prerequisites
- A Pagelove host (create one in the [console](https://console.pagelove.com/))
- An API key from **API keys** in the console (set expiry or leave blank)
- `curl` (or any WebDAV client)

### Prepare a deploy directory on any operating system

The preparation script uses only Python's standard library, so the same
command works in PowerShell, Command Prompt, macOS Terminal, and Linux shells:

```text
python scripts/prepare-deploy.py --host your-host.onpagelove.com
```

The command writes a `.deploy/` directory containing the gallery, every
matching demo route, shared assets, crawler metadata, and host-specific schema references. It
does not modify your source files. The target host must be a hostname only,
without `https://`.

The source files use `__PAGELOVE_HOST__` as a neutral deployment placeholder
for canonical URLs, vocabulary URLs, and sitemap metadata. `prepare-deploy.py`
replaces that token everywhere it appears, including generated client-side
fragments and schema declarations.
Always prepare a directory before deploying to a different host. The script
creates the standardized `demo-01-event` through `demo-05-professional` routes;
it does not delete older routes that may already exist on a host.

Upload the contents of `.deploy/` to the matching paths on your Pagelove host
using the [Pagelove WebDAV workflow](https://docs.pagelove.com/all/reference/protocol/).
Use the API key only in your local environment or credential store; never put
it in this repository.

- `PUT` creates (`201`) or updates (`200`); no directory creation is needed
- Push `/assets/` once; all demos reference it by absolute path
- Rules (`AuthorizationRule`, `ShapeConstraint`, etc.) are *inside* each HTML file and activate on deploy
- WebDAV bypasses rules, letting you write the very rules that govern subsequent access

### Validate before deployment

```text
python scripts/check-repo.py
python scripts/test-deploy.py
```

These commands verify required files, every deployed HTML reference, page
metadata, unsafe link schemes, live hostnames, secrets, and the exact contents
of a prepared deployment bundle.

The repository also has pinned Node, Bun, browser, accessibility, and page-load
performance checks.
They are development-only; the deployed demos still have no package install or
build step:

```text
bun install --frozen-lockfile
bun run install:browser
bun run prepare:test
bun run test:browser
```

After deploying to a disposable host, run the non-destructive live smoke test:

```text
python scripts/check-live.py --host your-host.onpagelove.com
```

See [Live-host verification](docs/LIVE-TESTING.md) for the repeatable write,
uniqueness, transition, authentication, and cleanup checklist. CI runs the
local repository, deployment, browser, accessibility, and performance gates;
live-host checks remain an explicit pre-release step because they require a
deployed Pagelove host.

## Iteration Workflow (No Local Preview)

Since Pagelove has no local emulator (the platform *is* the storage), iterate by deploying:

1. Deploy to a test host
2. Edit files in the console's WebDAV browser, or
3. Re-run the deploy script after changes

To learn the mental model, the [Learn tutorial](https://docs.pagelove.com/learn/your-first-app/) builds a working shopping list on a live host.

## Demo limitations

These are production-quality interactive demonstrations, not complete
multi-user applications. They intentionally use seeded identities and some
anonymous writes so visitors can try the flows without account setup.

- Event capacity and waitlist promotion are demonstrated in client-side code;
  they are not safe for concurrent real-world reservations.
- The accountability feed demonstrates a members-only read rule, while its
  write path is intentionally open for the demo.
- The identity picker labels seeded demo users; it is not authentication.
- Replace the demo authorization, moderation, rate limiting, and data-retention
  assumptions before using these patterns with real user data.

The [security policy](SECURITY.md) describes the intended public-repository
scope.

## Resources

- [Learn](https://docs.pagelove.com/learn/): step-by-step tutorials: your first app (shopping list), build a blog; teaches the mental model on a live host
- [Reference](https://docs.pagelove.com/reference/): full platform spec: reading/writing (HTTP methods, Range selectors, SSE), composing pages (bindings, includes, pagination), modeling data (Schema, ShapeConstraint, resolvers), permissions (AuthorizationRule, Groups), reacting to changes (Processors, Triggers, TransitionConstraints), protocol (WebDAV, OPTIONS, QUERY)
- [Recipes](https://docs.pagelove.com/recipes/): task-focused guides: group-based permissions, webhooks on change, paginating lists, composite uniqueness, primitives layer, third-party widgets, state machines
- [Languages](https://docs.pagelove.com/languages/): authoring languages reference: Sessel (expression language), JavaScript (ES modules), Liquid (template language)
- [Console](https://console.pagelove.com/): create and manage hosts, generate API keys, browse/edit files via WebDAV UI
- [Pagelove on GitHub](https://github.com/pagelove): official projects, documentation, and development tools

## License

MIT. See [LICENSE](LICENSE).

## Document-first development review

Read [the edition2.4 project record](DOCUMENT-FIRST-REVIEW.md) for source authority, operation/recovery contracts, justified runtime exceptions and current acceptance limits. Plans and verification are recorded in audit/CHANGELOG.md. Local tests do not establish live privacy, authorization or physical-device acceptance.
