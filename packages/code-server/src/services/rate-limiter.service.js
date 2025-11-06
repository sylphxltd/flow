/**
 * Rate Limiter Service
 * SECURITY: OWASP API4 (Unrestricted Resource Consumption)
 *
 * Implementation: Token bucket algorithm with sliding window
 * - Efficient memory usage (auto-cleanup)
 * - Supports multiple rate limits per endpoint
 * - Per-client isolation (IP or userId)
 */
/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
    buckets = new Map();
    config;
    cleanupInterval = null;
    constructor(config) {
        this.config = config;
        // Cleanup old buckets every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    /**
     * Check if request should be allowed
     * Returns: { allowed: boolean, remaining: number, resetAt: number }
     */
    check(identifier) {
        const key = this.config.keyGenerator
            ? this.config.keyGenerator(identifier)
            : identifier;
        const now = Date.now();
        let bucket = this.buckets.get(key);
        if (!bucket) {
            // First request from this identifier
            bucket = {
                tokens: this.config.maxRequests - 1, // Consume 1 token
                lastRefill: now,
            };
            this.buckets.set(key, bucket);
            return {
                allowed: true,
                remaining: bucket.tokens,
                resetAt: now + this.config.windowMs,
            };
        }
        // Refill tokens based on time elapsed
        const timeSinceLastRefill = now - bucket.lastRefill;
        const tokensToAdd = Math.floor((timeSinceLastRefill / this.config.windowMs) * this.config.maxRequests);
        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
        // Check if we have tokens available
        if (bucket.tokens > 0) {
            bucket.tokens--;
            return {
                allowed: true,
                remaining: bucket.tokens,
                resetAt: bucket.lastRefill + this.config.windowMs,
            };
        }
        // Rate limit exceeded
        return {
            allowed: false,
            remaining: 0,
            resetAt: bucket.lastRefill + this.config.windowMs,
        };
    }
    /**
     * Reset rate limit for a specific identifier
     * Useful for testing or manual override
     */
    reset(identifier) {
        const key = this.config.keyGenerator
            ? this.config.keyGenerator(identifier)
            : identifier;
        this.buckets.delete(key);
    }
    /**
     * Reset all rate limits
     */
    resetAll() {
        this.buckets.clear();
    }
    /**
     * Cleanup expired buckets
     * Removes buckets that haven't been used in 2x window time
     */
    cleanup() {
        const now = Date.now();
        const expirationTime = this.config.windowMs * 2;
        for (const [key, bucket] of this.buckets.entries()) {
            if (now - bucket.lastRefill > expirationTime) {
                this.buckets.delete(key);
            }
        }
    }
    /**
     * Stop cleanup interval
     * Call when shutting down
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    /**
     * Get current bucket status for identifier
     * Useful for debugging/monitoring
     */
    getStatus(identifier) {
        const key = this.config.keyGenerator
            ? this.config.keyGenerator(identifier)
            : identifier;
        const bucket = this.buckets.get(key);
        return bucket ? { ...bucket } : null;
    }
}
/**
 * Pre-configured rate limiters for different endpoint types
 */
// Strict: For sensitive mutations (create, delete)
export const strictRateLimiter = new RateLimiter({
    maxRequests: 10, // 10 requests
    windowMs: 60 * 1000, // per minute
});
// Moderate: For regular mutations (update)
export const moderateRateLimiter = new RateLimiter({
    maxRequests: 30, // 30 requests
    windowMs: 60 * 1000, // per minute
});
// Lenient: For queries and subscriptions
export const lenientRateLimiter = new RateLimiter({
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // per minute
});
// Streaming: For subscriptions with high message volume
export const streamingRateLimiter = new RateLimiter({
    maxRequests: 5, // 5 concurrent streams
    windowMs: 60 * 1000, // per minute
});
//# sourceMappingURL=rate-limiter.service.js.map