#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .tools/sam
.tools/sam/bin/python -m pip install --cache-dir .cache/pip 'aws-sam-cli>=1.140,<2'
.tools/sam/bin/sam --version
printf '\nUse .tools/sam/bin/sam from this project. No global installation was changed.\n'
