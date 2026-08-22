import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TfnGameFeature } from './tfn-game-feature';

describe('TfnGameFeature', () => {
  let component: TfnGameFeature;
  let fixture: ComponentFixture<TfnGameFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfnGameFeature],
    }).compileComponents();

    fixture = TestBed.createComponent(TfnGameFeature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
