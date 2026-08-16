import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TfnLink } from './link';

@Component({
  imports: [TfnLink],
  template: '<tfn-link [routerLink]="[\'/moves\', \'move-1\']">Open details</tfn-link>',
})
class HostComponent {}

@Component({
  imports: [TfnLink],
  template: '<tfn-link routerLink="/characters">Back to Characters</tfn-link>',
})
class StringLinkHostComponent {}

describe('TfnLink', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders an Angular router link with action styling', () => {
    const link = fixture.nativeElement.querySelector('a');

    expect(link).not.toBeNull();
    expect(link.textContent).toContain('Open details');
    expect(link.classList.contains('tfn-link')).toBe(true);
    expect(link.getAttribute('href')).toBe('/moves/move-1');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('role')).not.toBe('button');
  });

  it('supports string RouterLink commands', () => {
    const stringFixture = TestBed.createComponent(StringLinkHostComponent);
    stringFixture.detectChanges();

    const link = stringFixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/characters');
    expect(link.textContent).toContain('Back to Characters');
  });
});
