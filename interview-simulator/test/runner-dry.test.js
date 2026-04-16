const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runScenario } = require('../lib/runner');

test('runScenario dry-run produces passing report', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-runner-'));
  const scenarioPath = path.join(tempRoot, 'scenario.json');
  const reportsDir = path.join(tempRoot, 'reports');

  const scenario = {
    interview: { name: 'Dry Test', pre_delay_sec: 0, between_questions_sec: 0 },
    acts: [
      {
        id: 'act-1',
        name: 'Act',
        questions: [
          {
            id: 'q1',
            text: 'Tell me about your experience',
            type: 'intro',
            wait_for_answer_sec: 1,
            expected: {
              mode: 'intro',
              intent: 'new_question',
              answer_must_contain: ['experience']
            }
          }
        ]
      }
    ]
  };
  fs.writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2), 'utf8');

  const config = {
    tts: { cache_dir: './audio-cache' },
    defender: { qa_log_path: '/tmp/non-existent.jsonl' },
    playback: { player: 'auto', between_questions_sec: 0 },
    evaluation: { run_semantic_checks: false },
    reporting: { output_dir: reportsDir, generate_markdown: true }
  };

  const report = await runScenario({
    scenario,
    scenarioPath,
    config,
    options: { dryRun: true }
  });

  assert.equal(report.summary.passed, 1);
  assert.equal(report.summary.total, 1);
  assert.ok(fs.existsSync(report.jsonPath));
  assert.ok(fs.existsSync(report.mdPath));
});
