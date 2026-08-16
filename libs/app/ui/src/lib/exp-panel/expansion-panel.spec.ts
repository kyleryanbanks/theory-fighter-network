import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpansionPanel } from './expansion-panel';

@Component({
  imports: [ExpansionPanel],
  template: `
    <tfn-expansion-panel
      secondary
      header="Entity summary"
      subheader="Entity key"
    >
      <p data-testid="panel-body">Nested content</p>
    </tfn-expansion-panel>
  `,
})
class HostComponent {}

@Component({
  imports: [ExpansionPanel],
  template: `
    <tfn-expansion-panel
      subsection
      header="Entity header"
      subheader="Entity subheader"
    >
      <p data-testid="panel-body">Nested content</p>
    </tfn-expansion-panel>
  `,
})
class InputHostComponent {}

describe('ExpPanel', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders header content and body content into details', () => {
    const summary = fixture.nativeElement.querySelector('summary');
    const body = fixture.nativeElement.querySelector('[data-testid="panel-body"]');

    expect(summary.textContent).toContain('Entity summary');
    expect(summary.textContent).toContain('Entity key');
    expect(body.textContent).toContain('Nested content');
  });

  it('uses the secondary variant for nested panels', () => {
    const details = fixture.nativeElement.querySelector('details');

    expect(details.classList.contains('exp-panel--secondary')).toBe(true);
    expect(details.querySelector('h5')).not.toBeNull();
  });

  it('supports a compact subsection variant for deeper nesting', () => {
    const subsectionFixture = TestBed.createComponent(InputHostComponent);
    subsectionFixture.detectChanges();

    const panel = subsectionFixture.nativeElement.querySelector(
      'tfn-expansion-panel'
    );
    expect(panel.classList.contains('exp-panel-host--subsection')).toBe(true);
    const details = subsectionFixture.nativeElement.querySelector('details');
    expect(details.classList.contains('exp-panel--subsection')).toBe(true);
    expect(details.querySelector('h5')).not.toBeNull();
  });

  it('uses native details expansion semantics', () => {
    const details = fixture.nativeElement.querySelector('details');
    const summary = fixture.nativeElement.querySelector('summary');

    expect(details.open).toBe(false);
    summary.click();
    expect(details.open).toBe(true);
  });

  it('renders optional header and subheader inputs', () => {
    const inputFixture = TestBed.createComponent(InputHostComponent);
    inputFixture.detectChanges();

    const summary = inputFixture.nativeElement.querySelector('summary');
    expect(summary.querySelector('h5')).not.toBeNull();
    expect(summary.textContent).toContain('Entity header');
    expect(summary.textContent).toContain('Entity subheader');
  });
});
