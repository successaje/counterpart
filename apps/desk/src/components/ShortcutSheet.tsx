import { Dialog, Kbd } from '@counterpart/ui';

const GROUPS: Array<{ title: string; rows: Array<[string[], string]> }> = [
  {
    title: 'Decide',
    rows: [
      [['a'], 'Allow the first waiting request once'],
      [['c'], 'Allow it for the rest of its case'],
      [['d'], 'Decline it, with a reason'],
    ],
  },
  {
    title: 'Go to',
    rows: [
      [['g', 'n'], 'Now'],
      [['g', 'c'], 'Cases'],
      [['g', 'l'], 'Ledger'],
      [['g', 'm'], 'Menu'],
    ],
  },
  {
    title: 'Everywhere',
    rows: [
      [['?'], 'This sheet'],
      [['Esc'], 'Close a dialog'],
    ],
  },
];

export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Shortcuts are off while you type in a field or a dialog is open."
      size="sm"
    >
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
              {g.title}
            </h3>
            <dl className="space-y-1.5">
              {g.rows.map(([keys, what]) => (
                <div key={what} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-ink">{what}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
