const fs = require('fs');
const readline = require('readline');
const { normalizeText } = require('./utils');

class AnswerWatcher {
  constructor(qaLogPath) {
    this.path = qaLogPath;
    this.position = 0;
    this.pending = new Map();
    this.timer = null;
    this.recentEntries = [];
  }

  start() {
    try {
      this.position = fs.statSync(this.path).size;
    } catch (_) {
      this.position = 0;
    }

    this.timer = setInterval(() => this._poll(), 400);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  waitForAnswer(questionText, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const key = `${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error(`Timeout waiting for answer: ${questionText.slice(0, 80)}`));
      }, timeoutMs);

      this.pending.set(key, {
        questionText,
        resolve: (entry) => {
          clearTimeout(timeout);
          resolve(entry);
        }
      });

      for (const entry of this.recentEntries) {
        if (this._isMatch(entry, questionText)) {
          this.pending.delete(key);
          clearTimeout(timeout);
          resolve(entry);
          return;
        }
      }
    });
  }

  waitForSilence(timeoutMs = 8000) {
    return new Promise((resolve) => {
      const before = this.recentEntries.length;
      setTimeout(() => {
        const after = this.recentEntries.length;
        resolve({ answered: after > before, newEntries: Math.max(0, after - before) });
      }, timeoutMs);
    });
  }

  _poll() {
    let stat;
    try {
      stat = fs.statSync(this.path);
    } catch (_) {
      return;
    }

    if (stat.size <= this.position) return;

    const stream = fs.createReadStream(this.path, {
      start: this.position,
      end: stat.size,
      encoding: 'utf8'
    });

    this.position = stat.size;

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch (_) {
        return;
      }

      this.recentEntries.push(entry);
      if (this.recentEntries.length > 200) this.recentEntries.shift();

      for (const [key, p] of this.pending.entries()) {
        if (this._isMatch(entry, p.questionText)) {
          this.pending.delete(key);
          p.resolve(entry);
        }
      }
    });
  }

  _isMatch(entry, questionText) {
    const source = normalizeText(entry.question || entry.prompt || '');
    const target = normalizeText(questionText);
    if (!source || !target) return false;

    if (source.includes(target) || target.includes(source)) return true;

    const sourceWords = source.split(' ');
    const targetWords = new Set(target.split(' '));
    const overlap = sourceWords.filter((w) => targetWords.has(w)).length;
    return overlap / Math.max(sourceWords.length, 1) >= 0.6;
  }
}

module.exports = {
  AnswerWatcher
};
