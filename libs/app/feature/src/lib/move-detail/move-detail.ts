import { Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LocalGuideFacadeStore, resolveEffectiveMove } from '@theory-fighter-network/data';
import { EntityMetadataView, ExpansionPanel } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

@Component({
  selector: 'tfn-move-detail',
  imports: [JsonPipe, RouterLink, EntityMetadataView, EntityNotes, ExpansionPanel],
  templateUrl: './move-detail.html',
  styleUrl: './move-detail.css',
})
export class MoveDetail {
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly move = computed(() => {
    const key = this.route.snapshot.paramMap.get('moveKey');
    const moves = this.facade.guide()?.entities.moves ?? [];
    const move = moves.find((candidate) => candidate.semanticKey === key);
    return move ? resolveEffectiveMove(move, moves) : undefined;
  });
}
