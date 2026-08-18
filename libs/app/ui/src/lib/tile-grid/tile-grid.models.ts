/**
 * Represents a single option within a tile's choice menu.
 * Used when a tile presents multiple selectable options to the user.
 */
export interface TileChoice {
  /** Display label for the choice option */
  label: string;
  /** Underlying value associated with this choice (any type) */
  value: any;
  /** Optional CSS class name for styling (e.g., 'success', 'danger', 'warning') */
  color?: string;
}

/**
 * Represents a single interactive tile in the grid.
 * Supports multiple interaction modes: passive, toggle, and choice menu.
 */
export interface Tile {
  /** Unique identifier for the tile */
  key: string;
  /** Display label shown on the tile */
  label: string;
  /**
   * Menu of choices available for this tile.
   * When provided, clicking the tile shows a dropdown menu.
   * The user selects one choice, which sets the tile.value to the selected TileChoice.
   */
  choices?: Record<string, TileChoice>;
  /**
   * The current state/value of the tile.
   * Three modes based on type:
   * - undefined: Passive mode (tile emits on click but has no state)
   * - boolean: Toggle mode (true=selected, false=unselected; clicking toggles)
   * - TileChoice: Selected choice mode (shows the choice label as a tag on the tile)
   */
  value?: boolean | TileChoice;
  /**
   * Parent-provided metadata tags displayed on the tile.
   * Read-only display only; does not affect selection behavior.
   * Example: [{ label: 'Universal' }, { label: 'Character' }]
   */
  tags?: {
    label: string;
    color?: string;
  }[];
}
