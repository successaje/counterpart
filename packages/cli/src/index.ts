export { runDoctor } from './commands/doctor.js';
export { runInit } from './commands/init.js';
export { agentPrincipal, ownerPrincipal, resolveDeskDir } from './context.js';
export * from './mcp/format.js';
export { createMcpServer, MCP_INSTRUCTIONS } from './mcp/server.js';
