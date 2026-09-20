import {
  Component
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GuideNav } from '@tfn/app-shell/ui';

@Component({
  selector: 'tfn-guide-shell',
  imports: [RouterOutlet, GuideNav],
  templateUrl: './guide-shell.html',
  styleUrl: './guide-shell.css',
})
export class GuideShell { }