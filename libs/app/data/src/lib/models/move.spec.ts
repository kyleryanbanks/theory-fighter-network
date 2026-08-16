import { createMove, resolveEffectiveMove } from './move';

describe('Move operations', () => {
  it("live-inherits an override Move's unset fields from its universal parent", () => {
    const universalMove = {
      ...createMove({ gameKey: 'game-sf6', name: 'Hadoken' }),
      sequence: [{ directions: ['2', '3', '6'], buttons: ['lp'] }],
    };
    const override = createMove({
      gameKey: 'game-sf6',
      characterKey: 'character-ryu',
      name: 'Hadoken',
      parentKey: universalMove.semanticKey,
    });

    const effective = resolveEffectiveMove(override, [universalMove, override]);

    expect(effective.sequence).toEqual(universalMove.sequence);

    const updatedUniversalMove = {
      ...universalMove,
      sequence: [{ directions: ['2', '3', '6'], buttons: ['hp'] }],
    };
    const effectiveAfterParentEdit = resolveEffectiveMove(override, [
      updatedUniversalMove,
      override,
    ]);

    expect(effectiveAfterParentEdit.sequence).toEqual(
      updatedUniversalMove.sequence
    );
  });

  it('keeps a locally customized field independent of later parent edits', () => {
    const universalMove = {
      ...createMove({ gameKey: 'game-sf6', name: 'Hadoken' }),
      sequence: [{ directions: ['2', '3', '6'], buttons: ['lp'] }],
    };
    const override = {
      ...createMove({
        gameKey: 'game-sf6',
        characterKey: 'character-ryu',
        name: 'Hadoken',
        parentKey: universalMove.semanticKey,
      }),
      sequence: [{ directions: ['2', '3', '6'], buttons: ['ex'] }],
    };

    const effective = resolveEffectiveMove(override, [universalMove, override]);

    expect(effective.sequence).toEqual(override.sequence);
  });

  it('returns the Move unchanged when it has no parent', () => {
    const move = createMove({ gameKey: 'game-sf6', name: 'Hadoken' });

    expect(resolveEffectiveMove(move, [move])).toBe(move);
  });
});
