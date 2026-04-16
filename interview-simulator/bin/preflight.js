#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readJson, expandHome } = require('../lib/utils');

function hasCommand(cmd) {
  const res = spawnSync('which', [cmd], { stdio: 'ignore' });
  return res.status === 0;
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
  results.push(
    check(
      'TTS command available',
      hasCommand('espeak-ng') || hasCommand('espeak') || hasCommand('spd-say'),
      'Install espeak-ng or speech-dispatcher'
    )
  );
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
