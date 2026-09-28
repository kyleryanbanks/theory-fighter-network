import type { ProgressResult } from './progress.types';

export function calculateCountProgress(
  label: string,
  actual: number,
  expected: number | undefined,
): ProgressResult {
  if (expected === undefined) {
    return {
      completed: actual,
      total: undefined,
      label,
      state: 'blocked',
    };
  }

  return {
    completed: actual,
    total: expected,
    label,
    state:
      expected === 0 || actual >= expected
        ? 'complete'
        : actual === 0
          ? 'not-started'
          : 'in-progress',
  };
}
