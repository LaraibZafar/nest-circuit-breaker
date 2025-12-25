/**
 * nest-circuit-breaker
 * A NestJS circuit breaker implementation with decorators for resilient microservices
 */

// Export module
export { CircuitBreakerModule } from './circuit-breaker.module';

// Export decorators
export {
  CircuitBreaker,
  UseCircuitBreaker,
} from './decorators/circuit-breaker.decorator';

// Export interfaces and types
export type {
  CircuitBreakerConfig,
  CircuitBreakerModuleOptions,
} from './types/circuit-breaker.types';

// In case you need to use the service directly
export { CircuitBreakerService } from './services/circuit-breaker.service';

// Export constants and enums
export { CircuitBreakerState } from './constants';
