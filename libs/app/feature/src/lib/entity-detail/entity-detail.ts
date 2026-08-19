import { JsonPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import type { EntityMetadata } from '@theory-fighter-network/data';
import { ExpansionPanel, EntityDetailShell } from '@theory-fighter-network/ui';
import { EntityNotes } from '../entity-notes/entity-notes';

type EntityType =
  | 'game'
  | 'stage'
  | 'stageZone'
  | 'character'
  | 'team'
  | 'projectile'
  | 'matchup';

@Component({
  selector: 'tfn-entity-detail',
  imports: [JsonPipe, ExpansionPanel, EntityDetailShell, EntityNotes],
  templateUrl: './entity-detail.html',
  styleUrl: './entity-detail.css',
})
export class EntityDetail {
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(LocalGuideFacadeStore);
  readonly entityType = this.route.snapshot.data['entityType'] as EntityType;
  readonly entityKey = this.route.snapshot.paramMap.get('entityKey') ?? '';
  readonly entity = computed(() => {
    const entities = this.facade.guide()?.entities;
    if (!entities) return undefined;
    if (this.entityType === 'game') return entities.game.semanticKey === this.entityKey ? entities.game : undefined;
    const collection = {
      stage: entities.stages,
      stageZone: entities.stageZones,
      character: entities.characters,
      team: entities.teams,
      projectile: entities.projectiles,
      matchup: entities.matchups,
    }[this.entityType];
    return collection?.find(candidate => candidate.semanticKey === this.entityKey);
  });

  readonly title = computed(() => {
    const entity = this.entity() as { name?: string; version?: string } | undefined;
    if (this.entityType === 'game' && entity) return `${entity.name ?? 'Game'} ${entity.version ?? ''}`.trim();
    if (this.entityType === 'matchup') return 'Matchup';
    return entity?.name ?? this.entityTypeLabel();
  });

  readonly backRoute = computed(() => ({
    game: ['/game'],
    stage: ['/stages'],
    stageZone: ['/stages'],
    character: ['/characters'],
    team: ['/teams'],
    projectile: ['/game'],
    matchup: ['/matchups'],
  }[this.entityType]));

  entityTypeLabel(): string {
    return this.entityType === 'stageZone' ? 'Stage Zone' : this.entityType;
  }

  metadata(): { meta: EntityMetadata } | undefined {
    const entity = this.entity() as { meta?: EntityMetadata } | undefined;
    return entity?.meta ? { meta: entity.meta } : undefined;
  }
}

