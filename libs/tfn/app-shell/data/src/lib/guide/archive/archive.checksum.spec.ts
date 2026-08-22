import { computeChecksum } from './archive.checksum';

describe('computeChecksum', () => {
  it('is stable across equivalent object key ordering', () => {
    expect(computeChecksum({ a: 1, b: { c: 2 } }))
      .toBe(computeChecksum({ b: { c: 2 }, a: 1 }));
  });

  it('changes when the payload changes', () => {
    expect(computeChecksum({ value: 1 })).not.toBe(computeChecksum({ value: 2 }));
  });
});