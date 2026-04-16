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

## Windows Setup (Recommended)

If you're on Windows with Defender available, update `config.json` with these exact values:

```json
{
  "defender": {
    "qa_log_path": "C:\\Users\\<YourUsername>\\AppData\\Roaming\\defender-host\\session-qa.jsonl",
    "project_path": "D:\\03_Projects\\OA_Coder_Main"
  }
}
```

**Prerequisites:**
- **PowerShell SAPI** (built-in on Windows): TTS engine for audio generation
- **ffplay** (from ffmpeg): Audio playback. Download from https://ffmpeg.org/download.html
- **Node.js 18+**: Verify with `node --version`

**Verify setup:**
```bash
npm run preflight
```

Should show all `OK` checks (Node, ffplay, PowerShell SAPI, Defender path, QA log).

### Generate Audio Cache

```bash
npm run setup
```

This generates .wav files for all questions in audio-cache/ using PowerShell SAPI TTS. Takes 30-60 seconds depending on scenario size.

### Run Live Test

**Terminal 1 - Start Defender:**
```bash
cd D:\03_Projects\OA_Coder_Main
npm start
```

Wait for Defender to initialize and show "Recording" or "Ready" status.

**Terminal 2 - Run Simulator:**
```bash
cd /path/to/interview-simulator
node bin/run.js scenarios/classifier-only.json
```

The simulator will:
1. Play each question audio through system speaker
2. Wait for answers in the QA log (~60 sec per question)
3. Evaluate and report results to console and reports/

### Troubleshooting

- **No QA log entries**: Check Defender is running and recording. Ensure path in config.json matches actual Defender output path.
- **TTS command not available**: Verify PowerShell can run scripts: `powershell -NoProfile -Command "Write-Host 'OK'"`
- **ffplay not found**: Reinstall ffmpeg and ensure ffplay is on PATH.

## Linux/macOS Setup

- On Linux: install `ffmpeg` (for ffplay) and `espeak-ng` for TTS.
- Update config.json defender.qa_log_path to your Defender session log location (typically ~/.config/defender/session-qa.jsonl).

## Live Test Checklist

1. Defender repo is available and starts (`npm start`) in a separate terminal.
2. Defender screen share/system audio capture is active.
3. QA log file exists at configured path (verify with `npm run preflight`).
4. Audio cache generated (`npm run setup`).
5. Run scenario in live mode:
   ```bash
   node bin/run.js scenarios/full-interview.json
   ```
   Or with explicit paths:
   ```bash
   node bin/run.js scenarios/classifier-only.json \
     --qa-log "C:\Users\<User>\AppData\Roaming\defender-host\session-qa.jsonl" \
     --defender-log "<path-to-defender.log>"
   ```
