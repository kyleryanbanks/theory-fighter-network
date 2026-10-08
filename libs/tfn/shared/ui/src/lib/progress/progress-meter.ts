import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'tfn-progress-meter',
  standalone: true,
  template: `
    <div class="meter-heading">
      <span>{{ label }}</span>
      <strong>{{
        mappingPending
          ? 'Pending'
          : completed + (total === undefined ? '' : ' / ' + total)
      }}</strong>
    </div>
    @if (mappingPending) {
      <p class="mapping-pending" role="status">Progress mapping pending</p>
    } @else {
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
    }
    @if (!mappingPending && total === undefined) {
      <button
        class="estimate-link"
        type="button"
        (click)="estimateRequested.emit()"
      >
        Estimate needed
      </button>
    } @else if (!mappingPending) {
      <small>{{ percent + '%' }}</small>
    }
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
    .estimate-link {
      border: 0;
      padding: 0;
      background: transparent;
      color: #e7b84b;
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    .mapping-pending {
      margin: 0.45rem 0 0.3rem;
      color: #91a89a;
      font-size: 0.8rem;
    }
  `,
})
export class ProgressMeter {
  @Input() completed = 0;
  @Input() total: number | undefined;
  @Input() label = 'Progress';
  @Input() mappingPending = false;
  @Output() estimateRequested = new EventEmitter<void>();

  get percent(): number {
    if (this.total === undefined || this.total <= 0) return 0;
    return Math.min(100, Math.round((this.completed / this.total) * 100));
  }
}
