import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LocalGuideFacadeStore, TodoStore } from '@tfn/app-shell/data';
import { vi } from 'vitest';
import { MoveEditor } from './move-editor';

function buildGuide(
  characters: Array<{ name: string; semanticKey: string }> = [],
  moves: Array<{
    name: string;
    semanticKey: string;
    characterKey?: string;
    parentKey?: string;
    sequence?: Array<{
      directions: string[];
      buttons: string[];
      frames?: number;
    }>;
    phases?: Array<{
      startup?: { duration?: { exact?: number; relative?: number } };
      active?: { duration?: { exact?: number; relative?: number } };
      recovery?: { duration?: { exact?: number; relative?: number } };
      effects?: {
        onHit?: { stun?: { exact?: number; relative?: number } };
        onBlock?: { stun?: { exact?: number; relative?: number } };
        onCounterHit?: { stun?: { exact?: number; relative?: number } };
      };
    }>;
  }> = [],
) {
  return {
    entities: { characters, moves },
  };
}

describe('MoveEditor', () => {
  let fixture: ComponentFixture<MoveEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createMove: vi.fn(
      async (): Promise<{ status: string; error?: Error }> => ({
        status: 'success',
      }),
    ),
    deleteMove: vi.fn(async () => ({ status: 'success' })),
    overrideMove: vi.fn(async () => ({ status: 'success' })),
    promoteMove: vi.fn(async () => ({ status: 'success' })),
  };
  const mockTodoStore = { createTracked: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [MoveEditor],
      providers: [
        provideRouter([]),
        { provide: LocalGuideFacadeStore, useValue: mockStore },
        { provide: TodoStore, useValue: mockTodoStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MoveEditor);
    fixture.detectChanges();
  });

  it('renders the move collection as a table instead of expansion panels', () => {
    guide.set(
      buildGuide([], [{ name: 'Universal Parry', semanticKey: 'move-parry' }]),
    );
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('table[aria-label="Moves"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="move-entry"]'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Universal Parry');
  });

  it('renders input and frame data, then filters rows by move or input', () => {
    guide.set(
      buildGuide(
        [],
        [
          {
            name: 'Fireball',
            semanticKey: 'move-fireball',
            sequence: [{ directions: ['2', '3', '6'], buttons: ['P'] }],
            phases: [
              {
                startup: { duration: { exact: 5 } },
                active: { duration: { relative: 40 } },
                recovery: { duration: { exact: 12 } },
                effects: { onHit: { stun: { exact: 8 } } },
              },
            ],
          },
          { name: 'Sweep', semanticKey: 'move-sweep' },
        ],
      ),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('236+P');
    expect(fixture.nativeElement.textContent).toContain('5f');
    expect(fixture.nativeElement.textContent).toContain('~40%');

    const filter: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="move-filter"]',
    );
    filter.value = '236+P';
    filter.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fireball');
    expect(fixture.nativeElement.textContent).not.toContain('Sweep');
  });

  it('creates a Todo linked to the move from its row action', () => {
    guide.set(
      buildGuide([], [{ name: 'Universal Parry', semanticKey: 'move-parry' }])
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Add Todo for Universal Parry"]')
      .click();

    expect(mockTodoStore.createTracked).toHaveBeenCalledWith({
      text: 'Research Universal Parry',
      tracking: {
        type: 'entity',
        entityType: 'move',
        entityKey: 'move-parry',
      },
    });
  });

  it('carries selected move keys into the comparison route', () => {
    guide.set(
      buildGuide([], [{ name: 'Universal Parry', semanticKey: 'move-parry' }])
    );
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Select Universal Parry for comparison"]')
      .click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="compare-selected"]').click();

    expect(navigate).toHaveBeenCalledWith(['/move-comparison'], {
      queryParams: { moveKeys: 'move-parry' },
    });
  });

  it('marks effective override frame values as inherited and filters by completeness', () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          {
            name: 'Universal Parry',
            semanticKey: 'move-parry',
            sequence: [{ directions: ['5'], buttons: ['P'] }],
            phases: [
              {
                startup: { duration: { exact: 5 } },
                active: { duration: { exact: 2 } },
                recovery: { duration: { exact: 10 } },
                effects: {
                  onHit: { stun: { exact: 2 } },
                  onBlock: { stun: { exact: 1 } },
                  onCounterHit: { stun: { exact: 3 } },
                },
              },
            ],
          },
          {
            name: 'Universal Parry',
            semanticKey: 'move-parry-override',
            characterKey: 'character-ryu',
            parentKey: 'move-parry',
          },
          {
            name: 'Hadoken',
            semanticKey: 'move-hadoken',
            characterKey: 'character-ryu',
          },
        ],
      )
    );
    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inherited: 5f');
    expect(fixture.nativeElement.textContent).toContain('7/7');

    fixture.componentInstance.setCompletenessFilter('complete');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Universal Parry');
    expect(fixture.nativeElement.textContent).not.toContain('Hadoken');
  });

  it('shows universal Moves by default', () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          { name: 'Universal Parry', semanticKey: 'move-parry' },
          {
            name: 'Hadoken',
            semanticKey: 'move-hadoken',
            characterKey: 'character-ryu',
          },
        ],
      ),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Universal Parry');
    expect(fixture.nativeElement.textContent).not.toContain('Hadoken');
  });

  it("shows universal Moves alongside a Character's own Moves when scoped, with an Override action for the inherited one", () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          { name: 'Universal Parry', semanticKey: 'move-parry' },
          {
            name: 'Hadoken',
            semanticKey: 'move-hadoken',
            characterKey: 'character-ryu',
          },
        ],
      ),
    );
    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Universal Parry');
    expect(fixture.nativeElement.textContent).toContain('Hadoken');

    fixture.nativeElement
      .querySelector('[aria-label="Override Universal Parry"]')
      .click();

    expect(mockStore.overrideMove).toHaveBeenCalledWith({
      characterKey: 'character-ryu',
      universalMoveKey: 'move-parry',
    });
  });

  it('shows a Move override with a Revert to Universal action instead of the locked entry', () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          { name: 'Universal Parry', semanticKey: 'move-parry' },
          {
            name: 'Universal Parry',
            semanticKey: 'move-parry-override',
            characterKey: 'character-ryu',
            parentKey: 'move-parry',
          },
        ],
      ),
    );
    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Overrides move-parry');
    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Override Universal Parry"]',
      ),
    ).toBeNull();

    fixture.nativeElement
      .querySelector('[aria-label="Revert Universal Parry to Universal"]')
      .click();

    expect(mockStore.deleteMove).toHaveBeenCalledWith({
      moveKey: 'move-parry-override',
    });
  });

  it("promotes a Character's own Move to universal from its row action", () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          {
            name: 'Hadoken',
            semanticKey: 'move-hadoken',
            characterKey: 'character-ryu',
          },
        ],
      ),
    );
    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Promote Hadoken to Universal"]')
      .click();

    expect(mockStore.promoteMove).toHaveBeenCalledWith({
      moveKey: 'move-hadoken',
    });
  });

  it('creates a universal Move from the name field and clears the draft', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="move-name"]',
    );
    input.value = 'Universal Parry';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="add-move"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockStore.createMove).toHaveBeenCalledWith({
      name: 'Universal Parry',
    });
    expect(input.value).toBe('');
  });

  it('creates a character-scoped Move when a character scope is selected', async () => {
    guide.set(buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }]));
    fixture.detectChanges();

    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="move-name"]',
    );
    input.value = 'Hadoken';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="add-move"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockStore.createMove).toHaveBeenCalledWith({
      name: 'Hadoken',
      characterKey: 'character-ryu',
    });
  });

  it('shows a duplicate Move error without clearing the draft', async () => {
    mockStore.createMove.mockResolvedValueOnce({
      status: 'error',
      error: new Error('Move "Universal Parry" already exists in this scope.'),
    });
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="move-name"]',
    );
    input.value = 'Universal Parry';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="add-move"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Move "Universal Parry" already exists in this scope.',
    );
    expect(input.value).toBe('Universal Parry');
  });

  it('deletes a Move from its row action', async () => {
    guide.set(
      buildGuide([], [{ name: 'Universal Parry', semanticKey: 'move-parry' }]),
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Move Universal Parry"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.deleteMove).toHaveBeenCalledWith({
      moveKey: 'move-parry',
    });
  });
});
