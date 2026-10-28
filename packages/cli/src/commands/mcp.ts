import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { openConnection } from '../context.js';
import { createMcpServer } from '../mcp/server.js';

/**
 * Runs the MCP server on stdio. Nothing may be written to stdout here except
 * protocol frames, so all logging goes to stderr.
 */
export async function runMcp(root: string, version: string): Promise<void> {
  const conn = await openConnection(root, true);
  const server = createMcpServer(conn.handle, version);
  const transport = new StdioServerTransport();
  const shutdown = async () => {
    await server.close().catch(() => undefined);
    if (conn.mode === 'local') await conn.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  transport.onclose = () => void shutdown();
  await server.connect(transport);
  const info = await conn.handle.info();
  console.error(
    `counterpart mcp: ${info.project.name} · ${conn.mode === 'local' ? `serving ${conn.server.url}` : `joined ${conn.server.url}`}${info.desk ? ` · Desk ${info.desk.url}` : ''}`,
  );
}
