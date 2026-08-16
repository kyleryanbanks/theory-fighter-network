import {
  createStage,
  createStageSemanticKey,
  validateStageDocument,
} from './stage';

describe('Stage operations', () => {
  it('creates a canonical semantic key from Game identity and Stage name', () => {
    expect(createStageSemanticKey('game-sf6', 'Training Room')).toBe(
      createStageSemanticKey('game-sf6', ' training-room ')
    );
    expect(createStageSemanticKey('game-sf6', 'Training Room')).not.toBe(
      createStageSemanticKey('game-t8', 'Training Room')
    );
  });

  it('creates a valid Stage document', () => {
    const stage = createStage({
      gameKey: 'game-sf6',
      name: 'Training Room',
    });

    expect(stage.semanticKey).toBe(
      createStageSemanticKey('game-sf6', 'Training Room')
    );
    expect(validateStageDocument(stage)).toEqual([]);
  });

  it('rejects missing fields and semantic key mismatches', () => {
    const stage = createStage({
      gameKey: 'game-sf6',
      name: 'Training Room',
    });

    expect(
      validateStageDocument({ ...stage, gameKey: '', name: '' })
    ).toEqual(['gameKey is required.', 'name is required.']);
    expect(
      validateStageDocument({ ...stage, semanticKey: 'stage-wrong' })
    ).toContain('semanticKey does not match the Game and Stage name.');
  });
});