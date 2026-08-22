import {
  createCharacterDocument,
  createGameDocument,
  createMoveDocument,
  createStageDocument,
  createStageZoneDocument,
} from '../models';
import { createGuideJson } from './guide.factory';
import { validateGuideHierarchy } from './guide.hierarchy';
import type { LocalGuide } from './guide.types';

function buildGuide(): LocalGuide {
  const gameKey = 'game-demo';
  const stageKey = 'stage-training';
  const zoneKey = 'zone-corner';
  const characterKey = 'character-ryu';
  const moveKey = 'move-hadoken';
  const universalMoveKey = 'move-throw';

  return {
    guide: createGuideJson({ gameKey }),
    entities: {
      game: createGameDocument({
        semanticKey: gameKey,
        hierarchy: {
          stageKeys: [stageKey],
          characterKeys: [characterKey],
          teamKeys: [],
          matchupKeys: [],
        },
        universal: {
          stageZoneKeys: [],
          moveKeys: [universalMoveKey],
          sequenceKeys: [],
          projectileKeys: [],
        },
      }),
      stages: [
        createStageDocument({
          gameKey,
          semanticKey: stageKey,
          name: 'Training Room',
          hierarchy: {
            zoneKeys: [zoneKey],
          },
        }),
      ],
      stageZones: [
        createStageZoneDocument({
          gameKey,
          stageKey,
          semanticKey: zoneKey,
          name: 'Corner',
        }),
      ],
      characters: [
        createCharacterDocument({
          gameKey,
          semanticKey: characterKey,
          name: 'Ryu',
          hierarchy: {
            moveKeys: [moveKey],
            sequenceKeys: [],
            projectileKeys: [],
          },
        }),
      ],
      moves: [
        createMoveDocument({
          gameKey,
          characterKey,
          semanticKey: moveKey,
          name: 'Hadoken',
        }),
        createMoveDocument({
          gameKey,
          semanticKey: universalMoveKey,
          name: 'Throw',
        }),
      ],
      teams: [],
      sequences: [],
      projectiles: [],
      matchups: [],
    },
  };
}

describe('Guide hierarchy validation', () => {
  it('accepts matching parent semantic-key arrays and child parent keys', () => {
    expect(validateGuideHierarchy(buildGuide())).toEqual([]);
  });

  it('reports Stage Zone and Character Move linkage mismatches', () => {
    const guide = buildGuide();
    guide.entities.stages[0].hierarchy.zoneKeys = [];
    guide.entities.characters[0].hierarchy.moveKeys = ['move-missing'];

    expect(validateGuideHierarchy(guide)).toEqual([
      'Stage stage-training zoneKeys do not match its Stage Zones.',
      'Character character-ryu moveKeys do not match its Moves.',
    ]);
  });

  it('reports Game direct-child linkage mismatches', () => {
    const guide = buildGuide();
    guide.entities.game.hierarchy.stageKeys = [];
    guide.entities.game.universal.moveKeys = [];

    expect(validateGuideHierarchy(guide)).toEqual([
      'Game stageKeys do not match its Stages.',
      'Game universalMoveKeys do not match its universal Moves.',
    ]);
  });
});
