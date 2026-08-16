import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { LocalGuideFacadeStore } from '@theory-fighter-network/data';
import { EntityDetail } from './entity-detail';

describe('EntityDetail', () => {
  let fixture: ComponentFixture<EntityDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { entityType: 'character' },
              paramMap: { get: () => 'character-ryu' },
            },
          },
        },
        {
          provide: LocalGuideFacadeStore,
          useValue: {
            guide: () => ({
              entities: {
                characters: [
                  {
                    name: 'Ryu',
                    semanticKey: 'character-ryu',
                    meta: { createdAt: new Date(), lastUpdatedAt: new Date() },
                  },
                ],
              },
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDetail);
    fixture.detectChanges();
  });

  it('renders the requested entity name and semantic key', () => {
    expect(fixture.nativeElement.textContent).toContain('Ryu');
    expect(fixture.nativeElement.textContent).toContain('character-ryu');
  });
});
