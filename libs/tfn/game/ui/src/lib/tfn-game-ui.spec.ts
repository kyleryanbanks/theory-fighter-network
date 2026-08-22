import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TfnGameUi } from './tfn-game-ui';

describe('TfnGameUi', () => {
  let component: TfnGameUi;
  let fixture: ComponentFixture<TfnGameUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfnGameUi],
    }).compileComponents();

    fixture = TestBed.createComponent(TfnGameUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
