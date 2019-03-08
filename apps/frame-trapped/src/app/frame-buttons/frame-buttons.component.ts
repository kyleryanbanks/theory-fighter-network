import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'ft-frame-buttons',
  template: `
    <img *ngIf="buttons.LP" src="assets/LightPunch.png" />
    <img *ngIf="buttons.HP" src="assets/HeavyPunch.png" />
    <img *ngIf="buttons.LK" src="assets/LightKick.png" />
    <img *ngIf="buttons.HK" src="assets/HeavyKick.png" />
    <img *ngIf="buttons.TAG" src="assets/Tag.png" />
    <img *ngIf="buttons.STONE" src="assets/Surge.png" />
  `,

  styles: [
    `
      img {
        height: 36px;
        width: auto;
      }
    `
  ]
})
export class FrameButtonsComponent implements OnInit {
  @Input() buttons: any;

  constructor() {}

  ngOnInit() {}
}
