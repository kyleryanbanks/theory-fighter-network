import { booleanAttribute, Component, computed, effect, inject, input, linkedSignal, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LocalGuideFacadeStore, MoveDocument } from '@theory-fighter-network/data';
import { TileGridComponent, Tile, ExpansionPanel } from '@theory-fighter-network/ui';

/**
 * CancelGroupsEditor - Displays and edits cancel group selections at game, character, or phase level.
 *
 * Component is presentation-only; parent handles persistence via facade.
 * Uses dual-track model: selectedGameGroups + selectedCharacterGroups + userOverrideMoves.
 * When user checks a group, removes any force-ON overrides for moves that group provides.
 */
@Component({
  selector: 'tfn-cancel-groups-editor',
  templateUrl: './cancel-groups-editor.html',
  styleUrls: ['./cancel-groups-editor.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, TileGridComponent, ExpansionPanel],
})
export class CancelGroupsEditorComponent {

  // Inputs
  readonly characterName = input<string>('');
  readonly includeName = input(false, { transform: booleanAttribute });
  readonly groupName = signal('');

  readonly phaseStartFrame = input<number | undefined>(undefined);
  readonly cancelWindowStart = signal<number | null>(null);
  readonly cancelWindowEnd = signal<number | null>(null);

  readonly universalGroups = input<Record<string, string[]>>({});
  readonly overrideUniversalGroups = input<Set<string>>(new Set());
  readonly selectedUniversalGroups = linkedSignal(() => this.overrideUniversalGroups());

  readonly characterGroups = input<Record<string, string[]>>({});
  readonly overrideCharacterGroups = input<Set<string>>(new Set());
  readonly selectedCharacterGroups = linkedSignal(() => this.overrideCharacterGroups());

  readonly moveList = input<Tile[]>([]);
  readonly overrides = input<Set<string>>(new Set()); // move keys that have been toggled on/off by the user

  // Outputs
  readonly cancelRuleChange = output<{
    name?: string;
    universalGroups?: string[];
    characterGroups?: string[];
    overrides: string[];
  }>();

  // Computed: Merged list of moves from selected groups with overrides applied
  readonly activeMoveList = computed(() => {

    const tileShouldBeSelected = (key: string): boolean => {
      const fromGroup = this.selectedUniversalGroups().has(key) || this.selectedCharacterGroups().has(key);
      const inOverrides = this.overrides().has(key);
    
      return fromGroup && !inOverrides || inOverrides;
    };

    this.moveList().map(tile => ({
      ...tile,
      value: tileShouldBeSelected(tile.key),
      tags: [
        this.selectedUniversalGroups().has(tile.key) ? { label: 'Universal', color: 'info' } : null,
        this.selectedCharacterGroups().has(tile.key) ? { label: this.characterName(), color: 'primary' } : null,
      ].filter(tag => tag !== null),
    }));})


  // Handle game group checkbox changes
  onUniversalGroupChange(groupName: string, isChecked: boolean): void {
    const updated = new Set(this.selectedUniversalGroups());

    if  (isChecked) {
      updated.add(groupName);
    } else {
      updated.delete(groupName);
    }

    this.selectedUniversalGroups.set(updated);

    this.cancelRuleChange.emit({
      name: this.groupName().trim() || undefined,
      universalGroups: Array.from(updated),
      characterGroups: Array.from(this.selectedCharacterGroups()),
      overrides: Array.from(this.overrides()),
    });
  }

    // Handle game group checkbox changes
  onCharacterGroupChange(groupName: string, isChecked: boolean): void {
    const updated = new Set(this.selectedCharacterGroups());

    if  (isChecked) {
      updated.add(groupName);
    } else {
      updated.delete(groupName);
    }
    
    this.selectedCharacterGroups.set(updated);

    this.cancelRuleChange.emit({
      name: this.groupName().trim() || undefined,
      universalGroups: Array.from(this.selectedUniversalGroups()),
      characterGroups: Array.from(updated),
      overrides: Array.from(this.overrides()),
    });
  }

  // Handle tile grid updates
  onTileUpdate(tile: Tile): void {
    this.overrides().has(tile.key) ? this.overrides().delete(tile.key) : this.overrides().add(tile.key);

    this.cancelRuleChange.emit({
      name: this.groupName().trim() || undefined,
      universalGroups: Array.from(this.selectedUniversalGroups()),
      characterGroups: Array.from(this.selectedCharacterGroups()),
      overrides: Array.from(this.overrides()),
    });
  }

  // Computed: Check if any game groups are available
  readonly hasGameGroups = computed(() => Object.keys(this.universalGroups()).length > 0);

  // Computed: Check if any character groups are available
  readonly hasCharacterGroups = computed(() => Object.keys(this.characterGroups()).length > 0);

  // Helper: Get array of game group names
  readonly gameGroupNames = computed(() => Object.keys(this.universalGroups()));

  // Helper: Get array of character group names
  readonly characterGroupNames = computed(() => Object.keys(this.characterGroups()));

  /**
   * True when editing a named parent cancel group (name input visible, cancel window hidden).
   * False when editing phase-level cancel rules (cancel window visible, name input hidden).
   */
  readonly isParentGroupMode = computed(() => this.includeName());
}
