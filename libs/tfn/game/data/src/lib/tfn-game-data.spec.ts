import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TfnGameData } from './tfn-game-data';

describe('TfnGameData', () => {
  let component: TfnGameData;
  let fixture: ComponentFixture<TfnGameData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfnGameData],
    }).compileComponents();

    fixture = TestBed.createComponent(TfnGameData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
