import { Component, input } from '@angular/core';
import type { EntityMetadata } from '@theory-fighter-network/data';
import { EntityMetadataView } from '../entity-metadata/entity-metadata';
import { ExpansionPanel } from '../exp-panel/expansion-panel';
import { TfnLink } from '../link/link';

@Component({
  selector: 'tfn-entity-detail-shell',
  imports: [EntityMetadataView, ExpansionPanel, TfnLink],
  templateUrl: './entity-detail-shell.html',
  styleUrl: './entity-detail-shell.css',
})
export class EntityDetailShell {
  readonly title = input.required<string>();
  readonly entityKey = input.required<string>();
  readonly backLabel = input.required<string>();
  readonly backLink = input<readonly unknown[] | string>('');
  readonly metadata = input.required<EntityMetadata>();
}