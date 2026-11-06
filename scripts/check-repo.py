#!/usr/bin/env python3
"""Run dependency-free checks for the Pagelove demo repository."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    ROOT / "favicon.svg",
    ROOT / "robots.txt",
    ROOT / "sitemap.xml",
    ROOT / "assets" / "pagelove-logo-official.svg",
    ROOT / "assets" / "vendor" / "anime.umd.min.js",
    ROOT / "assets" / "fonts" / "SourceSerif4-Variable.woff",
    ROOT / "assets" / "fonts" / "Inter-Variable.woff2",
    ROOT / "assets" / "fonts" / "FiraCode-Regular.woff2",
    ROOT / "package.json",
    ROOT / "bun.lock",
    ROOT / "playwright.config.mjs",
    ROOT / "tests" / "demo-pages.spec.js",
    ROOT / "scripts" / "test-deploy.py",
    ROOT / "scripts" / "check-live.py",
    ROOT / "scripts" / "serve-test.cjs",
]
USER_PAGES = [ROOT / "index.html", *sorted(ROOT.glob("demo-*/index.html"))]
DOCUMENT_PAGES = sorted(set([*USER_PAGES, *ROOT.glob("demo-*/*.html")]))
DEPLOYED_HTML = [ROOT / "index.html", *sorted(ROOT.glob("demo-*/**/*.html"))]
ROOT_REF = re.compile(r"(?:src|href)=[\"'](/[^\"']+)[\"']")
UNSAFE_HREF = re.compile(r"href=[\"']\s*(?:javascript|data|vbscript):", re.IGNORECASE)
SKIP_DIRS = {
    ".git",
    ".deploy",
    ".deploy-ci",
    ".ci-build",
    ".lighthouseci",
    "__pycache__",
    ".venv",
    "node_modules",
    "playwright-report",
    "test-results",
}
BINARY_SUFFIXES = {".woff", ".woff2", ".png", ".jpg", ".jpeg", ".webp", ".ico"}
SECRET_PATTERN = re.compile(r"(?:pk_|sk_live_|AKIA)[A-Za-z0-9_-]{12,}")
# Deployment hostnames must stay tokenized. prepare-deploy.py substitutes
# __PAGELOVE_HOST__ for the target host, so a real one committed to source
# would point every clone of this repo at somebody else's live data.
HOST_PATTERN = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.onpagelove\.com")
ALLOWED_HOSTS = {"your-host.onpagelove.com"}
TRAILING_WS = re.compile(r"[ \t]+$")


def check() -> list[str]:
    errors: list[str] = []
    for path in REQUIRED_FILES:
        if not path.is_file():
            errors.append(f"Missing required file: {path.relative_to(ROOT)}")

    for page in DEPLOYED_HTML:
        if not page.is_file():
            errors.append(f"Missing deployed HTML file: {page.relative_to(ROOT)}")
            continue
        html = page.read_text(encoding="utf-8")
        for match in ROOT_REF.finditer(html):
            reference = match.group(1).split("?", 1)[0].split("#", 1)[0]
            candidate = ROOT / reference.lstrip("/")
            if reference.endswith("/"):
                candidate = candidate / "index.html"
            if not candidate.is_file():
                errors.append(f"{page.relative_to(ROOT)} references missing {reference}")
        if UNSAFE_HREF.search(html):
            errors.append(f"{page.relative_to(ROOT)} contains an unsafe link scheme")

    for page in DOCUMENT_PAGES:
        html = page.read_text(encoding="utf-8")
        if '<meta name="description"' not in html:
            errors.append(f"{page.relative_to(ROOT)} has no meta description")
        if 'rel="icon"' not in html:
            errors.append(f"{page.relative_to(ROOT)} has no favicon link")
        if "Content-Security-Policy" not in html:
            errors.append(f"{page.relative_to(ROOT)} has no CSP")

    for path in ROOT.rglob("*"):
        if not path.is_file() or SKIP_DIRS.intersection(path.parts):
            continue
        if path.suffix.lower() in BINARY_SUFFIXES:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        relative = path.relative_to(ROOT)

        if SECRET_PATTERN.search(text):
            errors.append(f"Possible secret detected in {relative}")

        for host in sorted(set(HOST_PATTERN.findall(text)) - ALLOWED_HOSTS):
            errors.append(f"{relative} hard-codes the live host {host}; use __PAGELOVE_HOST__")

        # Historical audit payloads retain their exact bytes; secrets/host checks above still apply.
        if relative.parts[0] == "audit" and path.suffix.lower() in {".patch", ".json"}:
            continue

        for number, line in enumerate(text.split("\n"), start=1):
            if TRAILING_WS.search(line):
                errors.append(f"{relative}:{number} has trailing whitespace")

        if text and not text.endswith("\n"):
            errors.append(f"{relative} has no newline at end of file")
    return errors


def main() -> int:
    errors = check()
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(
        "Repository checks passed for "
        f"{len(DOCUMENT_PAGES)} documents and {len(DEPLOYED_HTML)} deployed HTML files."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
