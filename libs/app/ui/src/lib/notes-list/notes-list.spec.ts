import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { NoteEntry } from '@theory-fighter-network/data';
import { NotesList } from './notes-list';

function buildNote(overrides: Partial<NoteEntry> = {}): NoteEntry {
  return {
    id: 'note-1',
    text: 'Got hit by something weird, explore later',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('NotesList', () => {
  let fixture: ComponentFixture<NotesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotesList],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesList);
  });

  it('renders a bulleted entry for each note', () => {
    fixture.componentRef.setInput('notes', [
      buildNote({ id: 'note-1', text: 'First note' }),
      buildNote({ id: 'note-2', text: 'Second note' }),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll(
      '[data-testid="note-item"]'
    );
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('First note');
    expect(items[1].textContent).toContain('Second note');
  });

  it('shows an empty state when there are no notes', () => {
    fixture.componentRef.setInput('notes', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No notes yet.');
  });

  it('shows a Promote action for a note without a promotedToKey', () => {
    fixture.componentRef.setInput('notes', [buildNote()]);
    fixture.detectChanges();

    const promoteButton = fixture.nativeElement.querySelector(
      '[data-testid="promote-note"]'
    );
    expect(promoteButton).not.toBeNull();
  });

  it('shows a promoted indicator instead of Promote once a note has a promotedToKey', () => {
    fixture.componentRef.setInput('notes', [
      buildNote({ promotedToKey: 'scenario-123' }),
    ]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="promote-note"]')
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Promoted');
  });

  it('emits add with the entered text and clears the input', () => {
    const addSpy = vi.fn();
    fixture.componentInstance.add.subscribe(addSpy);
    fixture.detectChanges();

    fixture.componentInstance.draftText.set('New idea to explore');
    fixture.nativeElement
      .querySelector('[data-testid="add-note"]')
      .dispatchEvent(new Event('click'));

    expect(addSpy).toHaveBeenCalledWith('New idea to explore');
    expect(fixture.componentInstance.draftText()).toBe('');
  });

  it('emits remove with the note id', () => {
    const removeSpy = vi.fn();
    fixture.componentInstance.remove.subscribe(removeSpy);
    fixture.componentRef.setInput('notes', [buildNote({ id: 'note-1' })]);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="remove-note"]')
      .dispatchEvent(new Event('click'));

    expect(removeSpy).toHaveBeenCalledWith('note-1');
  });

  it('emits promote with the full note entry', () => {
    const promoteSpy = vi.fn();
    fixture.componentInstance.promote.subscribe(promoteSpy);
    const note = buildNote({ id: 'note-1' });
    fixture.componentRef.setInput('notes', [note]);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="promote-note"]')
      .dispatchEvent(new Event('click'));

    expect(promoteSpy).toHaveBeenCalledWith(note);
  });
});
