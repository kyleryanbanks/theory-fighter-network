import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityTable } from './entity-table';
import type { EntityTableColumn } from './entity-table';

interface TestEntity {
  semanticKey: string;
  name: string;
  score?: number;
  enabled?: boolean;
  phases?: Array<{ startup?: { exact?: number } }>;
  metadata?: { label: string };
}

const testRows: TestEntity[] = [
    {
      semanticKey: 'move-slow',
      name: 'Slow Move',
      score: 10,
      enabled: false,
      phases: [{ startup: { exact: 10 } }],
      metadata: { label: 'Launch character' },
    },
    {
      semanticKey: 'move-fast',
      name: 'Fast Move',
      score: 2,
      enabled: true,
      phases: [{ startup: { exact: 2 } }],
    },
    { semanticKey: 'move-unset', name: 'Unset Move', score: 0 },
];

const testColumns: EntityTableColumn<TestEntity>[] = [
    { id: 'name', label: 'Move', key: 'name', sticky: true },
    { id: 'score', label: 'Score', key: 'score' },
    { id: 'enabled', label: 'Enabled', key: 'enabled' },
    {
      id: 'startup',
      label: 'Startup',
      accessor: (entity) => entity.phases?.[0]?.startup?.exact,
    },
    {
      id: 'metadata',
      label: 'Metadata',
      accessor: (entity) => entity.metadata,
      formatter: (value) =>
        value && typeof value === 'object' && 'label' in value
          ? String(value.label)
          : 'No metadata',
    },
];

const testRowKey = (entity: TestEntity) => entity.semanticKey;

function createTableFixture<T extends object>(
  rows: readonly T[],
  columns: readonly EntityTableColumn<T>[],
  rowKey: (entity: T) => string,
  ariaLabel: string,
): ComponentFixture<EntityTable<T>> {
  const fixture = TestBed.createComponent(EntityTable<T>);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('columns', columns);
  fixture.componentRef.setInput('rowKey', rowKey);
  fixture.componentRef.setInput('ariaLabel', ariaLabel);
  fixture.detectChanges();
  return fixture;
}

describe('EntityTable', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityTable],
    }).compileComponents();
    fixture = createTableFixture(testRows, testColumns, testRowKey, 'Test entities');
  });

  it('renders top-level keys and nested accessors without collapsing false, zero, or missing values', () => {
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('table')?.getAttribute('aria-label')).toBe(
      'Test entities',
    );
    expect(host.querySelectorAll('tbody tr[mat-row]')).toHaveLength(3);
    expect(host.textContent).toContain('false');
    expect(host.textContent).toContain('0');
    expect(host.textContent).toContain('10');
    expect(host.textContent).toContain('Launch character');
    expect(host.textContent).toContain('—');
  });

  it('sorts numeric key values without mutating the input rows', () => {
    const originalNames = testRows.map((row) => row.name);
    const host: HTMLElement = fixture.nativeElement;

    host.querySelector<HTMLElement>('th.mat-column-score')?.click();
    fixture.detectChanges();

    const renderedNames = Array.from(
      host.querySelectorAll('tbody tr[mat-row] .mat-column-name'),
      (cell) => cell.textContent?.trim(),
    );
    expect(renderedNames).toEqual(['Unset Move', 'Fast Move', 'Slow Move']);
    expect(testRows.map((row) => row.name)).toEqual(originalNames);
  });

  it('renders an accessible empty state when there are no rows', () => {
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('table')?.getAttribute('aria-label')).toBe(
      'Test entities',
    );
    expect(host.textContent).toContain('No entities to display.');
  });

  it('provides a keyboard-focusable horizontal scroll region', () => {
    const region = fixture.nativeElement.querySelector('[role="region"]');

    expect(region?.getAttribute('tabindex')).toBe('0');
    expect(region?.getAttribute('aria-label')).toContain('Test entities');
  });
});

interface CharacterSummary {
  semanticKey: string;
  name: string;
  archetypes: string[];
}

describe('EntityTable with another entity shape', () => {
  it('renders a simple entity using its own explicit key list', async () => {
    await TestBed.configureTestingModule({
      imports: [EntityTable],
    }).compileComponents();
    const rows: CharacterSummary[] = [
      {
        semanticKey: 'character-ryu',
        name: 'Ryu',
        archetypes: ['All-rounder', 'Shoto'],
      },
    ];
    const columns: EntityTableColumn<CharacterSummary>[] = [
      { id: 'name', label: 'Character', key: 'name', sticky: true },
      {
        id: 'archetypes',
        label: 'Archetypes',
        accessor: (character) => character.archetypes.join(', '),
        mobilePriority: true,
      },
    ];
    const fixture = createTableFixture(
      rows,
      columns,
      (character) => character.semanticKey,
      'Characters',
    );

    expect(fixture.nativeElement.textContent).toContain('Ryu');
    expect(fixture.nativeElement.textContent).toContain('All-rounder, Shoto');
  });
});
