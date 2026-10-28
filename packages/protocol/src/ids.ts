/**
 * Short, prefixed, URL-safe identifiers.
 *
 * `crypto.randomUUID` is available in modern browsers and in Node 19+, so the
 * protocol package can stay free of Node built-ins.
 */

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

function randomChunk(length: number): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  let out = '';
  for (let i = 0; i < length; i++) {
    const byte = Number.parseInt(uuid.slice(i * 2, i * 2 + 2), 16);
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

export type IdPrefix = 'case' | 'req' | 'rec' | 'appr';

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomChunk(10)}`;
}

export const ID_PATTERN = /^(case|req|rec|appr)_[0-9a-z]{10}$/;
