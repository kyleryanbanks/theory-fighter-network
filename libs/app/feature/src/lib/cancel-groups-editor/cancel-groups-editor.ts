import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { TileGridComponent, Tile } from '@theory-fighter-network/ui';
import { DeleteButton } from '@theory-fighter-network/ui';

interface CancelGroup {
  name: string;
  moveKeys: string[];
}

@Component({
  selector: 'tfn-cancel-groups-editor',
  templateUrl: './cancel-groups-editor.html',
  styleUrls: ['./cancel-groups-editor.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, TileGridComponent, DeleteButton],
})
export class CancelGroupsEditorComponent {
  @Input() scope: 'game' | 'character' = 'game';
  @Input() scopeKey: string = '';

  private readonly facade = inject(LocalGuideFacadeStore);

  readonly editingGroupName = signal<string | null>(null);
  readonly renamingGroupName = signal<string | null>(null);
  readonly newGroupName = signal('');
  readonly isCreatingGroup = signal(false);
  private readonly editedMoveKeys = signal<Set<string>>(new Set());

  readonly cancelGroups = computed(() => {
    const guide = this.facade.guide();
    if (!guide) return [];

    if (this.scope === 'game') {
      return Object.entries(guide.entities.game.universal.cancelGroups ?? {}).map(
        ([name, moveKeys]) => ({ name, moveKeys })
      );
    } else {
      const character = guide.entities.characters.find((c) => c.semanticKey === this.scopeKey);
      return Object.entries(character?.cancelGroups ?? {}).map(([name, moveKeys]) => ({
        name,
        moveKeys,
      }));
    }
  });

  readonly availableMoves = computed(() => {
    const guide = this.facade.guide();
    return guide?.entities.moves ?? [];
  });

  readonly moveTiles = computed(() => {
    return this.availableMoves().map((move) => ({
      key: move.semanticKey,
      label: move.name,
      value: this.editedMoveKeys().has(move.semanticKey),
    }));
  });

  onEditGroup(groupName: string): void {
    const group = this.cancelGroups().find((g) => g.name === groupName);
    if (group) {
      this.editingGroupName.set(groupName);
      this.editedMoveKeys.set(new Set(group.moveKeys));
    }
  }

  onCancelEdit(): void {
    this.editingGroupName.set(null);
    this.editedMoveKeys.set(new Set());
  }

  onSaveGroup(): void {
    const groupName = this.editingGroupName();
    if (groupName) {
      this.facade.updateCancelGroupMoveKeys({
        scopeKey: this.scope === 'character' ? this.scopeKey : '',
        isGameLevel: this.scope === 'game',
        groupName,
        moveKeys: Array.from(this.editedMoveKeys()),
      });
      this.editingGroupName.set(null);
      this.editedMoveKeys.set(new Set());
    }
  }

  onStartRename(groupName: string): void {
    this.renamingGroupName.set(groupName);
    this.newGroupName.set(groupName);
  }

  onCancelRename(): void {
    this.renamingGroupName.set(null);
    this.newGroupName.set('');
  }

  async onConfirmRename(): Promise<void> {
    const oldName = this.renamingGroupName();
    const newName = this.newGroupName().trim();
    if (oldName && newName && oldName !== newName) {
      await this.facade.renameCancelGroup({
        scopeKey: this.scope === 'character' ? this.scopeKey : '',
        isGameLevel: this.scope === 'game',
        oldName,
        newName,
      });
      this.renamingGroupName.set(null);
      this.newGroupName.set('');
    }
  }

  async onDeleteGroup(groupName: string): Promise<void> {
    await this.facade.deleteCancelGroup({
      scopeKey: this.scope === 'character' ? this.scopeKey : '',
      isGameLevel: this.scope === 'game',
      groupName,
    });
  }

  onStartCreate(): void {
    this.isCreatingGroup.set(true);
    this.newGroupName.set('');
  }

  onCancelCreate(): void {
    this.isCreatingGroup.set(false);
    this.newGroupName.set('');
  }

  async onConfirmCreate(): Promise<void> {
    const name = this.newGroupName().trim();
    if (name) {
      await this.facade.createCancelGroup({
        scopeKey: this.scope === 'character' ? this.scopeKey : '',
        isGameLevel: this.scope === 'game',
        groupName: name,
        moveKeys: [],
      });
      this.isCreatingGroup.set(false);
      this.newGroupName.set('');
    }
  }

  onTileUpdate(tile: Tile | Tile[]): void {
    if (Array.isArray(tile)) {
      // selections array from maxSelections mode - not used here
      return;
    }
    if (tile.value === true) {
      this.editedMoveKeys().add(tile.key);
    } else if (tile.value === false) {
      this.editedMoveKeys().delete(tile.key);
    }
    this.editedMoveKeys.set(new Set(this.editedMoveKeys()));
  }

  isEditing(groupName: string): boolean {
    return this.editingGroupName() === groupName;
  }

  isRenaming(groupName: string): boolean {
    return this.renamingGroupName() === groupName;
  }

  isCreating(): boolean {
    return this.isCreatingGroup();
  }
}
