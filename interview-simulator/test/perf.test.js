const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePerfFromText } = require('../lib/perf');

test('parsePerfFromText computes average e2e and classifier timings', () => {
  const data = [
    '[PERF] e2e=3000ms',
    '[PERF] e2e=2700ms',
    '[PERF] classifier=350ms',
    '[PERF] classifier=450ms'
  ].join('\n');

  const result = parsePerfFromText(data);
  assert.equal(result.avg_e2e_ms, 2850);
  assert.equal(result.avg_classifier_ms, 400);
});
