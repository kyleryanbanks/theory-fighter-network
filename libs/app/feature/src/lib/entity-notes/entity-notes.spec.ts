import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore, type NoteEntry } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { EntityNotes } from './entity-notes';

function note(text = 'A useful observation'): NoteEntry {
  return { id: 'note-1', text, createdAt: new Date() };
}

describe('EntityNotes', () => {
  let fixture: ComponentFixture<EntityNotes>;
  const guide = signal({});
  const mockStore = {
    guide,
    addEntityNote: vi.fn(async () => ({ status: 'success' })),
    removeEntityNote: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [EntityNotes],
      providers: [{ provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityNotes);
    fixture.componentRef.setInput('entityType', 'character');
    fixture.componentRef.setInput('entityKey', 'character-1');
    fixture.componentRef.setInput('notes', [note()]);
    fixture.detectChanges();
  });

  it('renders the reusable notes list directly', () => {
    expect(fixture.nativeElement.querySelector('tfn-notes-list')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('A useful observation');
  });

  it('adds a note through the generic facade mutation', async () => {
    await fixture.componentInstance.addNote('New note');

    expect(mockStore.addEntityNote).toHaveBeenCalledWith({
      entityType: 'character',
      entityKey: 'character-1',
      text: 'New note',
    });
  });

  it('removes a note through the generic facade mutation', async () => {
    await fixture.componentInstance.removeNote('note-1');

    expect(mockStore.removeEntityNote).toHaveBeenCalledWith({
      entityType: 'character',
      entityKey: 'character-1',
      noteId: 'note-1',
    });
  });

  it('emits the note for the parent editor to promote', () => {
    const promote = vi.fn();
    fixture.componentInstance.promote.subscribe(promote);
    const entry = note();
    fixture.componentInstance.promoteNote(entry);

    expect(promote).toHaveBeenCalledWith(entry);
  });
});
