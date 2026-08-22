import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  createDataValue,
  createFrameStage,
  createMoveOutcomeEffect,
  createMovePhase,
  MoveDocument,
  MovePhase,
  DataValue,
} from '@theory-fighter-network/data';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { ComparisonAxis, TfnLink } from '@theory-fighter-network/ui';

type OutcomeKey = 'onHit' | 'onBlock' | 'onCounterHit' | 'onWhiff' | 'onSecondaryTrigger';

export interface ComparisonType {
  fieldId: string;
  phaseIndex: number;
}

interface ComparableField {
  id: string;
  label: string;
  path: string[];
}

// Fully populated so the walker below can discover every comparable leaf.
const MOVE_PHASE_TEMPLATE: MovePhase = createMovePhase({
  startup: createFrameStage({ duration: createDataValue() }),
  active: createFrameStage({ duration: createDataValue() }),
  recovery: createFrameStage({ duration: createDataValue() }),
  effects: {
    onHit: createMoveOutcomeEffect({ hitStop: createDataValue(), stun: createDataValue() }),
    onBlock: createMoveOutcomeEffect({ hitStop: createDataValue(), stun: createDataValue() }),
    onCounterHit: createMoveOutcomeEffect({ hitStop: createDataValue(), stun: createDataValue() }),
    onWhiff: createMoveOutcomeEffect({ hitStop: createDataValue(), stun: createDataValue() }),
    onSecondaryTrigger: createMoveOutcomeEffect({ hitStop: createDataValue(), stun: createDataValue() }),
  },
});

function isDataValue(value: unknown): value is DataValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    ('exact' in value || 'relative' in value || 'unit' in value || 'notes' in value)
  );
}

function humanizeSegment(segment: string): string {
  return segment.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

function collectComparableFields(node: unknown, path: string[] = []): ComparableField[] {
  if (isDataValue(node)) {
    const label = path.filter(segment => segment !== 'effects').map(humanizeSegment).join(' → ');
    return [{ id: path.join('.'), label, path }];
  }
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return [];
  return Object.entries(node).flatMap(([key, value]) => collectComparableFields(value, [...path, key]));
}

const COMPARABLE_FIELDS = collectComparableFields(MOVE_PHASE_TEMPLATE);

const COMPARABLE_FIELD_GROUPS: { label: string; fields: ComparableField[] }[] = [
  { label: 'Frame Data', fields: COMPARABLE_FIELDS.filter(field => field.path[0] !== 'effects') },
  { label: 'Hit Properties', fields: COMPARABLE_FIELDS.filter(field => field.path[0] === 'effects') },
];

function getIn(phase: MovePhase | undefined, path: string[]): DataValue | undefined {
  let current: unknown = phase;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current as DataValue | undefined;
}

@Component({
  selector: 'tfn-move-comparison',
  imports: [ComparisonAxis, RouterLink, TfnLink],
  templateUrl: './move-comparison.html',
  styleUrl: './move-comparison.css',
})
export class MoveComparison {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly moves = computed(() => this.facade.guide()?.entities.moves ?? []);
  readonly selectedKeys = signal<string[]>([]);
  readonly comparisonType = signal<ComparisonType>({
    fieldId: 'startup.duration',
    phaseIndex: 0,
  });
  readonly fieldGroups = COMPARABLE_FIELD_GROUPS;

  readonly selectedMoves = computed(() =>
    this.moves().filter(move => this.selectedKeys().includes(move.semanticKey))
  );

  readonly maxPhaseCount = computed(() =>
    Math.max(1, ...this.selectedMoves().map(move => move.phases?.length ?? 0))
  );

  readonly phaseIndexOptions = computed(() =>
    Array.from({ length: this.maxPhaseCount() }, (_, index) => index)
  );

  readonly pins = computed(() =>
    this.selectedMoves().map(move => ({
      key: move.semanticKey,
      label: move.name,
      relative: this.extractDataValue(move)?.relative ?? 50,
      exact: this.extractDataValue(move)?.exact,
    }))
  );

  toggleMove(moveKey: string): void {
    this.selectedKeys.update(keys =>
      keys.includes(moveKey) ? keys.filter(key => key !== moveKey) : [...keys, moveKey]
    );
  }

  isSelected(moveKey: string): boolean {
    return this.selectedKeys().includes(moveKey);
  }

  setComparisonField(fieldId: string): void {
    this.comparisonType.update(current => ({ ...current, fieldId }));
  }

  setPhaseIndex(phaseIndex: number): void {
    this.comparisonType.update(current => ({ ...current, phaseIndex }));
  }

  private currentField(): ComparableField | undefined {
    return COMPARABLE_FIELDS.find(field => field.id === this.comparisonType().fieldId);
  }

  private extractDataValue(move: MoveDocument): DataValue | undefined {
    const field = this.currentField();
    if (!field) return undefined;
    const movePhase = move.phases?.[this.comparisonType().phaseIndex];
    if (!movePhase) return undefined;
    return getIn(movePhase, field.path);
  }

  async updatePosition(change: { key: string; relative: number }): Promise<void> {
    const move = this.moves().find(candidate => candidate.semanticKey === change.key);
    if (!move) return;

    const field = this.currentField();
    if (!field) return;

    const { phaseIndex } = this.comparisonType();
    const currentValue = this.extractDataValue(move);
    const value: DataValue = { ...(currentValue ?? {}), relative: change.relative };

    if (field.path[0] === 'effects') {
      const [, outcome, effectField] = field.path;
      await this.facade.updateMoveOutcomeDataValue({
        moveKey: move.semanticKey,
        outcome: outcome as OutcomeKey,
        field: effectField as 'hitStop' | 'stun',
        value,
        phaseIndex,
      });
    } else {
      const [phase] = field.path;
      await this.facade.updateMovePhaseDuration({
        moveKey: move.semanticKey,
        phase: phase as 'startup' | 'active' | 'recovery',
        duration: value,
        phaseIndex,
      });
    }
  }
}
