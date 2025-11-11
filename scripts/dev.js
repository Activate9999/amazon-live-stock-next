// scripts/dev.js
// Launch next dev while setting a unique AUTH_COOKIE_NAME per dev run to invalidate previous auth cookies.
const { spawn } = require('child_process');

const uniq = `alst_auth_dev_${Date.now()}`;
console.log(`Starting dev server with AUTH_COOKIE_NAME=${uniq}`);

const env = Object.assign({}, process.env, { AUTH_COOKIE_NAME: uniq });

// Spawn `npx next dev -p 3000` using a shell so command resolution works on Windows (cmd.exe)
// Using shell:true avoids spawn EINVAL on some Windows setups and lets the shell find npx.
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(cmd, ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('close', (code) => {
  process.exit(code);
});
