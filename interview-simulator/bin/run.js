#!/usr/bin/env node
const path = require('path');
const { readJson } = require('../lib/utils');
const { runScenario } = require('../lib/runner');

function parseArgs(argv) {
  const args = {
    scenario: null,
    dryRun: false,
    qaLogPath: null,
    defenderLogPath: null,
    noSemantic: false
  };

  const input = [...argv];
  while (input.length) {
    const token = input.shift();
    if (!token) break;

    if (!token.startsWith('--') && !args.scenario) {
      args.scenario = token;
      continue;
    }

    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--no-semantic') args.noSemantic = true;
    else if (token === '--qa-log') args.qaLogPath = input.shift() || null;
    else if (token === '--defender-log') args.defenderLogPath = input.shift() || null;
  }

  return args;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const config = readJson(path.join(repoRoot, 'config.json'));
  const parsed = parseArgs(process.argv.slice(2));

  const scenarioArg = parsed.scenario || 'scenarios/full-interview.json';
  const scenarioPath = path.resolve(repoRoot, scenarioArg);
  const scenario = readJson(scenarioPath);

  if (parsed.noSemantic) {
    config.evaluation = config.evaluation || {};
    config.evaluation.run_semantic_checks = false;
  }

  await runScenario({
    scenario,
    scenarioPath,
    config,
    options: {
      dryRun: parsed.dryRun,
      qaLogPath: parsed.qaLogPath,
      defenderLogPath: parsed.defenderLogPath
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
