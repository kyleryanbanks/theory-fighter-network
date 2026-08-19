import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { StateDocument, StateModel } from '@theory-fighter-network/data';
import { DeleteButton } from '../delete-button/delete-button';
import { ExpansionPanel } from '../exp-panel/expansion-panel';

@Component({
  selector: 'tfn-game-state-manager',
  imports: [DeleteButton, ExpansionPanel, MatButtonModule],
  templateUrl: './game-state-manager.html',
  styleUrl: './game-state-manager.css',
})
export class GameStateManagerComponent {
  readonly stateModel = input<StateModel>({});
  readonly header = input('Game States');
  readonly subheader = input<string>();

  readonly addState = output<void>();
  readonly deleteState = output<{ category: string; semanticKey: string }>();

  stateCategories(): Array<{ category: string; states: StateDocument[] }> {
    return Object.entries(this.stateModel())
      .map(([category, states]) => ({
        category,
        states: Object.values(states).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter(({ states }) => states.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  stateSummary(state: StateDocument): string {
    if (state.min !== undefined || state.max !== undefined) {
      const min = state.min ?? '';
      const max = state.max ?? '';
      const unit = state.unit ? ` ${state.unit}` : '';
      return `${min} - ${max}${unit}`.trim();
    }
    return 'Boolean';
  }

  onDeleteState(category: string, semanticKey: string): void {
    this.deleteState.emit({ category, semanticKey });
  }
}
