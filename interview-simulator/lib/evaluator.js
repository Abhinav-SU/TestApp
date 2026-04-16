function toText(answer) {
  if (!answer) return '';
  if (typeof answer === 'string') return answer;
  return String(answer.answer || answer.text || '');
}

function toMode(answer) {
  if (!answer || typeof answer === 'string') return null;
  return answer.mode || answer.route || null;
}

function toIntent(answer) {
  if (!answer || typeof answer === 'string') return null;
  return answer.intent || null;
}

function getWordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function evaluateDeterministic(question, answer, expected = {}) {
  const results = [];
  const text = toText(answer);
  const textLower = text.toLowerCase();
  const mode = toMode(answer);
  const intent = toIntent(answer);
  const wordCount = getWordCount(text);

  if (expected.mode) {
    results.push({
      check: 'mode',
      pass: mode === expected.mode,
      detail: `expected=${expected.mode} actual=${mode || 'unknown'}`
    });
  }

  if (expected.intent) {
    results.push({
      check: 'intent',
      pass: intent === expected.intent,
      detail: `expected=${expected.intent} actual=${intent || 'unknown'}`
    });
  }

  for (const term of expected.answer_must_contain || []) {
    const pass = textLower.includes(String(term).toLowerCase());
    results.push({ check: `contains:${term}`, pass });
  }

  for (const term of expected.answer_must_not_contain || []) {
    const pass = !textLower.includes(String(term).toLowerCase());
    results.push({ check: `not_contains:${term}`, pass });
  }

  if (expected.max_answer_words != null) {
    results.push({
      check: 'max_words',
      pass: wordCount <= Number(expected.max_answer_words),
      detail: `${wordCount}/${expected.max_answer_words}`
    });
  }

  if (expected.min_answer_words != null) {
    results.push({
      check: 'min_words',
      pass: wordCount >= Number(expected.min_answer_words),
      detail: `${wordCount}/${expected.min_answer_words}`
    });
  }

  if (expected.answer_has_part2) {
    const part2 = typeof answer === 'object' ? answer.part2 : null;
    const pass = Boolean(part2) || text.includes('```');
    results.push({ check: 'has_part2', pass });
  }

  for (const term of expected.part2_must_contain || []) {
    const scope = typeof answer === 'object' && answer.part2 ? String(answer.part2) : text;
    const pass = scope.toLowerCase().includes(String(term).toLowerCase());
    results.push({ check: `part2_contains:${term}`, pass });
  }

  if (expected.should_answer === false) {
    const pass = wordCount === 0;
    results.push({ check: 'no_answer_expected', pass, detail: `words=${wordCount}` });
  }

  return {
    checks: results,
    pass: results.every((r) => r.pass),
    metrics: { wordCount }
  };
}

function semanticChecksNeeded(expected = {}) {
  return Boolean(
    expected.should_reference_previous ||
      expected.story_different_from ||
      expected.answer_should_use_story
  );
}

async function evaluateSemantic(question, answer, expected = {}, options = {}) {
  if (!semanticChecksNeeded(expected)) return [];
  const apiKey = process.env[options.geminiKeyEnv || 'GEMINI_API_KEY'];
  if (!apiKey) {
    return [
      {
        check: 'semantic_skipped_no_api_key',
        pass: true,
        detail: 'GEMINI_API_KEY not set, skipping semantic checks'
      }
    ];
  }

  const checks = [];
  const rubric = [];
  if (expected.should_reference_previous) rubric.push('references_previous');
  if (expected.answer_should_use_story) rubric.push('uses_story');
  if (expected.story_different_from) rubric.push('unique_story');

  const prompt = [
    'Evaluate the interview answer for each criterion and return strict JSON only.',
    `Question: ${question.text}`,
    `Answer: ${toText(answer).slice(0, 2500)}`,
    `Criteria: ${rubric.join(', ')}`,
    'Output format: {"references_previous": true|false, "uses_story": true|false, "unique_story": true|false, "notes": "..."}'
  ].join('\n');

  const model = options.semanticModel || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let parsed = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });
    const body = await res.json();
    const raw =
      body?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '{}';
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (err) {
    return [{ check: 'semantic_error', pass: false, detail: String(err.message || err) }];
  }

  if (expected.should_reference_previous) {
    checks.push({
      check: 'references_previous',
      pass: Boolean(parsed.references_previous)
    });
  }
  if (expected.answer_should_use_story) {
    checks.push({
      check: 'uses_story',
      pass: Boolean(parsed.uses_story)
    });
  }
  if (expected.story_different_from) {
    checks.push({
      check: 'unique_story',
      pass: Boolean(parsed.unique_story)
    });
  }

  return checks;
}

module.exports = {
  evaluateDeterministic,
  evaluateSemantic
};
