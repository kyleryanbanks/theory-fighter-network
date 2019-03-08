import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'ft-frame-direction',
  template: `
    <img
      *ngIf="direction !== null"
      src="assets/Arrow.png"
      [style.transform]="'rotate(' + direction * 45 + 'deg)'"
    />
  `,
  styles: [
    `
      img {
        height: 36px;
        width: auto;
        margin-right: 10px;
      }
    `
  ]
})
export class FrameDirectionComponent implements OnInit {
  @Input() direction;

  constructor() {}

  ngOnInit() {}
}
