import { describe, expect, it } from 'vitest';
import { createNoteEntry } from './shared';

describe('createNoteEntry', () => {
  it('builds a NoteEntry with trimmed text and a generated id', () => {
    const note = createNoteEntry({ text: '  Watch for fireball punishes  ' });

    expect(note.text).toBe('Watch for fireball punishes');
    expect(note.id).toBeTruthy();
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.promotedToKey).toBeUndefined();
  });

  it('generates unique ids for separate notes', () => {
    const note1 = createNoteEntry({ text: 'Same text' });
    const note2 = createNoteEntry({ text: 'Same text' });

    expect(note1.id).not.toBe(note2.id);
  });

  it('throws when text is empty', () => {
    expect(() => createNoteEntry({ text: '   ' })).toThrow(/text is required/);
  });
});
