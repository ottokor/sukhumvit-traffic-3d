#!/usr/bin/env bash
# GitHub never lets the built-in Actions token push changes to .github/workflows/*, whatever
# permissions the job declares. So before committing, move any workflow edits the agent made to
# .github/proposed-workflows/ (same file names), restore the originals, and record what was parked
# so the PR description can tell the human to apply them.
set -euo pipefail
mkdir -p .agent
: > .agent/parked.txt
git status --porcelain -- .github/workflows | awk '{print $NF}' | while read -r f; do
  [ -f "$f" ] || continue
  mkdir -p .github/proposed-workflows
  cp "$f" ".github/proposed-workflows/$(basename "$f")"
  git checkout -q -- "$f" 2>/dev/null || rm -f "$f"
  echo "$f" >> .agent/parked.txt
done
if [ -s .agent/parked.txt ]; then echo "Parked workflow edits:"; cat .agent/parked.txt; else echo "No workflow edits to park."; fi
