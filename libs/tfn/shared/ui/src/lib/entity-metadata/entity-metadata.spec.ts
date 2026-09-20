import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityMetadataView } from './entity-metadata';

describe('EntityMetadataView', () => {
  let fixture: ComponentFixture<EntityMetadataView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityMetadataView],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityMetadataView);
    fixture.componentRef.setInput('metadata', {
      createdAt: new Date('2026-01-01T00:00:00Z'),
      lastUpdatedAt: new Date('2026-01-02T00:00:00Z'),
      label: 'Working label',
      validatedVersion: '1.0.0',
    });
    fixture.detectChanges();
  });

  it('renders metadata fields without rendering notes', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Working label');
    expect(text).toContain('1.0.0');
    expect(text).toContain('Created');
    expect(text).toContain('Last updated');
    expect(text).not.toContain('Notes');
  });
});
