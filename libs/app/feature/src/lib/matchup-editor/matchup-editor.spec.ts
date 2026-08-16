import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { MatchupEditor } from './matchup-editor';

function buildGuide(
  characters: Array<{ name: string; semanticKey: string }> = [],
  stages: Array<{ name: string; semanticKey: string }> = [],
  matchups: Array<{
    semanticKey: string;
    attackerKey: string;
    defenderKey: string;
    notes?: Array<{ id: string; text: string; promotedToKey?: string }>;
    scenarios?: Array<{
      semanticKey: string;
      opponentOptionKey: string;
      name?: string;
      stageKey?: string;
    }>;
  }> = [],
  moves: Array<{ name: string; semanticKey: string }> = [],
  sequences: Array<{ semanticKey: string }> = []
) {
  return {
    entities: {
      characters,
      stages,
      matchups: matchups.map(({ notes, ...matchup }) => ({
        ...matchup,
        scenarios: matchup.scenarios ?? [],
        meta: { notes: notes ?? [] },
      })),
      moves,
      sequences,
    },
  };
}

describe('MatchupEditor', () => {
  let fixture: ComponentFixture<MatchupEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createMatchup: vi.fn(async () => ({ status: 'success' })),
    deleteMatchup: vi.fn(async () => ({ status: 'success' })),
    addMatchupScenario: vi.fn(async () => ({ status: 'success' })),
    removeMatchupScenario: vi.fn(async () => ({ status: 'success' })),
    addEntityNote: vi.fn(async () => ({ status: 'success' })),
    removeEntityNote: vi.fn(async () => ({ status: 'success' })),
    promoteEntityNote: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [MatchupEditor],
      providers: [{ provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchupEditor);
    fixture.detectChanges();
  });

  it('renders the active Guide Matchups with resolved Character names', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'char-ryu' },
          { name: 'Ken', semanticKey: 'char-ken' },
        ],
        [],
        [
          {
            semanticKey: 'matchup-1',
            attackerKey: 'char-ryu',
            defenderKey: 'char-ken',
          },
        ]
      )
    );
    fixture.detectChanges();

    const entry = fixture.nativeElement.querySelector(
      '[data-testid="matchup-item"]'
    );
    expect(entry.textContent).toContain('Ryu');
    expect(entry.textContent).toContain('Ken');
  });

  it('shows an empty state when there are no Matchups', () => {
    expect(fixture.nativeElement.textContent).toContain('No Matchups added.');
  });

  it('creates a Matchup from the selected attacker and defender', async () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'char-ryu' },
        { name: 'Ken', semanticKey: 'char-ken' },
      ])
    );
    fixture.detectChanges();

    fixture.componentInstance.attackerKey.set('char-ryu');
    fixture.componentInstance.defenderKey.set('char-ken');

    await fixture.componentInstance.createMatchup();

    expect(mockStore.createMatchup).toHaveBeenCalledWith({
      attackerKey: 'char-ryu',
      defenderKey: 'char-ken',
    });
  });

  it('shows a validation error when creating without an attacker or defender', async () => {
    fixture.componentInstance.attackerKey.set('');
    fixture.componentInstance.defenderKey.set('');

    await fixture.componentInstance.createMatchup();

    expect(mockStore.createMatchup).not.toHaveBeenCalled();
    expect(fixture.componentInstance.matchupError()).toContain('attacker');
  });

  it('surfaces a facade error when creating a Matchup fails', async () => {
    mockStore.createMatchup.mockResolvedValueOnce({
      status: 'error',
      error: new Error('A Matchup with this attacker and defender already exists.'),
    });
    fixture.componentInstance.attackerKey.set('char-ryu');
    fixture.componentInstance.defenderKey.set('char-ken');

    await fixture.componentInstance.createMatchup();

    expect(fixture.componentInstance.matchupError()).toBe(
      'A Matchup with this attacker and defender already exists.'
    );
  });

  it('deletes a Matchup', async () => {
    await fixture.componentInstance.deleteMatchup('matchup-1');

    expect(mockStore.deleteMatchup).toHaveBeenCalledWith({
      matchupKey: 'matchup-1',
    });
  });

  it('limits response options to universal and attacker-scoped Moves and Sequences', () => {
    const matchup = {
      attackerKey: 'char-ryu',
      defenderKey: 'char-ken',
    };
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'char-ryu' },
          { name: 'Ken', semanticKey: 'char-ken' },
        ],
        [],
        [],
        [
          { name: 'Universal', semanticKey: 'move-universal' },
          { name: 'Ryu Move', semanticKey: 'move-ryu', characterKey: 'char-ryu', parentKey: 'move-universal' } as never,
          { name: 'Ken Move', semanticKey: 'move-ken', characterKey: 'char-ken' } as never,
        ],
        [
          { semanticKey: 'sequence-universal' },
          { semanticKey: 'sequence-ryu', characterKey: 'char-ryu' } as never,
          { semanticKey: 'sequence-ken', characterKey: 'char-ken' } as never,
        ]
      )
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.responseMoves(matchup).map((move) => move.semanticKey)).toEqual([
      'move-universal',
      'move-ryu',
    ]);
    expect(fixture.componentInstance.responseSequences(matchup).map((sequence) => sequence.semanticKey)).toEqual([
      'sequence-universal',
      'sequence-ryu',
    ]);
  });

  it('shows Scenarios for a Matchup once selected, resolving the opponent option name', () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'char-ryu' },
          { name: 'Ken', semanticKey: 'char-ken' },
        ],
        [],
        [
          {
            semanticKey: 'matchup-1',
            attackerKey: 'char-ryu',
            defenderKey: 'char-ken',
            scenarios: [
              {
                semanticKey: 'scenario-1',
                opponentOptionKey: 'move-fireball',
                name: 'Fireball punish',
              },
            ],
          },
        ],
        [{ name: 'Fireball', semanticKey: 'move-fireball' }]
      )
    );
    fixture.detectChanges();

    fixture.componentInstance.toggleScenarios('matchup-1');
    fixture.detectChanges();

    const entry = fixture.nativeElement.querySelector(
      '[data-testid="scenario-entry"]'
    );
    expect(entry.textContent).toContain('Fireball');
    expect(entry.textContent).toContain('Fireball punish');
  });

  it('adds a Scenario to a Matchup from the selected opponent option', async () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'char-ryu' },
          { name: 'Ken', semanticKey: 'char-ken' },
        ],
        [],
        [
          {
            semanticKey: 'matchup-1',
            attackerKey: 'char-ryu',
            defenderKey: 'char-ken',
          },
        ],
        [{ name: 'Fireball', semanticKey: 'move-fireball' }]
      )
    );
    fixture.detectChanges();

    fixture.componentInstance.draftOpponentOptionKey.set('move-fireball');
    fixture.componentInstance.draftScenarioName.set('Fireball punish');

    await fixture.componentInstance.addScenario('matchup-1');

    expect(mockStore.addMatchupScenario).toHaveBeenCalledWith({
      matchupKey: 'matchup-1',
      opponentOptionKey: 'move-fireball',
      name: 'Fireball punish',
      stageKey: undefined,
    });
  });

  it('shows a validation error when adding a Scenario without an opponent option', async () => {
    await fixture.componentInstance.addScenario('matchup-1');

    expect(mockStore.addMatchupScenario).not.toHaveBeenCalled();
    expect(fixture.componentInstance.scenarioError()).toContain('option');
  });

  it('removes a Scenario from a Matchup', async () => {
    await fixture.componentInstance.removeScenario('matchup-1', 'scenario-1');

    expect(mockStore.removeMatchupScenario).toHaveBeenCalledWith({
      matchupKey: 'matchup-1',
      scenarioKey: 'scenario-1',
    });
  });

  it('promoting a note opens the Scenario draft prefilled with the note text', () => {
    const note = {
      id: 'note-1',
      text: 'Got hit by something weird',
      createdAt: new Date(),
    };

    fixture.componentInstance.addressNote('matchup-1', note);

    expect(fixture.componentInstance.selectedMatchupKey()).toBe('matchup-1');
    expect(fixture.componentInstance.draftScenarioName()).toBe(
      'Got hit by something weird'
    );
  });

  it('links an addressed note to the newly created Scenario once added', async () => {
    guide.set(
      buildGuide(
        [
          { name: 'Ryu', semanticKey: 'char-ryu' },
          { name: 'Ken', semanticKey: 'char-ken' },
        ],
        [],
        [
          {
            semanticKey: 'matchup-1',
            attackerKey: 'char-ryu',
            defenderKey: 'char-ken',
          },
        ],
        [{ name: 'Fireball', semanticKey: 'move-fireball' }]
      )
    );
    fixture.detectChanges();

    const note = {
      id: 'note-1',
      text: 'Got hit by something weird',
      createdAt: new Date(),
    };
    fixture.componentInstance.addressNote('matchup-1', note);
    fixture.componentInstance.draftOpponentOptionKey.set('move-fireball');

    await fixture.componentInstance.addScenario('matchup-1');

    expect(mockStore.promoteEntityNote).toHaveBeenCalledWith({
      entityType: 'matchup',
      entityKey: 'matchup-1',
      noteId: 'note-1',
      promotedToKey: expect.any(String),
    });
  });
});

