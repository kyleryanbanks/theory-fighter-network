import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CancelGroupsEditorComponent } from './cancel-groups-editor';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { vi } from 'vitest';

@Component({
  selector: 'tfn-test-host',
  template: `
    <tfn-cancel-groups-editor
      [scope]="scope()"
      [scopeKey]="scopeKey()"
    />
  `,
  standalone: true,
  imports: [CancelGroupsEditorComponent],
})
class TestHostComponent {
  scope = signal<'game' | 'character'>('game');
  scopeKey = signal<string>('');
}

describe('CancelGroupsEditorComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let facade: LocalGuideFacadeStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        {
          provide: LocalGuideFacadeStore,
          useValue: {
            guide: () => ({
              entities: {
                game: {
                  universal: {
                    cancelGroups: {
                      'group-1': ['move-a', 'move-b'],
                      'group-2': ['move-c'],
                    },
                  },
                },
                characters: [
                  {
                    semanticKey: 'char-1',
                    cancelGroups: {
                      'char-group': ['move-d', 'move-e'],
                    },
                  },
                ],
                moves: [
                  { semanticKey: 'move-a', name: 'Move A' },
                  { semanticKey: 'move-b', name: 'Move B' },
                  { semanticKey: 'move-c', name: 'Move C' },
                  { semanticKey: 'move-d', name: 'Move D' },
                  { semanticKey: 'move-e', name: 'Move E' },
                ],
              },
            }),
            createCancelGroup: vi.fn(),
            renameCancelGroup: vi.fn(),
            updateCancelGroupMoveKeys: vi.fn(),
            deleteCancelGroup: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    facade = TestBed.inject(LocalGuideFacadeStore);
  });

  describe('game scope', () => {
    it('should render cancel groups list for game scope', () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const heading = fixture.nativeElement.querySelector('h3');
      expect(heading?.textContent).toContain('Cancel Groups');

      const items = fixture.nativeElement.querySelectorAll('.cancel-group-item');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('group-1');
      expect(items[1].textContent).toContain('group-2');
    });

    it('should show move tiles when editing a group', () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const editButtons = fixture.nativeElement.querySelectorAll('.cancel-group-edit-button');
      editButtons[0].click();
      fixture.detectChanges();

      const moveCount = fixture.nativeElement.querySelectorAll('tfn-tile-grid .tile-grid-button');
      expect(moveCount.length).toBeGreaterThan(0);
    });

    it('should display selected moves in editor', () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const editButtons = fixture.nativeElement.querySelectorAll('.cancel-group-edit-button');
      editButtons[0].click();
      fixture.detectChanges();

      const selectedTiles = fixture.nativeElement.querySelectorAll('.tile-grid-button--selected');
      expect(selectedTiles.length).toBe(2); // group-1 has 2 moves
    });

    it('should save updated move selection', () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const editButtons = fixture.nativeElement.querySelectorAll('.cancel-group-edit-button');
      editButtons[0].click();
      fixture.detectChanges();

      const saveButton = fixture.nativeElement.querySelector('.save-group-button');
      saveButton.click();

      expect(facade.updateCancelGroupMoveKeys).toHaveBeenCalled();
    });

    it('should allow renaming a group', async () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const renameButtons = fixture.nativeElement.querySelectorAll('.cancel-group-rename-button');
      renameButtons[0].click();
      fixture.detectChanges();
      await fixture.whenStable();

      const renameInput = fixture.nativeElement.querySelector('.cancel-group-rename-input') as HTMLInputElement;
      expect(renameInput).toBeTruthy();
      renameInput.value = 'new-name';
      renameInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const confirmButton = fixture.nativeElement.querySelector('.confirm-rename-button') as HTMLButtonElement;
      confirmButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(facade.renameCancelGroup).toHaveBeenCalled();
    });

    it('should allow deleting a group', async () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const deleteButtons = fixture.nativeElement.querySelectorAll('.cancel-group-delete-button');
      const deleteButton = deleteButtons[0].querySelector('button') as HTMLButtonElement;
      deleteButton?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(facade.deleteCancelGroup).toHaveBeenCalled();
    });

    it('should allow creating a new group', async () => {
      hostComponent.scope.set('game');
      fixture.detectChanges();

      const createButton = fixture.nativeElement.querySelector('.create-cancel-group-button') as HTMLButtonElement;
      createButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const nameInput = fixture.nativeElement.querySelector('.new-group-name-input') as HTMLInputElement;
      nameInput.value = 'new-group';
      nameInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const confirmButton = fixture.nativeElement.querySelector('.confirm-create-button') as HTMLButtonElement;
      confirmButton.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(facade.createCancelGroup).toHaveBeenCalled();
    });
  });

  describe('character scope', () => {
    it('should render character-specific cancel groups', () => {
      hostComponent.scope.set('character');
      hostComponent.scopeKey.set('char-1');
      fixture.detectChanges();

      const items = fixture.nativeElement.querySelectorAll('.cancel-group-item');
      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('char-group');
    });
  });
});
