import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, firstValueFrom, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import 'reflect-metadata';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { CircuitBreakerConfig } from '../types/circuit-breaker.types';
import {
  CIRCUIT_BREAKER_CLASS_CONFIG,
  CIRCUIT_BREAKER_METHOD_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../constants';

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  private getCircuitBreakerConfig(
    context: ExecutionContext,
  ): CircuitBreakerConfig {
    const targetClass = context.getClass();
    const targetMethod = context.getHandler();

    const serviceName = targetClass.name;

    const classConfig: CircuitBreakerConfig = Reflect.getMetadata(
      CIRCUIT_BREAKER_CLASS_CONFIG,
      targetClass,
    ) as CircuitBreakerConfig;

    const methodConfig: CircuitBreakerConfig = Reflect.getMetadata(
      CIRCUIT_BREAKER_METHOD_CONFIG,
      targetMethod,
    ) as CircuitBreakerConfig;

    const circuitBreakerConfig: CircuitBreakerConfig = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...classConfig,
      ...methodConfig,
    };

    if (circuitBreakerConfig.key) {
      circuitBreakerConfig.key = `circuit-breaker:${serviceName}:${circuitBreakerConfig.key}`;
    } else {
      circuitBreakerConfig.key = `circuit-breaker:${serviceName}`;
    }

    return circuitBreakerConfig;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const circuitBreakerConfig = this.getCircuitBreakerConfig(context);
    console.log(
      'CircuitBreakerInterceptor circuitBreakerConfig',
      circuitBreakerConfig,
    );
    return from(
      this.circuitBreakerService.execute(
        async () => {
          return (await firstValueFrom(next.handle())) as unknown;
        },
        circuitBreakerConfig.key!,
        circuitBreakerConfig.threshold!,
        circuitBreakerConfig.timeout!,
        circuitBreakerConfig.fallbackResult,
      ),
    ).pipe(
      switchMap((result) => {
        return from(Promise.resolve(result));
      }),
    );
  }
}
