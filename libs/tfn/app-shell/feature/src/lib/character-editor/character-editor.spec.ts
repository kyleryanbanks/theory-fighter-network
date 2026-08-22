import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { CharacterEditor } from './character-editor';

function buildGuide(
  characters: Array<{ name: string; semanticKey: string }> = []
) {
  return {
    entities: { characters },
  };
}

describe('CharacterEditor', () => {
  let fixture: ComponentFixture<CharacterEditor>;
  const guide = signal(buildGuide());
  const mockStore = {
    guide,
    createCharacter: vi.fn(async () => ({ status: 'success' })),
    deleteCharacter: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(buildGuide());

    await TestBed.configureTestingModule({
      imports: [CharacterEditor],
      providers: [provideRouter([]), { provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterEditor);
    fixture.detectChanges();
  });

  it('renders the active Guide Characters', () => {
    guide.set(
      buildGuide([
        { name: 'Ryu', semanticKey: 'character-ryu' },
        { name: 'Ken', semanticKey: 'character-ken' },
      ])
    );
    fixture.detectChanges();

    const entries = fixture.nativeElement.querySelectorAll(
      '[data-testid="character-entry"]'
    );
    expect(entries).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Ryu');
    expect(fixture.nativeElement.textContent).toContain('Ken');
  });

  it('creates one Character from the name field and clears the draft', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="character-name"]'
    );
    input.value = 'Ryu';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="add-character"]')
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockStore.createCharacter).toHaveBeenCalledWith({ name: 'Ryu' });
    expect(input.value).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Character name is required.'
    );
  });

  it('shows a duplicate Character error without clearing the draft', async () => {
    mockStore.createCharacter.mockResolvedValueOnce({
      status: 'error',
      error: new Error('Character "Ryu" already exists.'),
    });
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="character-name"]'
    );
    input.value = 'Ryu';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[data-testid="add-character"]')
      .click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Character "Ryu" already exists.'
    );
    expect(input.value).toBe('Ryu');
  });

  it('deletes a Character from its row action', async () => {
    guide.set(buildGuide([{ name: 'Ryu', semanticKey: 'character-ryu' }]));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('[aria-label="Delete Character Ryu"]')
      .click();
    await fixture.whenStable();

    expect(mockStore.deleteCharacter).toHaveBeenCalledWith({
      characterKey: 'character-ryu',
    });
  });
});
