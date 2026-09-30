import type { LocalGuide } from '../guide';

export type ProgressState =
  | 'not-started'
  | 'in-progress'
  | 'complete'
  | 'blocked';

export interface ProgressResult {
  completed: number;
  total?: number;
  label: string;
  nextStep?: string;
  state: ProgressState;
}

export interface HelperTaskStep {
  key: string;
  title: string;
  getProgress: (guide: LocalGuide) => ProgressResult;
}

export interface HelperTask {
  key: string;
  title: string;
  steps: HelperTaskStep[];
}
