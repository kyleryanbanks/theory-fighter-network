import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EntityDetailShell } from './entity-detail-shell';
import { ExpansionPanel } from '../exp-panel/expansion-panel';

@Component({
  imports: [EntityDetailShell, ExpansionPanel],
  template: `<tfn-entity-detail-shell title="Ryu" entityKey="character-ryu" backLabel="Back to Characters" [backLink]="['/characters']" [metadata]="metadata"><p detail-notes>Notes content</p><tfn-expansion-panel header="Character data"><p data-testid="unique-data">Unique content</p></tfn-expansion-panel></tfn-entity-detail-shell>`,
})
class HostComponent {
  readonly metadata = { createdAt: new Date(), lastUpdatedAt: new Date() };
}

describe('EntityDetailShell', () => {
  let fixture: ComponentFixture<HostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });
  it('renders shared navigation, projected data, and metadata last', () => {
    const element = fixture.nativeElement as HTMLElement;
    const panels = Array.from(element.querySelectorAll('tfn-expansion-panel'));
    expect(element.textContent).toContain('Back to Characters');
    expect(element.querySelector('[data-testid="unique-data"]')).not.toBeNull();
    expect(element.querySelector('.entity-detail-shell__unique-content [data-testid="unique-data"]')).not.toBeNull();
    expect(panels.at(-1)?.textContent).toContain('Metadata');
  });
});
