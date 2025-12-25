import { DynamicModule, Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RedisService } from './services/redis.service';
import { CircuitBreakerModuleOptions } from './types/circuit-breaker.types';
import { CIRCUIT_BREAKER_CONFIG } from './constants';

@Global() // Makes it available globally so you don't need to import in every module
@Module({})
export class CircuitBreakerModule {
  /**
   * Register the Circuit Breaker module with required configuration
   * @param options - Configuration options for the circuit breaker
   * @example
   * CircuitBreakerModule.forRoot({
   *   serviceName: 'my-api-service',
   *   redisHost: 'localhost',
   *   redisPort: 6379,
   * })
   */
  static forRoot(options: CircuitBreakerModuleOptions): DynamicModule {
    if (
      !options.serviceName ||
      !options.redisHost ||
      options.redisPort === undefined
    ) {
      throw new Error(
        'CircuitBreakerModule requires serviceName, redisHost, and redisPort to be configured',
      );
    }

    return {
      module: CircuitBreakerModule,
      providers: [
        {
          provide: CIRCUIT_BREAKER_CONFIG,
          useValue: options,
        },
        RedisService,
        CircuitBreakerService,
      ],
      exports: [CircuitBreakerService],
    };
  }

  /**
   * Register the Circuit Breaker module asynchronously
   * Useful when configuration depends on other services or async operations
   * @param options - Async configuration options
   * @example
   * CircuitBreakerModule.forRootAsync({
   *   inject: [ConfigService],
   *   useFactory: (configService: ConfigService) => ({
   *     serviceName: configService.get('SERVICE_NAME'),
   *     redisHost: configService.get('REDIS_HOST'),
   *     redisPort: configService.get('REDIS_PORT'),
   *   }),
   * })
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<CircuitBreakerModuleOptions> | CircuitBreakerModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: CircuitBreakerModule,
      providers: [
        {
          provide: CIRCUIT_BREAKER_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        RedisService,
        CircuitBreakerService,
      ],
      exports: [CircuitBreakerService],
    };
  }
}
