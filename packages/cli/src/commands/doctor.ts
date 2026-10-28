import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  connect,
  detectSandbox,
  execArgv,
  exists,
  loadConfig,
  pathsFor,
  RunnerError,
} from '@counterpart/runner';
import { resolveDeskDir } from '../context.js';
import { ui } from '../ui.js';

interface Check {
  name: string;
  ok: boolean | 'warn';
  detail: string;
}

async function which(cmd: string): Promise<boolean> {
  try {
    const out = await execArgv([process.platform === 'win32' ? 'where' : 'which', cmd], {
      cwd: process.cwd(),
      timeoutMs: 5000,
      maxLines: 5,
      maxBytes: 1024,
    });
    return out.exitCode === 0;
  } catch {
    return false;
  }
}

export async function runDoctor(
  root: string,
  log: (l: string) => void = console.log,
): Promise<boolean> {
  const checks: Check[] = [];
  const paths = pathsFor(root);

  try {
    const config = await loadConfig(root);
    checks.push({
      name: 'runner.yaml',
      ok: true,
      detail: `${config.menu.length} menu entries, ${config.configPaths.length} readable paths`,
    });
    for (const entry of config.menu) {
      const cmd = entry.run[0] ?? '';
      const found = await which(cmd);
      checks.push({
        name: `menu: ${entry.name}`,
        ok: found,
        detail: found ? `${cmd} is on PATH` : `${cmd} not found on PATH`,
      });
      const cwd = path.resolve(root, entry.cwd);
      if (!(await exists(cwd)))
        checks.push({
          name: `menu: ${entry.name} cwd`,
          ok: false,
          detail: `${entry.cwd} does not exist`,
        });
    }
  } catch (err) {
    checks.push({
      name: 'runner.yaml',
      ok: false,
      detail: err instanceof RunnerError ? err.message : String(err),
    });
  }

  checks.push({
    name: 'git',
    ok: await which('git'),
    detail: (await which('git')) ? 'found' : 'not found; E5 and E6 need it',
  });

  const sandbox = await detectSandbox();
  checks.push({
    name: 'network sandbox (E4)',
    ok: sandbox.adapter ? true : 'warn',
    detail: sandbox.adapter
      ? sandbox.adapter.name
      : `${sandbox.reason ?? 'unavailable'} E4 requests will be refused.`,
  });

  const gitignore = (await exists(path.join(root, '.gitignore')))
    ? await readFile(path.join(root, '.gitignore'), 'utf8')
    : '';
  const ignored = gitignore.includes('.counterpart/evidence');
  checks.push({
    name: '.gitignore',
    ok: ignored ? true : 'warn',
    detail: ignored
      ? 'ledger and raw evidence are ignored'
      : '.counterpart/evidence is not ignored; raw evidence could be committed',
  });

  const desk = await resolveDeskDir();
  checks.push({
    name: 'Desk build',
    ok: desk ? true : 'warn',
    detail: desk ? desk : 'not found; approvals will go through `counterpart approvals`',
  });

  const conn = await connect(root, { startIfNeeded: false });
  checks.push({
    name: 'server',
    ok: conn ? true : 'warn',
    detail:
      conn && conn.mode === 'remote'
        ? `running at ${conn.server.url} (pid ${conn.server.pid})`
        : 'not running; `counterpart desk` or the MCP server will start one',
  });
  checks.push({ name: 'state dir', ok: true, detail: paths.state });

  for (const c of checks) {
    const mark = c.ok === true ? ui.ok('✓') : c.ok === 'warn' ? ui.warn('!') : ui.bad('✗');
    log(`${mark} ${c.name.padEnd(24)} ${ui.dim(c.detail)}`);
  }
  return checks.every((c) => c.ok !== false);
}
