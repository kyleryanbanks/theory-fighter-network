import { Component, Input } from '@angular/core';
import type { ProgressResult } from '@tfn/app-shell/data';

@Component({
  selector: 'tfn-completion-checklist',
  standalone: true,
  template: `
    <ul class="checklist">
      @for (step of steps; track step.key) {
        <li [class.complete]="step.progress.state === 'complete'">
          <span class="check" aria-hidden="true">{{
            step.progress.state === 'complete' ? '✓' : '○'
          }}</span>
          <span>{{ step.title }}</span>
          <span class="state"
            >{{ step.progress.completed
            }}{{
              step.progress.total === undefined ? '' : '/' + step.progress.total
            }}</span
          >
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .checklist {
      display: grid;
      gap: 0.65rem;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li {
      display: grid;
      grid-template-columns: 1.3rem 1fr auto;
      align-items: center;
      gap: 0.5rem;
      color: #b9cbbf;
    }
    li.complete {
      color: #e7f1eb;
    }
    .check {
      color: #e7b84b;
      font-weight: 700;
    }
    .state {
      color: #91a89a;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CompletionChecklist {
  @Input() steps: Array<{
    key: string;
    title: string;
    progress: ProgressResult;
  }> = [];
}
