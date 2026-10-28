import pc from 'picocolors';

export const ui = {
  title: (s: string) => pc.bold(s),
  dim: (s: string) => pc.dim(s),
  ok: (s: string) => pc.green(s),
  warn: (s: string) => pc.yellow(s),
  bad: (s: string) => pc.red(s),
  code: (s: string) => pc.cyan(s),
  label: (s: string) => pc.bold(pc.white(s)),
};

export function heading(text: string): string {
  return `\n${ui.title(text)}`;
}

export function kv(rows: Array<[string, string]>, indent = 2): string {
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${' '.repeat(indent)}${ui.dim(k.padEnd(width))}  ${v}`).join('\n');
}

export function columns(rows: string[][], indent = 2): string {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 0, visible(cell).length);
    });
  }
  return rows
    .map((row) =>
      `${' '.repeat(indent)}${row
        .map((cell, i) =>
          i === row.length - 1 ? cell : cell + ' '.repeat((widths[i] ?? 0) - visible(cell).length),
        )
        .join('  ')}`.trimEnd(),
    )
    .join('\n');
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: strips ANSI for width maths.
const ANSI = /\x1b\[[0-9;]*m/g;
function visible(s: string): string {
  return s.replace(ANSI, '');
}

export function relative(iso: string, now = Date.now()): string {
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fail(message: string): never {
  console.error(`${ui.bad('error')} ${message}`);
  process.exit(1);
}
