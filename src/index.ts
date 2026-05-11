/**
 * @creadev.org/lock
 *
 * Session lock handlers, race prevention.
 *
 * EXAMPLES:
 * ```typescript
 * import { Lock } from '@creadev.org/lock';
 *
 * const lock = new Lock();
 * const token = await lock.acquire('agent-1');
 * if (token) { ... }
 * await lock.release('agent-1', token);
 * ```
 * ============================================================================
 */

import { withTimeout } from '@creadev.org/qos/timeout';

// ============================================================================
// CONFIG
// ============================================================================

export interface LockOptions {
  /** Default timeout ms (default: 3600000) */
  defaultTimeoutMs?: number;
  /** Max acquires per minute (default: 10) */
  maxAcquiresPerMinute?: number;
}

export interface LockToken {
  token: string;
  agentId: string;
  acquired: number;
  expires: number;
}

export interface AcquireResult {
  success: boolean;
  token?: string;
  reason?: string;
}

// ============================================================================
// LOCK
// ============================================================================

export class Lock {
  private options: Required<LockOptions>;
  private locks: Map<string, LockToken>;
  private tokenCache: Map<string, string>;
  private acquireAttempts: Map<string, number[]>;
  private startTime: number;

  constructor(options: LockOptions = {}) {
    this.options = {
      defaultTimeoutMs: options.defaultTimeoutMs ?? 3600000,
      maxAcquiresPerMinute: options.maxAcquiresPerMinute ?? 10,
    };

    this.locks = new Map();
    this.tokenCache = new Map();
    this.acquireAttempts = new Map();
    this.startTime = Date.now();
  }

  // ---------------------------------------------------------------------------
  // GENERATE TOKEN
  // ---------------------------------------------------------------------------

  private _generateToken(agentId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${agentId}-${timestamp}-${random}`;
  }

  // ---------------------------------------------------------------------------
  // RATE LIMIT
  // ---------------------------------------------------------------------------

  private _checkRateLimit(agentId: string): boolean {
    const now = Date.now();
    const attempts = this.acquireAttempts.get(agentId) || [];
    const recent = attempts.filter(t => now - t < 60000);
    
    if (recent.length >= this.options.maxAcquiresPerMinute) {
      return false;
    }
    
    recent.push(now);
    this.acquireAttempts.set(agentId, recent);
    return true;
  }

  // ---------------------------------------------------------------------------
  // ACQUIRE
  // ---------------------------------------------------------------------------

  acquire(agentId: string, timeoutMs?: number): AcquireResult {
    // Check rate limit
    if (!this._checkRateLimit(agentId)) {
      return { success: false, reason: 'Rate limit exceeded' };
    }

    // Check if already locked
    const existing = this.locks.get(agentId);
    if (existing) {
      // Check if expired
      if (Date.now() > existing.expires) {
        // Expired - allow new acquire
        this.locks.delete(agentId);
      } else {
        return { success: false, reason: 'Already locked' };
      }
    }

    // Generate token
    const token = this._generateToken(agentId);
    const timeout = timeoutMs ?? this.options.defaultTimeoutMs;
    
    const lockToken: LockToken = {
      token,
      agentId,
      acquired: Date.now(),
      expires: Date.now() + timeout,
    };

    this.locks.set(agentId, lockToken);
    this.tokenCache.set(agentId, token);

    return { success: true, token };
  }

  // ---------------------------------------------------------------------------
  // RELEASE
  // ---------------------------------------------------------------------------

  release(agentId: string, token: string): boolean {
    const lock = this.locks.get(agentId);
    if (!lock) return false;

    // Verify token
    if (lock.token !== token) {
      return false;
    }

    this.locks.delete(agentId);
    this.tokenCache.delete(agentId);
    return true;
  }

  // ---------------------------------------------------------------------------
  // CHECK
  // ---------------------------------------------------------------------------

  isLocked(agentId: string): boolean {
    const lock = this.locks.get(agentId);
    if (!lock) return false;
    
    if (Date.now() > lock.expires) {
      this.locks.delete(agentId);
      this.tokenCache.delete(agentId);
      return false;
    }
    
    return true;
  }

  getLock(agentId: string): LockToken | null {
    return this.locks.get(agentId) ?? null;
  }

  // ---------------------------------------------------------------------------
  // FORCE
  // ---------------------------------------------------------------------------

  /** Force unlock - use with caution */
  forceRelease(agentId: string): boolean {
    this.locks.delete(agentId);
    this.tokenCache.delete(agentId);
    return true;
  }

  /** Clear all locks */
  clear(): void {
    this.locks.clear();
    this.tokenCache.clear();
  }

  // ---------------------------------------------------------------------------
  // STATUS
  // ---------------------------------------------------------------------------

  getStatus() {
    return {
      locks: this.locks.size,
      uptime: Date.now() - this.startTime,
    };
  }
}