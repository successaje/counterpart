import type { Release } from '@counterpart/protocol';
import { Stepper } from '@counterpart/ui';

/**
 * Where a request is on its way from the room to your agent. The same route
 * the site draws: asked, checked against the menu, your decision, collected,
 * redacted, released. Nothing after "your decision" happens until you act.
 */

function collectLabel(record: Release): string {
  const req = record.request;
  switch (req.type) {
    case 'versions':
      return 'Read manifests';
    case 'config':
      return req.args.paths.length === 1 ? 'Read the file' : 'Read the files';
    case 'command':
      return `Run ${req.args.name}`;
    case 'repro':
      return 'Run in the sandbox';
    case 'diff':
      return 'Read git';
    case 'apply-fix':
      return 'Apply and verify';
    case 'other':
      return 'Collect';
  }
}

export function RequestPath({ record, className }: { record: Release; className?: string }) {
  const collecting = record.status === 'collecting';
  const steps = [
    { id: 'asked', label: 'Asked in the room' },
    { id: 'menu', label: 'On the menu' },
    { id: 'decision', label: collecting ? 'Allowed' : 'Your decision' },
    { id: 'collect', label: collectLabel(record) },
    { id: 'redact', label: 'Redact' },
    { id: 'release', label: 'Release to your agent' },
  ];
  return (
    <Stepper
      steps={steps}
      current={collecting ? 'collect' : 'decision'}
      tone={collecting ? 'info' : 'pending'}
      live
      {...(className ? { className } : {})}
    />
  );
}
