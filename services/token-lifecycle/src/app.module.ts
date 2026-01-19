import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';
import {
  AuditLogger,
  CorrelationIdMiddleware,
  IdempotencyMiddleware,
  InMemoryIdempotencyStore,
  OutboxService,
  RbacGuard,
} from '@tokenizasyon/common';

@Module({
  controllers: [LifecycleController],
  providers: [LifecycleService, AuditLogger, OutboxService, InMemoryIdempotencyStore, RbacGuard],
})
export class AppModule implements NestModule {
  constructor(private readonly store: InMemoryIdempotencyStore) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(IdempotencyMiddleware).forRoutes('*');
  }
}
