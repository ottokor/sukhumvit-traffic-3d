#!/usr/bin/env bash
# Renders a reviewer verdict JSON file as a Markdown PR comment.
# Usage: format-review.sh review.json "Heading"
set -euo pipefail
FILE="$1"; HEADING="${2:-Review}"
verdict=$(jq -r '.verdict' "$FILE")
case "$verdict" in
  approve)          badge="✅ **Verdict: approve** — safe for the human to merge" ;;
  request_changes)  badge="🔧 **Verdict: request changes** — the fixer agent will take a pass" ;;
  *)                badge="🙋 **Verdict: needs your decision**" ;;
esac
echo "### 🤖 $HEADING"
echo
echo "$badge"
echo
jq -r '.summary' "$FILE"
echo
q=$(jq -r '.question // ""' "$FILE")
if [ -n "$q" ]; then echo "**Question for you:** $q"; echo; fi
count=$(jq '.findings | length' "$FILE")
if [ "$count" -gt 0 ]; then
  echo "**Findings ($count)**"
  echo
  jq -r '.findings[] | "- **\(.severity)**\(if .file and .file != "" then " · `\(.file)`" else "" end): \(.description)\(if .fix and .fix != "" then "\n  - Fix: \(.fix)" else "" end)"' "$FILE"
  echo
fi
echo "_Automated review by the agent pipeline. Reply with \`@claude\` to discuss or change something._"
