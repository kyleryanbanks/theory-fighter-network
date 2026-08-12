/**
 * Stage entity and zone types
 */

import { CommunityMetadata, ComparativeAttribute, EntityMetadata } from './shared';

export interface StageDocument {
  id: string;
  gameKey: string;
  semanticKey: string; // hash(gameSemanticKey + normalizedStageName)
  name: string;
  notes?: string;

  comparativeAttributes: ComparativeAttribute[];

  community: CommunityMetadata;
  meta: EntityMetadata;
}

/**
 * Stage zone for environmental interactions
 */
export interface StageZoneDocument {
  id: string;
  gameKey: string;
  stageId?: string;
  parentScope: 'game' | 'stage';
  semanticKey: string; // hash(gameSemanticKey + stageSemanticKey + zoneType + side)
  inheritedFromZoneId?: string;
  fieldOverrides?: (keyof StageZoneDocument)[];

  zoneType: 'wall' | 'floor' | 'ceiling';
  side?: 'left' | 'right' | 'center';
  notes?: string;

  splatBehavior?: {
    causesSplatStateTag?: string;
    notes?: string;
  };

  breakBehavior?: {
    isBreakable: boolean;
    breakStateTag?: string;
    breakOnZeroDurability?: boolean;
  };

  durability?: {
    maxPoints: number;
    currentPoints?: number;
    resetConditions?: {
      resetEvery?: 'round' | 'match';
      resetOnScreenTransition?: boolean;
    };
  };

  community: CommunityMetadata;
  meta: EntityMetadata;
}
