import { openConnection, openInBrowser } from '../context.js';
import { heading, ui } from '../ui.js';

export async function runDesk(root: string, opts: { port?: number; open: boolean }): Promise<void> {
  const conn = await openConnection(root, true, opts.port);
  const info = await conn.handle.info();
  const url = conn.mode === 'local' ? conn.server.deskUrl : conn.server.deskUrl;
  console.log(heading(`Counterpart Desk  ${ui.dim(info.project.name)}`));
  console.log(`  ${ui.code(url)}`);
  if (!info.desk) {
    console.log(
      `  ${ui.warn('The Desk UI is not built; the API is serving. Approvals: counterpart approvals')}`,
    );
  }
  if (conn.mode === 'remote') {
    console.log(
      `  ${ui.dim(`joined the server already running for this project (pid ${conn.server.pid})`)}`,
    );
    if (opts.open) openInBrowser(url);
    return;
  }
  console.log(
    `  ${ui.dim("bound to 127.0.0.1; the token in the URL is this server's secret. Ctrl-C to stop.")}`,
  );
  if (opts.open) openInBrowser(url);

  const pending = await conn.handle.pendingApprovals();
  if (pending.length)
    console.log(`\n  ${ui.warn(`${pending.length} request(s) waiting for your decision`)}`);

  await new Promise<void>((resolve) => {
    const stop = async () => {
      console.log(`\n${ui.dim('stopping')}`);
      await conn.close();
      resolve();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}
