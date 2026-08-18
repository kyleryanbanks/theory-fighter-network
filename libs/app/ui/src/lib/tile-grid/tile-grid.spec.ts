import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileGridComponent } from './tile-grid';
import { Tile, TileChoice } from './tile-grid.models';

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
  lastUpdatedTile: Tile | Tile[] | undefined;

  onUpdate(tile: Tile | Tile[]) {
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
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', value: false }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();
      fixture.detectChanges();

      expect(hostComponent.lastUpdatedTile).toBeDefined();
      const tile = hostComponent.lastUpdatedTile as Tile;
      expect(tile.key).toBe('move1');
      expect(tile.value).toBe(true);
    });

    it('should apply selected class when tile is selected', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', value: true }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('tile-grid-button--selected')).toBe(true);
    });

    it('should emit update with selected tile', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab', value: false }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(hostComponent.lastUpdatedTile).toBeDefined();
      const tile = hostComponent.lastUpdatedTile as Tile;
      expect(tile.key).toBe('move1');
      expect(tile.value).toBe(true);
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

      expect(hostComponent.lastUpdatedTile).toBeDefined();
      const tile = hostComponent.lastUpdatedTile as Tile;
      expect(tile.key).toBe('move1');
      const selectedChoice = tile.value as TileChoice;
      expect(selectedChoice.value).toBe(1);
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
    it('should emit update even without value set', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab' }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(hostComponent.lastUpdatedTile).toBeDefined();
      const tile = hostComponent.lastUpdatedTile as Tile;
      expect(tile.key).toBe('move1');
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

  describe('selection mode (maxSelections)', () => {
    @Component({
      selector: 'tfn-test-selection-host',
      template: `
        <tfn-tile-grid 
          [tiles]="tiles()" 
          [selections]="selections()"
          [maxSelections]="maxSelections()"
          (update)="onUpdate($event)" 
        />
      `,
      standalone: true,
      imports: [TileGridComponent],
    })
    class SelectionTestComponent {
      maxSelections = signal<number | undefined>(2);
      selections = signal<Tile[]>([]);
      tiles = signal<Tile[]>([
        { key: 'move1', label: 'Jab' },
        { key: 'move2', label: 'Strong' },
      ]);

      onUpdate(tiles: Tile | Tile[]) {
        if (Array.isArray(tiles)) {
          this.selections.set(tiles);
        }
      }
    }

    let selectionFixture: ComponentFixture<SelectionTestComponent>;
    let selectionHost: SelectionTestComponent;

    beforeEach(() => {
      selectionFixture = TestBed.createComponent(SelectionTestComponent);
      selectionHost = selectionFixture.componentInstance;
      selectionFixture.detectChanges();
    });

    it('should disable tiles when selection limit is reached', () => {
      selectionHost.maxSelections.set(1);
      selectionHost.selections.set([{ key: 'move1', label: 'Jab' }]);
      selectionFixture.detectChanges();

      const buttons = selectionFixture.nativeElement.querySelectorAll('button');
      expect(buttons[1].classList.contains('tile-grid-button--disabled')).toBe(true);
    });

    it('should show yellow border immediately after clicking the first tile', () => {
      const buttons = selectionFixture.nativeElement.querySelectorAll('button');
      buttons[0].click();
      selectionFixture.detectChanges();

      expect(buttons[0].classList.contains('tile-grid-button--selected-badged')).toBe(true);
    });

    it('should show badge immediately after clicking the first tile', () => {
      const buttons = selectionFixture.nativeElement.querySelectorAll('button');
      buttons[0].click();
      selectionFixture.detectChanges();

      const badge = selectionFixture.nativeElement.querySelector('.tile-selection-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent.trim()).toBe('1');
    });
  });

  describe('tags rendering', () => {
    it('should render tile tags when provided', () => {
      hostComponent.tiles.set([
        {
          key: 'move1',
          label: 'Jab',
          tags: [{ label: 'Universal', color: 'success' }],
        },
      ]);
      fixture.detectChanges();

      const tags = fixture.nativeElement.querySelectorAll('.tile-tag-badge');
      expect(tags.length).toBe(1);
      expect(tags[0].textContent).toContain('Universal');
      expect(tags[0].classList.contains('tile-tag-badge--success')).toBe(true);
    });

    it('should render multiple tags', () => {
      hostComponent.tiles.set([
        {
          key: 'move1',
          label: 'Jab',
          tags: [
            { label: 'Universal' },
            { label: 'Character', color: 'warning' },
          ],
        },
      ]);
      fixture.detectChanges();

      const tags = fixture.nativeElement.querySelectorAll('.tile-tag-badge');
      expect(tags.length).toBe(2);
      expect(tags[0].textContent).toContain('Universal');
      expect(tags[1].textContent).toContain('Character');
    });
  });

  describe('choice label display', () => {
    it('should display selected choice label as tag', () => {
      const choices: Record<string, TileChoice> = {
        win: { label: 'Win', value: 1, color: 'success' },
      };
      hostComponent.tiles.set([
        {
          key: 'move1',
          label: 'Outcome',
          choices,
          value: choices.win,
        },
      ]);
      fixture.detectChanges();

      const choiceTag = fixture.nativeElement.querySelector('.tile-tag');
      expect(choiceTag).toBeDefined();
      expect(choiceTag.textContent).toContain('Win');
      expect(choiceTag.classList.contains('tile-tag--success')).toBe(true);
    });

    it('should not display tag when value is boolean', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Move', value: true }]);
      fixture.detectChanges();

      const choiceTag = fixture.nativeElement.querySelector('.tile-tag');
      expect(choiceTag).toBeNull();
    });

    it('should apply choice color to tile background', () => {
      const choices: Record<string, TileChoice> = {
        danger: { label: 'Danger', value: -1, color: 'danger' },
      };
      hostComponent.tiles.set([
        {
          key: 'move1',
          label: 'Risk',
          choices,
          value: choices.danger,
        },
      ]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('.tile-grid-button');
      expect(button.classList.contains('tile-tag--danger')).toBe(false);
      const tag = fixture.nativeElement.querySelector('.tile-tag');
      expect(tag.classList.contains('tile-tag--danger')).toBe(true);
    });
  });

  describe('passive mode', () => {
    it('should emit tile on click with no value or choices', () => {
      hostComponent.tiles.set([{ key: 'move1', label: 'Jab' }]);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(hostComponent.lastUpdatedTile).toBeDefined();
      const tile = hostComponent.lastUpdatedTile as Tile;
      expect(tile.key).toBe('move1');
    });
  });
});
