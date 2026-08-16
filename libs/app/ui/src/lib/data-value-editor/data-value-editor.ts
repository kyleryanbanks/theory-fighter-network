import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import type { DataValue } from '@theory-fighter-network/data';

type DataValueMode = 'relative' | 'exact';

@Component({
  selector: 'tfn-data-value-editor',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatSliderModule],
  templateUrl: './data-value-editor.html',
  styleUrl: './data-value-editor.css',
})
export class DataValueEditor {
  readonly value = input<DataValue>({});
  readonly valueChange = output<DataValue>();
  readonly mode = signal<DataValueMode>('relative');
  readonly relativeValue = computed(() => this.value().relative ?? 50);
  readonly exactValue = computed(() => this.value().exact ?? '');

  toggleMode(): void {
    this.mode.update(current => current === 'relative' ? 'exact' : 'relative');
  }

  updateRelative(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.valueChange.emit({ ...this.value(), relative: Math.min(100, Math.max(0, value)) });
    }
  }

  updateRelativeNumber(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.valueChange.emit({
        ...this.value(),
        relative: Math.min(100, Math.max(0, value)),
      });
    }
  }

  updateExact(event: Event): void {
    const input = event.target as HTMLInputElement;
    const exact = input.value === '' ? undefined : Number(input.value);
    if (exact === undefined || Number.isFinite(exact)) {
      const next = { ...this.value() };
      if (exact === undefined) {
        delete next.exact;
      } else {
        next.exact = exact;
      }
      this.valueChange.emit(next);
    }
  }

  modeLabel(): string {
    return this.mode() === 'relative' ? 'Relative' : 'Exact';
  }

  switchLabel(): string {
    return this.mode() === 'relative'
      ? 'Switch to exact value'
      : 'Switch to relative value';
  }
}
