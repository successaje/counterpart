import { z } from 'zod';

/**
 * The evidence card is what a helpdesk posts back to the room and keeps in
 * the case ledger. Plain Markdown, bold labels, no tables, so it renders the
 * same on every chat bridge.
 */

export const ConfidenceSchema = z.enum(['reproduced', 'likely', 'unconfirmed']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const EvidenceCardSchema = z.object({
  caseId: z.string(),
  title: z.string().min(1).max(140),
  environment: z.array(z.string().min(1)).min(1),
  reproduction: z.string().min(1),
  diagnosis: z.string().optional(),
  fixTried: z.string().optional(),
  confidence: ConfidenceSchema,
  approvals: z.array(z.string().min(1)),
  thread: z.string().url().optional(),
});
export type EvidenceCard = z.infer<typeof EvidenceCardSchema>;

const LABELS = {
  title: 'Title',
  environment: 'Environment',
  reproduction: 'Reproduction',
  diagnosis: 'Diagnosis',
  fixTried: 'Fix tried',
  confidence: 'Confidence',
  approvals: 'Approvals',
  thread: 'Thread',
} as const;

function block(label: string, body: string): string {
  return body.includes('\n') ? `**${label}:**\n${body}` : `**${label}:** ${body}`;
}

export function formatEvidenceCard(card: EvidenceCard): string {
  const parts: string[] = [
    `**Case:** ${card.caseId}`,
    block(LABELS.title, card.title),
    block(LABELS.environment, card.environment.map((e) => `- ${e}`).join('\n')),
    block(LABELS.reproduction, card.reproduction),
  ];
  if (card.diagnosis) parts.push(block(LABELS.diagnosis, card.diagnosis));
  if (card.fixTried) parts.push(block(LABELS.fixTried, card.fixTried));
  parts.push(block(LABELS.confidence, card.confidence));
  parts.push(
    block(
      LABELS.approvals,
      card.approvals.length ? card.approvals.map((a) => `- ${a}`).join('\n') : 'none needed',
    ),
  );
  if (card.thread) parts.push(block(LABELS.thread, card.thread));
  return parts.join('\n\n');
}

/**
 * Parses a card back out of Markdown produced by `formatEvidenceCard` or
 * written by hand in the same shape. Used to validate what a helpdesk posts.
 */
export function parseEvidenceCard(markdown: string): z.ZodSafeParseResult<EvidenceCard> {
  const sections = new Map<string, string>();
  const re = /\*\*([A-Za-z ]+):\*\*[ \t]*([\s\S]*?)(?=\n\n\*\*[A-Za-z ]+:\*\*|$)/g;
  for (const m of markdown.matchAll(re)) {
    const label = (m[1] ?? '').trim().toLowerCase();
    sections.set(label, (m[2] ?? '').trim());
  }
  const list = (s: string | undefined) =>
    (s ?? '')
      .split('\n')
      .map((l) => l.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  const approvals = sections.get('approvals');
  const candidate = {
    caseId: sections.get('case'),
    title: sections.get('title'),
    environment: list(sections.get('environment')),
    reproduction: sections.get('reproduction'),
    diagnosis: sections.get('diagnosis'),
    fixTried: sections.get('fix tried'),
    confidence: sections.get('confidence'),
    approvals: approvals === 'none needed' ? [] : list(approvals),
    thread: sections.get('thread'),
  };
  return EvidenceCardSchema.safeParse(candidate);
}
