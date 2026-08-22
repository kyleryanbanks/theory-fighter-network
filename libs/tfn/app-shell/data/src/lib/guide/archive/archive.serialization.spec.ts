import { stableStringify } from './archive.serialization';

describe('stableStringify', () => {
  it('sorts nested object keys without changing array order', () => {
    expect(stableStringify({ z: [{ b: 2, a: 1 }], a: true }))
      .toBe('{"a":true,"z":[{"a":1,"b":2}]}');
  });
});