import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  TrackByFunction,
  computed,
  input,
  signal,
} from '@angular/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { EntityTableColumn, EntityTableScalar } from './entity-table.models';

export type {
  EntityTableCellContext,
  EntityTableColumn,
  EntityTableKey,
  EntityTableScalar,
} from './entity-table.models';

@Component({
  selector: 'tfn-entity-table',
  standalone: true,
  imports: [MatSortModule, MatTableModule, NgTemplateOutlet],
  templateUrl: './entity-table.html',
  styleUrl: './entity-table.css',
})
export class EntityTable<T extends object> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly EntityTableColumn<T>[]>();
  readonly rowKey = input.required<(entity: T) => string>();
  readonly ariaLabel = input.required<string>();
  readonly emptyMessage = input('No entities to display.');

  private readonly sortState = signal<Sort>({ active: '', direction: '' });

  readonly displayedColumns = computed(() =>
    this.columns().map((column) => column.id),
  );

  readonly sortedRows = computed(() => {
    const { active, direction } = this.sortState();
    if (!active || !direction) return this.rows();

    const column = this.columns().find((candidate) => candidate.id === active);
    if (!column || !this.isSortable(column)) return this.rows();

    const directionMultiplier = direction === 'asc' ? 1 : -1;
    return [...this.rows()].sort((left, right) => {
      const leftValue = this.getSortValue(left, column);
      const rightValue = this.getSortValue(right, column);
      const comparison = compareValues(leftValue, rightValue);

      if (leftValue == null || rightValue == null) return comparison;
      return comparison * directionMultiplier;
    });
  });

  readonly trackRow: TrackByFunction<T> = (_index, entity) =>
    this.rowKey()(entity);

  onSortChange(sort: Sort): void {
    this.sortState.set(sort);
  }

  isSortable(column: EntityTableColumn<T>): boolean {
    if (column.sortable !== undefined) return column.sortable;
    if (column.sortValue) return true;
    if (column.cellTemplate && !column.key && !column.accessor) return false;

    return this.rows().every((entity) =>
      isScalar(this.getValue(entity, column)),
    );
  }

  getValue(entity: T, column: EntityTableColumn<T>): unknown {
    if (column.accessor) return column.accessor(entity);
    if (column.key) return entity[column.key];
    return undefined;
  }

  displayValue(entity: T, column: EntityTableColumn<T>): string {
    const value = this.getValue(entity, column);
    if (column.formatter) return column.formatter(value, entity);
    if (value === null || value === undefined) return '\u2014';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'object') return 'Complex value';
    return String(value);
  }

  private getSortValue(
    entity: T,
    column: EntityTableColumn<T>,
  ): EntityTableScalar {
    return (
      column.sortValue?.(entity) ??
      (this.getValue(entity, column) as EntityTableScalar)
    );
  }
}

function isScalar(value: unknown): value is EntityTableScalar {
  return (
    value === null ||
    value === undefined ||
    value instanceof Date ||
    ['string', 'number', 'boolean'].includes(typeof value)
  );
}

function compareValues(
  left: EntityTableScalar,
  right: EntityTableScalar,
): number {
  if (left == null) return right == null ? 0 : 1;
  if (right == null) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}
