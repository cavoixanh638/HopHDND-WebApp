#!/usr/bin/env bash
# PR142 parent CAS PoC. No production access or deployment.
set -euo pipefail
if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo 'Usage: bash run.sh /path/to/HopHDND-WebApp/source [absolute-evidence-dir]' >&2
  exit 2
fi
SOURCE="$(cd "$1" && pwd)"
ROOT="$(cd "$SOURCE/.." && pwd)"
POC="$SOURCE/poc/pr142-parent-cas"
BASE=98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847
if ! git -C "$ROOT" merge-base --is-ancestor "$BASE" HEAD; then
  echo "ERROR: current HEAD is not based on exact candidate SHA $BASE" >&2;exit 3
fi
if [[ ! -f "$SOURCE/firebase/database.exclusive-candidate.rules.json" ]]; then
  echo 'ERROR: candidate full Rules missing' >&2;exit 4
fi
if [[ ! -x "$SOURCE/node_modules/.bin/firebase" || ! -x "$SOURCE/node_modules/.bin/vitest" ]]; then
  echo 'Install dependencies in source with npm ci; do not access production' >&2;exit 5
fi
EVIDENCE="${2:-$(mktemp -d /tmp/pr142-parent-cas-XXXXXXXX)}"
mkdir -p "$EVIDENCE"
EVIDENCE="$(cd "$EVIDENCE" && pwd)"
node "$POC/build-trial-rules.mjs" "$SOURCE/firebase/database.exclusive-candidate.rules.json" "$EVIDENCE"
node --test "$POC/contract-smoke.test.mjs" > "$EVIDENCE/contract-logic.stdout.log" 2>&1
for MODE in baseline trial; do
  FILE="$EVIDENCE/$MODE.full.rules.json"
  cat > "$EVIDENCE/config.$MODE.json" <<JSON
{
  "database":{"rules":"$FILE"},
  "emulators":{
    "database":{"host":"127.0.0.1","port":9000},
    "auth":{"host":"127.0.0.1","port":9099},
    "ui":{"enabled":false},"singleProjectMode":true
  }
}
JSON
  echo "PARENT_CAS_MODE=$MODE SOURCE=$BASE GIT_HEAD=$(git -C "$ROOT" rev-parse HEAD)" | tee -a "$EVIDENCE/index.txt"
  set +e
  FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
    PARENT_CASE_MODE="$MODE" PARENT_RULES_PATH="$FILE" \
    PARENT_WITNESS_OUT="$EVIDENCE/$MODE.witness.json" CI=true \
    "$SOURCE/node_modules/.bin/firebase" emulators:exec \
    --project demo-pr142-parent-cas --config "$EVIDENCE/config.$MODE.json" --only database,auth \
    "cd '$SOURCE' && '$SOURCE/node_modules/.bin/vitest' run --config '$POC/vitest.config.mjs'" \
    > "$EVIDENCE/$MODE.stdout.log" 2>&1
  CODE=$?
  set -e
  echo "$MODE exit=$CODE" | tee -a "$EVIDENCE/index.txt"
done
sha256sum "$EVIDENCE"/*.json "$EVIDENCE"/*.log > "$EVIDENCE/SHA256SUMS"
cat "$EVIDENCE/index.txt"
echo "EVIDENCE_DIR=$EVIDENCE"
echo 'Do not claim Emulator PASS unless trial and positive controls actually passed.'
