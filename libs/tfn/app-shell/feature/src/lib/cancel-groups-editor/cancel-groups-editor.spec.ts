import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { CancelGroupsEditorComponent } from './cancel-groups-editor';

const UNIVERSAL_GROUPS = {
  Launcher: ['move1', 'move2'],
  Combo: ['move3'],
};

const CHARACTER_GROUPS = {
  Hadoken: ['move1', 'move4'],
};

const MOVE_LIST = [
  { key: 'move1', label: 'Move 1' },
  { key: 'move2', label: 'Move 2' },
  { key: 'move3', label: 'Move 3' },
  { key: 'move4', label: 'Move 4' },
];

describe('CancelGroupsEditorComponent', () => {
  let component: CancelGroupsEditorComponent;
  let fixture: ComponentFixture<CancelGroupsEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancelGroupsEditorComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CancelGroupsEditorComponent);
    component = fixture.componentInstance;
  });

  // ── initialization ──────────────────────────────────────────────────────

  describe('initialization', () => {
    beforeEach(() => fixture.detectChanges());

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize local signals with defaults', () => {
      expect(component.groupName()).toBe('');
      expect(component.cancelWindowStart()).toBeNull();
      expect(component.cancelWindowEnd()).toBeNull();
      expect(component.selectedUniversalGroups().size).toBe(0);
      expect(component.selectedCharacterGroups().size).toBe(0);
      expect(component.selectedOverrides()).toEqual({});
    });

    it('includeName defaults to false (phase move mode)', () => {
      expect(component.includeName()).toBe(false);
    });

    it('isParentGroupMode is false by default', () => {
      expect(component.isParentGroupMode()).toBe(false);
    });
  });

  // ── mode switching ───────────────────────────────────────────────────────

  describe('mode switching', () => {
    it('isParentGroupMode is true when includeName is set', () => {
      fixture.componentRef.setInput('includeName', true);
      fixture.detectChanges();
      expect(component.isParentGroupMode()).toBe(true);
    });
  });

  // ── universal group checkboxes ───────────────────────────────────────────

  describe('universal group changes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('universalGroups', UNIVERSAL_GROUPS);
      fixture.componentRef.setInput('moveList', MOVE_LIST);
      fixture.detectChanges();
    });

    it('adds a group name to selectedUniversalGroups when checked', () => {
      component.onUniversalGroupChange('Launcher', true);
      expect(component.selectedUniversalGroups().has('Launcher')).toBe(true);
    });

    it('removes a group name from selectedUniversalGroups when unchecked', () => {
      component.onUniversalGroupChange('Launcher', true);
      component.onUniversalGroupChange('Launcher', false);
      expect(component.selectedUniversalGroups().has('Launcher')).toBe(false);
    });

    it('hasGameGroups is true when universalGroups input has entries', () => {
      expect(component.hasGameGroups()).toBe(true);
    });

    it('gameGroupNames returns the group names', () => {
      expect(component.gameGroupNames()).toContain('Launcher');
      expect(component.gameGroupNames()).toContain('Combo');
    });
  });

  // ── character group checkboxes ───────────────────────────────────────────

  describe('character group changes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('characterGroups', CHARACTER_GROUPS);
      fixture.componentRef.setInput('moveList', MOVE_LIST);
      fixture.detectChanges();
    });

    it('adds a group name to selectedCharacterGroups when checked', () => {
      component.onCharacterGroupChange('Hadoken', true);
      expect(component.selectedCharacterGroups().has('Hadoken')).toBe(true);
    });

    it('hasCharacterGroups is true when characterGroups input has entries', () => {
      expect(component.hasCharacterGroups()).toBe(true);
    });
  });

  // ── activeMoveList computed ──────────────────────────────────────────────

  describe('activeMoveList', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('universalGroups', UNIVERSAL_GROUPS);
      fixture.componentRef.setInput('characterGroups', CHARACTER_GROUPS);
      fixture.componentRef.setInput('characterName', 'Ryu');
      fixture.componentRef.setInput('moveList', MOVE_LIST);
      fixture.detectChanges();
    });

    it('marks tiles from selected universal group as selected', () => {
      component.onUniversalGroupChange('Launcher', true);
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move1')?.value).toBe(true);
      expect(tiles.find(t => t.key === 'move2')?.value).toBe(true);
      expect(tiles.find(t => t.key === 'move3')?.value).toBe(false);
    });

    it('marks tiles from selected character group as selected', () => {
      component.onCharacterGroupChange('Hadoken', true);
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move1')?.value).toBe(true);
      expect(tiles.find(t => t.key === 'move4')?.value).toBe(true);
    });

    it('merges universal and character groups', () => {
      component.onUniversalGroupChange('Launcher', true);
      component.onCharacterGroupChange('Hadoken', true);
      const tiles = component.activeMoveList();
      // move1: in both groups
      expect(tiles.find(t => t.key === 'move1')?.value).toBe(true);
      // move2: universal only
      expect(tiles.find(t => t.key === 'move2')?.value).toBe(true);
      // move4: character only
      expect(tiles.find(t => t.key === 'move4')?.value).toBe(true);
      // move3: not in either selected group
      expect(tiles.find(t => t.key === 'move3')?.value).toBe(false);
    });

    it('force-on override includes a move not in any group', () => {
      fixture.componentRef.setInput('overrides', { move3: true });
      fixture.detectChanges();
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move3')?.value).toBe(true);
    });

    it('checking a group clears pre-existing false overrides for its moves (purely additive)', () => {
      fixture.componentRef.setInput('overrides', { move1: false });
      fixture.detectChanges();
      // Checking Launcher clears the false override on move1
      component.onUniversalGroupChange('Launcher', true);
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move1')?.value).toBe(true);
      expect(tiles.find(t => t.key === 'move2')?.value).toBe(true);
    });

    it('deselecting a group move after the group is checked records a force-off override', () => {
      component.onUniversalGroupChange('Launcher', true);
      // User explicitly deselects move1 after group was checked
      component.onTileUpdate({ key: 'move1', label: 'Move 1', value: false });
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move1')?.value).toBe(false);
      expect(tiles.find(t => t.key === 'move2')?.value).toBe(true);
    });

    it('force-on override adds a move not in any group', () => {
      fixture.componentRef.setInput('overrides', { move3: true });
      fixture.detectChanges();
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move3')?.value).toBe(true);
    });

    it('move with no override and no group membership is unselected', () => {
      fixture.componentRef.setInput('overrides', { move3: false });
      fixture.detectChanges();
      const tiles = component.activeMoveList();
      expect(tiles.find(t => t.key === 'move3')?.value).toBe(false);
    });

    it('tags move with Universal when from universal group', () => {
      component.onUniversalGroupChange('Launcher', true);
      const tile = component.activeMoveList().find(t => t.key === 'move1');
      expect(tile?.tags).toContainEqual(expect.objectContaining({ label: 'Universal' }));
    });

    it('tags move with character name when from character group', () => {
      component.onCharacterGroupChange('Hadoken', true);
      const tile = component.activeMoveList().find(t => t.key === 'move4');
      expect(tile?.tags).toContainEqual(expect.objectContaining({ label: 'Ryu' }));
    });

    it('tags move with both when in universal and character groups', () => {
      component.onUniversalGroupChange('Launcher', true);
      component.onCharacterGroupChange('Hadoken', true);
      const tile = component.activeMoveList().find(t => t.key === 'move1');
      expect(tile?.tags).toContainEqual(expect.objectContaining({ label: 'Universal' }));
      expect(tile?.tags).toContainEqual(expect.objectContaining({ label: 'Ryu' }));
    });

    it('checking a group selects its moves while preserving existing user overrides', () => {
      // User has move3 selected (not in Launcher), move4 selected (not in Launcher)
      component.onTileUpdate({ key: 'move3', label: 'Move 3', value: true });
      component.onTileUpdate({ key: 'move4', label: 'Move 4', value: true });
      // Now check Launcher (move1, move2) — no overrides on those
      component.onUniversalGroupChange('Launcher', true);
      const tiles = component.activeMoveList();
      // Group moves selected, tagged Universal
      expect(tiles.find(t => t.key === 'move1')?.value).toBe(true);
      expect(tiles.find(t => t.key === 'move1')?.tags).toContainEqual(expect.objectContaining({ label: 'Universal' }));
      expect(tiles.find(t => t.key === 'move2')?.value).toBe(true);
      // User overrides preserved
      expect(tiles.find(t => t.key === 'move3')?.value).toBe(true);
      expect(tiles.find(t => t.key === 'move4')?.value).toBe(true);
    });
  });

  // ── tile override handling ───────────────────────────────────────────────

  describe('onTileUpdate', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('universalGroups', UNIVERSAL_GROUPS);
      fixture.componentRef.setInput('moveList', MOVE_LIST);
      fixture.detectChanges();
    });

    it('records force-on override when tile is selected', () => {
      component.onTileUpdate({ key: 'move3', label: 'Move 3', value: true });
      expect(component.selectedOverrides()['move3']).toBe(true);
    });

    it('records force-off override when tile is deselected', () => {
      component.onUniversalGroupChange('Launcher', true);
      component.onTileUpdate({ key: 'move1', label: 'Move 1', value: false });
      expect(component.selectedOverrides()['move1']).toBe(false);
    });

    it('ignores array emissions from selection mode', () => {
      const before = { ...component.selectedOverrides() };
      component.onTileUpdate([{ key: 'move1', label: 'Move 1', value: true }]);
      expect(component.selectedOverrides()).toEqual(before);
    });
  });

  // ── save output ──────────────────────────────────────────────────────────

  describe('save output', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('universalGroups', UNIVERSAL_GROUPS);
      fixture.componentRef.setInput('moveList', MOVE_LIST);
      fixture.detectChanges();
    });

    it('does not emit while user is interacting (no auto-emit on group change)', () => {
      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));

      component.onUniversalGroupChange('Launcher', true);

      expect(emitted.length).toBe(0);
    });

    it('does not emit while user is interacting (no auto-emit on tile update)', () => {
      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));

      component.onTileUpdate({ key: 'move3', label: 'Move 3', value: true });

      expect(emitted.length).toBe(0);
    });

    it('emits universalGroups, characterGroups, overrides, and moveList on onSave()', () => {
      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));

      component.onUniversalGroupChange('Launcher', true);
      component.onSave();

      expect(emitted.length).toBe(1);
      const result = emitted[0];
      expect(result.universalGroups).toContain('Launcher');
      expect(result.characterGroups).toEqual([]);
      expect(result.overrides).toEqual({});
      expect(result.moveList).toContain('move1');
      expect(result.moveList).toContain('move2');
    });

    it('emits overrides as Record<string, boolean> on onSave()', () => {
      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));

      component.onTileUpdate({ key: 'move3', label: 'Move 3', value: true });
      component.onSave();

      expect(emitted[0].overrides).toEqual({ move3: true });
    });

    it('emits accumulated state from multiple interactions on onSave()', () => {
      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));

      component.onTileUpdate({ key: 'move1', label: 'Move 1', value: true });
      component.onUniversalGroupChange('Combo', true);
      component.onSave();

      const result = emitted[0];
      expect(result.overrides['move1']).toBe(true);
      expect(result.universalGroups).toContain('Combo');
    });

    it('emits name in parent group mode when groupName is set', () => {
      fixture.componentRef.setInput('includeName', true);
      fixture.detectChanges();
      component.groupName.set('My Group');

      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));
      component.onSave();

      expect(emitted[0].name).toBe('My Group');
    });

    it('does not emit name when groupName is empty', () => {
      fixture.componentRef.setInput('includeName', true);
      fixture.detectChanges();

      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));
      component.onSave();

      expect(emitted[0].name).toBeUndefined();
    });

    it('includes cancelWindowStart and cancelWindowEnd in phase move mode', () => {
      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));

      component.cancelWindowStart.set(3);
      component.cancelWindowEnd.set(12);
      component.onSave();

      expect(emitted[0].cancelWindowStart).toBe(3);
      expect(emitted[0].cancelWindowEnd).toBe(12);
    });

    it('omits cancelWindowStart and cancelWindowEnd in parent group mode', () => {
      fixture.componentRef.setInput('includeName', true);
      fixture.detectChanges();
      component.cancelWindowStart.set(3);
      component.cancelWindowEnd.set(12);

      const emitted: any[] = [];
      component.save.subscribe((v: any) => emitted.push(v));
      component.onSave();

      expect(emitted[0].cancelWindowStart).toBeUndefined();
      expect(emitted[0].cancelWindowEnd).toBeUndefined();
    });
  });

  // ── input passthrough ────────────────────────────────────────────────────

  describe('input properties', () => {
    it('accepts phaseStartFrame', () => {
      fixture.componentRef.setInput('phaseStartFrame', 42);
      fixture.detectChanges();
      expect(component.phaseStartFrame()).toBe(42);
    });

    it('accepts characterName', () => {
      fixture.componentRef.setInput('characterName', 'Chun-Li');
      fixture.detectChanges();
      expect(component.characterName()).toBe('Chun-Li');
    });

    it('initializes selectedUniversalGroups from overrideUniversalGroups', () => {
      fixture.componentRef.setInput('overrideUniversalGroups', new Set(['Launcher']));
      fixture.detectChanges();
      expect(component.selectedUniversalGroups().has('Launcher')).toBe(true);
    });

    it('initializes selectedCharacterGroups from overrideCharacterGroups', () => {
      fixture.componentRef.setInput('overrideCharacterGroups', new Set(['Hadoken']));
      fixture.detectChanges();
      expect(component.selectedCharacterGroups().has('Hadoken')).toBe(true);
    });

    it('initializes selectedOverrides from overrides input', () => {
      fixture.componentRef.setInput('overrides', { move1: false });
      fixture.detectChanges();
      expect(component.selectedOverrides()['move1']).toBe(false);
    });

    it('cancelWindowStart and cancelWindowEnd are writable', () => {
      component.cancelWindowStart.set(5);
      component.cancelWindowEnd.set(15);
      expect(component.cancelWindowStart()).toBe(5);
      expect(component.cancelWindowEnd()).toBe(15);
    });
  });
});
