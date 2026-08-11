/**
 * Stage entity and zone types
 */

import { Timestamp } from 'firebase/firestore';
import { GuideVersionReference, ComparativeAttribute } from './shared';

export interface StageDocument {
  id: string;
  gameId: string;
  canonicalKey: string;
  name: string;
  notes?: string;

  comparativeAttributes: ComparativeAttribute[];
  guideVersion: GuideVersionReference;

  ownerId: string;
  communityId?: string;
  lastPublishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Stage zone for environmental interactions
 */
export interface StageZoneDocument {
  id: string;
  gameId: string;
  stageId?: string;
  parentScope: 'game' | 'stage';
  canonicalKey: string;
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

  guideVersion: GuideVersionReference;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
