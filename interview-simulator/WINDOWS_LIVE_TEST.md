# Windows Live Test Execution Guide

Complete step-by-step instructions to run the simulator against Defender on Windows with PowerShell SAPI TTS.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] ffmpeg installed with ffplay available (`ffplay -version`)
- [ ] PowerShell 5.0+ available (`powershell -Version`)
- [ ] Defender repo at `D:\03_Projects\OA_Coder_Main` (with .env containing GEMINI_API_KEY)
- [ ] Git and this simulator repo cloned

## Phase 1: Setup (5 min)

### 1.1 Clone or Pull Latest

```bash
# If first time:
git clone https://github.com/Abhinav-SU/TestApp.git
cd TestApp/interview-simulator

# If already cloned:
cd interview-simulator
git fetch origin
git checkout feature/interview-simulator-harness
git pull origin
```

### 1.2 Install Dependencies

```bash
npm install
```

Expected output:
```
added N packages in Xs
```

### 1.3 Verify Preflight (Windows)

```bash
npm run preflight
```

**Expected output:**
```
OK Node >= 18 - 24.x.x
OK ffplay available - ffplay
OK TTS command available - PowerShell SAPI (System.Speech)
OK Defender directory exists - D:\03_Projects\OA_Coder_Main
OK QA log path configured - C:\Users\abhin\AppData\Roaming\defender-host\session-qa.jsonl
OK QA log file exists - (will be created when Defender runs)
```

**If any show XX:**
- ffplay: Reinstall ffmpeg from https://ffmpeg.org/download.html, add to PATH
- PowerShell SAPI: Run `powershell -NoProfile -Command "Write-Host 'OK'"`; if it fails, update PowerShell
- QA log file: Don't worry — it's created by Defender on first run

## Phase 2: Generate Audio (2-3 min)

### 2.1 Create Audio Cache

```bash
npm run setup
```

This uses PowerShell SAPI to generate WAV files for all questions (7 scenarios, ~100+ questions).

**Expected output:**
```
Generating audio for scenario: scenarios/full-interview.json
  Question 1: Can you introduce yourself...
  Question 2: Tell me about a time you handled conflict...
  ...
Total: created 100+ .wav files, skipped 0
Audio cache complete.
```

**Troubleshooting:**
- If PowerShell fails: Check System.Speech is available (`[System.Reflection.Assembly]::LoadWithPartialName("System.Speech")`)
- If ffplay needed: Ensure ffmpeg is on PATH
- Output directory: `audio-cache/`

## Phase 3: Start Defender (3-5 min, Terminal 1)

**IMPORTANT: This terminal must stay open for the entire test.**

### 3.1 Start Defender Service

```bash
cd D:\03_Projects\OA_Coder_Main
npm start
```

**Expected output (varies by Defender):**
```
Defender service starting...
Listening on port 3000
Audio capture initialized
Recording: YES
QA log path: C:\Users\abhin\AppData\Roaming\defender-host\session-qa.jsonl
```

**Wait for:**
- "Recording: YES" or "Ready for input"
- No errors in console

**Troubleshooting:**
- Port already in use: Kill previous Defender process or use different port
- Audio capture unavailable: Check Windows audio settings, permissions
- QA log not created yet: It will be created on first answer

## Phase 4: Run Simulator (5-30 min, Terminal 2)

**New terminal — keep Terminal 1 with Defender running.**

### 4.1 Test Dry Run First (30 sec, no Defender needed)

```bash
cd path/to/interview-simulator
npm run run:dry
```

**Expected output:**
```
=== Mode Detection ===
  c1    Can you introduce yourself in brief?               OK PASS
  c2    Tell me about a time you handled conflict          OK PASS
  c3    Solve two sum and share complexity                 OK PASS
  c4    Design a URL shortener                             OK PASS
  c5    Explain CAP theorem                                OK PASS
  c6    Design parking lot with classes                    OK PASS

============================================
Passed 6/6 (100%)
Duration: 14s
```

If this passes, dry-run is working. Proceed to live test.

### 4.2 Run Live Scenario (10-30 min)

**Quick test first (6 questions, ~2-4 min per question = 12-24 min total):**

```bash
node bin/run.js scenarios/classifier-only.json
```

**Expected flow:**

1. **Preflight check** (~2 sec):
   ```
   Checking prerequisites...
   All checks pass - ready for live test
   ```

2. **Load scenario** (~1 sec):
   ```
   Loaded 6 questions from scenarios/classifier-only.json
   ```

3. **For each question** (~2-4 min):
   ```
   Question 1/6: Can you introduce yourself in brief?
   Playing audio (30 sec)...
   [Audio plays from system speaker]
   Waiting for answer in QA log (timeout: 60s)...
   ```
   
   **AT THIS POINT:** Defender is listening. Speak your answer clearly.
   Defender captures audio → transcribes → logs to QA log as JSON entry.
   
   ```
   Answer found: "{your spoken answer}"
   Evaluating...
     • Mode check: OK (detected "intro")
     • Contains required keywords: OK
     • Word count (10-100): OK ✓
   Result: PASS
   ```

4. **After all questions** (~20 sec):
   ```
   ============================================
   Passed 6/6 (100%)
   Duration: 2m 45s
   JSON report: reports/run-2026-04-16-143022.json
   Markdown report: reports/run-2026-04-16-143022.md
   ============================================
   ```

**If a question times out** (60 sec with no answer):
- Defender may have stopped recording → Restart Defender (Terminal 1)
- Or Defender answer format is different → Check QA log file manually
- Or answer didn't match question → Try again, speak clearly

**If evaluation says XX (FAIL):**
- Answer might be missing required keywords → Check deterministic rules in scenario JSON
- Try again with different answer

### 4.3 Full Scenario (Optional, 30+ min)

```bash
node bin/run.js scenarios/full-interview.json
```

13 questions across 7 different interview modes (intro → behavioral → DSA → HLD → technical → LLD → edge-cases).

## Phase 5: Review Results

### 5.1 JSON Report

```bash
cat reports/run-2026-04-16-*.json | jq .
```

Detailed results:
```json
{
  "scenario": "classifier-only.json",
  "timestamp": "2026-04-16T14:30:22Z",
  "questions": [
    {
      "id": "c1",
      "text": "Can you introduce yourself in brief?",
      "answer": "{your actual answer}",
      "evaluator": {
        "deterministic": { "mode": true, "intent": true, ... },
        "result": "PASS"
      }
    },
    ...
  ],
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0,
    "pass_rate": 100
  }
}
```

### 5.2 Markdown Report

```bash
cat reports/run-2026-04-16-*.md
```

Human-readable table format (open in any text editor).

## Troubleshooting

### ffplay Not Playing Audio

```bash
# Test ffplay directly
ffplay audio-cache/c1-*.wav

# If not found, add ffmpeg to PATH or restart terminal
```

### Defender QA Log Not Getting Entries

1. Check file exists and is writable:
   ```bash
   ls "C:\Users\abhin\AppData\Roaming\defender-host\session-qa.jsonl"
   ```

2. Check Defender recording status — restart if needed

3. Manually test with debug log:
   ```bash
   node bin/run.js scenarios/classifier-only.json --qa-log "C:\Users\abhin\AppData\Roaming\defender-host\session-qa.jsonl" --defender-log "D:\03_Projects\OA_Coder_Main\defender.log"
   ```

### PowerShell SAPI TTS Fails During Setup

```bash
# Test PowerShell SAPI directly
powershell -NoProfile -Command @"
Add-Type -AssemblyName System.Speech
`$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
`$speak.SetOutputToWaveFile('C:\temp\test.wav')
`$speak.Speak('Hello World')
`$speak.Dispose()
"@

# If successful, test.wav exists at C:\temp\test.wav
```

### Questions Not Being Detected

Simulator matches questions by text similarity (60% word overlap).

Check watcher is finding entries:

```bash
# Manually watch QA log while speaking
# Terminal 3:
tail -f "C:\Users\abhin\AppData\Roaming\defender-host\session-qa.jsonl"
```

Each time Defender logs an answer, you'll see:
```json
{"ts":"2026-04-16T14:30:45.123Z","question":"...","answer":"...","mode":"intro"}
```

If entries appear but simulator doesn't match, the question text may differ slightly. Check logs/debug output.

## Next: Merge to Main

Once live test passes and reports look good:

```bash
# Terminal 2
git add reports/
git commit -m "Live test results: 6/6 passing on Windows with PowerShell SAPI TTS"
git push

# Create PR (if not already done) or merge feature/interview-simulator-harness → main
```

## Files Generated

- `reports/run-YYYY-MM-DD-HHMMSS.json` — Full results JSON
- `reports/run-YYYY-MM-DD-HHMMSS.md` — Markdown report
- `audio-cache/*.wav` — Generated question audio

## Support

For issues, check:
1. Preflight output — tells you exactly what's missing
2. Recent terminal output — look for stack traces
3. QA log file manually — verify Defender is actually logging
4. Defender logs — check if audio capture is working
