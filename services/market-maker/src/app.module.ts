import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MarketMakerController } from './market-maker.controller';
import { MarketMakerService } from './market-maker.service';
import {
  AuditLogger,
  CorrelationIdMiddleware,
  IdempotencyMiddleware,
  InMemoryIdempotencyStore,
  OutboxService,
  RbacGuard,
} from '@tokenizasyon/common';

@Module({
  controllers: [MarketMakerController],
  providers: [MarketMakerService, AuditLogger, OutboxService, InMemoryIdempotencyStore, RbacGuard],
})
export class AppModule implements NestModule {
  constructor(private readonly store: InMemoryIdempotencyStore) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(IdempotencyMiddleware).forRoutes('*');
  }
}
