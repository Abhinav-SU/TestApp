const { execSync } = require('child_process');
const os = require('os');

function psSingleQuote(value) {
  return String(value).replace(/'/g, "''");
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
      return (wavPath) => {
        const safe = psSingleQuote(wavPath);
        return `powershell -NoProfile -Command "try { $p = New-Object System.Media.SoundPlayer('${safe}'); $p.Load(); $p.PlaySync(); } catch { Write-Error $_; exit 1 }"`;
      };
    }
  }

  const platform = os.platform();
  if (platform === 'darwin') return (wavPath) => `afplay "${wavPath}"`;
  if (platform === 'win32') {
    return (wavPath) => {
      const safe = psSingleQuote(wavPath);
      return `powershell -NoProfile -Command "try { $p = New-Object System.Media.SoundPlayer('${safe}'); $p.Load(); $p.PlaySync(); } catch { Write-Error $_; exit 1 }"`;
    };
  }
  return (wavPath) => `ffplay -nodisp -autoexit -loglevel error "${wavPath}"`;
}

function playAudio(wavPath, options = {}) {
  const commandBuilder = resolveCommand(options.player || 'auto');
  const command = commandBuilder(wavPath);
  execSync(command, { stdio: 'ignore' });
}

module.exports = {
  playAudio
};
