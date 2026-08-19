import { booleanAttribute, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TileGridComponent, Tile, ExpansionPanel, DeleteButton } from '@theory-fighter-network/ui';

/**
 * CancelGroupsEditor - Displays and edits cancel group selections at game, character, or phase level.
 *
 * Operates in two modes gated by `includeName`:
 * - Phase move mode (default, includeName=false): user sets a cancel window; name field hidden.
 * - Parent group mode (includeName=true): user names the group; cancel window hidden.
 *
 * Inputs supply the available group definitions and initial selections.
 * All selection state is local (linkedSignal); changes are surfaced via cancelRuleChange.
 */
@Component({
  selector: 'tfn-cancel-groups-editor',
  templateUrl: './cancel-groups-editor.html',
  styleUrls: ['./cancel-groups-editor.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, TileGridComponent, ExpansionPanel, DeleteButton],
})
export class CancelGroupsEditorComponent {

  // ── Inputs ────────────────────────────────────────────────────────────────

  readonly characterName = input<string>('');
  readonly header = input<string>('Cancel Groups');
  readonly subheader = input<string>();

  /** When true: show name field, hide cancel window (parent group mode). Default: false. */
  readonly includeName = input(false, { transform: booleanAttribute });
  readonly groupName = signal('');

  readonly phaseStartFrame = input<number | undefined>(undefined);
  readonly cancelWindowStart = signal<number | null>(null);
  readonly cancelWindowEnd = signal<number | null>(null);

  /** Available game-level cancel groups: group name → move keys */
  readonly universalGroups = input<Record<string, string[]>>({});
  /** Initially selected game-level group names */
  readonly overrideUniversalGroups = input<Set<string>>(new Set());
  readonly selectedUniversalGroups = linkedSignal(() => this.overrideUniversalGroups());

  /** Available character-level cancel groups: group name → move keys */
  readonly characterGroups = input<Record<string, string[]>>({});
  /** Initially selected character-level group names */
  readonly overrideCharacterGroups = input<Set<string>>(new Set());
  readonly selectedCharacterGroups = linkedSignal(() => this.overrideCharacterGroups());

  /** Full move pool for the tile grid */
  readonly moveList = input<Tile[]>([]);
  /**
   * Initial per-move overrides: true = force-on, false = force-off.
   * Keyed by move semantic key.
   */
  readonly overrides = input<Record<string, boolean>>({});
  readonly selectedOverrides = linkedSignal(() => this.overrides());

  // ── Output ────────────────────────────────────────────────────────────────

  /**
   * Emitted only when the user explicitly presses Save.
   * cancelWindowStart/End are included when in phase move mode (includeName=false).
   */
  readonly save = output<{
    name?: string;
    universalGroups: string[];
    characterGroups: string[];
    /** Per-move force-on (true) / force-off (false) overrides */
    overrides: Record<string, boolean>;
    /** Resolved move keys: groups merged with overrides applied */
    moveList: string[];
    cancelWindowStart?: number | null;
    cancelWindowEnd?: number | null;
  }>();

  /** Emitted when the user renames an existing parent group. Only fires in parent group mode. */
  readonly renameGroup = output<{ oldName: string; newName: string }>();

  /** Emitted when the user deletes an existing parent group. Only fires in parent group mode. */
  readonly deleteGroup = output<{ groupName: string }>();

  /** Tracks which existing group is being renamed (null = none). */
  readonly renamingGroup = signal<string | null>(null);
  readonly renameValue = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────

  /**
   * Returns the tile list with selection state and origin tags applied.
   * - value: true when the move is included (via group or force-on override)
   * - tags:  'Universal' / character name badges indicating which group provides it
   */
  readonly activeMoveList = computed(() => {
    const inUniversalGroup = (key: string): boolean =>
      [...this.selectedUniversalGroups()].some(g => this.universalGroups()[g]?.includes(key));

    const inCharacterGroup = (key: string): boolean =>
      [...this.selectedCharacterGroups()].some(g => this.characterGroups()[g]?.includes(key));

    const tileShouldBeSelected = (key: string): boolean => {
      const groupSelected = inUniversalGroup(key) || inCharacterGroup(key);
      const overrideValue = this.selectedOverrides()[key];
      // Override toggles the group's decision when present.
      // No override: use group membership as-is.
      if (overrideValue === undefined) return groupSelected;
      // Override present: flip — true adds a non-grouped move, false removes a grouped move.
      return overrideValue;
    };

    return this.moveList().map(tile => ({
      ...tile,
      value: tileShouldBeSelected(tile.key),
      tags: [
        inUniversalGroup(tile.key) ? { label: 'Universal', color: 'info' } : null,
        inCharacterGroup(tile.key) ? { label: this.characterName(), color: 'primary' } : null,
      ].filter((tag): tag is { label: string; color: string } => tag !== null),
    }));
  });

  readonly hasGameGroups = computed(() => Object.keys(this.universalGroups()).length > 0);
  readonly hasCharacterGroups = computed(() => Object.keys(this.characterGroups()).length > 0);
  readonly gameGroupNames = computed(() => Object.keys(this.universalGroups()));
  readonly characterGroupNames = computed(() => Object.keys(this.characterGroups()));

  /**
   * True when editing a named parent cancel group (name input visible, cancel window hidden).
   * False when editing phase-level cancel rules (cancel window visible, name input hidden).
   */
  readonly isParentGroupMode = computed(() => this.includeName());

  // ── Helpers ───────────────────────────────────────────────────────────────

  onSave(): void {
    this.save.emit({
      name: this.groupName().trim() || undefined,
      universalGroups: Array.from(this.selectedUniversalGroups()),
      characterGroups: Array.from(this.selectedCharacterGroups()),
      overrides: { ...this.selectedOverrides() },
      moveList: this.activeMoveList()
        .filter(tile => tile.value === true)
        .map(tile => tile.key),
      cancelWindowStart: this.isParentGroupMode() ? undefined : this.cancelWindowStart(),
      cancelWindowEnd: this.isParentGroupMode() ? undefined : this.cancelWindowEnd(),
    });
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onUniversalGroupChange(groupName: string, isChecked: boolean): void {
    const updated = new Set(this.selectedUniversalGroups());
    isChecked ? updated.add(groupName) : updated.delete(groupName);
    this.selectedUniversalGroups.set(updated);

    // When adding a group, clear any false overrides for its moves so the group
    // is purely additive — existing manual deselections don't block new group inclusion.
    if (isChecked) {
      this._clearFalseOverridesFor(this.universalGroups()[groupName] ?? []);
    }
  }

  onCharacterGroupChange(groupName: string, isChecked: boolean): void {
    const updated = new Set(this.selectedCharacterGroups());
    isChecked ? updated.add(groupName) : updated.delete(groupName);
    this.selectedCharacterGroups.set(updated);

    if (isChecked) {
      this._clearFalseOverridesFor(this.characterGroups()[groupName] ?? []);
    }
  }

  private _clearFalseOverridesFor(keys: string[]): void {
    const current = this.selectedOverrides();
    const hasFalse = keys.some(k => current[k] === false);
    if (!hasFalse) return;
    const updated = { ...current };
    keys.forEach(k => { if (updated[k] === false) delete updated[k]; });
    this.selectedOverrides.set(updated);
  }

  startRename(groupName: string): void {
    this.renamingGroup.set(groupName);
    this.renameValue.set(groupName);
  }

  commitRename(oldName: string): void {
    const newName = this.renameValue().trim();
    if (newName && newName !== oldName) {
      this.renameGroup.emit({ oldName, newName });
    }
    this.renamingGroup.set(null);
  }

  cancelRename(): void {
    this.renamingGroup.set(null);
  }

  onDeleteGroup(groupName: string): void {
    this.deleteGroup.emit({ groupName });
  }

  onTileUpdate({ tile }: { tile: Tile; selection: string[] }): void {
    const updated = { ...this.selectedOverrides() };
    updated[tile.key] = tile.value === true;
    this.selectedOverrides.set(updated);
  }
}
