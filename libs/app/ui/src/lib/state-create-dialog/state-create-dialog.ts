import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required, submit, validate } from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { normalizeGameName, type StateModel } from '@theory-fighter-network/data';

export interface StateCreateDialogData {
  existingStates: StateModel;
  existingCategories?: string[];
  defaultCategory?: string;
  defaultName?: string;
}

export interface StateCreateDialogResult {
  category: string;
  name: string;
  min?: number;
  max?: number;
  unit?: string;
}

@Component({
  selector: 'tfn-state-create-dialog',
  standalone: true,
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './state-create-dialog.html',
  styleUrl: './state-create-dialog.css',
})
export class StateCreateDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<StateCreateDialogComponent, StateCreateDialogResult | undefined>
  );
  private readonly data = inject<StateCreateDialogData>(MAT_DIALOG_DATA, {
    optional: true,
  }) ?? {
    existingStates: {},
    existingCategories: [],
  };

  readonly model = signal({
    category: this.data.defaultCategory ?? '',
    name: this.data.defaultName ?? '',
    isNumeric: false,
    min: '0',
    max: '100',
    unit: '',
  });

  readonly stateForm = form(this.model, (s) => {
    required(s.category, { message: 'Category is required' });
    required(s.name, { message: 'Name is required' });
    validate(s.name, ({ valueOf }) => {
      const category = valueOf(s.category).trim();
      const name = valueOf(s.name).trim();
      if (!category || !name) return undefined;
      if (this.data.existingStates[category]?.[normalizeGameName(name)]) {
        return { kind: 'duplicate', message: 'This category already has a state with that name.' };
      }
      return undefined;
    });
  });

  readonly categories = computed(() =>
    Array.from(
      new Set(
        this.data.existingCategories ?? Object.keys(this.data.existingStates)
      )
    ).sort((left, right) => left.localeCompare(right))
  );

  readonly filteredCategories = computed(() => {
    const query = this.model().category.trim().toLowerCase();
    if (!query) return this.categories();
    return this.categories().filter((c) => c.toLowerCase().includes(query));
  });

  selectCategory(value: string): void {
    this.model.update((m) => ({ ...m, category: value }));
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  save(): void {
    submit(this.stateForm, async () => {
      const { category, name, isNumeric, min, max, unit } = this.model();
      const result: StateCreateDialogResult = {
        category: category.trim(),
        name: name.trim(),
      };
      if (isNumeric) {
        const minNum = parseOptionalNumber(min);
        const maxNum = parseOptionalNumber(max);
        const unitStr = unit.trim();
        if (minNum !== undefined) result.min = minNum;
        if (maxNum !== undefined) result.max = maxNum;
        if (unitStr) result.unit = unitStr;
      }
      this.dialogRef.close(result);
    });
  }
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

