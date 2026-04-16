import argparse
import difflib
import os
import re
from pathlib import Path
from typing import Iterable, List

import libcst as cst

ALLOWLIST_RE = re.compile(r"#\s*(todo|fixme|note)\b", re.IGNORECASE)

COMMENTED_CODE_RE = re.compile(r"#\s*(def |class |import |from |if |for |while |return |print\(|\w+\s*=)")

REMOVED_COMMENTS: List[str] = []


def should_preserve_comment(raw: str) -> bool:
    text = raw.strip()

    if not text.startswith("#"):
        return True

    if text.startswith("#!"):
        return True

    if text.lower().startswith("# -*-"):
        return True

    if ALLOWLIST_RE.match(text):
        return True

    if COMMENTED_CODE_RE.match(text):
        return True

    return False


class RemoveCommentsTransformer(cst.CSTTransformer):
    def __init__(self, file_path: Path, verbose: bool = False):
        super().__init__()
        self.file_path = file_path
        self.verbose = verbose

    def record_removal(self, comment_node):
        if not self.verbose:
            return
        text = comment_node.value.strip()
        position = self.get_metadata(cst.metadata.PositionProvider, comment_node)
        REMOVED_COMMENTS.append(f"{self.file_path}:{position.start.line}: removed comment → {text}")

    def leave_EmptyLine(self, original_node: cst.EmptyLine, updated_node: cst.EmptyLine):
        if updated_node.comment and not should_preserve_comment(updated_node.comment.value):
            self.record_removal(updated_node.comment)
            return updated_node.with_changes(comment=None)
        return updated_node

    def leave_TrailingWhitespace(self, original_node, updated_node):
        if updated_node.comment and not should_preserve_comment(updated_node.comment.value):
            self.record_removal(updated_node.comment)
            return updated_node.with_changes(comment=None)
        return updated_node


SKIP_DIRS = {
    ".git",
    ".venv",
    ".ruff_cache",
    "__pycache__",
    ".pytest_cache",
    "migrations",
    "alembic",
}


def iter_python_files(paths: Iterable[Path]) -> Iterable[Path]:
    for base in paths:
        if base.is_file() and base.suffix == ".py":
            yield base
        elif base.is_dir():
            for root, dirs, files in os.walk(base):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for name in files:
                    if name.endswith(".py"):
                        yield Path(root) / name


def process_file(path: Path, mode: str, show_diff: bool, verbose: bool) -> bool:
    """Mode ∈ {"apply", "dry-run"}
    Returns True if file changed
    """
    try:
        original_code = path.read_text(encoding="utf-8")
    except Exception:
        return False

    try:
        module = cst.parse_module(original_code)
    except cst.ParserSyntaxError:
        return False

    wrapper = cst.metadata.MetadataWrapper(module)
    transformer = RemoveCommentsTransformer(file_path=path, verbose=verbose)
    new_module = wrapper.visit(transformer)
    new_code = new_module.code

    if new_code == original_code:
        return False

    if mode == "dry-run":
        if show_diff:
            diff = difflib.unified_diff(
                original_code.splitlines(),
                new_code.splitlines(),
                fromfile=str(path),
                tofile=str(path),
                lineterm="",
            )
            print("\n".join(diff))
        else:
            print(f"[DRY-RUN] Would clean comments in: {path}")
        return True

    path.write_text(new_code, encoding="utf-8")
    print(f"[UPDATED] Cleaned comments in: {path}")

    if show_diff:
        diff = difflib.unified_diff(
            original_code.splitlines(),
            new_code.splitlines(),
            fromfile=str(path),
            tofile=str(path),
            lineterm="",
        )
        print("\n".join(diff))

    return True


def main(argv: list[str] | None = None) -> int:
    global REMOVED_COMMENTS
    REMOVED_COMMENTS = []

    parser = argparse.ArgumentParser(
        prog="clean-ai-comments",
        description="Remove AI/explanatory comments while preserving TODO/FIXME/NOTE and commented-out code.",
    )

    parser.add_argument("paths", nargs="+", help="Files or directories to process.")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Show what would change but do not write.")
    parser.add_argument("--diff", action="store_true", help="Show unified diff of changes.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show removed comments.")
    parser.add_argument("--apply", action="store_true", help="Apply changes (default behavior).")

    args = parser.parse_args(argv)

    if args.dry_run:
        mode = "dry-run"
    else:
        mode = "apply"

    if args.apply:
        mode = "apply"

    base_paths = [Path(p).resolve() for p in args.paths]

    changed_any = False

    for file in iter_python_files(base_paths):
        changed = process_file(
            file,
            mode=mode,
            show_diff=args.diff,
            verbose=args.verbose,
        )
        changed_any |= changed

    if args.verbose and REMOVED_COMMENTS:
        print("\n========= Removed Comments =========")
        for entry in REMOVED_COMMENTS:
            print(entry)
        print("===================================")

    if mode == "dry-run" and not changed_any:
        print("No files would be changed.")
    elif mode == "apply" and not changed_any:
        print("No files were changed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
