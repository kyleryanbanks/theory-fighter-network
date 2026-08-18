import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CancelGroupsEditorComponent } from './cancel-groups-editor';

describe('CancelGroupsEditorComponent', () => {
  let component: CancelGroupsEditorComponent;
  let fixture: ComponentFixture<CancelGroupsEditorComponent>;
  let facadeMock: any;

  beforeEach(async () => {
    const facadeSpy = {
      guide: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [CancelGroupsEditorComponent],
      providers: [
        { provide: LocalGuideFacadeStore, useValue: facadeSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    facadeMock = TestBed.inject(LocalGuideFacadeStore);
    fixture = TestBed.createComponent(CancelGroupsEditorComponent);
    component = fixture.componentInstance;
  });

  describe('initialization', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty signals', () => {
      expect(component.groupName()).toBe('');
      expect(component.cancelWindowStart()).toBeNull();
      expect(component.cancelWindowEnd()).toBeNull();
      expect(component.selectedGameGroups().size).toBe(0);
      expect(component.selectedCharacterGroups().size).toBe(0);
      expect(component.userOverrideMoves().size).toBe(0);
    });

    it('should accept includeName input and default to true', () => {
      expect(component.includeName()).toBe(true);
    });
  });

  describe('game cancel groups', () => {
    beforeEach(() => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {
                'Launcher': ['move1', 'move2'],
                'Combo': ['move3'],
              },
            },
          },
          characters: [],
          moves: [
            { semanticKey: 'move1', name: 'Move 1' },
            { semanticKey: 'move2', name: 'Move 2' },
            { semanticKey: 'move3', name: 'Move 3' },
          ],
        },
      };
      facadeMock.guide.set(mockGuide);
      fixture.detectChanges();
    });

    it('should load game universal cancel groups from facade', () => {
      const groups = component.gameUniversalGroups();
      expect(groups['Launcher']).toEqual(['move1', 'move2']);
      expect(groups['Combo']).toEqual(['move3']);
    });

    it('should mark hasGameGroups as true when groups exist', () => {
      expect(component.hasGameGroups()).toBe(true);
    });

    it('should select a game group when checkbox is checked', () => {
      component.onGameGroupChange('Launcher', true);

      expect(component.selectedGameGroups().has('Launcher')).toBe(true);
    });

    it('should deselect a game group when checkbox is unchecked', () => {
      component.selectedGameGroups.set(new Set(['Launcher']));
      component.onGameGroupChange('Launcher', false);

      expect(component.selectedGameGroups().has('Launcher')).toBe(false);
    });

    it('should add moves from selected game group to effective moves', () => {
      component.onGameGroupChange('Launcher', true);

      const effective = component.effectiveMoves();
      expect(effective.has('move1')).toBe(true);
      expect(effective.has('move2')).toBe(true);
    });

    it('should remove force-ON overrides when a game group is checked', () => {
      // User had explicitly selected move1
      component.userOverrideMoves.set(new Map([['move1', true]]));

      // Now select the group that contains move1
      component.onGameGroupChange('Launcher', true);

      // The override should be removed since the group now provides it
      expect(component.userOverrideMoves().has('move1')).toBe(false);
      expect(component.selectedGameGroups().has('Launcher')).toBe(true);
    });

    it('should keep force-OFF overrides when selecting a group', () => {
      // User had explicitly deselected move1
      component.userOverrideMoves.set(new Map([['move1', false]]));

      // Now select the group that contains move1
      component.onGameGroupChange('Launcher', true);

      // The force-OFF override should remain (user wants to prevent this move even though group has it)
      expect(component.userOverrideMoves().get('move1')).toBe(false);
    });
  });

  describe('character cancel groups', () => {
    beforeEach(() => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {},
            },
          },
          characters: [
            {
              semanticKey: 'ryu',
              name: 'Ryu',
              cancelGroups: {
                'Hadoken': ['move1', 'move4'],
              },
            },
          ],
          moves: [
            { semanticKey: 'move1', name: 'Move 1' },
            { semanticKey: 'move4', name: 'Move 4' },
          ],
        },
      };
      facadeMock.guide.set(mockGuide);
      fixture.componentRef.setInput('characterKey', 'ryu');
      fixture.detectChanges();
    });

    it('should load character cancel groups from facade', () => {
      const groups = component.characterCancelGroups();
      expect(groups['Hadoken']).toEqual(['move1', 'move4']);
    });

    it('should get character name from facade', () => {
      expect(component.characterName()).toBe('Ryu');
    });

    it('should mark hasCharacterGroups as true when groups exist', () => {
      expect(component.hasCharacterGroups()).toBe(true);
    });

    it('should select a character group when checkbox is checked', () => {
      component.onCharacterGroupChange('Hadoken', true);

      expect(component.selectedCharacterGroups().has('Hadoken')).toBe(true);
    });

    it('should add moves from character group to effective moves', () => {
      component.onCharacterGroupChange('Hadoken', true);

      const effective = component.effectiveMoves();
      expect(effective.has('move1')).toBe(true);
      expect(effective.has('move4')).toBe(true);
    });

    it('should remove force-ON overrides when a character group is checked', () => {
      component.userOverrideMoves.set(new Map([['move1', true]]));

      component.onCharacterGroupChange('Hadoken', true);

      expect(component.userOverrideMoves().has('move1')).toBe(false);
    });
  });

  describe('move merging and overrides', () => {
    beforeEach(() => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {
                'Universal': ['move1', 'move2'],
              },
            },
          },
          characters: [
            {
              semanticKey: 'ryu',
              name: 'Ryu',
              cancelGroups: {
                'Character': ['move3'],
              },
            },
          ],
          moves: [
            { semanticKey: 'move1', name: 'Move 1' },
            { semanticKey: 'move2', name: 'Move 2' },
            { semanticKey: 'move3', name: 'Move 3' },
            { semanticKey: 'move4', name: 'Move 4' },
          ],
        },
      };
      facadeMock.guide.set(mockGuide);
      fixture.componentRef.setInput('characterKey', 'ryu');
      fixture.detectChanges();
    });

    it('should merge game and character groups', () => {
      component.onGameGroupChange('Universal', true);
      component.onCharacterGroupChange('Character', true);

      const effective = component.effectiveMoves();
      expect(effective.has('move1')).toBe(true);
      expect(effective.has('move2')).toBe(true);
      expect(effective.has('move3')).toBe(true);
    });

    it('should apply force-OFF overrides to remove moves from merged list', () => {
      component.onGameGroupChange('Universal', true);

      // User wants to exclude move1 even though it's in the group
      component.userOverrideMoves.set(new Map([['move1', false]]));
      fixture.detectChanges();

      const effective = component.effectiveMoves();
      expect(effective.has('move1')).toBe(false);
      expect(effective.has('move2')).toBe(true);
    });

    it('should apply force-ON overrides to add moves outside groups', () => {
      component.onGameGroupChange('Universal', true);

      // User wants to add move4 which is not in any group
      component.userOverrideMoves.set(new Map([['move4', true]]));
      fixture.detectChanges();

      const effective = component.effectiveMoves();
      expect(effective.has('move4')).toBe(true);
    });
  });

  describe('tile generation and tags', () => {
    beforeEach(() => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {
                'Universal': ['move1'],
              },
            },
          },
          characters: [
            {
              semanticKey: 'ryu',
              name: 'Ryu',
              cancelGroups: {
                'Character': ['move2'],
              },
            },
          ],
          moves: [
            { semanticKey: 'move1', name: 'Move 1' },
            { semanticKey: 'move2', name: 'Move 2' },
            { semanticKey: 'move3', name: 'Move 3' },
          ],
        },
      };
      facadeMock.guide.set(mockGuide);
      fixture.componentRef.setInput('characterKey', 'ryu');
      fixture.detectChanges();
    });

    it('should generate tiles from effective moves', () => {
      component.onGameGroupChange('Universal', true);
      fixture.detectChanges();

      const tiles = component.moveTiles();
      expect(tiles.length).toBe(1);
      expect(tiles[0].key).toBe('move1');
      expect(tiles[0].label).toBe('Move 1');
    });

    it('should tag move with Universal when from game group only', () => {
      component.onGameGroupChange('Universal', true);
      fixture.detectChanges();

      const tiles = component.moveTiles();
      expect(tiles[0].tags).toContainEqual(expect.objectContaining({ label: 'Universal' }));
    });

    it('should tag move with character name when from character group only', () => {
      component.onCharacterGroupChange('Character', true);
      fixture.detectChanges();

      const tiles = component.moveTiles();
      expect(tiles[0].key).toBe('move2');
      expect(tiles[0].tags).toContainEqual(expect.objectContaining({ label: 'Ryu' }));
    });

    it('should tag move with both Universal and character name when in both groups', () => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {
                'Universal': ['move1'],
              },
            },
          },
          characters: [
            {
              semanticKey: 'ryu',
              name: 'Ryu',
              cancelGroups: {
                'Character': ['move1'],
              },
            },
          ],
          moves: [
            { semanticKey: 'move1', name: 'Move 1' },
          ],
        },
      };
      // Update the facade's guide signal directly
      facadeMock.guide.set(mockGuide);
      fixture.componentRef.setInput('characterKey', 'ryu');
      fixture.detectChanges();

      component.onGameGroupChange('Universal', true);
      component.onCharacterGroupChange('Character', true);
      fixture.detectChanges();

      const tiles = component.moveTiles();
      expect(tiles[0].tags).toContainEqual(expect.objectContaining({ label: 'Universal' }));
      expect(tiles[0].tags).toContainEqual(expect.objectContaining({ label: 'Ryu' }));
    });

    it('should tag force-ON override moves with Local Override', () => {
      component.userOverrideMoves.set(new Map([['move3', true]]));
      fixture.detectChanges();

      const tiles = component.moveTiles();
      expect(tiles[0].key).toBe('move3');
      expect(tiles[0].tags).toContainEqual(expect.objectContaining({ label: 'Local Override' }));
    });
  });

  describe('tile interaction', () => {
    beforeEach(() => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {
                'Universal': ['move1', 'move2'],
              },
            },
          },
          characters: [],
          moves: [
            { semanticKey: 'move1', name: 'Move 1' },
            { semanticKey: 'move2', name: 'Move 2' },
          ],
        },
      };
      facadeMock.guide.set(mockGuide);
      fixture.detectChanges();
    });

    it('should force-OFF a move when tile is deselected and move is in a group', () => {
      component.onGameGroupChange('Universal', true);
      fixture.detectChanges();

      const tile = { key: 'move1', label: 'Move 1', value: false };
      component.onTileUpdate(tile);

      expect(component.userOverrideMoves().get('move1')).toBe(false);
    });

    it('should force-ON a move when tile is selected and move is not in any group', () => {
      component.onTileUpdate({ key: 'move3', label: 'Move 3', value: true });

      expect(component.userOverrideMoves().get('move3')).toBe(true);
    });

    it('should remove override when tile is toggled back to normal', () => {
      component.userOverrideMoves.set(new Map([['move1', false]]));

      // Simulate re-selecting the move to remove the override
      component.onTileUpdate({ key: 'move1', label: 'Move 1', value: true });

      expect(component.userOverrideMoves().has('move1')).toBe(false);
    });

    it('should ignore tile array updates from selection mode', () => {
      const tiles = [
        { key: 'move1', label: 'Move 1', value: true },
        { key: 'move2', label: 'Move 2', value: true },
      ];

      component.onTileUpdate(tiles);

      // Should not crash, should not add to overrides
      expect(component.userOverrideMoves().size).toBe(0);
    });
  });

  describe('public API', () => {
    beforeEach(() => {
      const mockGuide = {
        entities: {
          game: {
            universal: {
              cancelGroups: {
                'Launcher': ['move1', 'move2'],
              },
            },
          },
          characters: [],
          moves: [],
        },
      };
      facadeMock.guide.set(mockGuide);
      fixture.detectChanges();
    });

    it('should return effective moves as array via getSelectedMoves', () => {
      component.onGameGroupChange('Launcher', true);
      fixture.detectChanges();

      const selected = component.getSelectedMoves();
      expect(Array.isArray(selected)).toBe(true);
      expect(selected).toContain('move1');
      expect(selected).toContain('move2');
    });

    it('should accept frame inputs', () => {
      component.cancelWindowStart.set(5);
      component.cancelWindowEnd.set(15);

      expect(component.cancelWindowStart()).toBe(5);
      expect(component.cancelWindowEnd()).toBe(15);
    });

    it('should accept group name input', () => {
      component.groupName.set('My Cancel Group');

      expect(component.groupName()).toBe('My Cancel Group');
    });
  });

  describe('input properties', () => {
    it('should accept includeName input', () => {
      fixture.componentRef.setInput('includeName', false);
      fixture.detectChanges();

      expect(component.includeName()).toBe(false);
    });

    it('should accept gameKey input', () => {
      fixture.componentRef.setInput('gameKey', 'sf6');
      fixture.detectChanges();

      expect(component.gameKey()).toBe('sf6');
    });

    it('should accept characterKey input', () => {
      fixture.componentRef.setInput('characterKey', 'ryu');
      fixture.detectChanges();

      expect(component.characterKey()).toBe('ryu');
    });

    it('should accept phaseStartFrame input', () => {
      fixture.componentRef.setInput('phaseStartFrame', 42);
      fixture.detectChanges();

      expect(component.phaseStartFrame()).toBe(42);
    });
  });
});
