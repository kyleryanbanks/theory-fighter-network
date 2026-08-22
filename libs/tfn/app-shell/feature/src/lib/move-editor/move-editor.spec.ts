import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { MoveEditor } from './move-editor';

function buildGuide(
  characters: Array<{ name: string; semanticKey: string }> = [],
  moves: Array<{
    name: string;
    semanticKey: string;
    characterKey?: string;
    parentKey?: string;
  }> = []
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
    createMove: vi.fn(async () => ({ status: 'success' })),
    deleteMove: vi.fn(async () => ({ status: 'success' })),
    overrideMove: vi.fn(async () => ({ status: 'success' })),
    promoteMove: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [MoveEditor],
      providers: [provideRouter([]), { provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(MoveEditor);
    fixture.detectChanges();
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
        ]
      )
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
        ]
      )
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
        ]
      )
    );
    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Overrides move-parry');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Override Universal Parry"]')
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
        ]
      )
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
      '[data-testid="move-name"]'
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
    guide.set(
      buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }])
    );
    fixture.detectChanges();

    fixture.componentInstance.setScope('character-ryu');
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="move-name"]'
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
      '[data-testid="move-name"]'
    );
    input.value = 'Universal Parry';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="add-move"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Move "Universal Parry" already exists in this scope.'
    );
    expect(input.value).toBe('Universal Parry');
  });

  it('deletes a Move from its row action', async () => {
    guide.set(
      buildGuide(
        [],
        [{ name: 'Universal Parry', semanticKey: 'move-parry' }]
      )
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
