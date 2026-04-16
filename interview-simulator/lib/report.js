const fs = require('fs');
const path = require('path');
const { ensureDir, timestampForFile } = require('./utils');

function summarize(results) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  return {
    total,
    passed,
    failed,
    passRate: total === 0 ? 0 : Number(((passed / total) * 100).toFixed(1))
  };
}

function printQuestionResult(result) {
  const status = result.pass ? 'PASS' : 'FAIL';
  const symbol = result.pass ? 'OK' : 'XX';
  console.log(`  ${result.questionId.padEnd(5)} ${result.questionText.slice(0, 48).padEnd(50)} ${symbol} ${status}`);
}

function writeReports({
  scenarioName,
  startedAt,
  endedAt,
  durationSec,
  results,
  outputDir,
  generateMarkdown = true,
  extraPerf = {}
}) {
  ensureDir(outputDir);
  const stamp = timestampForFile();
  const summary = summarize(results);

  const avgWords = results.length
    ? Math.round(results.reduce((acc, r) => acc + (r.metrics?.wordCount || 0), 0) / results.length)
    : 0;

  const json = {
    timestamp: new Date().toISOString(),
    scenario: scenarioName,
    started_at: startedAt,
    ended_at: endedAt,
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    duration_sec: durationSec,
    results,
    perf: {
      avg_answer_words: avgWords,
      ...extraPerf
    }
  };

  const jsonPath = path.join(outputDir, `run-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');

  let mdPath = null;
  if (generateMarkdown) {
    const lines = [];
    lines.push(`# Interview Simulator Report`);
    lines.push('');
    lines.push(`- Scenario: ${scenarioName}`);
    lines.push(`- Timestamp: ${json.timestamp}`);
    lines.push(`- Total: ${summary.total}`);
    lines.push(`- Passed: ${summary.passed}`);
    lines.push(`- Failed: ${summary.failed}`);
    lines.push(`- Duration: ${durationSec}s`);
    lines.push('');
    lines.push('## Results');
    lines.push('');
    lines.push('| Question | Status | Details |');
    lines.push('|---|---|---|');
    for (const r of results) {
      const details = r.checks.filter((c) => !c.pass).map((c) => c.check).join(', ') || 'all checks passed';
      lines.push(`| ${r.questionId} | ${r.pass ? 'PASS' : 'FAIL'} | ${details} |`);
    }

    mdPath = path.join(outputDir, `run-${stamp}.md`);
    fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  }

  return {
    summary,
    jsonPath,
    mdPath
  };
}

module.exports = {
  printQuestionResult,
  writeReports,
  summarize
};
