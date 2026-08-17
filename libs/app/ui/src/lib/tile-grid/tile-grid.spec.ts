import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileGridComponent, Tile, TileChoice } from './tile-grid';

@Component({
  selector: 'tfn-test-host',
  template: `
    <tfn-tile-grid [tiles]="tiles()" (update)="onUpdate($event)" />
  `,
  standalone: true,
  imports: [TileGridComponent],
})
class TestHostComponent {
  tiles = signal<Tile[]>([]);
  lastUpdatedTile: Tile | undefined;

  onUpdate(tile: Tile) {
    this.lastUpdatedTile = tile;
  }
}

describe('TileGridComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
  });

  describe('toggle mode', () => {
    it('should render tiles', () => {
      hostComponent.tiles.set([
        { key: 'move1', label: 'Jab' },
        { key: 'move2', label: 'Strong' },
      ]);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toContain('Jab');
      expect(buttons[1].textContent).toContain('Strong');
    });

    it('should toggle selected state on click', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', selected: false }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      expect(hostComponent.lastUpdatedTile?.key).toBe('move1');
      expect(hostComponent.lastUpdatedTile?.selected).toBe(true);
    });

    it('should apply selected class when tile is selected', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', selected: true }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('tile-grid-button--selected')).toBe(true);
    });

    it('should emit update with selected tile', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', selected: false }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(hostComponent.lastUpdatedTile).toBeDefined();
      expect(hostComponent.lastUpdatedTile?.key).toBe('move1');
      expect(hostComponent.lastUpdatedTile?.selected).toBe(true);
    });
  });

  describe('choice mode', () => {
    it('should show choice menu on click', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1, color: 'success' },
        loss: { label: 'Loss', value: -1, color: 'danger' },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      const menuButtons = fixture.nativeElement.querySelectorAll('.tile-choice-button');
      expect(menuButtons.length).toBe(2);
      expect(menuButtons[0].textContent).toContain('Win');
      expect(menuButtons[1].textContent).toContain('Loss');
    });

    it('should apply choice color class', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1, color: 'success' },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      const choiceButton = fixture.nativeElement.querySelector('.tile-choice-button');
      expect(choiceButton.classList.contains('tile-choice-button--success')).toBe(true);
    });

    it('should emit update with selected choice value', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1, color: 'success' },
        loss: { label: 'Loss', value: -1, color: 'danger' },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      // Open menu
      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      // Click choice
      const choiceButtons = fixture.nativeElement.querySelectorAll('.tile-choice-button');
      choiceButtons[0].click();
      fixture.detectChanges();

      expect(hostComponent.lastUpdatedTile?.key).toBe('move1');
      expect(hostComponent.lastUpdatedTile?.selectedChoiceValue).toBe(1);
    });

    it('should close menu after choice selection', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1, color: 'success' },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      // Open menu
      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      // Click choice
      const choiceButton = fixture.nativeElement.querySelector('.tile-choice-button');
      choiceButton.click();
      fixture.detectChanges();

      // Menu should be closed
      const menu = fixture.nativeElement.querySelector('.tile-choice-menu');
      expect(menu).toBeNull();
    });
  });

  describe('passive mode', () => {
    it('should emit update even without selected or choices', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab' }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(hostComponent.lastUpdatedTile?.key).toBe('move1');
    });
  });

  describe('menu state', () => {
    it('should toggle menu-open class when menu is open', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1 },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      expect(button.classList.contains('tile-grid-button--menu-open')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should set aria-haspopup when tile has choices', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1 },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
    });

    it('should set aria-expanded based on menu state', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1 },
      };
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', choices }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.getAttribute('aria-expanded')).toBe('false');

      button.click();
      fixture.detectChanges();

      expect(button.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
