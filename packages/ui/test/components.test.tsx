import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/components/Button.js';
import { BarList, StackedBar } from '../src/components/Meter.js';
import { RecordStatusPill } from '../src/components/Status.js';
import { Stepper } from '../src/components/Stepper.js';
import { CodeBlock } from '../src/components/Text.js';
import { durationLabel, relativeTime } from '../src/components/Time.js';
import { Timeline } from '../src/components/Timeline.js';

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

  it('colours and pulses the current step when asked', () => {
    const { container } = render(
      <Stepper
        steps={[
          { id: 'a', label: 'Asked' },
          { id: 'b', label: 'Your decision' },
        ]}
        current="b"
        tone="pending"
        live
      />,
    );
    const dot = container.querySelector('li[aria-current="step"] span');
    expect(dot?.className).toContain('bg-pending');
    expect(dot?.className).toContain('animate-pulse-dot');
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

describe('StackedBar', () => {
  it('describes the split for assistive tech and lists every segment', () => {
    render(
      <StackedBar
        segments={[
          { id: 'left', label: 'left', value: 4, tone: 'accent' },
          { id: 'stayed', label: 'stayed', value: 1, tone: 'danger' },
          { id: 'waiting', label: 'waiting', value: 0, tone: 'pending' },
        ]}
      />,
    );
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('4 left, 1 stayed');
    expect(screen.getByText('waiting')).toBeTruthy();
  });

  it('says so when there is nothing to show', () => {
    render(<StackedBar segments={[{ id: 'a', label: 'left', value: 0, tone: 'accent' }]} />);
    expect(screen.getByText('nothing yet')).toBeTruthy();
  });
});

describe('BarList', () => {
  it('sizes bars against the largest item', () => {
    const { container } = render(
      <BarList
        items={[
          { id: 'path', label: 'path', value: 3 },
          { id: 'email', label: 'email', value: 1 },
        ]}
      />,
    );
    const fills = container.querySelectorAll('li span span');
    expect((fills[0] as HTMLElement).style.width).toBe('100%');
    expect((fills[1] as HTMLElement).style.width).toBe(`${(1 / 3) * 100}%`);
  });
});

describe('Timeline', () => {
  it('calls out gaps of a minute or more', () => {
    render(
      <Timeline
        entries={[
          { id: 'a', at: '2026-11-05T10:00:00Z', tone: 'info', title: 'Asked' },
          { id: 'b', at: '2026-11-05T10:00:04Z', tone: 'pending', title: 'Waiting' },
          { id: 'c', at: '2026-11-05T10:12:00Z', tone: 'accent', title: 'Released', crossed: true },
        ]}
      />,
    );
    expect(screen.queryByText('4s later')).toBeNull();
    expect(screen.getByText('12 min later')).toBeTruthy();
    expect(screen.getByText('left this machine')).toBeTruthy();
  });
});

describe('durationLabel', () => {
  it('picks the unit', () => {
    expect(durationLabel(12_000)).toBe('12s');
    expect(durationLabel(180_000)).toBe('3 min');
    expect(durationLabel(7_200_000)).toBe('2 h');
    expect(durationLabel(3 * 86_400_000)).toBe('3 days');
  });
});
