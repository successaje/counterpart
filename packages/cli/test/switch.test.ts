import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { EVIDENCE_INFO, EVIDENCE_TYPES } from '@counterpart/protocol';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { z } from 'zod';

/**
 * The Switch templates and briefs in switch/ are what a maintainer and a
 * reporter run; nothing else in the repository reads them. These tests hold
 * them to Switch's template language (docs/TEMPLATES.md in the Switch
 * repository, version 1) and keep the briefs, the templates and the MCP
 * server saying the same thing.
 */

const SWITCH = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../switch');
const read = (file: string) => readFile(path.join(SWITCH, file), 'utf8');
const body = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n\n?/, '').trimEnd();

/** The nine tools packages/cli/src/mcp/server.ts registers. mcp.test.ts asserts the list. */
const TOOLS = [
  'counterpart_await',
  'counterpart_card',
  'counterpart_case',
  'counterpart_cases',
  'counterpart_collect',
  'counterpart_menu',
  'counterpart_open_case',
  'counterpart_refuse',
  'counterpart_update_case',
];

const IDENT = /^[a-z0-9][a-z0-9._-]*$/;
const placeholder = z.string().regex(/^\{[a-z_][a-z0-9_]*\}$/);

const param = z
  .object({
    type: z.enum([
      'string',
      'number',
      'boolean',
      'enum',
      'agent',
      'bridge',
      'room',
      'user',
      'provider',
      'location',
      'machine',
      'directory',
    ]),
    description: z.string().optional(),
    label: z.string().optional(),
    default: z.unknown().optional(),
    required: z.boolean().optional(),
    input: z.enum(['ask', 'advanced', 'fixed']).optional(),
    enum: z.array(z.string()).optional(),
    multiline: z.boolean().optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();

const agentBlock = z
  .object({
    name: z.string().optional(),
    display_name: z.string().optional(),
    icon_url: z.string().url().optional(),
    description: z.string().optional(),
    instructions: z.string().min(1),
    provider: z.union([
      z.enum(['claude', 'codex', 'opencode', 'antigravity', 'cursor']),
      placeholder,
    ]),
    machine: z.string().optional(),
    location: z.string().optional(),
    directory: z.string().min(1),
    model: z.string().optional(),
    advanced_config: z.record(z.string(), z.unknown()).optional(),
    isolation: z.enum(['shared', 'isolated']).optional(),
    auto_mode: z.boolean().optional(),
    auto_approve: z.boolean().optional(),
    can_manage_agents: z.boolean().optional(),
    connections: z.array(z.unknown()).optional(),
    repo: z.string().optional(),
    sources: z
      .array(z.union([z.string(), z.object({ label: z.string(), url: z.string().url() })]))
      .optional(),
    addressing: z.enum(['owner', 'owner-agents', 'anyone']).optional(),
    join: z.array(z.string()).optional(),
    allow_existing: z.boolean().optional(),
  })
  .strict()
  .refine((a) => a.location || a.machine, 'an agent says where it runs');

const roomBlock = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    instructions: z.string().optional(),
    bridge: z.string().optional(),
    channel_type: z.enum(['channel_public', 'channel_private']).optional(),
    read_visibility: z.string().optional(),
    write_visibility: z.string().optional(),
    agents: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    roles: z.array(z.unknown()).optional(),
    references: z.array(z.unknown()).optional(),
    packages: z.array(z.unknown()).optional(),
    docs: z
      .array(
        z
          .object({
            name: z.string().regex(IDENT),
            description: z.string(),
            instructions: z.string(),
            content: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
    aliases: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const template = z
  .object({
    version: z.literal(1),
    params: z.record(z.string().regex(/^[a-z_][a-z0-9_]*$/), param),
    form: z.object({ advanced: z.object({ label: z.string(), open: z.boolean() }) }).optional(),
    agent: agentBlock.optional(),
    agents: z.array(agentBlock).optional(),
    room: roomBlock.optional(),
    kickoff: z.string().optional(),
  })
  .strict();

type Template = z.infer<typeof template>;

const BUILTINS = new Set(['$creator', '$creator_email', '$date', '$timestamp', '$agents_dir']);

function placeholders(doc: unknown): string[] {
  const text = JSON.stringify(doc);
  return [...text.matchAll(/\{(\$?[a-z_][a-z0-9_]*)\}/g)].map((m) => m[1] as string);
}

async function load(file: string): Promise<Template> {
  const parsed = template.safeParse(YAML.parse(await read(file)));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
  return parsed.data;
}

function checkPlaceholders(doc: Template) {
  const declared = new Set(Object.keys(doc.params));
  const used = placeholders(doc);
  for (const name of used) {
    if (name.startsWith('$')) expect(BUILTINS, `builtin {${name}}`).toContain(name);
    else if (name !== 'agent') expect(declared, `{${name}} is declared`).toContain(name);
  }
  for (const name of declared) expect(used, `param ${name} is used`).toContain(name);
}

describe('switch/support-room.template.yaml', () => {
  it('is a valid version 1 template that creates the helpdesk and its room', async () => {
    const doc = await load('support-room.template.yaml');
    checkPlaceholders(doc);
    const agent = doc.agent as NonNullable<Template['agent']>;
    expect(agent.name).toBe('{project}-helpdesk');
    expect(agent.addressing).toBe('anyone');
    expect(agent.auto_mode).toBe(true);
    expect(agent.auto_approve).toBe(false);
    expect(doc.params.provider?.type).toBe('provider');
    expect(doc.params.location?.type).toBe('location');
    expect(doc.params.directory?.type).toBe('directory');
    expect(doc.params.project?.pattern).toBeDefined();
    const room = doc.room as NonNullable<Template['room']>;
    expect(room.name).toBe('{project}-support');
    expect(room.channel_type).toBe('channel_public');
    expect(room.agents).toEqual(['{agent}']);
    expect(room.users).toEqual(['{$creator}']);
    expect(doc.kickoff).toContain('@{agent}');
  });

  it('carries the helpdesk brief and both room documents word for word', async () => {
    const doc = await load('support-room.template.yaml');
    expect(doc.agent?.instructions.trimEnd()).toBe(body(await read('helpdesk.md')));
    const docs = Object.fromEntries(
      (doc.room?.docs ?? []).map((d) => [d.name, d.content.trimEnd()]),
    );
    expect(Object.keys(docs).sort()).toEqual(['case-ledger', 'evidence-protocol']);
    expect(docs['evidence-protocol']).toBe((await read('evidence-protocol.md')).trimEnd());
    expect(docs['case-ledger']).toBe((await read('case-ledger.md')).trimEnd());
  });
});

describe('switch/dev-agent.template.yaml', () => {
  it('creates the reporter agent in the project folder, auto mode off, joining the support room', async () => {
    const doc = await load('dev-agent.template.yaml');
    checkPlaceholders(doc);
    expect(doc.room).toBeUndefined();
    const agent = doc.agent as NonNullable<Template['agent']>;
    expect(agent.auto_mode).toBe(false);
    expect(agent.auto_approve).toBe(false);
    expect(agent.addressing).toBe('owner-agents');
    expect(agent.directory).toBe('{project_dir}');
    expect(doc.params.project_dir?.type).toBe('directory');
    expect(agent.join).toEqual(['{room}']);
    expect(doc.params.room?.type).toBe('room');
    expect(doc.params.name?.default).toBe('dev-agent');
    expect(doc.params.name?.pattern).toBeDefined();
    expect(agent.instructions.trimEnd()).toBe(body(await read('dev-agent.md')));
  });
});

describe('the briefs and the evidence protocol', () => {
  it('name only tools the MCP server has, and every evidence code', async () => {
    for (const file of ['dev-agent.md', 'helpdesk.md']) {
      const text = await read(file);
      const named = [...new Set(text.match(/counterpart_[a-z_]+/g) ?? [])];
      for (const t of named) expect(TOOLS, `${file} names ${t}`).toContain(t);
      for (const type of EVIDENCE_TYPES) {
        const info = EVIDENCE_INFO[type];
        expect(text, `${file} mentions ${info.code} ${type}`).toMatch(
          new RegExp(`${info.code}\\b[^\\n]*${type}`),
        );
      }
    }
    expect(await read('dev-agent.md')).toMatch(/counterpart_refuse/);
    expect(await read('dev-agent.md')).toMatch(/counterpart_await/);
    expect(await read('helpdesk.md')).toMatch(/counterpart_card/);
  });

  it('lists the six types in the protocol order', async () => {
    const rows = (await read('evidence-protocol.md'))
      .split('\n')
      .filter((l) => /^\| E\d /.test(l))
      .map((l) => l.split('|').map((c) => c.trim()));
    expect(rows.map((r) => [r[1], r[2]])).toEqual(
      EVIDENCE_TYPES.map((t) => [EVIDENCE_INFO[t].code, t]),
    );
  });

  it('keeps the two rules in both the document and the helpdesk brief', async () => {
    const protocol = await read('evidence-protocol.md');
    const helpdesk = await read('helpdesk.md');
    for (const text of [protocol, helpdesk]) {
      expect(text).toMatch(/[Aa]sk (by name|only for what is on the menu)/);
      expect(text).toMatch(/[Nn]ever ask (for anything else|the reporter's agent)/);
      expect(text).toMatch(/refusal or a decline is final/);
    }
  });
});
