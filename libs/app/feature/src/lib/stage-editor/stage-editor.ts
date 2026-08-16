import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';

interface StageDraft {
  name: string;
}

@Component({
  selector: 'tfn-stage-editor',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './stage-editor.html',
  styleUrl: './stage-editor.css',
})
export class StageEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly stages = computed(
    () => this.facade.guide()?.entities.stages ?? []
  );
  readonly stageModel = signal<StageDraft>({ name: '' });
  readonly stageError = signal('');
  readonly stageForm = form(this.stageModel, (path) => {
    required(path.name, { message: 'Stage name is required.' });
  });

  createStage(): void {
    submit(this.stageForm, async () => {
      const result = await this.facade.createStage({
        name: this.stageModel().name.trim(),
      });

      if (result.status === 'error') {
        this.stageError.set(getErrorMessage(result.error));
        return;
      }

      this.stageForm().reset({ name: '' });
      this.stageError.set('');
    });
  }

  async deleteStage(stageKey: string): Promise<void> {
    const result = await this.facade.deleteStage({ stageKey });

    if (result.status === 'error') {
      this.stageError.set(getErrorMessage(result.error));
      return;
    }

    this.stageError.set('');
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The Stage could not be updated.';
}
