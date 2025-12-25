# NestJS Circuit Breaker

A robust and easy-to-use circuit breaker implementation for NestJS applications with decorator-based usage with redis as a datastore

[![npm version](https://badge.fury.io/js/nest-circuit-breaker.svg)](https://badge.fury.io/js/nest-circuit-breaker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✨ **Decorator-based API** - Simple `@CircuitBreaker` and `@UseCircuitBreaker` decorators  
🔄 **Redis-backed** - Distributed circuit breaker state across multiple instances  
🎯 **Type-safe** - Full TypeScript support  
⚙️ **Configurable** - Class-level and method-level configuration  
🛡️ **Resilient** - Automatic fallback handling

## Installation

```bash
npm install nest-circuit-breaker ioredis
# or
yarn add nest-circuit-breaker ioredis
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { CircuitBreakerModule } from 'nest-circuit-breaker';

@Module({
  imports: [
    CircuitBreakerModule.forRoot({
      serviceName: 'my-api-service',
      redisHost: 'localhost',
      redisPort: 6379,
    }),
  ],
})
export class AppModule {}
```

### 2. Use the Decorators (Note I'm showcasing both the decorators, but you should only need one)

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreaker, UseCircuitBreaker } from 'nest-circuit-breaker';

@Injectable()
@CircuitBreaker({ threshold: 5, timeout: 30000 })
export class PaymentService {
  @UseCircuitBreaker({
    threshold: 3,
    timeout: 15000,
    fallbackResult: {
      status: 'unavailable',
      message: 'Payment service is temporarily down',
    },
    key: 'processPayment',
  })
  async processPayment(amount: number): Promise<any> {
    // Your external API call here
    const response = await fetch('https://payment-api.example.com/charge', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return response.json();
  }

  @UseCircuitBreaker({ key: 'checkBalance' })
  async checkBalance(userId: string): Promise<number> {
    // Another protected method
    const response = await fetch(
      `https://payment-api.example.com/balance/${userId}`,
    );
    return response.json();
  }
}
```

## Configuration

### Module Options

| Option        | Type     | Required | Description                                       |
| ------------- | -------- | -------- | ------------------------------------------------- |
| `serviceName` | `string` | Yes      | Unique name for your service (used in Redis keys) |
| `redisHost`   | `string` | Yes      | Redis server hostname                             |
| `redisPort`   | `number` | Yes      | Redis server port                                 |

### Circuit Breaker Options

| Option           | Type     | Default     | Description                                      |
| ---------------- | -------- | ----------- | ------------------------------------------------ |
| `threshold`      | `number` | `3`         | Number of failures before opening the circuit    |
| `timeout`        | `number` | `10000`     | Time (ms) before attempting to close the circuit |
| `fallbackResult` | `any`    | `null`      | Value to return when circuit is open             |
| `key`            | `string` | `undefined` | Custom key for independent circuit breaker state |

## Advanced Usage

### Async Configuration

Use `forRootAsync` when your configuration depends on other services:

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CircuitBreakerModule } from 'nest-circuit-breaker';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CircuitBreakerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME'),
        redisHost: configService.get('REDIS_HOST'),
        redisPort: configService.get('REDIS_PORT'),
      }),
    }),
  ],
})
export class AppModule {}
```

### Manual Circuit Breaker Control

For advanced use cases, inject `CircuitBreakerService` directly:

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from 'nest-circuit-breaker';

@Injectable()
export class CustomService {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  async customLogic() {
    return this.circuitBreaker.execute(
      async () => {
        // Your logic here
        return await someExternalCall();
      },
      'custom-operation', // key
      5, // threshold
      20000, // timeout
      { default: 'value' }, // fallback
    );
  }
}
```

### Class-Level Defaults

Set defaults for all methods in a class:

```typescript
@Injectable()
@CircuitBreaker({ threshold: 5, timeout: 30000 })
export class ApiService {
  @UseCircuitBreaker({ key: 'method1' })
  async method1() {
    // Inherits threshold: 5, timeout: 30000
  }

  @UseCircuitBreaker({
    threshold: 2, // Override class-level setting
    key: 'method2',
  })
  async method2() {
    // Uses threshold: 2, timeout: 30000 (inherited)
  }
}
```

## How It Works

The circuit breaker operates in two states:

### 🟢 CLOSED (Normal Operation)

- All requests pass through
- Failures are counted
- When failures reach the threshold, circuit opens

### 🔴 OPEN (Failing Fast)

- Requests are blocked immediately
- Fallback result is returned (or exception thrown)
- After the timeout period, circuit automatically resets

### State Transitions

```
CLOSED --[threshold failures]--> OPEN
  ↑                                |
  └────[timeout expires]───────────┘
```

## Error Handling

The circuit breaker only trips on:

- HTTP 5xx errors (500-599)
- HTTP 429 (Too Many Requests)

These indicate service degradation. Client errors (4xx) don't trip the circuit.

## Monitoring

Export `CircuitBreakerState` for monitoring:

```typescript
import { CircuitBreakerState } from 'nest-circuit-breaker';

if (currentState === CircuitBreakerState.OPEN) {
  console.warn('Circuit breaker is open - service degraded');
}
```

## Testing

In your tests, you can mock the circuit breaker:

```typescript
import { CircuitBreakerService } from 'nest-circuit-breaker';

const mockCircuitBreaker = {
  execute: jest.fn((fn) => fn()),
};

// In your test module
{
  providers: [
    {
      provide: CircuitBreakerService,
      useValue: mockCircuitBreaker,
    },
  ],
}
```

## Best Practices

1. **Use unique keys** - Set custom `key` for each method to avoid shared circuit state
2. **Set appropriate thresholds** - Balance between fault tolerance and responsiveness
3. **Provide fallbacks** - Always set `fallbackResult` for better user experience
4. **Monitor circuit states** - Track when circuits open to identify systemic issues
5. **Test failure scenarios** - Ensure your fallbacks work as expected

## Requirements

- NestJS 10.x or 11.x
- Node.js 16+
- Redis 5.x+
- TypeScript 5.x+

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you have any questions or issues, please open an issue on GitHub.

## Author

Laraib Zafar

---

Made with ❤️ for the NestJS community
