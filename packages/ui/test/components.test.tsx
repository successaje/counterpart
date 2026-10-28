import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/components/Button.js';
import { RecordStatusPill } from '../src/components/Status.js';
import { Stepper } from '../src/components/Stepper.js';
import { CodeBlock } from '../src/components/Text.js';
import { relativeTime } from '../src/components/Time.js';

describe('Button', () => {
  it('disables itself while busy and exposes aria-busy', () => {
    render(<Button busy>Allow once</Button>);
    const b = screen.getByRole('button', { name: 'Allow once' });
    expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(b.getAttribute('aria-busy')).toBe('true');
  });
});

describe('RecordStatusPill', () => {
  it('labels statuses for people, not for code', () => {
    render(<RecordStatusPill status="pending" />);
    expect(screen.getByText('Waiting for you')).toBeTruthy();
  });
});

describe('Stepper', () => {
  it('marks the current step', () => {
    render(
      <Stepper
        steps={[
          { id: 'a', label: 'Reported' },
          { id: 'b', label: 'Diagnosed' },
        ]}
        current="b"
      />,
    );
    expect(screen.getByText('Diagnosed').closest('li')?.getAttribute('aria-current')).toBe('step');
  });
});

describe('CodeBlock', () => {
  it('collapses long output and highlights redaction tokens', () => {
    const text = Array.from({ length: 30 }, (_, i) =>
      i === 0 ? 'KEY=«redacted:secret»' : `line ${i}`,
    ).join('\n');
    render(<CodeBlock collapsedLines={5}>{text}</CodeBlock>);
    expect(screen.getByText('show 25 more lines')).toBeTruthy();
    expect(screen.getByText('«redacted:secret»').tagName).toBe('MARK');
  });
});

describe('relativeTime', () => {
  it('rounds sensibly', () => {
    const now = Date.parse('2026-11-05T10:00:00Z');
    expect(relativeTime('2026-11-05T09:59:58Z', now)).toBe('just now');
    expect(relativeTime('2026-11-05T09:58:00Z', now)).toBe('2 min ago');
    expect(relativeTime('2026-11-05T07:00:00Z', now)).toBe('3 h ago');
  });
});
