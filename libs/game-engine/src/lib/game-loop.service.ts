import { Observable, of, fromEvent, combineLatest } from 'rxjs';
import {
  expand,
  filter,
  map,
  share,
  switchMap,
  takeUntil,
  tap,
  distinctUntilChanged,
  scan
} from 'rxjs/operators';
import { Injectable } from '@angular/core';

export interface IFrameData {
  frameStartTime: number;
  deltaTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameLoopService {
  connected$ = fromEvent<GamepadEvent>(window, 'gamepadconnected');
  disconnected$ = fromEvent<GamepadEvent>(window, 'gamepaddisconnected');

  calculateStep: (prevFrame: IFrameData) => Observable<IFrameData> = (
    prevFrame: IFrameData
  ) => {
    return Observable.create(observer => {
      requestAnimationFrame(frameStartTime => {
        // Millis to seconds
        const deltaTime = prevFrame
          ? (frameStartTime - prevFrame.frameStartTime) / 1000
          : 0;
        observer.next({
          frameStartTime,
          deltaTime
        });
      });
    }).pipe(
      map((frame: IFrameData) => {
        if (frame.deltaTime > 1 / 60) {
          frame.deltaTime = 1 / 60;
        }
        return frame;
      })
    );
  };

  getFrames() {
    return of(undefined).pipe(
      expand(val => this.calculateStep(val)),
      // Expand emits the first value provided to it, and in this
      //  case we just want to ignore the undefined input frame
      filter(frame => frame !== undefined),
      map((frame: IFrameData) => frame.deltaTime),
      share()
    );
  }

  getButtonsPerFrames() {
    return this.connected$.pipe(
      tap(console.log),
      map(event => event.gamepad.index),
      switchMap((id: number) => {
        return this.getFrames().pipe(
          map(() => {
            const pad = navigator.getGamepads()[id];
            return pad.buttons.reduce((buttons, button, index) => {
              buttons[index] = button.pressed;
              return buttons;
            }, {});
          }),
          distinctUntilChanged(),
          takeUntil(this.disconnected$)
        );
      })
    );
  }

  getMappedButtons() {
    return this.getButtonsPerFrames().pipe(
      map(buttons => {
        return {
          TAG: buttons['2'],
          LP: buttons['3'],
          HP: buttons['5'],
          STONE: buttons['4'],
          LK: buttons['0'],
          HK: buttons['7']
        };
      })
    );
  }

  getDirection(): Observable<number | null> {
    return this.getButtonsPerFrames().pipe(
      map(buttons => {
        const UP: boolean = buttons['12'];
        const DOWN: boolean = buttons['13'];
        const LEFT: boolean = buttons['14'];
        const RIGHT: boolean = buttons['15'];

        if (UP && !RIGHT && !LEFT) {
          return 0;
        } else if (UP && RIGHT) {
          return 1;
        } else if (RIGHT && !UP && !DOWN) {
          return 2;
        } else if (DOWN && RIGHT) {
          return 3;
        } else if (DOWN && !RIGHT && !LEFT) {
          return 4;
        } else if (DOWN && LEFT) {
          return 5;
        } else if (LEFT && !UP && !DOWN) {
          return 6;
        } else if (UP && LEFT) {
          return 7;
        } else {
          return null;
        }
      })
    );
  }

  getInputs() {
    return combineLatest(this.getDirection(), this.getMappedButtons()).pipe(
      distinctUntilChanged((prev, next) => {
        console.log(prev, next);
        return prev === next;
      }),
      scan((acc, [direction, buttons]) => [...acc, { direction, buttons }], [])
    );
  }
}
