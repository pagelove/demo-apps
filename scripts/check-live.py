#!/usr/bin/env python3
"""Run non-destructive smoke checks against a deployed Pagelove host."""

from __future__ import annotations

import argparse
import re
import urllib.error
import urllib.request


PUBLIC_PATHS = [
    "/",
    "/demo-01-event/",
    "/demo-02-show-and-tell/",
    "/demo-03-resource-exchange/",
    "/demo-04-accountability/",
    "/demo-05-professional/",
    "/favicon.svg",
    "/assets/og-demo-apps.png",
]
PRIVATE_PATH = "/demo-04-accountability/feed.html"


def valid_host(value: str) -> str:
    value = value.strip().rstrip("/")
    if re.fullmatch(r"[A-Za-z0-9.-]+", value) is None:
        raise argparse.ArgumentTypeError("host must be a hostname without https://")
    return value


def status_for(url: str, timeout: float) -> tuple[int, bytes]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "pagelove-demo-apps-live-check/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True, type=valid_host)
    parser.add_argument("--timeout", type=float, default=15.0)
    args = parser.parse_args()

    base = f"https://{args.host}"
    errors: list[str] = []
    for path in PUBLIC_PATHS:
        status, body = status_for(base + path, args.timeout)
        if status != 200:
            errors.append(f"GET {path} returned {status}; expected 200")
        elif path == "/" and b"__PAGELOVE_HOST__" in body:
            errors.append("GET / still contains the unresolved host token")

    status, _ = status_for(base + PRIVATE_PATH, args.timeout)
    if status != 401:
        errors.append(f"Anonymous GET {PRIVATE_PATH} returned {status}; expected 401")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print(
        f"Live checks passed for {len(PUBLIC_PATHS)} public resources; "
        "the members-only feed returned 401 anonymously."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
