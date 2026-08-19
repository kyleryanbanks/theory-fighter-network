import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  type ComparisonOperator,
  type MovePreconditions,
  type StatePrecondition,
  type StateDocument,
  type StateModel,
} from '@theory-fighter-network/data';
import { ExpansionPanel } from '../exp-panel/expansion-panel';
import { TileGridComponent, type Tile } from '../tile-grid/tile-grid';

export const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: '=',  label: '= equals' },
  { value: '!=', label: '≠ not equals' },
  { value: '>',  label: '> greater than' },
  { value: '>=', label: '≥ greater or equal' },
  { value: '<',  label: '< less than' },
  { value: '<=', label: '≤ less or equal' },
];

@Component({
  selector: 'tfn-move-precondition-editor',
  standalone: true,
  imports: [
    ExpansionPanel,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TileGridComponent,
  ],
  templateUrl: './move-precondition-editor.html',
  styleUrl: './move-precondition-editor.css',
})
export class MovePreconditionEditorComponent {
  readonly stateModel = input<StateModel>({});
  readonly moveList = input<Tile[]>([]);
  readonly value = input<MovePreconditions>({});
  readonly header = input('Preconditions');
  readonly subheader = input<string>();
  readonly characterKey = input<string | undefined>(undefined);
  readonly valueChange = output<MovePreconditions>();
  readonly createGameState = output<void>();
  readonly createCharacterState = output<void>();

  readonly operators = COMPARISON_OPERATORS;
  readonly targets = [
    { key: 'player' as const,   label: 'Player conditions' },
    { key: 'opponent' as const, label: 'Opponent conditions' },
  ];

  readonly hasCharacter = computed(() => !!this.characterKey());

  readonly followUpTiles = computed((): Tile[] => {
    const selected = new Set(this.value().followUpFromMoveKeys ?? []);
    return this.moveList().map((m) => ({ ...m, value: selected.has(m.key) }));
  });

  readonly cancelTiles = computed((): Tile[] => {
    const selected = new Set(this.value().cancelFromMoveKeys ?? []);
    return this.moveList().map((m) => ({ ...m, value: selected.has(m.key) }));
  });

  readonly categories = computed(() =>
    Object.entries(this.stateModel())
      .map(([category, states]) => ({
        category,
        states: Object.values(states).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter(({ states }) => states.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category))
  );

  operatorsFor(state: StateDocument): typeof COMPARISON_OPERATORS {
    if (!this.isNumericState(state)) {
      return COMPARISON_OPERATORS.filter((op) => op.value === '=' || op.value === '!=');
    }
    return COMPARISON_OPERATORS;
  }

  isNumericState(state: StateDocument): boolean {
    return state.min !== undefined || state.max !== undefined;
  }

  isConditioned(target: 'player' | 'opponent', category: string, stateKey: string): boolean {
    return (this.value()[target] ?? []).some(
      (c) => c.category === category && c.stateKey === stateKey
    );
  }

  getCondition(target: 'player' | 'opponent', category: string, stateKey: string): StatePrecondition | undefined {
    return (this.value()[target] ?? []).find(
      (c) => c.category === category && c.stateKey === stateKey
    );
  }

  onConditionedChange(
    target: 'player' | 'opponent',
    state: StateDocument,
    category: string,
    conditioned: boolean
  ): void {
    if (!conditioned) {
      this.removeCondition(target, category, state.semanticKey);
      return;
    }
    const numeric = this.isNumericState(state);
    const newCondition: StatePrecondition = {
      category,
      stateKey: state.semanticKey,
      operator: numeric ? '>=' : '=',
      value: numeric ? 0 : true,
    };
    this.emit(target, [...(this.value()[target] ?? []), newCondition]);
  }

  onOperatorChange(
    target: 'player' | 'opponent',
    category: string,
    stateKey: string,
    operator: ComparisonOperator
  ): void {
    this.updateCondition(target, category, stateKey, (c) => ({ ...c, operator }));
  }

  onNumericValueChange(
    target: 'player' | 'opponent',
    category: string,
    stateKey: string,
    raw: string
  ): void {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    this.updateCondition(target, category, stateKey, (c) => ({ ...c, value: parsed }));
  }

  onBooleanValueChange(
    target: 'player' | 'opponent',
    category: string,
    stateKey: string,
    value: boolean
  ): void {
    this.updateCondition(target, category, stateKey, (c) => ({ ...c, value }));
  }

  numericValue(target: 'player' | 'opponent', category: string, stateKey: string): number {
    const v = this.getCondition(target, category, stateKey)?.value;
    return typeof v === 'number' ? v : 0;
  }

  booleanValue(target: 'player' | 'opponent', category: string, stateKey: string): boolean {
    return this.getCondition(target, category, stateKey)?.value === true;
  }

  operatorValue(target: 'player' | 'opponent', category: string, stateKey: string): ComparisonOperator {
    return this.getCondition(target, category, stateKey)?.operator ?? '=';
  }

  private removeCondition(target: 'player' | 'opponent', category: string, stateKey: string): void {
    this.emit(
      target,
      (this.value()[target] ?? []).filter(
        (c) => !(c.category === category && c.stateKey === stateKey)
      )
    );
  }

  private updateCondition(
    target: 'player' | 'opponent',
    category: string,
    stateKey: string,
    update: (c: StatePrecondition) => StatePrecondition
  ): void {
    this.emit(
      target,
      (this.value()[target] ?? []).map((c) =>
        c.category === category && c.stateKey === stateKey ? update(c) : c
      )
    );
  }

  onFollowUpToggle({ selection }: { tile: Tile; selection: string[] }): void {
    this.valueChange.emit({ ...this.value(), followUpFromMoveKeys: selection.length ? selection : undefined });
  }

  onCancelToggle({ selection }: { tile: Tile; selection: string[] }): void {
    this.valueChange.emit({ ...this.value(), cancelFromMoveKeys: selection.length ? selection : undefined });
  }

  private emit(target: 'player' | 'opponent', conditions: StatePrecondition[]): void {
    const next: MovePreconditions = { ...this.value(), [target]: conditions };
    if (next[target]?.length === 0) delete next[target];
    this.valueChange.emit(next);
  }
}
