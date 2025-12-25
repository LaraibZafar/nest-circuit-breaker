import { HttpException, Inject, Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import {
  CIRCUIT_BREAKER_CONFIG,
  CIRCUIT_BREAKER_KEY_PREFIX,
  CircuitBreakerState,
  HTTP_EXCEPTIONS,
} from '../constants';
import type { CircuitBreakerModuleOptions } from '../types/circuit-breaker.types';

@Injectable()
export class CircuitBreakerService {
  constructor(
    private readonly redisService: RedisService,
    @Inject(CIRCUIT_BREAKER_CONFIG)
    private readonly config: CircuitBreakerModuleOptions,
  ) {}

  private getCircuitBreakerServiceName(): string {
    return this.config.serviceName ?? 'service';
  }

  private getCircuitBreakerKey(key: string): string {
    return `${CIRCUIT_BREAKER_KEY_PREFIX}:${this.getCircuitBreakerServiceName()}:${key}`;
  }

  private async getCircuitBreakerStatus(
    key: string,
    threshold: number,
  ): Promise<CircuitBreakerState> {
    const count = await this.redisService.get(this.getCircuitBreakerKey(key));
    if (!count) {
      return CircuitBreakerState.CLOSED;
    }

    if (count && parseInt(count) >= threshold) {
      return CircuitBreakerState.OPEN;
    }

    return CircuitBreakerState.CLOSED;
  }

  private async handleCircuitBreakerError(
    key: string,
    timeout: number,
  ): Promise<void> {
    const circuitBreakerKey = this.getCircuitBreakerKey(key);
    const results = await this.redisService.executePipeline((pipeline) => {
      pipeline.incr(circuitBreakerKey);
      pipeline.expire(circuitBreakerKey, Math.floor(timeout / 1000));
    });

    if (results?.[0]?.[0] !== null) {
      console.error(
        'Failed to increment circuit breaker error count',
        results?.[0]?.[0],
      );
      throw new Error('Failed to increment circuit breaker error count');
    }
    if (results?.[1]?.[0] !== null) {
      console.error(
        'Failed to set circuit breaker error count expiration',
        results?.[1]?.[0],
      );
      throw new Error('Failed to set circuit breaker error count expiration');
    }
  }

  public async execute<T>(
    fn: () => Promise<T>,
    key: string,
    threshold: number,
    timeout: number,
    fallbackResult: T | null = null,
  ): Promise<T> {
    const circuitBreakerStatus = await this.getCircuitBreakerStatus(
      key,
      threshold,
    );

    if (circuitBreakerStatus === CircuitBreakerState.OPEN) {
      if (fallbackResult) {
        return fallbackResult;
      }

      throw new HttpException(
        'Service is unavailable - Circuit Breaker is open',
        HTTP_EXCEPTIONS.SERVICE_UNAVAILABLE,
      );
    }

    if (circuitBreakerStatus === CircuitBreakerState.CLOSED) {
      try {
        const result = await fn();

        /** @todo maybe do this without awaiting */
        await this.redisService.del(this.getCircuitBreakerKey(key));

        return result;
      } catch (error) {
        console.log('CircuitBreakerService error', error);
        if (
          error instanceof HttpException &&
          (error.getStatus() >= 500 || error.getStatus() === 429)
        ) {
          await this.handleCircuitBreakerError(key, timeout);
        }
        throw error;
      }
    }

    return fallbackResult as T;
  }
}
