import { booleanAttribute, Component, Directive, input } from '@angular/core';

@Directive({
  selector: '[tfnExpansionPanelSummary]',
})
export class ExpansionPanelSummary {}

@Component({
  selector: 'tfn-expansion-panel',
  imports: [],
  templateUrl: './exp-panel.html',
  styleUrl: './exp-panel.css',
})
export class ExpansionPanel {
  readonly secondary = input(false, { transform: booleanAttribute });
}
