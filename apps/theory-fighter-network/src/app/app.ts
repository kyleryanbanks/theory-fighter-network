import { Component } from '@angular/core';
import { AppShell } from '@tfn/app-shell/feature';

@Component({
  imports: [AppShell],
  selector: 'tfn-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class TheoryFighterNetwork {}
