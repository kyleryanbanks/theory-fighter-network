import { TestBed } from '@angular/core/testing';

import { GameLoopService } from './game-loop.service';

describe('GameLoopService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GameLoopService = TestBed.get(GameLoopService);
    expect(service).toBeTruthy();
  });
});
