import type { LocalGuide, LocalGuideEntities } from './guide.types';

export function validateGuideHierarchy(localGuide: LocalGuide): string[] {
  const errors: string[] = [];
  const { entities } = localGuide;
  const game = entities.game;

  validateKeys(errors, 'Game stageKeys do not match its Stages.', game.hierarchy.stageKeys, entities.stages);
  validateKeys(errors, 'Game characterKeys do not match its Characters.', game.hierarchy.characterKeys, entities.characters);
  validateKeys(errors, 'Game teamKeys do not match its Teams.', game.hierarchy.teamKeys, entities.teams);
  validateKeys(errors, 'Game matchupKeys do not match its Matchups.', game.hierarchy.matchupKeys, entities.matchups);
  validateKeys(
    errors,
    'Game universalStageZoneKeys do not match its universal Stage Zones.',
    game.universal.stageZoneKeys,
    entities.stageZones.filter((zone) => !zone.stageKey)
  );
  validateKeys(
    errors,
    'Game universalMoveKeys do not match its universal Moves.',
    game.universal.moveKeys,
    entities.moves.filter((move) => !move.characterKey)
  );
  validateKeys(
    errors,
    'Game universalSequenceKeys do not match its universal Sequences.',
    game.universal.sequenceKeys,
    entities.sequences.filter(
      (sequence) => !sequence.characterKey && !sequence.teamKey
    )
  );
  validateKeys(
    errors,
    'Game universalProjectileKeys do not match its universal Projectiles.',
    game.universal.projectileKeys,
    entities.projectiles.filter((projectile) => !projectile.characterKey)
  );

  for (const stage of entities.stages) {
    validateKeys(
      errors,
      `Stage ${stage.semanticKey} zoneKeys do not match its Stage Zones.`,
      stage.hierarchy.zoneKeys,
      entities.stageZones.filter((zone) => zone.stageKey === stage.semanticKey)
    );
  }

  for (const character of entities.characters) {
    validateKeys(
      errors,
      `Character ${character.semanticKey} moveKeys do not match its Moves.`,
      character.hierarchy.moveKeys,
      entities.moves.filter(
        (move) => move.characterKey === character.semanticKey
      )
    );
    validateKeys(
      errors,
      `Character ${character.semanticKey} sequenceKeys do not match its Sequences.`,
      character.hierarchy.sequenceKeys,
      entities.sequences.filter(
        (sequence) => sequence.characterKey === character.semanticKey
      )
    );
    validateKeys(
      errors,
      `Character ${character.semanticKey} projectileKeys do not match its Projectiles.`,
      character.hierarchy.projectileKeys,
      entities.projectiles.filter(
        (projectile) => projectile.characterKey === character.semanticKey
      )
    );
  }

  for (const team of entities.teams) {
    validateKeys(
      errors,
      `Team ${team.semanticKey} sequenceKeys do not match its Sequences.`,
      team.hierarchy.sequenceKeys,
      entities.sequences.filter(
        (sequence) => sequence.teamKey === team.semanticKey
      )
    );
  }

  validateGameKeys(errors, game.semanticKey, entities);
  return errors;
}

function validateKeys(
  errors: string[],
  message: string,
  parentKeys: string[],
  children: Array<{ semanticKey: string }>
): void {
  const expectedKeys = new Set(children.map((child) => child.semanticKey));
  const actualKeys = new Set(parentKeys);
  const matches =
    actualKeys.size === parentKeys.length &&
    actualKeys.size === expectedKeys.size &&
    [...actualKeys].every((key) => expectedKeys.has(key));

  if (!matches) {
    errors.push(message);
  }
}

function validateGameKeys(
  errors: string[],
  gameKey: string,
  entities: LocalGuideEntities
): void {
  const scopedEntities = [
    ...entities.stages,
    ...entities.stageZones,
    ...entities.characters,
    ...entities.teams,
    ...entities.moves,
    ...entities.sequences,
    ...entities.projectiles,
    ...entities.matchups,
  ];

  for (const entity of scopedEntities) {
    if (entity.gameKey !== gameKey) {
      errors.push(
        `Entity ${entity.semanticKey} gameKey does not match the Guide Game.`
      );
    }
  }
}
