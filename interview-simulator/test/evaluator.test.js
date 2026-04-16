const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateDeterministic } = require('../lib/evaluator');

test('evaluateDeterministic validates mode, intent, contains, and word limits', () => {
  const question = { id: 'q1', text: 'Tell me about yourself' };
  const answer = {
    mode: 'intro',
    intent: 'new_question',
    text: 'I have 7 years of experience in backend systems and platform reliability.'
  };
  const expected = {
    mode: 'intro',
    intent: 'new_question',
    answer_must_contain: ['experience', 'years'],
    min_answer_words: 5,
    max_answer_words: 100
  };

  const result = evaluateDeterministic(question, answer, expected);
  assert.equal(result.pass, true);
});

test('evaluateDeterministic fails noise question when unexpected text appears', () => {
  const question = { id: 'q2', text: 'mm-hmm' };
  const answer = { text: 'unexpected answer' };
  const expected = { should_answer: false };

  const result = evaluateDeterministic(question, answer, expected);
  assert.equal(result.pass, false);
  assert.ok(result.checks.some((c) => c.check === 'no_answer_expected' && !c.pass));
});
