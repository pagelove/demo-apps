# Contributing

1. Create a branch for your change.
2. Keep each demo deployable with no build step.
3. Do not commit API keys, passwords, or personal data.
4. Run `python scripts/check-repo.py` and `python scripts/test-deploy.py` before
   opening a pull request. They check deployed references, page metadata,
   unsafe link schemes, whitespace, hostnames, secrets, and bundle integrity.
5. For user-interface changes, run the pinned browser gates:
   `bun install --frozen-lockfile`, `bun run install:browser`,
   `bun run prepare:test`, and `bun run test:browser`.
6. If you change a demo's behavior, update its README entry and document any
   Pagelove permissions or schema changes.

Pull requests should explain the user-visible change, the Pagelove mechanics
demonstrated, and the verification performed on a clean test host.
Follow [the live-host checklist](docs/LIVE-TESTING.md) when a change affects
writes, permissions, uniqueness, or transitions.
