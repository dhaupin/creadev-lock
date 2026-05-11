import { describe, it, expect } from 'vitest';
import { Lock } from '../src/index';

describe('Lock', () => {
  it('creates lock', () => {
    const lock = new Lock();
    expect(lock).toBeDefined();
  });
});
