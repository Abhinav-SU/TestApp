const { execSync } = require('child_process');
const os = require('os');

function resolveCommand(explicitPlayer) {
  if (explicitPlayer && explicitPlayer !== 'auto') {
    if (explicitPlayer === 'ffplay') {
      return (wavPath) => `ffplay -nodisp -autoexit -loglevel error "${wavPath}"`;
    }
    if (explicitPlayer === 'afplay') {
      return (wavPath) => `afplay "${wavPath}"`;
    }
    if (explicitPlayer === 'powershell') {
      return (wavPath) => `powershell -c "(New-Object Media.SoundPlayer '${wavPath}').PlaySync();"`;
    }
  }

  const platform = os.platform();
  if (platform === 'darwin') return (wavPath) => `afplay "${wavPath}"`;
  if (platform === 'win32') {
    return (wavPath) => `powershell -c "(New-Object Media.SoundPlayer '${wavPath}').PlaySync();"`;
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
