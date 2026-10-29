import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ResearchValuesStore } from '@tfn/app-shell/data';

export type EstimateKind =
  | 'characters'
  | 'stages'
  | 'universalMoves'
  | 'characterMoves';

export interface EstimateDialogData {
  kind: EstimateKind;
  characters: { name: string; semanticKey: string }[];
  expectedCount?: number;
}

@Component({
  selector: 'tfn-estimate-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './estimate-dialog.html',
  styleUrl: './estimate-dialog.css',
})
export class EstimateDialog {
  readonly data = inject<EstimateDialogData>(MAT_DIALOG_DATA);
  readonly research = inject(ResearchValuesStore);
  private readonly dialogRef = inject(MatDialogRef<EstimateDialog>);
  readonly value = signal(
    this.data.expectedCount === undefined
      ? ''
      : String(this.data.expectedCount),
  );
  readonly characterKey = signal(this.data.characters[0]?.semanticKey ?? '');
  readonly error = signal('');

  label(): string {
    if (this.data.kind === 'universalMoves') return 'universal Moves';
    if (this.data.kind === 'characterMoves') {
      const character = this.data.characters.find(
        (item) => item.semanticKey === this.characterKey(),
      );
      return `${character?.name ?? 'character'} Moves`;
    }
    return this.data.kind;
  }

  close(): void {
    this.dialogRef.close();
  }

  async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const count = Number(this.value());
    if (!Number.isInteger(count) || count < 0) {
      this.error.set('Enter a whole number of zero or greater.');
      return;
    }

    if (this.data.kind === 'characterMoves') {
      if (!this.characterKey()) {
        this.error.set('Select a character first.');
        return;
      }
      const result = await this.research.setExpectedCharacterMoves({
        characterKey: this.characterKey(),
        count,
      });
      if (result.status === 'error') {
        this.error.set('The estimate could not be saved.');
        return;
      }
    } else {
      const result = await this.research.setExpectedCount({
        kind: this.data.kind,
        count,
      });
      if (result.status === 'error') {
        this.error.set('The estimate could not be saved.');
        return;
      }
    }

    this.dialogRef.close();
  }
}
