import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { SequenceEditor } from './sequence-editor';

function buildGuide(
  characters: Array<{ name: string; semanticKey: string }> = [],
  moves: Array<{
    name: string;
    semanticKey: string;
    characterKey?: string;
  }> = [],
  sequences: Array<{
    semanticKey: string;
    characterKey?: string;
    sequence: Array<{ moveKey?: string }>;
  }> = []
) {
  return {
    entities: { characters, moves, sequences },
  };
}

describe('SequenceEditor', () => {
  let fixture: ComponentFixture<SequenceEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createSequence: vi.fn(async () => ({ status: 'success' })),
    deleteSequence: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [SequenceEditor],
      providers: [{ provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(SequenceEditor);
    fixture.detectChanges();
  });

  it('shows universal Sequences by default with resolved Move names', () => {
    guide.set(
      buildGuide(
        [],
        [{ name: 'Universal Parry', semanticKey: 'move-parry' }],
        [
          {
            semanticKey: 'sequence-parry-only',
            sequence: [{ moveKey: 'move-parry' }],
          },
        ]
      )
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Universal Parry');
  });

  it('builds a draft Sequence from selected Moves and submits it', async () => {
    guide.set(
      buildGuide(
        [],
        [{ name: 'Universal Parry', semanticKey: 'move-parry' }]
      )
    );
    fixture.detectChanges();

    fixture.componentInstance.addDraftMove('move-parry');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="draft-steps"]')
        .textContent
    ).toContain('Universal Parry');

    fixture.nativeElement
      .querySelector('[data-testid="add-sequence"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.createSequence).toHaveBeenCalledWith({
      sequence: [{ directions: [], buttons: [], moveKey: 'move-parry' }],
    });
    expect(fixture.componentInstance.draftMoveKeys()).toEqual([]);
  });

  it('creates a character-scoped Sequence when a character scope is selected', async () => {
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
    fixture.detectChanges();

    fixture.componentInstance.setScope('character-ryu');
    fixture.componentInstance.addDraftMove('move-hadoken');
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="add-sequence"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.createSequence).toHaveBeenCalledWith({
      sequence: [{ directions: [], buttons: [], moveKey: 'move-hadoken' }],
      characterKey: 'character-ryu',
    });
  });

  it('shows an error when submitting an empty Sequence', async () => {
    fixture.nativeElement
      .querySelector('[data-testid="add-sequence"]')
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Add at least one Move to the Sequence.'
    );
    expect(mockStore.createSequence).not.toHaveBeenCalled();
  });

  it('deletes a Sequence from its row action', async () => {
    guide.set(
      buildGuide(
        [],
        [{ name: 'Universal Parry', semanticKey: 'move-parry' }],
        [
          {
            semanticKey: 'sequence-parry-only',
            sequence: [{ moveKey: 'move-parry' }],
          },
        ]
      )
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Sequence sequence-parry-only"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.deleteSequence).toHaveBeenCalledWith({
      sequenceKey: 'sequence-parry-only',
    });
  });
});
