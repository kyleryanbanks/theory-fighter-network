import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LocalGuideFacadeStore, type EntityType } from '@tfn/app-shell/data';

type FindingAction = 'create' | 'update' | 'note';
type CreatableEntityType =
  | 'character'
  | 'move'
  | 'stage'
  | 'sequence'
  | 'team'
  | 'matchup';

interface FindingEntityOption {
  key: string;
  label: string;
}

const ENTITY_TYPES: { type: EntityType; label: string }[] = [
  { type: 'game', label: 'Game' },
  { type: 'stage', label: 'Stage' },
  { type: 'stageZone', label: 'Stage Zone' },
  { type: 'character', label: 'Character' },
  { type: 'team', label: 'Team' },
  { type: 'move', label: 'Move' },
  { type: 'sequence', label: 'Sequence' },
  { type: 'projectile', label: 'Projectile' },
  { type: 'matchup', label: 'Matchup' },
];

const CREATABLE_TYPES: { type: CreatableEntityType; label: string }[] = [
  { type: 'character', label: 'Character' },
  { type: 'move', label: 'Move' },
  { type: 'stage', label: 'Stage' },
  { type: 'sequence', label: 'Sequence' },
  { type: 'team', label: 'Team' },
  { type: 'matchup', label: 'Matchup' },
];

const CREATE_ROUTES: Record<CreatableEntityType, string> = {
  character: '/characters',
  move: '/moves',
  stage: '/stages',
  sequence: '/sequences',
  team: '/teams',
  matchup: '/matchups',
};

const UPDATE_ROUTES: Record<EntityType, (key: string) => string> = {
  game: () => '/game',
  stage: (key) => `/stages/${encodeURIComponent(key)}`,
  stageZone: (key) => `/zones/${encodeURIComponent(key)}`,
  character: (key) => `/characters/${encodeURIComponent(key)}`,
  team: (key) => `/teams/${encodeURIComponent(key)}`,
  move: (key) => `/moves/${encodeURIComponent(key)}`,
  sequence: (key) => `/sequences/${encodeURIComponent(key)}`,
  projectile: (key) => `/projectiles/${encodeURIComponent(key)}`,
  matchup: (key) => `/matchups/${encodeURIComponent(key)}`,
};

@Component({
  selector: 'tfn-finding-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './finding-dialog.html',
  styleUrl: './finding-dialog.css',
})
export class FindingDialog {
  private readonly dialogRef = inject(MatDialogRef<FindingDialog>);
  private readonly facade = inject(LocalGuideFacadeStore);
  private readonly router = inject(Router);

  readonly model = signal({
    action: 'create' as FindingAction,
    entityType: 'character' as EntityType,
    entityKey: '',
    characterKey: '',
    note: '',
  });
  readonly error = signal('');
  readonly isSaving = signal(false);
  readonly createTypes = CREATABLE_TYPES;
  readonly entityTypes = ENTITY_TYPES;

  readonly entityOptions = computed(() => {
    const guide = this.facade.guide();
    if (!guide) return [];
    const entities = guide.entities;
    const collections: Record<EntityType, unknown[]> = {
      game: [entities.game],
      stage: entities.stages,
      stageZone: entities.stageZones,
      character: entities.characters,
      team: entities.teams,
      move: entities.moves,
      sequence: entities.sequences,
      projectile: entities.projectiles,
      matchup: entities.matchups,
    };

    return collections[this.model().entityType].map(toFindingOption);
  });

  readonly characters = computed(() =>
    (this.facade.guide()?.entities.characters ?? []).map((character) => ({
      key: character.semanticKey,
      label: character.name,
    })),
  );

  readonly canSubmit = computed(() => {
    const current = this.model();
    if (current.action === 'create') {
      return CREATABLE_TYPES.some(({ type }) => type === current.entityType);
    }
    if (!this.entityOptions().some(({ key }) => key === current.entityKey)) {
      return false;
    }
    return current.action !== 'note' || !!current.note.trim();
  });

  selectAction(action: FindingAction): void {
    this.model.update((current) => ({
      ...current,
      action,
      entityKey: '',
    }));
    this.error.set('');
  }

  selectEntityType(entityType: string): void {
    if (!ENTITY_TYPES.some((item) => item.type === entityType)) return;
    this.model.update((current) => ({
      ...current,
      entityType: entityType as EntityType,
      entityKey: '',
      characterKey: '',
    }));
    this.error.set('');
  }

  selectEntity(entityKey: string): void {
    this.model.update((current) => ({ ...current, entityKey }));
  }

  selectCharacterScope(characterKey: string): void {
    this.model.update((current) => ({ ...current, characterKey }));
  }

  setNote(note: string): void {
    this.model.update((current) => ({ ...current, note }));
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.isSaving()) return;
    const current = this.model();

    if (current.action === 'note') {
      await this.addNote(current);
      return;
    }

    const route =
      current.action === 'create'
        ? this.createRoute(current.entityType, current.characterKey)
        : UPDATE_ROUTES[current.entityType](current.entityKey);
    if (!route) return;
    this.dialogRef.close();
    void this.router.navigateByUrl(route);
  }

  close(): void {
    this.dialogRef.close();
  }

  private createRoute(
    entityType: EntityType,
    characterKey: string,
  ): string | undefined {
    if (!CREATABLE_TYPES.some(({ type }) => type === entityType)) {
      return undefined;
    }
    const route = CREATE_ROUTES[entityType as CreatableEntityType];
    if (characterKey && (entityType === 'move' || entityType === 'sequence')) {
      return `${route}?characterKey=${encodeURIComponent(characterKey)}`;
    }
    return route;
  }

  private async addNote(current: ReturnType<typeof this.model>): Promise<void> {
    this.isSaving.set(true);
    this.error.set('');
    try {
      const result = await this.facade.addEntityNote({
        entityType: current.entityType,
        entityKey: current.entityKey,
        text: current.note.trim(),
      });
      if (result.status === 'error') {
        this.error.set(
          result.error instanceof Error
            ? result.error.message
            : 'The finding could not be saved.',
        );
        return;
      }
      this.dialogRef.close();
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The finding could not be saved.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}

function toFindingOption(value: unknown): FindingEntityOption {
  const entity = value as {
    semanticKey: string;
    name?: string;
    meta?: { label?: string };
  };
  return {
    key: entity.semanticKey,
    label: entity.meta?.label || entity.name || entity.semanticKey,
  };
}
