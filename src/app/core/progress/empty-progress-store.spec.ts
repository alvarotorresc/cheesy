import { TestBed } from '@angular/core/testing';
import { emptyProgressStoreLoader } from './empty-progress-store';
import { ProgressService } from './progress.service';
import { PROGRESS_STORE_LOADER } from './progress-store';

describe('emptyProgressStoreLoader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PROGRESS_STORE_LOADER, useValue: emptyProgressStoreLoader }],
    });
  });

  it('should give the progress of a first visit, ready and empty', async () => {
    const progress = TestBed.inject(ProgressService);

    expect(await progress.lines()).toEqual([]);
    expect(await progress.endgames()).toEqual([]);
    expect(progress.status()).toBe('ready');
  });

  it('should keep nothing that is saved', async () => {
    const progress = TestBed.inject(ProgressService);

    await progress.recordEndgame('lucena-position');

    expect(await progress.endgames()).toEqual([]);
  });
});
