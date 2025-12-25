import { CircuitBreakerConfig } from './types/circuit-breaker.types';

export const HTTP_EXCEPTIONS = {
  SERVICE_UNAVAILABLE: 503,
  TOO_MANY_REQUESTS: 429,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
};

export enum CircuitBreakerState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const CIRCUIT_BREAKER_CONFIG = 'CIRCUIT_BREAKER_CONFIG';

export const CIRCUIT_BREAKER_CLASS_CONFIG = 'circuit-breaker:class-config';
export const CIRCUIT_BREAKER_METHOD_CONFIG = 'circuit-breaker:method-config';
export const CIRCUIT_BREAKER_KEY_PREFIX = 'circuit-breaker';

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Required<
  Omit<CircuitBreakerConfig, 'fallbackResult' | 'key'>
> = {
  threshold: 3,
  timeout: 10000,
};
