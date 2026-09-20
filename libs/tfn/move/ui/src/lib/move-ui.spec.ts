import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoveUi } from './move-ui';

describe('MoveUi', () => {
  let component: MoveUi;
  let fixture: ComponentFixture<MoveUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveUi],
    }).compileComponents();

    fixture = TestBed.createComponent(MoveUi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
