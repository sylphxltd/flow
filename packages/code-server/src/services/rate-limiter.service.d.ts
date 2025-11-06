/**
 * Rate Limiter Service
 * SECURITY: OWASP API4 (Unrestricted Resource Consumption)
 *
 * Implementation: Token bucket algorithm with sliding window
 * - Efficient memory usage (auto-cleanup)
 * - Supports multiple rate limits per endpoint
 * - Per-client isolation (IP or userId)
 */
export interface RateLimitConfig {
    /**
     * Maximum requests per window
     */
    maxRequests: number;
    /**
     * Time window in milliseconds
     */
    windowMs: number;
    /**
     * Optional: Custom identifier function
     * Default: IP address or userId
     */
    keyGenerator?: (identifier: string) => string;
}
/**
 * Rate limiter using token bucket algorithm
 */
export declare class RateLimiter {
    private buckets;
    private config;
    private cleanupInterval;
    constructor(config: RateLimitConfig);
    /**
     * Check if request should be allowed
     * Returns: { allowed: boolean, remaining: number, resetAt: number }
     */
    check(identifier: string): {
        allowed: boolean;
        remaining: number;
        resetAt: number;
    };
    /**
     * Reset rate limit for a specific identifier
     * Useful for testing or manual override
     */
    reset(identifier: string): void;
    /**
     * Reset all rate limits
     */
    resetAll(): void;
    /**
     * Cleanup expired buckets
     * Removes buckets that haven't been used in 2x window time
     */
    private cleanup;
    /**
     * Stop cleanup interval
     * Call when shutting down
     */
    destroy(): void;
    /**
     * Get current bucket status for identifier
     * Useful for debugging/monitoring
     */
    getStatus(identifier: string): {
        tokens: number;
        lastRefill: number;
    } | null;
}
/**
 * Pre-configured rate limiters for different endpoint types
 */
export declare const strictRateLimiter: RateLimiter;
export declare const moderateRateLimiter: RateLimiter;
export declare const lenientRateLimiter: RateLimiter;
export declare const streamingRateLimiter: RateLimiter;
//# sourceMappingURL=rate-limiter.service.d.ts.map