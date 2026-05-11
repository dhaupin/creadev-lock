import { describe, it, expect, beforeEach } from 'vitest';
import { Lock, createLock, acquire, release } from '../src/index';

describe('Lock', () => {
  let lock: Lock;
  beforeEach(() => { lock = createLock(); });
  it('creates lock', () => { expect(lock).toBeDefined(); });
});
