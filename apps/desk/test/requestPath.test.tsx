import type { Release } from '@counterpart/protocol';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RequestPath } from '../src/components/RequestPath.js';

const helpdesk = { kind: 'agent', name: 'cachekit-helpdesk', side: 'project' } as const;
const now = '2026-11-05T10:00:00.000Z';

function record(status: Release['status'], type: 'command' | 'repro' | 'config'): Release {
  const base = {
    id: 'req_1',
    caseId: 'case_1',
    requestedBy: helpdesk,
    requestText: 'please',
    createdAt: now,
  };
  const request =
    type === 'command'
      ? { ...base, type: 'command' as const, args: { name: 'test', verbose: true } }
      : type === 'repro'
        ? { ...base, type: 'repro' as const, args: { script: 'echo hi', shell: 'sh' as const } }
        : { ...base, type: 'config' as const, args: { paths: ['.env'] } };
  return {
    id: 'rec_1',
    request,
    status,
    approval: null,
    released: null,
    redaction: null,
    createdAt: now,
    updatedAt: now,
  } as Release;
}

function current() {
  return screen.getByRole('list', { name: 'Request path' }).querySelector('li[aria-current="step"]')
    ?.textContent;
}

describe('RequestPath', () => {
  afterEach(cleanup);

  it('pauses at the owner while the request waits', () => {
    render(<RequestPath record={record('pending', 'command')} />);
    expect(current()).toContain('Your decision');
    expect(screen.getByText('Run test')).toBeTruthy();
  });

  it('moves to collection once allowed and names what it is doing', () => {
    render(<RequestPath record={record('collecting', 'repro')} />);
    expect(current()).toContain('Run in the sandbox');
    expect(screen.getByText('Allowed')).toBeTruthy();
    expect(screen.queryByText('Your decision')).toBeNull();
  });

  it('describes a read in plain words', () => {
    render(<RequestPath record={record('pending', 'config')} />);
    expect(screen.getByText('Read the file')).toBeTruthy();
  });
});
