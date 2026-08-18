import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Tile, TileChoice } from './tile-grid.models';

// Re-export types for backwards compatibility
export type { Tile, TileChoice } from './tile-grid.models';

/**
 * TileGridComponent - Unified tile grid display and interaction component.
 *
 * Supports four distinct interaction modes:
 * 1. PASSIVE MODE (no value, no choices): Tile emits itself on click
 * 2. TOGGLE MODE (value: boolean): Clicking toggles true/false, emits single Tile
 * 3. CHOICE MENU MODE (choices defined): Clicking shows menu, selecting a choice sets value and emits Tile
 * 4. SELECTION MODE (maxSelections defined): Multiple tiles can be selected with a count limit
 *
 * Dark-themed styling matching the sequence editor with support for choice colors and metadata tags.
 */
@Component({
  selector: 'tfn-tile-grid',
  templateUrl: './tile-grid.html',
  styleUrls: ['./tile-grid.css'],
  standalone: true,
  imports: [CommonModule],
})
export class TileGridComponent {
  /** Array of tiles to display in the grid */
  @Input() tiles: Tile[] = [];

  /**
   * Currently selected tiles (selection mode only).
   * When maxSelections is provided, this tracks which tiles the user has selected.
   * Parent must provide this input to enable selection mode.
   */
  @Input() selections: Tile[] = [];

  /**
   * Maximum number of tiles that can be selected simultaneously.
   * When undefined: Normal interaction mode (toggle/choice/passive per tile).
   * When defined: Selection mode is active - tiles can only be added until limit reached,
   *               then only deselection is allowed. Emits selections array instead of single Tile.
   */
  @Input() maxSelections?: number;

  /**
   * Emits on tile interaction.
   * Type depends on maxSelections:
   * - Without maxSelections: Emits single Tile (possibly modified)
   * - With maxSelections: Emits Tile[] (the updated selections array)
   */
  @Output() update = new EventEmitter<Tile | Tile[]>();

  /** Signal tracking which tile's choice menu is currently open (by tile.key) */
  readonly openMenuKey = signal<string | null>(null);

  /**
   * Checks if a tile is currently selected (selection mode only).
   * Used when maxSelections is provided to track selections.
   */
  isSelected(tile: Tile): boolean {
    return this.selections.some(s => s.key === tile.key);
  }

  /**
   * Determines if a tile should be disabled (grayed out, unclickable).
   * - Selection mode: Disabled when max selections reached AND tile not already selected
   * - Normal mode: Never disabled
   */
  isDisabled(tile: Tile): boolean {
    if (this.maxSelections === undefined) return false;
    return this.selections.length >= this.maxSelections && !this.isSelected(tile);
  }

  /**
   * Main tile click handler - routes to appropriate interaction mode.
   *
   * Selection Mode (maxSelections defined):
   * - If below limit: Add tile to selections and emit selections array
   * - If at limit and tile selected: Remove from selections and emit
   * - If at limit and tile not selected: Do nothing (no emit)
   *
   * Normal Modes (no maxSelections):
   * - If choices defined: Open choice menu
   * - If value is boolean: Toggle value and emit tile
   * - Otherwise (passive): Just emit tile
   */
  onTileClick(tile: Tile): void {
    if (this.maxSelections !== undefined) {
      if (this.isSelected(tile)) {
        // Tile already selected — remove it
        this.selections = this.selections.filter(s => s.key !== tile.key);
        this.update.emit(this.selections);
      } else if (this.selections.length < this.maxSelections) {
        // Below limit and not selected — add it
        this.selections = [...this.selections, tile];
        this.update.emit(this.selections);
      }
      // else: at limit and not selected — do nothing
    } else {
      // Normal tile interaction mode
      if (tile.choices) {
        // Choice menu mode
        this.openMenuKey.set(tile.key);
      } else if (typeof tile.value === 'boolean') {
        // Toggle mode
        tile.value = !tile.value;
        this.update.emit(tile);
      } else {
        // Passive mode
        this.update.emit(tile);
      }
    }
  }

  /**
   * Handles selection of a choice from the choice menu.
   * Sets tile.value to the selected TileChoice and closes the menu.
   */
  onChoiceSelected(tile: Tile, choiceKey: string): void {
    tile.value = tile.choices?.[choiceKey];
    this.openMenuKey.set(null);
    this.update.emit(tile);
  }

  /** Checks if the choice menu for a given tile is currently open */
  isMenuOpen(tileKey: string): boolean {
    return this.openMenuKey() === tileKey;
  }

  /**
   * Returns the 1-based selection position for a tile (selection mode).
   * Returns null if the tile is not selected.
   */
  selectionPosition(tile: Tile): number | null {
    const index = this.selections.findIndex(s => s.key === tile.key);
    return index === -1 ? null : index + 1;
  }

  /** Returns array of [key, TileChoice] entries from tile.choices for template iteration */
  getChoiceEntries(tile: Tile): Array<[string, TileChoice]> {
    return Object.entries(tile.choices ?? {});
  }

  /**
   * Extracts the display label from a selected choice.
   * Returns null if value is not a TileChoice (boolean or undefined).
   * The label is displayed as a tag on the tile.
   */
  getSelectedChoiceLabel(tile: Tile): string | null {
    if (tile.value && typeof tile.value === 'object' && 'label' in tile.value) {
      return (tile.value as TileChoice).label;
    }
    return null;
  }

  /**
   * Extracts the color property from a selected choice.
   * Used to apply color styling to both the choice label tag and tile background.
   * Returns undefined if value is not a TileChoice or has no color property.
   */
  getChoiceColor(tile: Tile): string | undefined {
    if (tile.value && typeof tile.value === 'object' && 'color' in tile.value) {
      return (tile.value as TileChoice).color;
    }
    return undefined;
  }
}

