import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tfn-link',
  imports: [MatButtonModule, RouterLink],
  template: '<a matButton="outlined" class="tfn-link" [routerLink]="routerLink()"><ng-content /></a>',
  styleUrl: './link.css',
})
export class TfnLink {
  readonly routerLink = input<readonly unknown[] | string>('');
}
