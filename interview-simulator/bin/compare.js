#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadReport(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toMap(report) {
  const map = new Map();
  for (const r of report.results || []) {
    map.set(r.questionId, r.pass ? 'PASS' : 'FAIL');
  }
  return map;
}

function main() {
  const baseArg = process.argv[2];
  const nextArg = process.argv[3];
  if (!baseArg || !nextArg) {
    console.error('Usage: node bin/compare.js <old-report.json> <new-report.json>');
    process.exit(1);
  }

  const cwd = process.cwd();
  const basePath = path.resolve(cwd, baseArg);
  const nextPath = path.resolve(cwd, nextArg);

  const base = loadReport(basePath);
  const next = loadReport(nextPath);

  const baseMap = toMap(base);
  const nextMap = toMap(next);

  const allIds = new Set([...baseMap.keys(), ...nextMap.keys()]);
  let regressions = 0;
  let fixes = 0;

  for (const id of [...allIds].sort()) {
    const prev = baseMap.get(id) || 'MISSING';
    const curr = nextMap.get(id) || 'MISSING';
    if (prev !== curr) {
      if (prev === 'PASS' && curr === 'FAIL') regressions += 1;
      if (prev === 'FAIL' && curr === 'PASS') fixes += 1;
      console.log(`${id}: ${prev} -> ${curr}`);
    }
  }

  console.log('');
  console.log(`Summary: ${base.passed}/${base.total} -> ${next.passed}/${next.total}`);
  console.log(`Regressions: ${regressions}, Fixes: ${fixes}`);
}

main();
