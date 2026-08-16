import { Component, input } from '@angular/core';
import type { EntityMetadata } from '@theory-fighter-network/data';

@Component({
  selector: 'tfn-entity-metadata',
  imports: [],
  templateUrl: './entity-metadata.html',
  styleUrl: './entity-metadata.css',
})
export class EntityMetadataView {
  readonly metadata = input<EntityMetadata>();

  displayDate(value: Date | undefined): string {
    return value ? value.toLocaleString() : 'Not available';
  }
}
