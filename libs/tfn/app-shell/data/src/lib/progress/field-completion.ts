import type {
  CharacterDocument,
  MatchupDocument,
  MoveDocument,
  StageDocument,
} from '../models';
import type { ProgressResult } from './progress.types';

export type FieldEntity =
  | 'character'
  | 'move'
  | 'stage'
  | 'matchup';

export interface FieldDescriptor<T> {
  key: string;
  label: string;
  groupLabel?: string;
  getValue: (entity: T) => unknown;
}

export function calculateFieldCompletion<T>(
  entity: T,
  fields: FieldDescriptor<T>[],
): ProgressResult {
  const completed = fields.filter((field) => isPopulated(field.getValue(entity))).length;
  const label = fields[0]?.groupLabel ?? 'Entity fields';

  return {
    completed,
    total: fields.length,
    label,
    state:
      fields.length === 0
        ? 'blocked'
        : completed === 0
          ? 'not-started'
          : completed === fields.length
            ? 'complete'
            : 'in-progress',
  };
}

export function createFieldDescriptors(
  entity: 'character',
): FieldDescriptor<CharacterDocument>[];
export function createFieldDescriptors(
  entity: 'move',
): FieldDescriptor<MoveDocument>[];
export function createFieldDescriptors(
  entity: 'stage',
): FieldDescriptor<StageDocument>[];
export function createFieldDescriptors(
  entity: 'matchup',
): FieldDescriptor<MatchupDocument>[];
export function createFieldDescriptors(entity: FieldEntity): FieldDescriptor<unknown>[] {
  switch (entity) {
    case 'character':
      return [
        field('Character fields', 'Name', (value: CharacterDocument) => value.name),
        field('Character fields', 'Archetypes', (value: CharacterDocument) => value.archetypes),
        field('Character fields', 'Moves', (value: CharacterDocument) => value.hierarchy.moveKeys),
        field('Character fields', 'Neutral regions', (value: CharacterDocument) => value.neutralRegions),
      ];
    case 'move':
      return [
        field('Move fields', 'Name', (value: MoveDocument) => value.name),
        field('Move fields', 'Input', (value: MoveDocument) => value.sequence),
        field('Move fields', 'Preconditions', (value: MoveDocument) => value.preconditions),
        field('Move fields', 'Phases', (value: MoveDocument) => value.phases),
      ];
    case 'stage':
      return [
        field('Stage fields', 'Name', (value: StageDocument) => value.name),
        field('Stage fields', 'Zones', (value: StageDocument) => value.hierarchy.zoneKeys),
      ];
    case 'matchup':
      return [
        field('Matchup fields', 'Attacker', (value: MatchupDocument) => value.attackerKey),
        field('Matchup fields', 'Defender', (value: MatchupDocument) => value.defenderKey),
        field('Matchup fields', 'Scenarios', (value: MatchupDocument) => value.scenarios),
      ];
  }
}

function field<T>(
  groupLabel: string,
  label: string,
  getValue: (entity: T) => unknown,
): FieldDescriptor<T> {
  return {
    key: label.toLowerCase().replaceAll(' ', '-'),
    label,
    groupLabel,
    getValue,
  };
}

function isPopulated(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}
