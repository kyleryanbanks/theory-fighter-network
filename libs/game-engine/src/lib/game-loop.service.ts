import { Observable, of, fromEvent } from 'rxjs';
import {
  expand,
  filter,
  map,
  share,
  switchMap,
  takeUntil,
  tap
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

  connected$ = fromEvent<GamepadEvent>(window, 'gamepadconnected');
  disconnected$ = fromEvent<GamepadEvent>(window, 'gamepaddisconnected');

  getButtonsPerFrames() {
    return this.connected$.pipe(
      tap(console.log),
      map(event => event.gamepad.index),
      switchMap((id: number) => {
        return this.getFrames().pipe(
          map(() => {
            const pad = navigator.getGamepads()[id];
            const buttons = pad.buttons.reduce((buttons, button, index) => {
              buttons[index] = button.pressed;
              return buttons;
            }, {});

            const axes = pad.axes.reduce((axes, axis, index) => {
              axes[index] = axis;
              return axes;
            }, {});

            return {
              buttons,
              axes
            };
          }),
          takeUntil(this.disconnected$)
        );
      })
    );
  }
}
