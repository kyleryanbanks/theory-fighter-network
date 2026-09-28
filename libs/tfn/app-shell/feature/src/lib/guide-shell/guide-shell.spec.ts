import { describe, expect, it } from 'vitest';
import { GuideShell } from './guide-shell';

describe('GuideShell', () => {
  it('exports the routed shell component', () => {
    expect(GuideShell).toBeTruthy();
  });
});
