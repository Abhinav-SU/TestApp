const path = require('path');
const { playAudio } = require('./player');
const { getAudioPath } = require('./tts');
const { AnswerWatcher } = require('./watcher');
const { evaluateDeterministic, evaluateSemantic } = require('./evaluator');
const { printQuestionResult, writeReports } = require('./report');
const { sleep, expandHome } = require('./utils');
const { parsePerfFromFile } = require('./perf');

function buildDryRunAnswer(question) {
  const expected = question.expected || {};
  const mode = expected.mode || question.type || 'unknown';
  const intent = expected.intent || (question.type === 'followup' ? 'followup' : 'new_question');

  let text = `Dry run answer for ${question.id}.`;
  if (expected.answer_must_contain && expected.answer_must_contain.length > 0) {
    text += ` Includes: ${expected.answer_must_contain.join(', ')}.`;
  }
  if (expected.min_answer_words) {
    const currentCount = text.split(/\s+/).length;
    const needed = Math.max(0, Number(expected.min_answer_words) - currentCount);
    if (needed > 0) {
      text += ` ${Array.from({ length: needed }).map(() => 'token').join(' ')}`;
    }
  }

  return {
    question: question.text,
    answer: expected.should_answer === false ? '' : text,
    text: expected.should_answer === false ? '' : text,
    mode,
    intent,
    part2: expected.answer_has_part2 ? 'class Solution:\n    def solve(self):\n        pass' : null
  };
}

async function runScenario({ scenario, scenarioPath, config, options = {} }) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const scenarioName = scenario?.interview?.name || path.basename(scenarioPath || 'scenario');
  const dryRun = Boolean(options.dryRun);

  const qaLogPath = expandHome(options.qaLogPath || config.defender?.qa_log_path);
  const defenderLogPath = expandHome(options.defenderLogPath || config.defender?.log_path || null);
  const betweenQuestionsSec = Number(
    scenario?.interview?.between_questions_sec ??
      config?.playback?.between_questions_sec ??
      3
  );
  const preDelaySec = Number(scenario?.interview?.pre_delay_sec ?? 0);
  const audioDir = path.resolve(path.dirname(scenarioPath), '..', config.tts.cache_dir);
  const noAudio = Boolean(options.noAudio || config?.playback?.no_audio);
  const strictAudio = Boolean(config?.playback?.strict_audio);

  let watcher = null;
  if (!dryRun) {
    watcher = new AnswerWatcher(qaLogPath);
    watcher.start();
  }

  if (preDelaySec > 0) {
    console.log(`Waiting ${preDelaySec}s before starting...`);
    await sleep(preDelaySec * 1000);
  }

  const allResults = [];

  for (const act of scenario.acts || []) {
    console.log(`=== ${act.name} ===`);

    for (const q of act.questions || []) {
      const delayAfterPrev = Number(q.delay_after_prev_sec || 0);
      if (delayAfterPrev > 0) await sleep(delayAfterPrev * 1000);

      const wavPath = getAudioPath(q, audioDir);
      let answer = null;
      let timedOut = false;
      let audioPlaybackError = null;
      const questionStart = Date.now();

      if (!dryRun && !noAudio) {
        try {
          playAudio(wavPath, { player: config.playback?.player || 'auto' });
        } catch (err) {
          audioPlaybackError = String(err && err.message ? err.message : err);
          // Degrade gracefully so live runs still validate watcher/evaluator behavior.
          console.warn(`WARN audio playback failed for ${q.id}; continuing without audio. detail=${audioPlaybackError}`);
        }
      }

      const timeoutMs = Number((q.wait_for_answer_sec || 30) * 1000);
      // Ignore stale QA log entries by only accepting entries created after this question starts.
      const minEntryTsMs = Date.now() - 1000;

      try {
        if (dryRun) {
          answer = buildDryRunAnswer(q);
        } else {
          if (q.expected?.should_answer === false || q.type === 'noise') {
            const silence = await watcher.waitForSilence(timeoutMs, { minTsMs: minEntryTsMs });
            answer = silence.answered ? { text: 'unexpected_answer_detected' } : { text: '' };
          } else {
            answer = await watcher.waitForAnswer(q.text, timeoutMs, { minTsMs: minEntryTsMs });
          }
        }
      } catch (_) {
        timedOut = true;
        answer = { text: '' };
      }

      const deterministic = evaluateDeterministic(q, answer, q.expected || {});
      const semantic = !dryRun && config.evaluation?.run_semantic_checks
        ? await evaluateSemantic(q, answer, q.expected || {}, {
            geminiKeyEnv: config.evaluation?.gemini_key_env,
            semanticModel: config.evaluation?.semantic_model
          })
        : [];

      const checks = [
        ...(noAudio
          ? [{ check: 'audio_playback_skipped', pass: true, detail: 'disabled via --no-audio or config.playback.no_audio' }]
          : []),
        ...(audioPlaybackError
          ? [{ check: 'audio_playback', pass: !strictAudio, detail: audioPlaybackError }]
          : []),
        ...(timedOut ? [{ check: 'timeout', pass: false, detail: `${timeoutMs}ms` }] : []),
        ...deterministic.checks,
        ...semantic
      ];

      const result = {
        actId: act.id,
        questionId: q.id,
        questionText: q.text,
        pass: checks.every((c) => c.pass),
        checks,
        answer,
        metrics: {
          ...deterministic.metrics,
          latencyMs: Date.now() - questionStart
        }
      };

      allResults.push(result);
      printQuestionResult(result);

      if (betweenQuestionsSec > 0) {
        await sleep(betweenQuestionsSec * 1000);
      }
    }
  }

  if (watcher) watcher.stop();

  const endedAt = new Date().toISOString();
  const durationSec = Math.round((Date.now() - startedMs) / 1000);
  const report = writeReports({
    scenarioName,
    startedAt,
    endedAt,
    durationSec,
    results: allResults,
    outputDir: path.resolve(path.dirname(scenarioPath), '..', config.reporting?.output_dir || './reports'),
    generateMarkdown: Boolean(config.reporting?.generate_markdown),
    extraPerf: parsePerfFromFile(defenderLogPath)
  });

  console.log('');
  console.log('============================================');
  console.log(`Passed ${report.summary.passed}/${report.summary.total} (${report.summary.passRate}%)`);
  console.log(`Duration: ${durationSec}s`);
  console.log(`JSON report: ${report.jsonPath}`);
  if (report.mdPath) console.log(`Markdown report: ${report.mdPath}`);
  console.log('============================================');

  return report;
}

module.exports = {
  runScenario
};
