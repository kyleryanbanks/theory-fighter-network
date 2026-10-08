import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterOutlet } from '@angular/router';
import { GuideNav } from '@tfn/app-shell/ui';
import { FindingDialog } from '../finding-dialog/finding-dialog';

@Component({
  selector: 'tfn-guide-shell',
  imports: [MatButtonModule, MatDialogModule, RouterOutlet, GuideNav],
  templateUrl: './guide-shell.html',
  styleUrl: './guide-shell.css',
})
export class GuideShell {
  private readonly dialog = inject(MatDialog);

  openFindingDialog(): void {
    this.dialog.open(FindingDialog, {
      ariaLabel: 'Add a finding',
      width: 'min(34rem, calc(100vw - 2rem))',
    });
  }
}
