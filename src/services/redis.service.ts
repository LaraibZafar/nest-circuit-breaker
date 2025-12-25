import { Inject, Injectable } from '@nestjs/common';
import type { Redis as RedisClient, ChainableCommander } from 'ioredis';
import Redis from 'ioredis';
import { CIRCUIT_BREAKER_CONFIG } from '../constants';
import type { CircuitBreakerModuleOptions } from '../types/circuit-breaker.types';

@Injectable()
export class RedisService {
  private readonly redis: RedisClient;

  constructor(
    @Inject(CIRCUIT_BREAKER_CONFIG)
    private readonly config: CircuitBreakerModuleOptions,
  ) {
    this.redis = new Redis({
      host: this.config.redisHost ?? 'localhost',
      port: this.config.redisPort ?? 6379,
    });
  }
  public async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }
  public async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }
  public async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  public async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }
  public async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async executePipeline(
    commands: (pipeline: ChainableCommander) => void,
  ): Promise<[error: Error | null, result: unknown][] | null> {
    const pipeline = this.redis.pipeline();

    commands(pipeline);

    return await pipeline.exec();
  }
}
