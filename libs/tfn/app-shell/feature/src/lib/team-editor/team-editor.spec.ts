import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { TeamEditor } from './team-editor';
import type { Tile } from '@theory-fighter-network/ui';

function buildGuide(
  characters: Array<{ name: string; semanticKey: string }> = [],
  teams: Array<{ semanticKey: string; orderedCharacterKeys: string[] }> = [],
  teamSize = 3
) {
  return {
    entities: { characters, teams, game: { config: { teamSize } } },
  };
}

/** Find tile-grid buttons by label text (tile-grid renders .tile-grid-button elements). */
function tileFor(fixture: ComponentFixture<TeamEditor>, name: string): HTMLButtonElement {
  const buttons: HTMLButtonElement[] = Array.from(
    fixture.nativeElement.querySelectorAll('.tile-grid-button')
  );
  const tile = buttons.find((t) => t.textContent?.includes(name));
  if (!tile) {
    throw new Error(`No tile found for ${name}`);
  }
  return tile;
}

describe('TeamEditor', () => {
  let fixture: ComponentFixture<TeamEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createTeam: vi.fn(async () => ({ status: 'success' })),
    deleteTeam: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [TeamEditor],
      providers: [provideRouter([]), { provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamEditor);
    fixture.detectChanges();
  });

  it('renders the active Guide Teams with resolved Character names', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'character-ryu' },
          { name: 'Ken', semanticKey: 'character-ken' },
        ],
        [
          {
            semanticKey: 'team-ryu-ken',
            orderedCharacterKeys: ['character-ryu', 'character-ken'],
          },
        ]
      )
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ')).toContain(
      'Ryu + Ken'
    );
  });

  it('builds a roster by tapping Character tiles in pick order and submits it', async () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'character-ryu' },
        { name: 'Ken', semanticKey: 'character-ken' },
      ])
    );
    fixture.detectChanges();

    tileFor(fixture, 'Ken').click();
    fixture.detectChanges();
    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();

    // selection badges show pick order
    expect(tileFor(fixture, 'Ken').textContent).toContain('1');
    expect(tileFor(fixture, 'Ryu').textContent).toContain('2');

    fixture.nativeElement.querySelector('[data-testid="add-team"]').click();
    await fixture.whenStable();

    expect(mockStore.createTeam).toHaveBeenCalledWith({
      characterKeys: ['character-ken', 'character-ryu'],
    });
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([]);
  });

  it('removes a Character from the roster by tapping its tile again', () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'character-ryu' },
        { name: 'Ken', semanticKey: 'character-ken' },
      ])
    );
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([
      'character-ryu',
    ]);

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([]);
  });

  it('shows an error when submitting an empty Team', async () => {
    fixture.nativeElement.querySelector('[data-testid="add-team"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Add at least one Character to the Team.'
    );
    expect(mockStore.createTeam).not.toHaveBeenCalled();
  });

  it('shows an error from the facade without clearing the draft', async () => {
    mockStore.createTeam.mockResolvedValueOnce({
      status: 'error',
      error: new Error('A Team with this Character order already exists.'),
    });
    guide.set(buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }]));
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="add-team"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'A Team with this Character order already exists.'
    );
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([
      'character-ryu',
    ]);
  });

  it('disables unpicked tiles once the Game Team Size limit is reached, without disabling picked ones', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'character-ryu' },
          { name: 'Ken', semanticKey: 'character-ken' },
          { name: 'Chun-Li', semanticKey: 'character-chun-li' },
        ],
        [],
        2
      )
    );
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    tileFor(fixture, 'Ken').click();
    fixture.detectChanges();
    // at limit — Chun-Li click should be blocked by tile-grid
    tileFor(fixture, 'Chun-Li').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([
      'character-ryu',
      'character-ken',
    ]);
    // tile-grid disables tiles at limit
    expect(tileFor(fixture, 'Chun-Li').disabled).toBe(true);
    expect(tileFor(fixture, 'Ryu').disabled).toBe(false);
  });

  it('disables all tiles when the Game Team Size does not allow Teams', () => {
    guide.set(buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }], [], 1));
    fixture.detectChanges();

    // maxSelections=undefined when teamSize<=1, so click is a no-op from parent side
    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'Set the Game Team Size above 1 to build Teams.'
    );
  });

  it('deletes a Team from its row action', async () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          {
            semanticKey: 'team-ryu',
            orderedCharacterKeys: ['character-ryu'],
          },
        ]
      )
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Team team-ryu"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.deleteTeam).toHaveBeenCalledWith({
      teamKey: 'team-ryu',
    });
  });
});

describe('TeamEditor', () => {
  let fixture: ComponentFixture<TeamEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createTeam: vi.fn(async () => ({ status: 'success' })),
    deleteTeam: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [TeamEditor],
      providers: [provideRouter([]), { provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamEditor);
    fixture.detectChanges();
  });

  it('renders the active Guide Teams with resolved Character names', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'character-ryu' },
          { name: 'Ken', semanticKey: 'character-ken' },
        ],
        [
          {
            semanticKey: 'team-ryu-ken',
            orderedCharacterKeys: ['character-ryu', 'character-ken'],
          },
        ]
      )
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ')).toContain(
      'Ryu + Ken'
    );
  });

  it('builds a roster by tapping Character tiles in pick order and submits it', async () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'character-ryu' },
        { name: 'Ken', semanticKey: 'character-ken' },
      ])
    );
    fixture.detectChanges();

    tileFor(fixture, 'Ken').click();
    fixture.detectChanges();
    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();

    expect(tileFor(fixture, 'Ken').textContent).toContain('1');
    expect(tileFor(fixture, 'Ryu').textContent).toContain('2');

    fixture.nativeElement.querySelector('[data-testid="add-team"]').click();
    await fixture.whenStable();

    expect(mockStore.createTeam).toHaveBeenCalledWith({
      characterKeys: ['character-ken', 'character-ryu'],
    });
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([]);
  });

  it('removes a Character from the roster by tapping its tile again', () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'character-ryu' },
        { name: 'Ken', semanticKey: 'character-ken' },
      ])
    );
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([
      'character-ryu',
    ]);

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([]);
  });

  it('shows an error when submitting an empty Team', async () => {
    fixture.nativeElement.querySelector('[data-testid="add-team"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Add at least one Character to the Team.'
    );
    expect(mockStore.createTeam).not.toHaveBeenCalled();
  });

  it('shows an error from the facade without clearing the draft', async () => {
    mockStore.createTeam.mockResolvedValueOnce({
      status: 'error',
      error: new Error('A Team with this Character order already exists.'),
    });
    guide.set(buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }]));
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.nativeElement.querySelector('[data-testid="add-team"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'A Team with this Character order already exists.'
    );
    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([
      'character-ryu',
    ]);
  });

  it('disables unpicked tiles once the Game Team Size limit is reached, without disabling picked ones', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'character-ryu' },
          { name: 'Ken', semanticKey: 'character-ken' },
          { name: 'Chun-Li', semanticKey: 'character-chun-li' },
        ],
        [],
        2
      )
    );
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();
    tileFor(fixture, 'Ken').click();
    fixture.detectChanges();
    tileFor(fixture, 'Chun-Li').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([
      'character-ryu',
      'character-ken',
    ]);
    // tile-grid disables tiles at limit — no "Roster full" message needed
    expect(tileFor(fixture, 'Chun-Li').disabled).toBe(true);
    expect(tileFor(fixture, 'Ryu').disabled).toBe(false);
  });

  it('disables all tiles when the Game Team Size does not allow Teams', () => {
    guide.set(buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }], [], 1));
    fixture.detectChanges();

    tileFor(fixture, 'Ryu').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draftCharacterKeys()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'Set the Game Team Size above 1 to build Teams.'
    );
    // teamSize<=1 passes maxSelections=undefined; tile-grid doesn't disable in passive mode
  });

  it('deletes a Team from its row action', async () => {
    guide.set(
      buildGuide(
        [{ name: 'Ryu', semanticKey: 'character-ryu' }],
        [
          {
            semanticKey: 'team-ryu',
            orderedCharacterKeys: ['character-ryu'],
          },
        ]
      )
    );
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Team team-ryu"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.deleteTeam).toHaveBeenCalledWith({
      teamKey: 'team-ryu',
    });
  });
});
