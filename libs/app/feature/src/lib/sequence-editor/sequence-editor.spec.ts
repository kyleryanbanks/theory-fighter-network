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
    parentKey?: string;
  }> = [],
  sequences: Array<{
    semanticKey: string;
    characterKey?: string;
    teamKey?: string;
    sequence: Array<{ moveKey?: string }>;
  }> = [],
  teams: Array<{ semanticKey: string; orderedCharacterKeys: string[] }> = []
) {
  return {
    entities: { characters, moves, sequences, teams },
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

  it('appends a Move to the draft each time its tile is tapped, allowing repeats', () => {
    guide.set(
      buildGuide(
        [],
        [{ name: 'Jab', semanticKey: 'move-jab' }]
      )
    );
    fixture.detectChanges();

    const tile: HTMLButtonElement =
      fixture.nativeElement.querySelector('[data-testid="move-tile"]');
    tile.click();
    fixture.detectChanges();
    tile.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draftMoveKeys()).toEqual([
      'move-jab',
      'move-jab',
    ]);
  });

  it('shows universal Moves alongside a Character\'s own Moves in the move list', () => {
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
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="inherited-badge"]')
    ).toHaveLength(1);
  });

  it('hides the raw universal Move once a Character overrides it, showing only the override tile', () => {
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

    const tiles: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="move-tile"]')
    );

    expect(tiles).toHaveLength(1);
    expect(tiles[0].textContent).toContain('Universal Parry');
    expect(fixture.componentInstance.scopedMoves()).toEqual([
      expect.objectContaining({ semanticKey: 'move-parry-override' }),
    ]);
  });

  it('shows both the universal tile and an override tile when only some Team members override it', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Loki', semanticKey: 'character-loki' },
          { name: 'Storm', semanticKey: 'character-storm' },
        ],
        [
          { name: 'Trickery', semanticKey: 'move-trickery' },
          {
            name: 'Trickery',
            semanticKey: 'move-trickery-storm',
            characterKey: 'character-storm',
            parentKey: 'move-trickery',
          },
        ],
        [],
        [
          {
            semanticKey: 'team-loki-storm',
            orderedCharacterKeys: ['character-loki', 'character-storm'],
          },
        ]
      )
    );
    fixture.componentInstance.setScope('team-loki-storm');
    fixture.detectChanges();

    const tiles: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="move-tile"]')
    );

    expect(tiles).toHaveLength(2);
    expect(fixture.componentInstance.scopedMoves()).toEqual([
      expect.objectContaining({ semanticKey: 'move-trickery' }),
      expect.objectContaining({ semanticKey: 'move-trickery-storm' }),
    ]);
    expect(
      fixture.componentInstance.moveTileBadge({ characterKey: undefined })
    ).toBe('Universal');
    expect(
      fixture.componentInstance.moveTileBadge({
        characterKey: 'character-storm',
      })
    ).toBe('Storm');
  });

  it('hides the universal tile entirely once every Team member overrides it', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Loki', semanticKey: 'character-loki' },
          { name: 'Storm', semanticKey: 'character-storm' },
        ],
        [
          { name: 'Trickery', semanticKey: 'move-trickery' },
          {
            name: 'Trickery',
            semanticKey: 'move-trickery-loki',
            characterKey: 'character-loki',
            parentKey: 'move-trickery',
          },
          {
            name: 'Trickery',
            semanticKey: 'move-trickery-storm',
            characterKey: 'character-storm',
            parentKey: 'move-trickery',
          },
        ],
        [],
        [
          {
            semanticKey: 'team-loki-storm',
            orderedCharacterKeys: ['character-loki', 'character-storm'],
          },
        ]
      )
    );
    fixture.componentInstance.setScope('team-loki-storm');
    fixture.detectChanges();

    expect(fixture.componentInstance.scopedMoves().map((m) => m.semanticKey)).toEqual([
      'move-trickery-loki',
      'move-trickery-storm',
    ]);
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

  it('creates a team-scoped Sequence from moves shared by team members', async () => {
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
        [],
        [
          {
            semanticKey: 'team-ryu',
            orderedCharacterKeys: ['character-ryu'],
          },
        ]
      )
    );
    fixture.detectChanges();

    fixture.componentInstance.setScope('team-ryu');
    fixture.componentInstance.addDraftMove('move-hadoken');
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="add-sequence"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.createSequence).toHaveBeenCalledWith({
      sequence: [{ directions: [], buttons: [], moveKey: 'move-hadoken' }],
      teamKey: 'team-ryu',
    });
  });

  it('tags Team-scoped Moves with their owning Character name, and Universal with a Universal tag', () => {
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
        [],
        [
          {
            semanticKey: 'team-ryu',
            orderedCharacterKeys: ['character-ryu'],
          },
        ]
      )
    );
    fixture.componentInstance.setScope('team-ryu');
    fixture.detectChanges();

    const tiles: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="move-tile"]')
    );
    const parryTile = tiles.find((t) => t.textContent?.includes('Universal Parry'));
    const hadokenTile = tiles.find((t) => t.textContent?.includes('Hadoken'));

    expect(parryTile?.textContent).toContain('Universal');
    expect(hadokenTile?.textContent).toContain('Ryu');
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
