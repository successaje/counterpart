import {
  type AlignedSegment,
  alignRedaction,
  type Payload,
  type RedactedField,
  redactedFields,
} from '@counterpart/protocol';
import { CodeBlock, Pill } from '@counterpart/ui';
import { useMemo } from 'react';

/**
 * What the redactor took out, in place. Every string the release changed is
 * shown once, with the removed text struck through and the token that
 * replaced it beside it. Only the owner sees this: the raw record never
 * leaves the machine.
 */
export function RedactionView({ raw, released }: { raw: Payload; released: Payload }) {
  const fields = useMemo(() => redactedFields(raw, released), [raw, released]);
  if (fields.length === 0) {
    return (
      <p className="text-xs text-ink-faint">
        Nothing differs between the raw record and the release.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        <span className="rounded-sm bg-danger-soft px-1 text-danger line-through">struck</span> text
        stayed on this machine;{' '}
        <span className="rounded-sm bg-accent-soft px-1 text-accent">«redacted:…»</span> is what
        took its place in the release.
      </p>
      {fields.map((f) => (
        <FieldDiff key={f.path} field={f} />
      ))}
    </div>
  );
}

function countByCategory(segments: readonly AlignedSegment[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const s of segments) {
    if (s.kind !== 'removed') continue;
    for (const m of s.token.matchAll(/«redacted:([a-z-]+)»/g)) {
      const k = m[1] ?? 'unknown';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function FieldDiff({ field }: { field: RedactedField }) {
  const segments = useMemo(() => alignRedaction(field.raw, field.released), [field]);

  if (!segments) {
    return (
      <div className="space-y-1.5">
        <p className="text-2xs text-ink-faint">
          <span className="font-mono">{field.label}</span> · the two versions could not be lined up,
          shown side by side instead
        </p>
        <div className="grid gap-2 lg:grid-cols-2">
          <CodeBlock label="stayed on this machine" marks={false}>
            {field.raw}
          </CodeBlock>
          <CodeBlock label="left this machine">{field.released}</CodeBlock>
        </div>
      </div>
    );
  }

  const counts = countByCategory(segments);
  return (
    <div className="overflow-hidden rounded-md border border-line bg-sunken">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5 font-mono text-2xs text-ink-faint">
        <span>{field.label}</span>
        <span className="flex flex-wrap gap-1">
          {counts.map(([k, v]) => (
            <Pill key={k} tone="accent" mono>
              {v} {k}
            </Pill>
          ))}
        </span>
      </div>
      <pre className="scrollbar-thin max-h-96 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre text-ink">
        {segments.map((s, i) =>
          s.kind === 'kept' ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional fragments of one text.
            <span key={i}>{s.text}</span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional fragments of one text.
            <span key={i} className="inline">
              <del
                className="rounded-l-sm bg-danger-soft px-0.5 text-danger decoration-danger/60"
                title="stayed on this machine"
              >
                {s.text}
              </del>
              <mark
                className="rounded-r-sm bg-accent-soft px-0.5 text-accent"
                title="in the release"
              >
                {s.token}
              </mark>
            </span>
          ),
        )}
      </pre>
    </div>
  );
}
