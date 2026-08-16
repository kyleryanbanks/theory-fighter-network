import { Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { EntityMetadataView, ExpansionPanel } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-sequence-detail',
  imports: [JsonPipe, RouterLink, EntityMetadataView, EntityNotes, ExpansionPanel],
  templateUrl: './sequence-detail.html',
  styleUrl: './sequence-detail.css',
})
export class SequenceDetail {
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly sequence = computed(() => {
    const key = this.route.snapshot.paramMap.get('sequenceKey');
    return (this.facade.guide()?.entities.sequences ?? []).find(
      (candidate) => candidate.semanticKey === key
    );
  });
}
