import { Component, Input } from '@angular/core';

@Component({
  selector: 'tfn-progress-meter',
  standalone: true,
  template: `
    <div class="meter-heading">
      <span>{{ label }}</span>
      <strong
        >{{ completed }}{{ total === undefined ? '' : ' / ' + total }}</strong
      >
    </div>
    <div
      class="meter-track"
      role="progressbar"
      [attr.aria-label]="label"
      [attr.aria-valuenow]="percent"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
    >
      <span class="meter-fill" [style.width.%]="percent"></span>
    </div>
    <small>{{ total === undefined ? 'Estimate needed' : percent + '%' }}</small>
  `,
  styles: `
    :host {
      display: block;
    }
    .meter-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      color: #dbe7df;
      font-size: 0.85rem;
    }
    .meter-track {
      height: 8px;
      margin: 0.45rem 0 0.3rem;
      overflow: hidden;
      background: #243e32;
      border-radius: 999px;
    }
    .meter-fill {
      display: block;
      height: 100%;
      background: #e7b84b;
      border-radius: inherit;
      transition: width 0.25s ease;
    }
    small {
      color: #91a89a;
    }
  `,
})
export class ProgressMeter {
  @Input() completed = 0;
  @Input() total: number | undefined;
  @Input() label = 'Progress';

  get percent(): number {
    if (this.total === undefined || this.total <= 0) return 0;
    return Math.min(100, Math.round((this.completed / this.total) * 100));
  }
}
