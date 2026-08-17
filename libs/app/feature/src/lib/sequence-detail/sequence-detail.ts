import { Component, computed, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LocalGuideFacadeStore, type Step } from '@theory-fighter-network/data';
import { ExpansionPanel, EntityDetailShell } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-sequence-detail',
  imports: [
    JsonPipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ExpansionPanel,
    EntityDetailShell,
    EntityNotes,
  ],
  templateUrl: './sequence-detail.html',
  styleUrl: './sequence-detail.css',
})
export class SequenceDetail {
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly sequence = computed(() => {
    const key = this.route.snapshot.paramMap.get('sequenceKey');
    return (this.facade.guide()?.entities.sequences ?? []).find(
      (candidate) => candidate.semanticKey === key
    );
  });

  readonly moves = computed(() => this.facade.guide()?.entities.moves ?? []);
  readonly draftSequence = signal<Step[] | undefined>(undefined);
  readonly editError = signal('');

  startEdit(): void {
    const seq = this.sequence();
    if (seq) {
      this.draftSequence.set([...seq.sequence]);
    }
  }

  cancelEdit(): void {
    this.draftSequence.set(undefined);
    this.editError.set('');
  }

  updateStepFrames(index: number, value: string): void {
    const frames = parseInt(value, 10);
    if (isNaN(frames) || frames < 0) return;
    const draft = this.draftSequence();
    if (draft) {
      draft[index].frames = frames;
      this.draftSequence.set([...draft]);
    }
  }

  moveName(moveKey: string | undefined): string {
    if (!moveKey) return '(Unknown)';
    return (
      this.moves().find((m) => m.semanticKey === moveKey)?.name ?? moveKey
    );
  }

  async saveSequence(): Promise<void> {
    const seq = this.sequence();
    const draft = this.draftSequence();
    if (!seq || !draft) return;

    const result = await this.facade.updateSequence({
      sequenceKey: seq.semanticKey,
      sequence: draft,
    });

    if (result.status === 'error') {
      this.editError.set(
        result.error instanceof Error
          ? result.error.message
          : 'Failed to update sequence'
      );
      return;
    }

    this.draftSequence.set(undefined);
    this.editError.set('');
  }
}
