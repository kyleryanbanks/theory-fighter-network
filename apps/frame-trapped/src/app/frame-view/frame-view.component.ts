import { Component, OnInit } from '@angular/core';
import { GameLoopService } from '@tfn/game-engine';
import { Observable } from 'rxjs';

@Component({
  selector: 'ft-frame-view',
  template: `
    <div>{{ buttons$ | async | json }}</div>
    <div>
      <ft-frame-direction [direction]="direction$ | async"></ft-frame-direction>
      <ft-frame-buttons [buttons]="buttons$ | async"></ft-frame-buttons>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
    `
  ]
})
export class FrameViewComponent implements OnInit {
  buttons$: Observable<any>;
  direction$: Observable<any>;
  frames$: any;

  constructor(private gameLoop: GameLoopService) {
    this.buttons$ = this.gameLoop.getMappedButtons();
    this.direction$ = this.gameLoop.getDirection();
    this.frames$ = this.gameLoop.getInputs();
  }

  ngOnInit() {}
}
