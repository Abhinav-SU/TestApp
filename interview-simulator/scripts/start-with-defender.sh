#!/usr/bin/env bash
set -euo pipefail

SCENARIO_PATH="${1:-scenarios/full-interview.json}"
DEFENDER_DIR="${DEFENDER_DIR:-../defender}"
SIM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "$DEFENDER_DIR" ]]; then
  echo "Defender directory not found at $DEFENDER_DIR"
  echo "Set DEFENDER_DIR to override, for example: DEFENDER_DIR=/path/to/defender"
  exit 1
fi

echo "Starting Defender in $DEFENDER_DIR"
pushd "$DEFENDER_DIR" > /dev/null
npm start > defender.log 2>&1 &
DEFENDER_PID=$!
popd > /dev/null

cleanup() {
  if kill -0 "$DEFENDER_PID" 2>/dev/null; then
    kill "$DEFENDER_PID" || true
  fi
}
trap cleanup EXIT

echo "Waiting 8s for Defender boot..."
sleep 8

echo "Running simulator with scenario: $SCENARIO_PATH"
pushd "$SIM_DIR" > /dev/null
node bin/run.js "$SCENARIO_PATH" --qa-log "$HOME/.config/defender/session-qa.jsonl" --defender-log "$DEFENDER_DIR/defender.log"
popd > /dev/null
