import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  createDataValue,
  type DataValue,
  type StateDocument,
  type StateModel,
  type StatePatch,
} from '@theory-fighter-network/data';
import { DataValueEditor } from '../data-value-editor/data-value-editor';
import { ExpansionPanel } from '../exp-panel/expansion-panel';

@Component({
  selector: 'tfn-state-patch-editor',
  standalone: true,
  imports: [
    CommonModule,
    DataValueEditor,
    ExpansionPanel,
    MatButtonToggleModule,
    MatCheckboxModule,
  ],
  templateUrl: './state-patch-editor.html',
  styleUrl: './state-patch-editor.css',
})
export class StatePatchEditorComponent {
  readonly stateModel = input<StateModel>({});
  readonly value = input<StatePatch>({});
  readonly header = input('State Patch');
  readonly subheader = input<string>();
  readonly valueChange = output<StatePatch>();

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

    const nextValue = this.isNumericState(state)
      ? { relative: 50 }
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

  onNumericValueChange(
    category: string,
    semanticKey: string,
    nextValue: DataValue
  ): void {
    this.emitStateValue(category, semanticKey, nextValue);
  }

  booleanValue(category: string, semanticKey: string): boolean {
    return this.value()[category]?.[semanticKey] === true;
  }

  numericValue(category: string, semanticKey: string): DataValue {
    const current = this.value()[category]?.[semanticKey];
    if (current && typeof current === 'object') {
      return current as DataValue;
    }
    return createDataValue({ relative: 50, exact: undefined });
  }

  private emitStateValue(
    category: string,
    semanticKey: string,
    nextValue: boolean | DataValue
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
