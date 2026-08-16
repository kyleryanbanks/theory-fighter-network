import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  LocalGuideFacadeStore,
  createStageZoneSemanticKey,
  type NoteEntry,
} from '@theory-fighter-network/data';
import { DeleteButton, EntityMetadataView, ExpansionPanel } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

interface StageDraft {
  name: string;
}

interface ZoneDraft {
  name: string;
}

@Component({
  selector: 'tfn-stage-editor',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, EntityNotes, EntityMetadataView, ExpansionPanel, DeleteButton],
  templateUrl: './stage-editor.html',
  styleUrl: './stage-editor.css',
})
export class StageEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly stages = computed(
    () => this.facade.guide()?.entities.stages ?? []
  );
  readonly stageZones = computed(
    () => this.facade.guide()?.entities.stageZones ?? []
  );
  readonly universalZones = computed(() =>
    this.stageZones().filter((zone) => !zone.stageKey)
  );
  readonly stageModel = signal<StageDraft>({ name: '' });
  readonly stageError = signal('');
  readonly stageForm = form(this.stageModel, (path) => {
    required(path.name, { message: 'Stage name is required.' });
  });
  readonly zoneModel = signal<ZoneDraft>({ name: '' });
  readonly zoneError = signal('');
  readonly zoneForm = form(this.zoneModel, (path) => {
    required(path.name, { message: 'Zone name is required.' });
  });
  private readonly addressedStageNote = signal<{
    stageKey: string;
    note: NoteEntry;
  } | null>(null);

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

  createUniversalZone(): void {
    submit(this.zoneForm, async () => {
      const zoneName = this.zoneModel().name.trim();
      const result = await this.facade.createStageZone({
        name: zoneName,
      });

      if (result.status === 'error') {
        this.zoneError.set(getErrorMessage(result.error));
        return;
      }

      this.zoneForm().reset({ name: '' });
      this.zoneError.set('');

      const addressed = this.addressedStageNote();
      const game = this.facade.guide()?.entities.game;
      if (addressed && game) {
        const linked = await this.facade.promoteEntityNote({
          entityType: 'stage',
          entityKey: addressed.stageKey,
          noteId: addressed.note.id,
          promotedToKey: createStageZoneSemanticKey(
            game.semanticKey,
            undefined,
            zoneName
          ),
        });
        if (linked.status === 'error') {
          this.zoneError.set(getErrorMessage(linked.error));
        }
        this.addressedStageNote.set(null);
      }
    });
  }

  addressStageNote(stageKey: string, note: NoteEntry): void {
    this.addressedStageNote.set({ stageKey, note });
    this.zoneModel.set({ name: note.text });
  }

  // A Stage's own local Zones: stage-only Zones and overrides of universal Zones.
  localZonesFor(stageKey: string) {
    return this.stageZones().filter((zone) => zone.stageKey === stageKey);
  }

  isOverridden(stageKey: string, universalZoneKey: string): boolean {
    return this.localZonesFor(stageKey).some(
      (zone) => zone.inheritedFromZoneKey === universalZoneKey
    );
  }

  async overrideZone(stageKey: string, universalZoneKey: string): Promise<void> {
    const result = await this.facade.overrideStageZone({
      stageKey,
      universalZoneKey,
    });

    if (result.status === 'error') {
      this.zoneError.set(getErrorMessage(result.error));
      return;
    }

    this.zoneError.set('');
  }

  async deleteZone(stageZoneKey: string): Promise<void> {
    const result = await this.facade.deleteStageZone({ stageZoneKey });

    if (result.status === 'error') {
      this.zoneError.set(getErrorMessage(result.error));
      return;
    }

    this.zoneError.set('');
  }

  async promoteZone(stageZoneKey: string): Promise<void> {
    const result = await this.facade.promoteStageZone({ stageZoneKey });

    if (result.status === 'error') {
      this.zoneError.set(getErrorMessage(result.error));
      return;
    }

    this.zoneError.set('');
  }
}


function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The Stage could not be updated.';
}
