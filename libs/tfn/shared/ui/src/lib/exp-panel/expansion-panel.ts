import { booleanAttribute, Component, computed, input } from '@angular/core';

@Component({
  selector: 'tfn-expansion-panel',
  host: {
    '[class.exp-panel-host--subsection]': 'subsection()',
  },
  imports: [],
  templateUrl: './expansion-panel.html',
  styleUrl: './expansion-panel.css',
})
export class ExpansionPanel {
  readonly secondary = input(false, { transform: booleanAttribute });
  readonly subsection = input(false, { transform: booleanAttribute });
  readonly header = input.required<string>();
  readonly subheader = input<string>();
  readonly headingLevel = computed(() =>
    this.secondary() || this.subsection() ? 5 : 4
  );
}
