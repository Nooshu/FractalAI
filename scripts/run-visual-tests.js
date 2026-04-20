import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to determine free port')));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return;
    } catch {
      // ignore until ready
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(command, args, opts) {
  return spawn(command, args, { stdio: 'inherit', ...opts });
}

const extraArgs = process.argv.slice(2);

const port = await getFreePort();
const baseUrl = `http://localhost:${port}`;

// Start Vite on a known-free port. Use strictPort so we don't start on a different port silently.
const vite = run(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1', '--open=false'],
  {
    env: {
      ...process.env,
      // Prevent Playwright's built-in webServer from also spawning Vite.
      MANAGED_WEB_SERVER: '1',
    },
  }
);

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  vite.kill('SIGTERM');
};

process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(143);
});

try {
  await waitForUrl(baseUrl, 120_000);

  const playwright = run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['playwright', 'test', ...extraArgs],
    {
      env: {
        ...process.env,
        TEST_URL: baseUrl,
        MANAGED_WEB_SERVER: '1',
      },
    }
  );

  const exitCode = await new Promise((resolve) => {
    playwright.on('exit', (code) => resolve(code ?? 1));
  });

  shutdown();
  process.exit(exitCode);
} catch (err) {
  shutdown();
  console.error(err);
  process.exit(1);
}

