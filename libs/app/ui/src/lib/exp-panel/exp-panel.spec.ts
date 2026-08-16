import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpansionPanel } from './exp-panel';

@Component({
  imports: [ExpansionPanel],
  template: `
    <tfn-expansion-panel secondary>
      <span tfnExpansionPanelSummary>Entity summary</span>
      <p data-testid="panel-body">Nested content</p>
    </tfn-expansion-panel>
  `,
})
class HostComponent {}

describe('ExpPanel', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('projects summary content into summary and body content into details', () => {
    const summary = fixture.nativeElement.querySelector('summary');
    const body = fixture.nativeElement.querySelector('[data-testid="panel-body"]');

    expect(summary.textContent).toContain('Entity summary');
    expect(body.textContent).toContain('Nested content');
  });

  it('uses the secondary variant for nested panels', () => {
    const details = fixture.nativeElement.querySelector('details');

    expect(details.classList.contains('exp-panel--secondary')).toBe(true);
  });

  it('uses native details expansion semantics', () => {
    const details = fixture.nativeElement.querySelector('details');
    const summary = fixture.nativeElement.querySelector('summary');

    expect(details.open).toBe(false);
    summary.click();
    expect(details.open).toBe(true);
  });
});
