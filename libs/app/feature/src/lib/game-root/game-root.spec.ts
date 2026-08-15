import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';
import { GameRoot } from './game-root';

function createWorkspace(name: string, version: string) {
  return {
    guide: { gameKey: 'loaded-game' },
    entities: {
      game: {
        name,
        version,
        semanticKey: 'loaded-game',
        frameRate: 60,
        is3d: false,
        teamSize: 1,
        inputs: { directions: [], buttons: [] },
      },
    },
  };
}

describe('GameRoot', () => {
  let fixture: ComponentFixture<GameRoot>;
  const workspace = signal<ReturnType<typeof createWorkspace> | undefined>(
    undefined
  );
  const mockStore = {
    workspace,
    createWorkspace: vi.fn(async () => ({ status: 'success' })),
    updateActiveGame: vi.fn(async () => ({ status: 'success' })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    workspace.set(undefined);

    await TestBed.configureTestingModule({
      imports: [GameRoot],
      providers: [{ provide: LocalGuideFacadeStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(GameRoot);
    fixture.detectChanges();
  });

  it('updates the game draft when a workspace is loaded', () => {
    workspace.set(createWorkspace('Loaded Fighter', '2.3.0'));
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

  it('creates a workspace from the new-game draft', async () => {
    const name: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="game-name"]'
    );
    name.value = 'Test Fighter';
    name.dispatchEvent(new Event('input'));

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="create-workspace"]'
    );
    button.click();
    await fixture.whenStable();

    expect(mockStore.createWorkspace).toHaveBeenCalledWith({
      name: 'Test Fighter',
      version: '1.0.0',
      frameRate: 60,
      is3d: false,
      teamSize: 1,
      inputs: { directions: [], buttons: [] },
    });
  });

  it('updates loaded game metadata from the draft', async () => {
    workspace.set(createWorkspace('Loaded Fighter', '2.3.0'));
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
    });
  });
});