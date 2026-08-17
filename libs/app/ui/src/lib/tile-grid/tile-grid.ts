import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface TileChoice {
  label: string;
  value: any;
  color?: string;
}

export interface Tile {
  key: string;
  label: string;
  selected?: boolean;
  choices?: Record<string, TileChoice>;
  selectedChoiceValue?: any;
}

@Component({
  selector: 'tfn-tile-grid',
  templateUrl: './tile-grid.html',
  styleUrls: ['./tile-grid.css'],
  standalone: true,
  imports: [CommonModule],
})
export class TileGridComponent {
  @Input() tiles: Tile[] = [];
  @Output() update = new EventEmitter<Tile>();

  readonly openMenuKey = signal<string | null>(null);

  onTileClick(tile: Tile): void {
    if (tile.choices) {
      this.openMenuKey.set(tile.key);
    } else if ('selected' in tile) {
      tile.selected = !tile.selected;
      this.update.emit(tile);
    } else {
      this.update.emit(tile);
    }
  }

  onChoiceSelected(tile: Tile, choiceKey: string): void {
    tile.selectedChoiceValue = tile.choices?.[choiceKey]?.value;
    this.openMenuKey.set(null);
    this.update.emit(tile);
  }

  isMenuOpen(tileKey: string): boolean {
    return this.openMenuKey() === tileKey;
  }

  getChoiceEntries(tile: Tile): Array<[string, TileChoice]> {
    return Object.entries(tile.choices ?? {});
  }
}
