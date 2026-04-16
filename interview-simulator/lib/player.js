const { execSync, execFileSync } = require('child_process');
const os = require('os');

function psSingleQuote(value) {
  return String(value).replace(/'/g, "''");
}

function playWithPowerShell(wavPath) {
  const safe = psSingleQuote(wavPath);
  const script = `try { $p = New-Object System.Media.SoundPlayer('${safe}'); $p.Load(); $p.PlaySync(); } catch { Write-Error $_; exit 1 }`;
  const runners = ['powershell', 'powershell.exe', 'pwsh'];

  let lastErr = null;
  for (const runner of runners) {
    try {
      execFileSync(runner, ['-NoProfile', '-Command', script], { stdio: 'ignore' });
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('No PowerShell executable found for Windows playback');
}

function resolveCommand(explicitPlayer) {
  if (explicitPlayer && explicitPlayer !== 'auto') {
    if (explicitPlayer === 'ffplay') {
      return (wavPath) => `ffplay -nodisp -autoexit -loglevel error "${wavPath}"`;
    }
    if (explicitPlayer === 'afplay') {
      return (wavPath) => `afplay "${wavPath}"`;
    }
    if (explicitPlayer === 'powershell') {
      return null;
    }
  }

  const platform = os.platform();
  if (platform === 'darwin') return (wavPath) => `afplay "${wavPath}"`;
  if (platform === 'win32') {
    return null;
  }
  return (wavPath) => `ffplay -nodisp -autoexit -loglevel error "${wavPath}"`;
}

function playAudio(wavPath, options = {}) {
  const player = options.player || 'auto';
  const platform = os.platform();
  if (platform === 'win32' && (player === 'auto' || player === 'powershell')) {
    playWithPowerShell(wavPath);
    return;
  }

  const commandBuilder = resolveCommand(player);
  const command = commandBuilder(wavPath);
  execSync(command, { stdio: 'ignore' });
}

module.exports = {
  playAudio
};
