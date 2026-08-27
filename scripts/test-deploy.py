#!/usr/bin/env python3
"""Verify that prepare-deploy.py creates an exact, token-free bundle."""

from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare-deploy.py"
TEST_HOST = "ci-demo.example"


def load_prepare_module():
    spec = importlib.util.spec_from_file_location("prepare_deploy", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    module = load_prepare_module()
    sources = module.deployable_files()
    expected_paths = {path.relative_to(ROOT) for path in sources}

    with tempfile.TemporaryDirectory(prefix="pagelove-deploy-test-") as temporary:
        output = Path(temporary)
        count = module.prepare(TEST_HOST, output)
        actual_paths = {
            path.relative_to(output) for path in output.rglob("*") if path.is_file()
        }

        errors: list[str] = []
        if count != len(expected_paths):
            errors.append(f"prepare() reported {count} files; expected {len(expected_paths)}")
        if actual_paths != expected_paths:
            missing = sorted(str(path) for path in expected_paths - actual_paths)
            extra = sorted(str(path) for path in actual_paths - expected_paths)
            if missing:
                errors.append("Missing bundle files: " + ", ".join(missing))
            if extra:
                errors.append("Unexpected bundle files: " + ", ".join(extra))

        for source in sources:
            relative = source.relative_to(ROOT)
            destination = output / relative
            if source.suffix.lower() in module.TEXT_EXTENSIONS:
                expected = source.read_text(encoding="utf-8").replace(
                    module.HOST_TOKEN, TEST_HOST
                )
                actual = destination.read_text(encoding="utf-8")
                if module.HOST_TOKEN in actual:
                    errors.append(f"Unresolved host token in {relative}")
                if actual != expected:
                    errors.append(f"Unexpected transformed content in {relative}")
            elif source.read_bytes() != destination.read_bytes():
                errors.append(f"Binary file changed during preparation: {relative}")

        if errors:
            for error in errors:
                print(f"ERROR: {error}")
            return 1

    print(f"Deployment bundle test passed for {len(expected_paths)} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
