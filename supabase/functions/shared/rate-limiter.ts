import Redis from 'ioredis';

const redis = new Redis();

const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 100; // Maximum requests

export const rateLimiter = async (key: string) => {
    const current = await redis.get(key);
    if (current) {
        if (parseInt(current) >= RATE_LIMIT_MAX) {
            throw new Error('Rate limit exceeded');
        } else {
            await redis.incr(key);
        }
    } else {
        await redis.set(key, 1, 'EX', RATE_LIMIT_WINDOW);
    }
};