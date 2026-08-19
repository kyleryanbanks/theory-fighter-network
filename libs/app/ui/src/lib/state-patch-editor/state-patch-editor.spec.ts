import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { StateModel, StatePatch } from '@theory-fighter-network/data';
import { StatePatchEditorComponent } from './state-patch-editor';

@Component({
  imports: [StatePatchEditorComponent],
  template: `
    <tfn-state-patch-editor
      header="Target State"
      [stateModel]="stateModel"
      [value]="value"
      (valueChange)="value = $event"
    />
  `,
})
class HostComponent {
  stateModel: StateModel = {
    Resource: {
      meter: { semanticKey: 'meter', name: 'Meter', min: 0, max: 100, unit: 'bars' },
    },
    Defense: {
      invulnerable: { semanticKey: 'invulnerable', name: 'Invulnerable' },
      armor: { semanticKey: 'armor', name: 'Armor' },
    },
  };

  value: StatePatch = {};
}

describe('StatePatchEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders sorted category subsections and sorted state rows', () => {
    const categoryHeaders = queryAll('[data-testid="state-category-header"]').map(
      (element) => element.textContent?.trim()
    );
    const stateRows = queryAll('[data-testid="state-row-name"]').map((element) =>
      element.textContent?.trim()
    );

    expect(categoryHeaders).toEqual(['Defense', 'Resource']);
    expect(stateRows).toEqual(['Armor', 'Invulnerable', 'Meter']);
  });

  it('marks a boolean state as affected and defaults it to true', () => {
    click('[data-testid="affected-Defense-invulnerable"]');

    expect(host.value).toEqual({
      Defense: {
        invulnerable: true,
      },
    });
  });

  it('lets a boolean state be explicitly set to false', () => {
    click('[data-testid="affected-Defense-invulnerable"]');
    click('[data-testid="state-value-false-Defense-invulnerable"]');

    expect(host.value).toEqual({
      Defense: {
        invulnerable: false,
      },
    });
  });

  it('shows the DataValue editor only when a numeric state is affected', () => {
    expect(query('tfn-data-value-editor')).toBeNull();

    click('[data-testid="affected-Resource-meter"]');

    expect(host.value).toEqual({
      Resource: {
        meter: { relative: 50 },
      },
    });
    expect(query('tfn-data-value-editor')).not.toBeNull();
  });

  function click(selector: string): void {
    const element = query(selector) as HTMLButtonElement | HTMLInputElement | null;
    element?.click();
    fixture.detectChanges();
  }

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function queryAll(selector: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
  }
});
