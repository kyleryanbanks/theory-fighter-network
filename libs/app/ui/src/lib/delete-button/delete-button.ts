import { Component, booleanAttribute, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'tfn-delete-button',
  imports: [MatButtonModule],
  templateUrl: './delete-button.html',
  styleUrl: './delete-button.css',
})
export class DeleteButton {
  readonly ariaLabel = input<string>();
  readonly testId = input<string>();
  readonly delete = output<void>();
  readonly confirm = input(true, { transform: booleanAttribute });

  requestDelete(): void {
    const targetLabel = this.ariaLabel() ?? 'Delete';
    if (
      this.confirm() &&
      !(globalThis.confirm?.(`${targetLabel}? This cannot be undone.`) ?? true)
    ) {
      return;
    }
    this.delete.emit();
  }
}
