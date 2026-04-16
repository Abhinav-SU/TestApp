# Interview Simulator

A standalone Node.js app that simulates interviewer audio, waits for Defender answers, evaluates outputs, and generates reports.

## Quick Start

1. Install deps:
   npm install
2. Generate cached audio:
   node bin/setup.js
3. Run a scenario:
   node bin/run.js scenarios/full-interview.json
4. Run dry test mode (no Defender required):
   npm run run:dry
5. Run automated tests:
   npm test
6. Check live-mode readiness:
   npm run preflight

## Run Modes

- Live mode: plays audio and waits for Defender answers from QA log.
- Dry mode: skips playback/watcher and injects deterministic mock answers for fast validation.

CLI options:

- --dry-run
- --no-semantic
- --qa-log <path>
- --defender-log <path>

## Core Flow

- Reads scenario JSON
- Plays each question audio through system output
- Watches Defender session QA log for an answer
- Evaluates deterministic checks and optional semantic checks
- Writes JSON and Markdown reports to reports/

## Notes

- Ensure Defender audio capture is active before running.
- On Linux, install ffmpeg if ffplay is missing.
- Update config.json defender.qa_log_path to your local Defender log path.

## Live Test Checklist

1. Defender repo is available and starts (`npm start`) in a separate terminal.
2. Defender screen share/system audio capture is active.
3. QA log file exists at configured path.
4. Audio cache generated (`npm run setup`).
5. Run scenario in live mode:
   node bin/run.js scenarios/full-interview.json --qa-log <path-to-session-qa.jsonl> --defender-log <path-to-defender.log>
