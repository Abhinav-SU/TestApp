const fs = require('fs');
const path = require('path');
const say = require('say');
const { ensureDir, slug } = require('./utils');

function getAudioPath(question, outputDir) {
  return path.join(outputDir, `${question.id}-${slug(question.text)}.wav`);
}

function exportWithSay(text, outPath, config) {
  return new Promise((resolve, reject) => {
    say.export(text, config.voice || null, config.speed || 1, outPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function generateAll(scenario, outputDir, ttsConfig = {}) {
  ensureDir(outputDir);
  const created = [];
  const skipped = [];

  for (const act of scenario.acts || []) {
    for (const q of act.questions || []) {
      const outPath = getAudioPath(q, outputDir);
      if (fs.existsSync(outPath)) {
        skipped.push(outPath);
        continue;
      }
      await exportWithSay(q.text, outPath, ttsConfig);
      created.push(outPath);
    }
  }

  return { created, skipped };
}

module.exports = {
  getAudioPath,
  generateAll
};
