#!/usr/bin/env bash
# Publish the built site to the gh-pages branch. No GitHub Actions needed.
# Usage: npm run deploy
set -euo pipefail

REPO_URL="$(git config --get remote.origin.url)"
REPO_NAME="$(basename -s .git "$REPO_URL")"

npm test
VITE_BASE="/${REPO_NAME}/" npm run build

TMP="$(mktemp -d)"
cp -r dist/. "$TMP/"
cp dist/index.html "$TMP/404.html"
touch "$TMP/.nojekyll"

cd "$TMP"
git init -q -b gh-pages
git remote add origin "$REPO_URL"
git add -A
git commit -q -m "Deploy built site"
git push --force origin gh-pages
echo "Published. It is live in about a minute at your GitHub Pages address."
