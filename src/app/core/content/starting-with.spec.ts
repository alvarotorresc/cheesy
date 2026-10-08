import { ApplicationRef, Injector, resource, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { startingWith } from './starting-with';

describe('startingWith', () => {
  const pending = () => {
    let resolve!: (value: string) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<string>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    return { promise, resolve, reject };
  };

  const create = (load: () => Promise<string>, enabled = signal(true)) =>
    resource({
      params: () => (enabled() ? true : undefined),
      loader: load,
      injector: TestBed.inject(Injector),
    });

  it('should be resolved with the value while the first load is under way', () => {
    const answer = pending();
    const wrapped = startingWith(
      create(() => answer.promise),
      'carried',
    );
    TestBed.tick();

    expect(wrapped.status()).toBe('resolved');
    expect(wrapped.isLoading()).toBe(false);
    expect(wrapped.hasValue()).toBe(true);
    expect(wrapped.value()).toBe('carried');
  });

  it('should follow the resource once it has loaded', async () => {
    const answer = pending();
    const wrapped = startingWith(
      create(() => answer.promise),
      'carried',
    );
    TestBed.tick();

    answer.resolve('loaded');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(wrapped.value()).toBe('loaded');
  });

  it('should report an error of the resource', async () => {
    const answer = pending();
    const wrapped = startingWith(
      create(() => answer.promise),
      'carried',
    );
    TestBed.tick();

    answer.reject(new Error('offline'));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(wrapped.status()).toBe('error');
  });

  it('should stay idle while the resource has nothing to load', () => {
    const wrapped = startingWith(
      create(() => Promise.resolve('loaded'), signal(false)),
      'carried',
    );
    TestBed.tick();

    expect(wrapped.status()).toBe('idle');
  });

  it('should be the resource itself without a value', () => {
    const plain = create(() => pending().promise);

    expect(startingWith(plain, undefined)).toBe(plain);
  });
});
