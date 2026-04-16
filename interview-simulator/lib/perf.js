const fs = require('fs');

function parsePerfFromText(content) {
  const metrics = {
    e2e: [],
    classifier: []
  };

  const lines = String(content || '').split(/\r?\n/);
  for (const line of lines) {
    const raw = line.trim();
    if (!raw.includes('[PERF]')) continue;

    let m = raw.match(/\[PERF\].*?e2e[^0-9]*([0-9]+)\s*ms/i);
    if (m) {
      metrics.e2e.push(Number(m[1]));
      continue;
    }

    m = raw.match(/\[PERF\].*?classifier[^0-9]*([0-9]+)\s*ms/i);
    if (m) {
      metrics.classifier.push(Number(m[1]));
    }
  }

  const avg = (arr) => {
    if (!arr.length) return null;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  };

  return {
    avg_e2e_ms: avg(metrics.e2e),
    avg_classifier_ms: avg(metrics.classifier)
  };
}

function parsePerfFromFile(filePath) {
  if (!filePath) return {};
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  return parsePerfFromText(content);
}

module.exports = {
  parsePerfFromText,
  parsePerfFromFile
};
