import { describe, expect, it } from 'vitest';
import { type EvidenceCard, formatEvidenceCard, parseEvidenceCard } from '../src/card.js';

const card: EvidenceCard = {
  caseId: 'case_7h2k9m3p1q',
  title: 'cachekit-s3 0.4.1 cannot find the cache directory after cachekit 3.2.0',
  environment: ['node 24.2.0, pnpm 10.2.1', 'cachekit 3.2.0, cachekit-s3 0.4.1', 'macOS'],
  reproduction: 'E3 test (verbose): 2 failures in cache.spec.ts, "ENOENT .cache/cachekit"',
  diagnosis:
    'cachekit 3.2.0 moved the default directory to .cachekit; the plugin hard-codes the old path.',
  fixTried: 'Set CACHEKIT_DIR=.cache/cachekit; E6 verified with test.',
  confidence: 'reproduced',
  approvals: [
    'E3 command:test allowed once by owner via desk',
    'E6 apply-fix allowed once by owner via desk',
  ],
  thread: 'https://discord.com/channels/1/2/3',
};

describe('evidence card', () => {
  it('round-trips through markdown', () => {
    const md = formatEvidenceCard(card);
    expect(md.startsWith('**Case:** case_7h2k9m3p1q')).toBe(true);
    expect(md).not.toContain('|'); // no tables on chat bridges
    const parsed = parseEvidenceCard(md);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(card);
  });

  it('renders "none needed" when there were no approvals and parses it back', () => {
    const md = formatEvidenceCard({
      ...card,
      approvals: [],
      diagnosis: undefined,
      fixTried: undefined,
      thread: undefined,
    });
    expect(md).toContain('**Approvals:** none needed');
    const parsed = parseEvidenceCard(md);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.approvals).toEqual([]);
  });

  it('rejects a card without reproduction', () => {
    expect(parseEvidenceCard('**Case:** x\n\n**Title:** t\n\n**Confidence:** likely').success).toBe(
      false,
    );
  });
});
