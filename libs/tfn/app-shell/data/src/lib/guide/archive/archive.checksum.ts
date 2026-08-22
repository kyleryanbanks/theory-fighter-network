import { stableStringify } from './archive.serialization';
export function computeChecksum(payload: unknown): string {
  const input = stableStringify(payload); let hash = 2166136261;
  for (let index = 0; index < input.length; index++) { hash ^= input.charCodeAt(index); hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}