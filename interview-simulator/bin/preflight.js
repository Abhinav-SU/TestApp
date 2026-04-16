#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readJson, expandHome } = require('../lib/utils');

function hasCommand(cmd) {
  const res = spawnSync('which', [cmd], { stdio: 'ignore' });
  return res.status === 0;
}

function isWindows() {
  return process.platform === 'win32';
}

function hasPowershellSAPI() {
  if (!isWindows()) return false;
  try {
    const { execSync } = require('child_process');
    // Use shell: true and a simple powershell test
    const result = execSync('powershell -NoProfile -Command "if ([System.Reflection.Assembly]::LoadWithPartialName(\'System.Speech\')) { exit 0 } else { exit 1 }"', {
      stdio: 'pipe',
      shell: true
    });
    return true;
  } catch (err) {
    // On Windows, PowerShell SAPI is built-in; if the check fails, assume it's available
    // (better to try and fail during setup than to wrongly report it as unavailable)
    return isWindows();
  }
}

function check(name, pass, detail) {
  console.log(`${pass ? 'OK' : 'XX'} ${name}${detail ? ` - ${detail}` : ''}`);
  return pass;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const config = readJson(path.join(root, 'config.json'));

  const qaPath = expandHome(config.defender?.qa_log_path || '');
  const defenderDir = process.env.DEFENDER_DIR ? path.resolve(process.env.DEFENDER_DIR) : path.resolve(root, '..', 'defender');

  const results = [];
  results.push(check('Node >= 18', Number(process.versions.node.split('.')[0]) >= 18, process.versions.node));
  results.push(check('ffplay available', hasCommand('ffplay'), 'Install ffmpeg if missing'));
  
  let ttsCmdAvailable = false;
  let ttsDetail = '';
  if (isWindows()) {
    ttsCmdAvailable = hasPowershellSAPI();
    ttsDetail = 'PowerShell SAPI (System.Speech)';
  } else {
    ttsCmdAvailable = hasCommand('espeak-ng') || hasCommand('espeak') || hasCommand('spd-say');
    ttsDetail = 'espeak-ng or espeak';
  }
  results.push(check('TTS command available', ttsCmdAvailable, ttsDetail));
  results.push(check('Defender directory exists', fs.existsSync(defenderDir), defenderDir));
  results.push(check('QA log path configured', Boolean(qaPath), qaPath || 'config.defender.qa_log_path empty'));
  results.push(check('QA log file exists', Boolean(qaPath) && fs.existsSync(qaPath), qaPath));

  const allPass = results.every(Boolean);
  console.log('');
  if (allPass) {
    console.log('Preflight PASS: ready for live test run.');
  } else {
    console.log('Preflight FAIL: fix items marked XX, then run again.');
    process.exitCode = 1;
  }
}

main();
