import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { approvalPolicyFor, EVIDENCE_TYPES } from '@counterpart/protocol';
import { detectProject, exists, pathsFor, proposeConfig, saveConfig } from '@counterpart/runner';
import { columns, heading, ui } from '../ui.js';

export interface InitOptions {
  cwd: string;
  name?: string;
  force?: boolean;
  log?: (line: string) => void;
}

const IGNORE_LINES = ['.counterpart/state/', '.counterpart/evidence/'];

async function ensureGitignore(root: string): Promise<boolean> {
  const file = path.join(root, '.gitignore');
  const current = (await exists(file)) ? await readFile(file, 'utf8') : '';
  const missing = IGNORE_LINES.filter((l) => !current.split('\n').some((x) => x.trim() === l));
  if (missing.length === 0) return false;
  const block = `${current.endsWith('\n') || current === '' ? '' : '\n'}\n# Counterpart: local ledger and raw evidence never leave this machine\n${missing.join('\n')}\n`;
  await writeFile(file, current + block, 'utf8');
  return true;
}

export async function runInit(opts: InitOptions): Promise<{ root: string; created: boolean }> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const root = path.resolve(opts.cwd);
  const paths = pathsFor(root);
  if ((await exists(paths.config)) && !opts.force) {
    log(
      `${ui.warn('already set up:')} ${paths.config} exists. Use ${ui.code('--force')} to overwrite it.`,
    );
    return { root, created: false };
  }
  const detection = await detectProject(root);
  let projectName = opts.name;
  if (!projectName) {
    try {
      const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
        name?: string;
      };
      projectName = pkg.name;
    } catch {
      // fall through
    }
  }
  const config = proposeConfig(projectName ?? path.basename(root), detection);
  await mkdir(paths.dir, { recursive: true });
  await saveConfig(paths, config);
  const ignored = await ensureGitignore(root);

  log(`${ui.ok('✓')} Counterpart is set up for ${ui.title(config.project.name)}.`);
  log(
    heading('Menu  ') +
      ui.dim('what a helpdesk may ask your agent to run (E3) or verify with (E6)'),
  );
  log(
    columns(
      config.menu.map((m) => [
        ui.code(m.name),
        `$ ${[...m.run, ...m.verbose.map((v) => `[${v}]`)].join(' ')}`,
        ui.dim(m.description),
      ]),
    ),
  );
  log(
    heading('Readable config  ') + ui.dim('what a helpdesk may ask to read (E2), secrets redacted'),
  );
  log(`  ${config.configPaths.join(', ') || ui.dim('none')}`);
  log(heading('Approvals'));
  const automatic = EVIDENCE_TYPES.filter((t) => approvalPolicyFor(config, t) === 'automatic');
  const ask = EVIDENCE_TYPES.filter((t) => approvalPolicyFor(config, t) === 'ask');
  log(`  ${ui.dim('automatic')}  ${automatic.join(', ')}`);
  log(`  ${ui.dim('ask you  ')}  ${ask.join(', ')}`);
  for (const note of detection.notes) log(`\n${ui.warn('note')} ${note}`);
  log(heading('Next'));
  log(
    `  1. Review ${ui.code('.counterpart/runner.yaml')} and commit it${ignored ? ` (${ui.dim('.gitignore updated')})` : ''}.`,
  );
  log(
    `  2. Register the MCP server with your agent:  ${ui.code('claude mcp add counterpart -- counterpart mcp')}`,
  );
  log(`  3. When a case starts, open the Desk:         ${ui.code('counterpart desk')}`);
  return { root, created: true };
}
