import type { TemplateRef } from '@angular/core';

export type EntityTableScalar =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type EntityTableKey<T> = {
  [Key in keyof T]-?: T[Key] extends EntityTableScalar ? Key : never;
}[keyof T] &
  string;

export interface EntityTableCellContext<T> {
  $implicit: T;
  value: unknown;
}

interface EntityTableColumnBase<T> {
  id: string;
  label: string;
  sortable?: boolean;
  sortValue?: (entity: T) => EntityTableScalar;
  sticky?: boolean;
  mobilePriority?: boolean;
  formatter?: (value: unknown, entity: T) => string;
  cellTemplate?: TemplateRef<EntityTableCellContext<T>>;
}

export type EntityTableColumn<T extends object> =
  | (EntityTableColumnBase<T> & {
      key: EntityTableKey<T>;
      accessor?: never;
    })
  | (EntityTableColumnBase<T> & {
      key?: never;
      accessor: (entity: T) => EntityTableScalar;
    })
  | (EntityTableColumnBase<T> & {
      key?: never;
      accessor: (entity: T) => unknown;
      formatter: (value: unknown, entity: T) => string;
      cellTemplate?: never;
    })
  | (EntityTableColumnBase<T> & {
      key?: never;
      accessor: (entity: T) => unknown;
      cellTemplate: TemplateRef<EntityTableCellContext<T>>;
      formatter?: (value: unknown, entity: T) => string;
    })
  | (EntityTableColumnBase<T> & {
      key?: never;
      accessor?: never;
      cellTemplate: TemplateRef<EntityTableCellContext<T>>;
      formatter?: never;
    });
