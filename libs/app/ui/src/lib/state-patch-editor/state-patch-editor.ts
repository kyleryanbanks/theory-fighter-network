import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import {
  createDataValue,
  type DataValue,
  type NumericStatePatch,
  type PatchOperator,
  type StateDocument,
  type StateModel,
  type StatePatch,
} from '@theory-fighter-network/data';
import { DataValueEditor } from '../data-value-editor/data-value-editor';
import { ExpansionPanel } from '../exp-panel/expansion-panel';

const PATCH_OPERATORS: { value: PatchOperator; label: string; ariaLabel: string }[] = [
  { value: '=', label: '=', ariaLabel: 'Set to' },
  { value: '+', label: '+', ariaLabel: 'Add' },
  { value: '-', label: '−', ariaLabel: 'Subtract' },
  { value: '*', label: '×', ariaLabel: 'Multiply by' },
];

@Component({
  selector: 'tfn-state-patch-editor',
  standalone: true,
  imports: [
    CommonModule,
    DataValueEditor,
    ExpansionPanel,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  templateUrl: './state-patch-editor.html',
  styleUrl: './state-patch-editor.css',
})
export class StatePatchEditorComponent {
  readonly stateModel = input<StateModel>({});
  readonly value = input<StatePatch>({});
  readonly header = input('State Patch');
  readonly subheader = input<string>();
  readonly characterKey = input<string | undefined>(undefined);
  readonly valueChange = output<StatePatch>();
  readonly createGameState = output<void>();
  readonly createCharacterState = output<void>();

  readonly hasCharacter = computed(() => !!this.characterKey());
  readonly patchOperators = PATCH_OPERATORS;

  readonly categories = computed(() =>
    Object.entries(this.stateModel())
      .map(([category, states]) => ({
        category,
        states: Object.values(states).sort((left, right) =>
          left.name.localeCompare(right.name)
        ),
      }))
      .filter(({ states }) => states.length > 0)
      .sort((left, right) => left.category.localeCompare(right.category))
  );

  isAffected(category: string, semanticKey: string): boolean {
    return this.value()[category]?.[semanticKey] !== undefined;
  }

  isNumericState(state: StateDocument): boolean {
    return state.min !== undefined || state.max !== undefined;
  }

  onAffectedChange(
    category: string,
    state: StateDocument,
    affected: boolean
  ): void {
    if (!affected) {
      this.removeState(category, state.semanticKey);
      return;
    }

    const nextValue: boolean | NumericStatePatch = this.isNumericState(state)
      ? { op: '=', value: createDataValue({ relative: 50 }) }
      : true;

    this.emitStateValue(category, state.semanticKey, nextValue);
  }

  onBooleanValueChange(
    category: string,
    semanticKey: string,
    nextValue: boolean
  ): void {
    this.emitStateValue(category, semanticKey, nextValue);
  }

  onNumericOpChange(
    category: string,
    semanticKey: string,
    op: PatchOperator
  ): void {
    const current = this.numericPatch(category, semanticKey);
    this.emitStateValue(category, semanticKey, { ...current, op });
  }

  onNumericValueChange(
    category: string,
    semanticKey: string,
    value: DataValue
  ): void {
    const current = this.numericPatch(category, semanticKey);
    this.emitStateValue(category, semanticKey, { ...current, value });
  }

  booleanValue(category: string, semanticKey: string): boolean {
    return this.value()[category]?.[semanticKey] === true;
  }

  numericPatch(category: string, semanticKey: string): NumericStatePatch {
    const current = this.value()[category]?.[semanticKey];
    if (current && typeof current === 'object' && 'op' in current) {
      return current as NumericStatePatch;
    }
    return { op: '=', value: createDataValue({ relative: 50, exact: undefined }) };
  }

  private emitStateValue(
    category: string,
    semanticKey: string,
    nextValue: boolean | NumericStatePatch
  ): void {
    const nextPatch: StatePatch = {
      ...this.value(),
      [category]: {
        ...(this.value()[category] ?? {}),
        [semanticKey]: nextValue,
      },
    };

    this.valueChange.emit(nextPatch);
  }

  private removeState(category: string, semanticKey: string): void {
    const categoryPatch = { ...(this.value()[category] ?? {}) };
    delete categoryPatch[semanticKey];

    const nextPatch: StatePatch = { ...this.value() };
    if (Object.keys(categoryPatch).length === 0) {
      delete nextPatch[category];
    } else {
      nextPatch[category] = categoryPatch;
    }

    this.valueChange.emit(nextPatch);
  }
}
