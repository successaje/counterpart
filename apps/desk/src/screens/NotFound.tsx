import { EmptyState } from '@counterpart/ui';
import { Link } from 'react-router';
import { Page } from './Page.js';

export function NotFound() {
  return (
    <Page title="Not here">
      <EmptyState
        title="There is nothing at this address."
        action={
          <Link to="/" className="text-sm text-info underline-offset-2 hover:underline">
            Back to Now
          </Link>
        }
      />
    </Page>
  );
}
