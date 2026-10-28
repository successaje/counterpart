import { Button, Card, Field, Input, Mono } from '@counterpart/ui';
import { useState } from 'react';
import { saveToken, tokenFromInput } from '../lib/api.js';
import { useDesk } from '../lib/store.js';

/**
 * Shown when the Desk has no valid token: a fresh tab, or the server
 * restarted and rotated it. Nothing here talks to anything but 127.0.0.1.
 */
export function Connect() {
  const { refresh } = useDesk();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const token = tokenFromInput(value);

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect to your runner</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The Desk needs the token your local Counterpart server printed. It changes every time the
          server starts, so a stale tab lands here.
        </p>
      </div>
      <Card className="space-y-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
          <li>
            In your project, run <Mono>counterpart desk</Mono>. It prints a link ending in{' '}
            <Mono>#token=…</Mono> and opens it.
          </li>
          <li>Or paste that link, or just the token, here.</li>
        </ol>
        <Field label="Desk link or token" error={error}>
          {(id) => (
            <Input
              id={id}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder="http://127.0.0.1:4747/#token=…"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Button
            variant="solid"
            tone="accent"
            disabled={!token}
            onClick={async () => {
              if (!token) return;
              saveToken(token);
              await refresh();
              setError(
                'That token was not accepted. Copy the link from the terminal where counterpart desk is running.',
              );
            }}
          >
            Connect
          </Button>
        </div>
      </Card>
    </div>
  );
}
