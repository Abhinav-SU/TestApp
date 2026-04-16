const fs = require('fs');
const path = require('path');
const { execFile, execSync } = require('child_process');
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

function commandExists(cmd) {
  try {
    const { spawnSync } = require('child_process');
    const res = spawnSync('which', [cmd], { stdio: 'ignore' });
    return res.status === 0;
  } catch (_) {
    return false;
  }
}

function isWindows() {
  return process.platform === 'win32';
}

function exportWithPowershellSAPI(text, outPath, config) {
  return new Promise((resolve, reject) => {
    try {
      // Use PowerShell to convert text to speech and save as WAV
      const psScript = `
        Add-Type -AssemblyName System.Speech
        $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $speak.Rate = ${Number(config.speed || 1)}
        $speak.SelectVoice($speak.GetInstalledVoices()[0].VoiceInfo.Name)
        $speak.SetOutputToWaveFile('${outPath.replace(/\\/g, '\\\\')}')
        $speak.Speak('${text.replace(/'/g, "''")}') 
        $speak.Dispose()
      `;
      execSync(`powershell -NoProfile -Command "${psScript}"`, { stdio: 'pipe' });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function exportWithEspeak(text, outPath, config) {
  return new Promise((resolve, reject) => {
    const cmd = commandExists('espeak-ng') ? 'espeak-ng' : commandExists('espeak') ? 'espeak' : null;
    if (!cmd) {
      reject(new Error('Neither espeak-ng nor espeak is installed'));
      return;
    }

    const speed = Number(config.speed || 1);
    const wordsPerMinute = Math.max(80, Math.min(260, Math.round(175 * speed)));
    const args = ['-s', String(wordsPerMinute), '-w', outPath, text];
    execFile(cmd, args, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function exportSpeech(text, outPath, ttsConfig) {
  const provider = String(ttsConfig.provider || 'say.js').toLowerCase();

  if (provider === 'espeak') {
    await exportWithEspeak(text, outPath, ttsConfig);
    return;
  }

  // On Windows, try PowerShell SAPI first
  if (isWindows()) {
    try {
      await exportWithPowershellSAPI(text, outPath, ttsConfig);
      return;
    } catch (err) {
      console.warn('PowerShell SAPI failed, falling back to say.js:', err.message);
    }
  }

  try {
    await exportWithSay(text, outPath, ttsConfig);
  } catch (err) {
    if (!String(err && err.message).includes('does not support platform')) {
      throw err;
    }
    await exportWithEspeak(text, outPath, ttsConfig);
  }
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
      await exportSpeech(q.text, outPath, ttsConfig);
      created.push(outPath);
    }
  }

  return { created, skipped };
}

module.exports = {
  getAudioPath,
  generateAll
};
