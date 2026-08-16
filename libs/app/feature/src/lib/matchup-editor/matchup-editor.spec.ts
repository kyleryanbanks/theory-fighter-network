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
    name: string;
  }> = []
) {
  return {
    entities: { characters, stages, matchups },
  };
}

describe('MatchupEditor', () => {
  let fixture: ComponentFixture<MatchupEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createMatchup: vi.fn(async () => ({ status: 'success' })),
    deleteMatchup: vi.fn(async () => ({ status: 'success' })),
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
            name: 'Corner pressure',
          },
        ]
      )
    );
    fixture.detectChanges();

    const entry = fixture.nativeElement.querySelector(
      '[data-testid="matchup-entry"]'
    );
    expect(entry.textContent).toContain('Ryu');
    expect(entry.textContent).toContain('Ken');
    expect(entry.textContent).toContain('Corner pressure');
  });

  it('shows an empty state when there are no Matchups', () => {
    expect(fixture.nativeElement.textContent).toContain('No Matchups added.');
  });

  it('creates a Matchup from the selected attacker, defender, and name', async () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'char-ryu' },
        { name: 'Ken', semanticKey: 'char-ken' },
      ])
    );
    fixture.detectChanges();

    fixture.componentInstance.attackerKey.set('char-ryu');
    fixture.componentInstance.defenderKey.set('char-ken');
    fixture.componentInstance.draftName.set('Corner pressure');

    await fixture.componentInstance.createMatchup();

    expect(mockStore.createMatchup).toHaveBeenCalledWith({
      attackerKey: 'char-ryu',
      defenderKey: 'char-ken',
      name: 'Corner pressure',
      stageKey: undefined,
    });
  });

  it('shows a validation error when creating without a name', async () => {
    fixture.componentInstance.attackerKey.set('char-ryu');
    fixture.componentInstance.defenderKey.set('char-ken');
    fixture.componentInstance.draftName.set('   ');

    await fixture.componentInstance.createMatchup();

    expect(mockStore.createMatchup).not.toHaveBeenCalled();
    expect(fixture.componentInstance.matchupError()).toContain('name');
  });

  it('surfaces a facade error when creating a Matchup fails', async () => {
    mockStore.createMatchup.mockResolvedValueOnce({
      status: 'error',
      error: new Error('attackerKey and defenderKey must be different.'),
    });
    fixture.componentInstance.attackerKey.set('char-ryu');
    fixture.componentInstance.defenderKey.set('char-ryu');
    fixture.componentInstance.draftName.set('Mirror match');

    await fixture.componentInstance.createMatchup();

    expect(fixture.componentInstance.matchupError()).toBe(
      'attackerKey and defenderKey must be different.'
    );
  });

  it('deletes a Matchup', async () => {
    await fixture.componentInstance.deleteMatchup('matchup-1');

    expect(mockStore.deleteMatchup).toHaveBeenCalledWith({
      matchupKey: 'matchup-1',
    });
  });
});
