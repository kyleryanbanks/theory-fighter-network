import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  LocalGuideFacadeStore,
  resolveEffectiveMove,
} from '@theory-fighter-network/data';
import { DeleteButton, EntityMetadataView, ExpansionPanel, TfnLink } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

interface MoveDraft {
  name: string;
}

const UNIVERSAL_SCOPE = '';

@Component({
  selector: 'tfn-move-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    TfnLink,
    EntityNotes,
    ExpansionPanel,
    EntityMetadataView,
    DeleteButton,
  ],
  templateUrl: './move-editor.html',
  styleUrl: './move-editor.css',
})
export class MoveEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? []
  );
  readonly scopeKey = signal(UNIVERSAL_SCOPE);
  readonly universalMoves = computed(() =>
    (this.facade.guide()?.entities.moves ?? []).filter(
      (move) => !move.characterKey
    )
  );
  readonly moves = computed(() => {
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    const scope = this.scopeKey();

    return scope === UNIVERSAL_SCOPE
      ? this.universalMoves()
      : [
          ...this.universalMoves(),
          ...allMoves.filter((move) => move.characterKey === scope),
        ];
  });
  // A Character's own Moves within the currently selected scope (empty in
  // the Universal scope, since there is no owning Character), resolved
  // against their universal parent so unset fields live-cascade.
  readonly ownMoves = computed(() => {
    const scope = this.scopeKey();
    if (scope === UNIVERSAL_SCOPE) {
      return [];
    }
    const allMoves = this.facade.guide()?.entities.moves ?? [];
    return allMoves
      .filter((move) => move.characterKey === scope)
      .map((move) => resolveEffectiveMove(move, allMoves));
  });
  readonly moveModel = signal<MoveDraft>({ name: '' });
  readonly moveError = signal('');
  readonly moveForm = form(this.moveModel, (path) => {
    required(path.name, { message: 'Move name is required.' });
  });

  setScope(scopeKey: string): void {
    this.scopeKey.set(scopeKey);
    this.moveError.set('');
  }

  createMove(): void {
    submit(this.moveForm, async () => {
      const scope = this.scopeKey();
      const result = await this.facade.createMove({
        name: this.moveModel().name.trim(),
        ...(scope === UNIVERSAL_SCOPE ? {} : { characterKey: scope }),
      });

      if (result.status === 'error') {
        this.moveError.set(getErrorMessage(result.error));
        return;
      }

      this.moveForm().reset({ name: '' });
      this.moveError.set('');
    });
  }

  isOverridden(universalMoveKey: string): boolean {
    return this.ownMoves().some((move) => move.parentKey === universalMoveKey);
  }

  async overrideMove(universalMoveKey: string): Promise<void> {
    const result = await this.facade.overrideMove({
      characterKey: this.scopeKey(),
      universalMoveKey,
    });

    if (result.status === 'error') {
      this.moveError.set(getErrorMessage(result.error));
      return;
    }

    this.moveError.set('');
  }

  async promoteMove(moveKey: string): Promise<void> {
    const result = await this.facade.promoteMove({ moveKey });

    if (result.status === 'error') {
      this.moveError.set(getErrorMessage(result.error));
      return;
    }

    this.moveError.set('');
  }

  async deleteMove(moveKey: string): Promise<void> {
    const result = await this.facade.deleteMove({ moveKey });

    if (result.status === 'error') {
      this.moveError.set(getErrorMessage(result.error));
      return;
    }

    this.moveError.set('');
  }
}


function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The Move could not be updated.';
}
