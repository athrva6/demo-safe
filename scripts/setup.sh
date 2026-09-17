#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (!((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22)) { console.error("Use Node 20.19+ or 22.12+."); process.exit(1); }'
python3 -m venv .venv
.venv/bin/python -m pip install --cache-dir .cache/pip -r backend/requirements-lock.txt
npm ci --cache .cache/npm
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
if [ ! -f frontend/.env ]; then cp frontend/.env.example frontend/.env; fi
printf '\nDemoSafe is ready. Run npm run dev, then open http://127.0.0.1:5173\n'
