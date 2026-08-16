import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { GameRoot } from './game-root';

function createGuide(
  name: string,
  version: string,
  inputs = {
    directions: [] as { label: string; value?: string }[],
    buttons: [] as { label: string; value?: string }[],
  }
) {
  return {
    guide: { gameKey: 'loaded-game' },
    entities: {
      game: {
        name,
        version,
        semanticKey: 'loaded-game',
        config: {
          frameRate: 60,
          is3d: false,
          teamSize: 1,
          inputs,
        },
        hierarchy: {
          stageKeys: [],
          characterKeys: [],
          teamKeys: [],
          matchupKeys: [],
        },
        universal: {
          stageZoneKeys: [],
          moveKeys: [],
          sequenceKeys: [],
          projectileKeys: [],
        },
      },
    },
  };
}

describe('GameRoot', () => {
  let fixture: ComponentFixture<GameRoot>;
  const guide = signal<ReturnType<typeof createGuide> | undefined>(
    undefined
  );
  const mockStore = {
    guide,
    createGuide: vi.fn(async () => ({ status: 'success' })),
    updateActiveGame: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    guide.set(undefined);

    await TestBed.configureTestingModule({
      imports: [GameRoot],
      providers: [provideRouter([]), { provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(GameRoot);
    fixture.detectChanges();
  });

  it('updates the game draft when a Guide is loaded', () => {
    guide.set(createGuide('Loaded Fighter', '2.3.0'));
    fixture.detectChanges();

    const name: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="game-name"]'
    );
    const version: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="game-version"]'
    );

    expect(name.value).toBe('Loaded Fighter');
    expect(version.value).toBe('2.3.0');
  });

  it('creates a Guide from the new-game draft', async () => {
    const name: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="game-name"]'
    );
    name.value = 'Test Fighter';
    name.dispatchEvent(new Event('input'));

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="create-guide"]'
    );
    button.click();
    await fixture.whenStable();

    expect(mockStore.createGuide).toHaveBeenCalledWith({
      name: 'Test Fighter',
      version: '1.0.0',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: { directions: [], buttons: [] },
    });
  });

  it('updates loaded game metadata from the draft', async () => {
    guide.set(createGuide('Loaded Fighter', '2.3.0'));
    fixture.detectChanges();
    const teamSize: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="team-size"]'
    );
    teamSize.value = '2';
    teamSize.dispatchEvent(new Event('input'));

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="update-game"]'
    );
    button.click();
    await fixture.whenStable();

    expect(mockStore.updateActiveGame).toHaveBeenCalledWith({
      frameRate: 60,
      is3d: false,
      teamSize: 2,
      inputs: { directions: [], buttons: [] },
    });
  });

  it('adds direction and button vocabulary entries one at a time', () => {
    setInputValue('[data-testid="direction-label"]', 'Forward');
    setInputValue('[data-testid="direction-value"]', '6');
    click('[data-testid="add-direction"]');

    expect(queryAll('[data-testid="direction-entry"]')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Forward');
    expect(getInput('[data-testid="direction-label"]').value).toBe('');

    setInputValue('[data-testid="button-label"]', 'Light Punch');
    setInputValue('[data-testid="button-value"]', 'lp');
    click('[data-testid="add-button"]');

    expect(queryAll('[data-testid="button-entry"]')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Light Punch');
    expect(getInput('[data-testid="button-label"]').value).toBe('');
  });

  it('loads vocabulary as individual entries and saves the complete lists', async () => {
    guide.set(
      createGuide('Loaded Fighter', '2.3.0', {
        directions: [{ label: 'Neutral', value: '5' }],
        buttons: [{ label: 'Heavy Punch', value: 'hp' }],
      })
    );
    fixture.detectChanges();

    setInputValue('[data-testid="direction-label"]', 'Forward');
    setInputValue('[data-testid="direction-value"]', '6');
    click('[data-testid="add-direction"]');
    click('[data-testid="update-game"]');
    await fixture.whenStable();

    expect(queryAll('[data-testid="direction-entry"]')).toHaveLength(2);
    expect(mockStore.updateActiveGame).toHaveBeenCalledWith({
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: {
        directions: [
          { label: 'Neutral', value: '5' },
          { label: 'Forward', value: '6' },
        ],
        buttons: [{ label: 'Heavy Punch', value: 'hp' }],
      },
    });
  });

  it('rejects duplicate values across direction and button vocabularies', () => {
    setInputValue('[data-testid="direction-label"]', 'Forward');
    setInputValue('[data-testid="direction-value"]', '6');
    click('[data-testid="add-direction"]');

    setInputValue('[data-testid="button-label"]', 'Shortcut');
    setInputValue('[data-testid="button-value"]', '6');
    click('[data-testid="add-button"]');

    expect(queryAll('[data-testid="direction-entry"]')).toHaveLength(1);
    expect(queryAll('[data-testid="button-entry"]')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain(
      'Input value "6" is already used.'
    );
  });

  it('removes a vocabulary entry before saving the game', async () => {
    guide.set(
      createGuide('Loaded Fighter', '2.3.0', {
        directions: [
          { label: 'Neutral', value: '5' },
          { label: 'Forward', value: '6' },
        ],
        buttons: [],
      })
    );
    fixture.detectChanges();

    click('[aria-label="Remove direction Neutral"]');
    click('[data-testid="update-game"]');
    await fixture.whenStable();

    expect(mockStore.updateActiveGame).toHaveBeenCalledWith({
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: {
        directions: [{ label: 'Forward', value: '6' }],
        buttons: [],
      },
    });
  });

  function getInput(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector);
  }

  function setInputValue(selector: string, value: string): void {
    const input = getInput(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function click(selector: string): void {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector(selector);
    button.click();
    fixture.detectChanges();
  }

  function queryAll(selector: string): Element[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
  }
});