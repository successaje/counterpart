import { readFile, writeFile } from 'node:fs/promises';
import { type RunnerConfig, RunnerConfigSchema } from '@counterpart/protocol';
import YAML from 'yaml';
import { RunnerError } from '../handle.js';
import { type CounterpartPaths, exists, pathsFor } from './paths.js';

export async function loadConfig(root: string): Promise<RunnerConfig> {
  const paths = pathsFor(root);
  if (!(await exists(paths.config))) {
    throw new RunnerError(
      'config',
      `no ${paths.config}. Run \`counterpart init\` in the project you want to report from.`,
    );
  }
  let doc: unknown;
  try {
    doc = YAML.parse(await readFile(paths.config, 'utf8'));
  } catch (err) {
    throw new RunnerError('config', `${paths.config} is not valid YAML: ${(err as Error).message}`);
  }
  const parsed = RunnerConfigSchema.safeParse(doc);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new RunnerError('config', `${paths.config} has problems:\n${issues}`);
  }
  return parsed.data;
}

const HEADER = `# Counterpart runner configuration.
#
# This file is the statement of what your agent may do for a project's
# helpdesk. Everything a helpdesk can ask for is either on this menu or
# refused. Commit it; it is part of how your project reports bugs.
#
# Docs: https://github.com/successaje/counterpart#runner-yaml
`;

export async function saveConfig(paths: CounterpartPaths, config: RunnerConfig): Promise<void> {
  const text = YAML.stringify(config, { lineWidth: 100 });
  await writeFile(paths.config, `${HEADER}\n${text}`, 'utf8');
}
