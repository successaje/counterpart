import { Button, EmptyState } from '@counterpart/ui';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

/**
 * Route-level error boundary. The ledger on disk is untouched by anything
 * that goes wrong here, and the message says so.
 */
export function ErrorScreen() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong while drawing this screen.';
  return (
    <div className="mx-auto max-w-lg pt-8">
      <EmptyState
        title="The Desk hit an error"
        body={
          <div className="space-y-2">
            <p>Your ledger and evidence on disk are not affected. Reloading usually clears it.</p>
            <pre className="overflow-x-auto rounded-md bg-sunken p-2 font-mono text-xs text-ink-muted">
              {message}
            </pre>
          </div>
        }
        action={
          <div className="flex gap-2">
            <Button variant="solid" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Link
              to="/"
              className="inline-flex h-9 items-center px-2 text-sm text-ink-muted hover:text-ink"
            >
              Back to Now
            </Link>
          </div>
        }
      />
    </div>
  );
}
