import { Component, OnInit } from '@angular/core';
import { GameLoopService } from '@tfn/game-engine';
import { Observable } from 'rxjs';

@Component({
  selector: 'ft-frame-view',
  template: `
    {{ buttons$ | async | json }}
  `,
  styles: []
})
export class FrameViewComponent implements OnInit {
  buttons$: Observable<any>;
  frames$: any;

  constructor(private gameLoop: GameLoopService) {
    this.buttons$ = this.gameLoop.getButtonsPerFrames();
  }

  ngOnInit() {}
}
