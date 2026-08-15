import { Component, effect, inject, signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';

@Component({
  selector: 'tfn-game-root',
  templateUrl: './game-root.html',
  styleUrl: './game-root.css',
})
export class GameRoot {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly gameName = signal('Theory Fighter Network');
  readonly gameVersion = signal('1.0.0');
  readonly frameRate = signal(60);
  readonly is3d = signal(false);
  readonly teamSize = signal(1);

  constructor() {
    effect(() => {
      const game = this.facade.workspace()?.entities.game;
      if (!game) {
        return;
      }

      this.gameName.set(game.name);
      this.gameVersion.set(game.version);
      this.frameRate.set(game.frameRate ?? 60);
      this.is3d.set(game.is3d);
      this.teamSize.set(game.teamSize);
    });
  }

  async createWorkspace(): Promise<void> {
    await this.facade.createWorkspace({
      name: this.gameName(),
      version: this.gameVersion(),
      frameRate: this.frameRate(),
      is3d: this.is3d(),
      teamSize: this.teamSize(),
      inputs: { directions: [], buttons: [] },
    });
  }

  async updateActiveGame(): Promise<void> {
    await this.facade.updateActiveGame({
      frameRate: this.frameRate(),
      is3d: this.is3d(),
      teamSize: this.teamSize(),
    });
  }

  updateGameName(event: Event): void {
    this.gameName.set(getInputValue(event));
  }

  updateGameVersion(event: Event): void {
    this.gameVersion.set(getInputValue(event));
  }

  updateFrameRate(event: Event): void {
    this.frameRate.set(Number(getInputValue(event)));
  }

  updateTeamSize(event: Event): void {
    this.teamSize.set(Number(getInputValue(event)));
  }

  updateIs3d(event: Event): void {
    this.is3d.set((event.target as HTMLInputElement).checked);
  }
}

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}