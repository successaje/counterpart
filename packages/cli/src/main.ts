import { createRequire } from 'node:module';
import { RunnerError } from '@counterpart/runner';
import { Command } from 'commander';
import { decide, listApprovals, watch } from './commands/approvals.js';
import { listCases, printCard, showCase, validateCard } from './commands/cases.js';
import { runDesk } from './commands/desk.js';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runMcp } from './commands/mcp.js';
import { openConnection, requireProjectRoot } from './context.js';
import { infoText } from './mcp/format.js';
import { fail } from './ui.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command()
  .name('counterpart')
  .description('Support where both sides bring an agent.')
  .version(version)
  .showHelpAfterError();

program
  .command('init')
  .description(
    'Set this project up to report through Counterpart (writes .counterpart/runner.yaml)',
  )
  .option('-n, --name <slug>', 'project slug (default: package name or folder)')
  .option('-f, --force', 'overwrite an existing runner.yaml')
  .action(async (opts: { name?: string; force?: boolean }) => {
    await runInit({
      cwd: process.cwd(),
      ...(opts.name ? { name: opts.name } : {}),
      ...(opts.force ? { force: true } : {}),
    });
  });

program
  .command('doctor')
  .description('Check the menu, git, sandbox, Desk build and server')
  .action(async () => {
    const ok = await runDoctor(await requireProjectRoot());
    process.exitCode = ok ? 0 : 1;
  });

program
  .command('desk')
  .description(
    'Start the local server and open the Desk, where you approve requests and read the ledger',
  )
  .option('-p, --port <port>', 'port to listen on (default 4747, or a free one)')
  .option('--no-open', 'do not open a browser')
  .action(async (opts: { port?: string; open: boolean }) => {
    await runDesk(await requireProjectRoot(), {
      ...(opts.port ? { port: Number(opts.port) } : {}),
      open: opts.open,
    });
  });

program
  .command('mcp')
  .description('Run the MCP server on stdio for your coding agent')
  .action(async () => {
    await runMcp(await requireProjectRoot(), version);
  });

program
  .command('info')
  .description('Show the menu, policies and sandbox status as the agent sees them')
  .action(async () => {
    const conn = await openConnection(await requireProjectRoot(), true, 0);
    console.log(infoText(await conn.handle.info()));
    if (conn.mode === 'local') await conn.close();
  });

program
  .command('approvals')
  .description('List requests waiting for your decision')
  .action(async () => {
    const conn = await openConnection(await requireProjectRoot(), false);
    await listApprovals(conn.handle);
  });

program
  .command('approve <recordId>')
  .description('Allow a pending request')
  .option('--for-case', 'also trust this evidence type for the rest of the case')
  .option('-m, --note <note>', 'note for the ledger')
  .action(async (recordId: string, opts: { forCase?: boolean; note?: string }) => {
    const conn = await openConnection(await requireProjectRoot(), false);
    await decide(
      conn.handle,
      recordId,
      opts.forCase ? 'allowed-for-case' : 'allowed-once',
      opts.note,
    );
  });

program
  .command('decline <recordId>')
  .description('Decline a pending request')
  .option('-m, --note <note>', 'tell the helpdesk why (goes in the ledger)')
  .action(async (recordId: string, opts: { note?: string }) => {
    const conn = await openConnection(await requireProjectRoot(), false);
    await decide(conn.handle, recordId, 'declined', opts.note);
  });

program
  .command('watch')
  .description('Follow the ledger live and decide requests from the terminal')
  .action(async () => {
    const conn = await openConnection(await requireProjectRoot(), true, 0);
    await watch(conn.handle, Boolean(process.stdin.isTTY));
    if (conn.mode === 'local') await conn.close();
  });

program
  .command('cases')
  .description('List cases')
  .option('-a, --all', 'include closed cases')
  .action(async (opts: { all?: boolean }) => {
    const conn = await openConnection(await requireProjectRoot(), true, 0);
    await listCases(conn.handle, Boolean(opts.all));
    if (conn.mode === 'local') await conn.close();
  });

program
  .command('case <caseId>')
  .description('Show a case and its records')
  .option('--full', 'print every released payload')
  .action(async (caseId: string, opts: { full?: boolean }) => {
    const conn = await openConnection(await requireProjectRoot(), true, 0);
    await showCase(conn.handle, caseId, Boolean(opts.full));
    if (conn.mode === 'local') await conn.close();
  });

const card = program.command('card').description('Evidence cards');
card
  .command('draft <caseId>')
  .description('Print a draft evidence card for a case')
  .action(async (caseId: string) => {
    const conn = await openConnection(await requireProjectRoot(), true, 0);
    await printCard(conn.handle, caseId);
    if (conn.mode === 'local') await conn.close();
  });
card
  .command('validate <file>')
  .description('Validate an evidence card in Markdown (use - for stdin)')
  .action(async (file: string) => {
    process.exitCode = (await validateCard(file)) ? 0 : 1;
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof RunnerError) fail(err.message);
  fail(err instanceof Error ? err.message : String(err));
});
