import {
  Component,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { DataValue, MoveDocument, MovePhase } from '@tfn/app-shell/data';
import {
  LocalGuideFacadeStore,
  TodoStore,
  resolveEffectiveMove,
} from '@tfn/app-shell/data';
import type { EntityTableCellContext, EntityTableColumn } from '@tfn/shared/ui';
import { DeleteButton, EntityTable } from '@tfn/shared/ui';

interface MoveDraft {
  name: string;
}

interface MoveTableRow {
  move: MoveDocument;
  scopeLabel: string;
  input: string;
  inputInherited: boolean;
  inherited: boolean;
  inheritedData: boolean;
}

type CompletenessFilter = 'all' | 'complete' | 'incomplete';

const UNIVERSAL_SCOPE = '';

@Component({
  selector: 'tfn-move-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    DeleteButton,
    EntityTable,
  ],
  templateUrl: './move-editor.html',
  styleUrl: './move-editor.css',
})
export class MoveEditor {
  readonly facade = inject(LocalGuideFacadeStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly todos = inject(TodoStore);
  private readonly actionsCell =
    viewChild<TemplateRef<EntityTableCellContext<MoveTableRow>>>('actionsCell');
  readonly characters = computed(
    () => this.facade.guide()?.entities.characters ?? [],
  );
  readonly scopeKey = signal(
    this.route.snapshot.queryParamMap.get('characterKey') ?? UNIVERSAL_SCOPE,
  );
  readonly searchQuery = signal('');
  readonly completenessFilter = signal<CompletenessFilter>('all');
  readonly selectedMoveKeys = signal<string[]>([]);
  readonly todoFeedback = signal<
    { message: string; error: boolean } | null
  >(null);
  readonly rowKey = (row: MoveTableRow) => row.move.semanticKey;

  readonly allMoveRows = computed((): MoveTableRow[] => {
    const guide = this.facade.guide();
    if (!guide) return [];

    const allMoves = guide.entities.moves;
    const scope = this.scopeKey();
    const ownMoves = allMoves.filter((move) => move.characterKey === scope);
    const overriddenKeys = new Set(
      ownMoves.map((move) => move.parentKey).filter(Boolean),
    );
    const visibleMoves =
      scope === UNIVERSAL_SCOPE
        ? allMoves.filter((move) => !move.characterKey)
        : [
            ...allMoves.filter(
              (move) =>
                !move.characterKey && !overriddenKeys.has(move.semanticKey),
            ),
            ...ownMoves,
          ];

    return visibleMoves.map((sourceMove) => {
      const character = this.characters().find(
        (candidate) => candidate.semanticKey === sourceMove.characterKey,
      );
      const scopedCharacter = this.characters().find(
        (candidate) => candidate.semanticKey === scope,
      );
      const inherited = scope !== UNIVERSAL_SCOPE && !sourceMove.characterKey;
      const move = resolveEffectiveMove(sourceMove, allMoves);
      return {
        move,
        scopeLabel: inherited
          ? `Universal · inherited · ${scopedCharacter?.name ?? 'Character'}`
          : sourceMove.parentKey
            ? `Overrides ${sourceMove.parentKey} · ${character?.name ?? 'Character'}`
            : (character?.name ?? 'Universal'),
        input: formatMoveInput(move),
        inputInherited: !!sourceMove.parentKey && !sourceMove.sequence,
        inherited,
        inheritedData: !!sourceMove.parentKey && !sourceMove.phases,
      };
    });
  });

  readonly tableRows = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const completeness = this.completenessFilter();
    return this.allMoveRows().filter((row) => {
      const matchesQuery =
        !query ||
        `${row.move.name} ${row.input} ${row.scopeLabel}`
          .toLocaleLowerCase()
          .includes(query);
      const completedFields = moveCompleteness(row);
      const matchesCompleteness =
        completeness === 'all' ||
        (completeness === 'complete'
          ? completedFields === 7
          : completedFields < 7);
      return matchesQuery && matchesCompleteness;
    });
  });

  readonly columns = computed((): EntityTableColumn<MoveTableRow>[] => {
    const columns: EntityTableColumn<MoveTableRow>[] = [
      {
        id: 'move',
        label: 'Move',
        accessor: (row) => row.move.name,
        sticky: true,
        mobilePriority: true,
      },
      {
        id: 'input',
        label: 'Input',
        accessor: (row) =>
          row.input
            ? `${row.inputInherited ? 'Inherited: ' : ''}${row.input}`
            : undefined,
        mobilePriority: true,
      },
      { id: 'scope', label: 'Scope', accessor: (row) => row.scopeLabel },
      ...frameColumns,
      {
        id: 'completeness',
        label: 'Data',
        accessor: moveCompleteness,
        formatter: (value) => `${String(value)}/7`,
        mobilePriority: true,
      },
    ];
    const actionsCell = this.actionsCell();
    if (actionsCell) {
      columns.push({
        id: 'actions',
        label: 'Actions',
        sortable: false,
        cellTemplate: actionsCell,
      });
    }
    return columns;
  });

  readonly moveModel = signal<MoveDraft>({ name: '' });
  readonly moveError = signal('');
  readonly moveForm = form(this.moveModel, (path) => {
    required(path.name, { message: 'Move name is required.' });
  });

  setScope(scopeKey: string): void {
    this.scopeKey.set(scopeKey);
    this.moveError.set('');
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  setCompletenessFilter(value: string): void {
    if (value === 'complete' || value === 'incomplete') {
      this.completenessFilter.set(value);
    } else {
      this.completenessFilter.set('all');
    }
  }

  toggleCompare(row: MoveTableRow, selected: boolean): void {
    this.selectedMoveKeys.update((keys) =>
      selected
        ? [...new Set([...keys, row.move.semanticKey])]
        : keys.filter((key) => key !== row.move.semanticKey),
    );
  }

  compareSelected(): void {
    const moveKeys = this.selectedMoveKeys();
    if (moveKeys.length) {
      void this.router.navigate(['/move-comparison'], {
        queryParams: { moveKeys: moveKeys.join(',') },
      });
    }
  }

  async addTodo(row: MoveTableRow): Promise<void> {
    this.todoFeedback.set(null);
    try {
      const result = await this.todos.createTracked({
        text: `Research ${row.move.name}`,
        tracking: {
          type: 'entity',
          entityType: 'move',
          entityKey: row.move.semanticKey,
        },
      });
      this.todoFeedback.set(
        result.status === 'error'
          ? { message: 'Todo could not be added. Try again.', error: true }
          : { message: `Todo added for ${row.move.name}.`, error: false },
      );
    } catch {
      this.todoFeedback.set({
        message: 'Todo could not be added. Try again.',
        error: true,
      });
    }
  }

  isCompareSelected(row: MoveTableRow): boolean {
    return this.selectedMoveKeys().includes(row.move.semanticKey);
  }

  createMove(): void {
    submit(this.moveForm, async () => {
      const scope = this.scopeKey();
      const result = await this.facade.createMove({
        name: this.moveModel().name.trim(),
        ...(scope === UNIVERSAL_SCOPE ? {} : { characterKey: scope }),
      });

      if (result.status === 'error') {
        this.moveError.set(getErrorMessage(result.error));
        return;
      }

      this.moveForm().reset({ name: '' });
      this.moveError.set('');
    });
  }

  async overrideMove(universalMoveKey: string): Promise<void> {
    const result = await this.facade.overrideMove({
      characterKey: this.scopeKey(),
      universalMoveKey,
    });

    if (result.status === 'error') {
      this.moveError.set(getErrorMessage(result.error));
      return;
    }

    this.moveError.set('');
  }

  async promoteMove(moveKey: string): Promise<void> {
    const result = await this.facade.promoteMove({ moveKey });

    if (result.status === 'error') {
      this.moveError.set(getErrorMessage(result.error));
      return;
    }

    this.moveError.set('');
  }

  async deleteMove(moveKey: string): Promise<void> {
    const result = await this.facade.deleteMove({ moveKey });

    if (result.status === 'error') {
      this.moveError.set(getErrorMessage(result.error));
      return;
    }

    this.moveError.set('');
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The Move could not be updated.';
}

const frameColumns: EntityTableColumn<MoveTableRow>[] = [
  frameColumn(
    'startup',
    'Startup',
    (row) => row.move.phases?.[0]?.startup?.duration,
  ),
  frameColumn(
    'active',
    'Active',
    (row) => row.move.phases?.[0]?.active?.duration,
  ),
  frameColumn(
    'recovery',
    'Recovery',
    (row) => row.move.phases?.[0]?.recovery?.duration,
  ),
  frameColumn('total', 'Total', (row) => totalDuration(row.move.phases?.[0])),
  frameColumn(
    'onHit',
    'On hit',
    (row) => row.move.phases?.[0]?.effects?.onHit?.stun,
  ),
  frameColumn(
    'onBlock',
    'On block',
    (row) => row.move.phases?.[0]?.effects?.onBlock?.stun,
  ),
  frameColumn(
    'counterHit',
    'Counter hit',
    (row) => row.move.phases?.[0]?.effects?.onCounterHit?.stun,
  ),
];

function frameColumn(
  id: string,
  label: string,
  valueForRow: (row: MoveTableRow) => DataValue | undefined,
): EntityTableColumn<MoveTableRow> {
  return {
    id,
    label,
    accessor: (row) => sortFrameValue(valueForRow(row)),
    sortValue: (row) => sortFrameValue(valueForRow(row)),
    formatter: (_value, row) =>
      formatFrameValue(valueForRow(row), row.inherited || row.inheritedData),
  };
}

function formatMoveInput(move: MoveDocument): string {
  return (move.sequence ?? [])
    .map((step) => {
      const direction = step.directions.join('');
      const buttons = step.buttons.join('+');
      const input = [direction, buttons].filter(Boolean).join('+');
      return step.frames && step.frames > 1
        ? `${input} (${step.frames}f)`
        : input;
    })
    .filter(Boolean)
    .join(' ');
}

function totalDuration(phase: MovePhase | undefined): DataValue | undefined {
  const durations = [
    phase?.startup?.duration,
    phase?.active?.duration,
    phase?.recovery?.duration,
  ];
  const exactDurations = durations.map((duration) => duration?.exact);
  if (exactDurations.some((duration) => duration === undefined)) {
    return undefined;
  }
  return {
    exact: exactDurations.reduce<number>(
      (total, duration) => total + (duration ?? 0),
      0,
    ),
  };
}

function formatFrameValue(
  value: DataValue | undefined,
  inherited: boolean,
): string {
  if (value?.exact !== undefined) {
    return `${inherited ? 'Inherited: ' : ''}${value.exact}f`;
  }
  if (value?.relative !== undefined) {
    return `${inherited ? 'Inherited: ' : ''}~${value.relative}%`;
  }
  return 'Unknown';
}

function sortFrameValue(value: DataValue | undefined): number | undefined {
  return value?.exact ?? value?.relative;
}

function moveCompleteness(row: MoveTableRow): number {
  const firstPhase = row.move.phases?.[0];
  const values = [
    firstPhase?.startup?.duration,
    firstPhase?.active?.duration,
    firstPhase?.recovery?.duration,
    firstPhase?.effects?.onHit?.stun,
    firstPhase?.effects?.onBlock?.stun,
    firstPhase?.effects?.onCounterHit?.stun,
  ];
  return (
    Number(!!row.input) +
    values.filter(
      (value) => value?.exact !== undefined || value?.relative !== undefined,
    ).length
  );
}
