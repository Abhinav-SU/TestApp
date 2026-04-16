#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { readJson } = require('../lib/utils');
const { generateAll } = require('../lib/tts');

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const config = readJson(path.join(repoRoot, 'config.json'));

  const argScenario = process.argv[2];
  const scenariosDir = path.join(repoRoot, 'scenarios');

  const scenarioPaths = argScenario
    ? [path.resolve(repoRoot, argScenario)]
    : fs
        .readdirSync(scenariosDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => path.join(scenariosDir, name));

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const scenarioPath of scenarioPaths) {
    const scenario = readJson(scenarioPath);
    const outputDir = path.resolve(repoRoot, config.tts.cache_dir || './audio-cache');
    const { created, skipped } = await generateAll(scenario, outputDir, config.tts || {});
    totalCreated += created.length;
    totalSkipped += skipped.length;
    console.log(`Scenario: ${path.basename(scenarioPath)} created=${created.length} skipped=${skipped.length}`);
  }

  console.log(`Done. created=${totalCreated} skipped=${totalSkipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
