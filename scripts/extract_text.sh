#!/usr/bin/env bash
# Plain-text extraction (theory/formula text) from converted PDFs and original PDFs -> data/text/
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/data/text"
for f in "$ROOT"/derived/docs-pdf/*.pdf "$ROOT"/source/rsandt/media/*.pdf; do
  pdftotext -layout "$f" "$ROOT/data/text/$(basename "${f%.pdf}").txt" || echo "FAIL $f"
done
