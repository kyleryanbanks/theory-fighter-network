import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Tile, TileChoice, TileUpdate } from './tile-grid.models';

export type { Tile, TileChoice, TileUpdate } from './tile-grid.models';

/**
 * TileGridComponent - Unified tile grid display and interaction component.
 *
 * Supports four interaction modes. All emit `TileUpdate { tile, selection }` via `(update)`:
 * 1. PASSIVE: emits clicked tile, selection is []
 * 2. TOGGLE (value: boolean): toggles value; selection = keys of all true tiles
 * 3. CHOICE MENU: sets tile.value to chosen TileChoice; selection is []
 * 4. SELECTION (maxSelections): selection = keys of all currently selected tiles
 */
@Component({
  selector: 'tfn-tile-grid',
  templateUrl: './tile-grid.html',
  styleUrls: ['./tile-grid.css'],
  standalone: true,
  imports: [CommonModule],
})
export class TileGridComponent {
  @Input() tiles: Tile[] = [];
  @Input() selections: Tile[] = [];
  @Input() maxSelections?: number;

  @Output() update = new EventEmitter<TileUpdate>();

  readonly openMenuKey = signal<string | null>(null);

  isSelected(tile: Tile): boolean {
    return this.selections.some(s => s.key === tile.key);
  }

  isDisabled(tile: Tile): boolean {
    if (this.maxSelections === undefined) return false;
    return this.selections.length >= this.maxSelections && !this.isSelected(tile);
  }

  onTileClick(tile: Tile): void {
    if (this.maxSelections !== undefined) {
      if (this.isSelected(tile)) {
        this.selections = this.selections.filter(s => s.key !== tile.key);
        this.update.emit({ tile, selection: this.selections.map(s => s.key) });
      } else if (this.selections.length < this.maxSelections) {
        this.selections = [...this.selections, tile];
        this.update.emit({ tile, selection: this.selections.map(s => s.key) });
      }
    } else if (tile.choices) {
      this.openMenuKey.set(tile.key);
    } else if (typeof tile.value === 'boolean') {
      tile.value = !tile.value;
      this.update.emit({
        tile,
        selection: this.tiles.filter(t => t.value === true).map(t => t.key),
      });
    } else {
      this.update.emit({ tile, selection: [] });
    }
  }

  onChoiceSelected(tile: Tile, choiceKey: string): void {
    tile.value = tile.choices?.[choiceKey];
    this.openMenuKey.set(null);
    this.update.emit({ tile, selection: [] });
  }

  isMenuOpen(tileKey: string): boolean {
    return this.openMenuKey() === tileKey;
  }

  selectionPosition(tile: Tile): number | null {
    const index = this.selections.findIndex(s => s.key === tile.key);
    return index === -1 ? null : index + 1;
  }

  getChoiceEntries(tile: Tile): Array<[string, TileChoice]> {
    return Object.entries(tile.choices ?? {});
  }

  getSelectedChoiceLabel(tile: Tile): string | null {
    if (tile.value && typeof tile.value === 'object' && 'label' in tile.value) {
      return (tile.value as TileChoice).label;
    }
    return null;
  }

  getChoiceColor(tile: Tile): string | undefined {
    if (tile.value && typeof tile.value === 'object' && 'color' in tile.value) {
      return (tile.value as TileChoice).color;
    }
    return undefined;
  }
}
