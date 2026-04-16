import ast
import re
import tokenize

ALLOWLIST_RE = re.compile(r"#\s*(todo|fixme|note)\b", re.IGNORECASE)

IGNORE_COMMENTED_CODE_RE = re.compile(r"#\s*(def |class |import |from |if |for |while |return |print\(|\w+\s*=)")


class NoCommentChecker:
    """Flake8 plugin: flags explanatory comments"""

    name = "flake8-no-comments"
    version = "0.4.0"

    def __init__(self, tree, filename):
        self.filename = filename

    def run(self):
        with tokenize.open(self.filename) as f:
            tokens = list(tokenize.generate_tokens(f.readline))

        last_was_comment = False
        for tok_type, tok_str, start, _, _ in tokens:
            if tok_type == tokenize.COMMENT:
                lineno, col = start
                text = tok_str.strip()

                if ALLOWLIST_RE.match(text):
                    last_was_comment = True
                    continue

                if col == 0 and IGNORE_COMMENTED_CODE_RE.match(text):
                    last_was_comment = True
                    continue

                if col == 0 and last_was_comment:
                    last_was_comment = True
                    continue

                msg = "CMT001 Avoid committing explanatory comments"
                yield lineno, col, msg, type(self)

                last_was_comment = True
            else:
                last_was_comment = False


class DocstringDotChecker:
    """Flake8 plugin: flags summary docstring lines ending with a dot, ignoring Swagger/OpenAPI headers"""

    name = "flake8-docstring-dot"
    version = "0.2.0"

    IGNORE_RE = re.compile(
        r"^(---|tags:|parameters:|security:|\s*-\s.*|\s*)$",
        re.IGNORECASE,
    )

    def __init__(self, tree, filename):
        self.filename = filename
        self.tree = tree

    def _get_summary_line(self, docstring: str):
        """
        Returns the first non-Swagger summary line of the docstring
        """
        for line in docstring.splitlines():
            stripped = line.strip()

            if not stripped or self.IGNORE_RE.match(stripped):
                continue

            return stripped

        return None

    def run(self):
        for node in ast.walk(self.tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Module)):
                docstring = ast.get_docstring(node)

                if not docstring:
                    continue

                summary = self._get_summary_line(docstring)
                if not summary:
                    continue

                if summary.endswith("."):
                    lineno = node.body[0].lineno if node.body else node.lineno
                    col = 0
                    msg = "CMT002 Docstring summary should not end with a dot"
                    yield lineno, col, msg, type(self)
