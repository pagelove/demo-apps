# Contributing

1. Create a branch for your change.
2. Keep each demo deployable with no build step.
3. Do not commit API keys, passwords, or personal data.
4. Run `python scripts/check-repo.py` before opening a pull request. It checks
   required files, `/assets/` references, page metadata, whitespace, and that
   no live hostname or secret was committed.
5. If you change a demo's behavior, update its README entry and document any
   Pagelove permissions or schema changes.

Pull requests should explain the user-visible change, the Pagelove mechanics
demonstrated, and the verification performed on a clean test host.
