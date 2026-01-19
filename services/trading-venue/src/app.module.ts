import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { MatchingService } from './matching.service';
import {
  AuditLogger,
  CorrelationIdMiddleware,
  IdempotencyMiddleware,
  InMemoryIdempotencyStore,
  OutboxService,
  RbacGuard,
} from '@tokenizasyon/common';

@Module({
  controllers: [VenueController],
  providers: [MatchingService, AuditLogger, OutboxService, InMemoryIdempotencyStore, RbacGuard],
})
export class AppModule implements NestModule {
  constructor(private readonly store: InMemoryIdempotencyStore) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(IdempotencyMiddleware).forRoutes('*');
  }
}
