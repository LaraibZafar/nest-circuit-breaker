export interface CircuitBreakerConfig {
  threshold?: number;
  timeout?: number;
  fallbackResult?: any;
  key?: string /** @description Optional custom key for independent circuit breaker state for a method */;
}

export interface CircuitBreakerModuleOptions {
  serviceName: string;
  redisHost: string;
  redisPort: number;
}
