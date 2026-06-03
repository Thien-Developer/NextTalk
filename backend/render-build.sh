#!/bin/bash
set -e
chmod +x render-build.sh
npm install -g pnpm --prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
pnpm install --ignore-scripts=false
pnpm run build
