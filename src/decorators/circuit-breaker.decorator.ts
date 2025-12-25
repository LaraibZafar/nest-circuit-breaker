import { Inject } from '@nestjs/common';
import 'reflect-metadata';
import { CircuitBreakerConfig } from '../types/circuit-breaker.types';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import {
  CIRCUIT_BREAKER_CLASS_CONFIG,
  CIRCUIT_BREAKER_METHOD_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../constants';

/**
 * @description
 * Class-level decorator for circuit breaker configuration.
 * Sets default configuration for all methods in the service.
 *
 * @param config - Optional circuit breaker configuration
 *
 * @example
 * @Injectable()
 * @CircuitBreaker({ threshold: 5, timeout: 15000 })
 * export class MyService {
 *   // methods here
 * }
 *
 */
export function CircuitBreaker(config?: CircuitBreakerConfig): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(CIRCUIT_BREAKER_CLASS_CONFIG, config || {}, target);
  };
}

/**
 * @description
 * Method-level decorator to enable circuit breaker for a specific method.
 * Configuration provided here will override class-level configuration.
 *
 * @param config - Optional circuit breaker configuration
 * @example
 *
 * @UseCircuitBreaker({
 *   fallbackResult: { status: 'unavailable' },
 *   key: 'myMethod'
 * })
 * async myMethod(): Promise<any> {
 *   // method implementation
 * }
 *
 */
export function UseCircuitBreaker(
  config?: CircuitBreakerConfig,
): MethodDecorator {
  // Inject the CircuitBreakerService property into the class if not already done
  const injectCircuitBreaker = Inject(CircuitBreakerService);

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    // Inject CircuitBreakerService into the class
    injectCircuitBreaker(target, '__circuitBreakerService__');

    // Store the method-level configuration in metadata
    const methodConfig = config || {};
    Reflect.defineMetadata(
      CIRCUIT_BREAKER_METHOD_CONFIG,
      methodConfig,
      descriptor.value as object,
    );

    // Store the original method
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalMethod = descriptor.value;

    console.log('UseCircuitBreaker decorator applied', config, propertyKey);

    // Replace the method with a wrapped version
    descriptor.value = async function (
      this: Record<string, unknown>,
      ...args: unknown[]
    ) {
      // Get the circuit breaker service from the instance
      const circuitBreakerService: CircuitBreakerService = this
        .__circuitBreakerService__ as CircuitBreakerService;

      if (!circuitBreakerService) {
        console.error(
          'CircuitBreakerService not injected. Make sure CircuitBreakerModule is imported.',
        );
        // Fallback to calling the original method without circuit breaker
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return originalMethod.apply(this, args);
      }

      // Get class-level config
      const classConfig: CircuitBreakerConfig =
        (Reflect.getMetadata(
          CIRCUIT_BREAKER_CLASS_CONFIG,
          this.constructor as object,
        ) as CircuitBreakerConfig) || {};

      // Merge configurations
      const finalConfig: CircuitBreakerConfig = {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        ...classConfig,
        ...methodConfig,
      };

      // Generate Redis key
      const serviceName = (this.constructor as { name: string }).name;
      let redisKey: string;
      if (finalConfig.key) {
        redisKey = `circuit-breaker:${serviceName}:${finalConfig.key}`;
      } else {
        redisKey = `circuit-breaker:${serviceName}`;
      }

      console.log('Executing with circuit breaker', {
        redisKey,
        config: finalConfig,
      });

      // Execute the original method with circuit breaker protection
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return circuitBreakerService.execute(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        () => originalMethod.apply(this, args),
        redisKey,
        finalConfig.threshold!,
        finalConfig.timeout!,
        finalConfig.fallbackResult,
      );
    };

    return descriptor;
  };
}
