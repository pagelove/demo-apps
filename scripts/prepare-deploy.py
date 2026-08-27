#!/usr/bin/env python3
"""Create a deploy-ready Pagelove directory for any operating system.

The repository uses a neutral host token in deployable source. This command
copies only deployable files and replaces that token with the target host in
HTML and JavaScript schema references.
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOST_TOKEN = "__PAGELOVE_HOST__"
TEXT_EXTENSIONS = {".html", ".js", ".css", ".svg", ".txt", ".xml"}
BINARY_EXTENSIONS = {".woff", ".woff2", ".png", ".jpg", ".jpeg", ".webp", ".ico"}


def valid_host(value: str) -> str:
    value = value.strip().rstrip("/")
    if re.fullmatch(r"[A-Za-z0-9.-]+", value) is None:
        raise argparse.ArgumentTypeError(
            "host must be a hostname such as your-host.onpagelove.com"
        )
    return value


def deployable_files() -> list[Path]:
    files: list[Path] = []
    roots = [
        ROOT / "index.html",
        ROOT / "gallery.css",
        ROOT / "favicon.svg",
        ROOT / "robots.txt",
        ROOT / "sitemap.xml",
        ROOT / "assets",
        *sorted(ROOT.glob("demo-*")),
    ]
    for directory in roots:
        if directory.is_file() and directory.suffix.lower() in TEXT_EXTENSIONS | BINARY_EXTENSIONS:
            files.append(directory)
            continue
        if not directory.is_dir():
            continue
        for path in sorted(directory.rglob("*")):
            if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS | BINARY_EXTENSIONS:
                files.append(path)
    return files


def prepare(host: str, output: Path) -> int:
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    count = 0
    for source in deployable_files():
        relative = source.relative_to(ROOT)
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source.suffix.lower() in TEXT_EXTENSIONS:
            content = source.read_text(encoding="utf-8")
            content = content.replace(HOST_TOKEN, host)
            destination.write_text(content, encoding="utf-8", newline="")
        else:
            shutil.copy2(source, destination)
        count += 1

    unresolved = []
    for path in output.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
            if HOST_TOKEN in path.read_text(encoding="utf-8"):
                unresolved.append(str(path.relative_to(output)))
    if unresolved:
        raise RuntimeError("Unresolved host-token references: " + ", ".join(unresolved))

    print(f"Prepared {count} files for {host} in {output}")
    print("Deploy the contents of that directory to the matching paths on your Pagelove host.")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True, type=valid_host)
    parser.add_argument("--output", default=str(ROOT / ".deploy"), type=Path)
    args = parser.parse_args()
    prepare(args.host, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
