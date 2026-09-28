import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GuideProgressStore, LocalGuideFacadeStore } from '@tfn/app-shell/data';
import { ProgressMeter, TodoQuickAdd } from '@tfn/shared/ui';

@Component({
  selector: 'tfn-guide-home',
  imports: [ProgressMeter, RouterLink, TodoQuickAdd],
  templateUrl: './guide-home.html',
  styleUrl: './guide-home.css',
})
export class GuideHome {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly progress = inject(GuideProgressStore);
}
