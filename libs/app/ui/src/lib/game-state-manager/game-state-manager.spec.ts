import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameStateManagerComponent } from './game-state-manager';
import type { StateModel } from '@theory-fighter-network/data';

function buildStateModel(): StateModel {
  return {
    Defense: {
      'guard-crush': { semanticKey: 'guard-crush', name: 'Guard Crush' },
    },
  };
}

describe('GameStateManagerComponent', () => {
  let fixture: ComponentFixture<GameStateManagerComponent>;
  let component: GameStateManagerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameStateManagerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameStateManagerComponent);
    component = fixture.componentInstance;
  });

  it('shows empty state message when stateModel is {}', () => {
    fixture.componentRef.setInput('stateModel', {});
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty?.textContent?.trim()).toBe('No states added yet.');
  });

  it('shows a category header for each category with states', () => {
    fixture.componentRef.setInput('stateModel', {
      Defense: {
        'guard-crush': { semanticKey: 'guard-crush', name: 'Guard Crush' },
      },
      Offense: {
        'power-up': { semanticKey: 'power-up', name: 'Power Up' },
      },
    });
    fixture.detectChanges();

    const headers = fixture.nativeElement.querySelectorAll('h5');
    const headerTexts = Array.from(headers).map((h: any) => h.textContent?.trim());
    expect(headerTexts).toContain('Defense');
    expect(headerTexts).toContain('Offense');
  });

  it('shows each state name and semanticKey', () => {
    fixture.componentRef.setInput('stateModel', buildStateModel());
    fixture.detectChanges();

    const entries = fixture.nativeElement.querySelectorAll('[data-testid="game-state-entry"]');
    expect(entries.length).toBe(1);

    const entry = entries[0];
    expect(entry.querySelector('strong')?.textContent?.trim()).toBe('Guard Crush');
    expect(entry.querySelector('small')?.textContent?.trim()).toBe('guard-crush');
  });

  it('emits addState when "Add state" button is clicked', () => {
    fixture.componentRef.setInput('stateModel', {});
    fixture.detectChanges();

    let emitted = false;
    component.addState.subscribe(() => { emitted = true; });

    const btn = fixture.nativeElement.querySelector('[data-testid="add-game-state"]');
    btn.click();
    expect(emitted).toBe(true);
  });

  it('emits deleteState with correct { category, semanticKey } when delete button is clicked', () => {
    fixture.componentRef.setInput('stateModel', buildStateModel());
    fixture.detectChanges();

    let deleteEvent: { category: string; semanticKey: string } | null = null;
    component.deleteState.subscribe((evt) => { deleteEvent = evt; });

    const deleteBtn = fixture.nativeElement.querySelector('[aria-label="Delete Guard Crush"]');
    deleteBtn.click();

    expect(deleteEvent).toEqual({ category: 'Defense', semanticKey: 'guard-crush' });
  });
});
