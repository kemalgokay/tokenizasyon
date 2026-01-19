import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketMakerService } from './market-maker.service';
import { Roles, RbacGuard } from '@tokenizasyon/common';

@ApiTags('market-maker')
@Controller('market-maker')
@UseGuards(RbacGuard)
export class MarketMakerController {
  constructor(private readonly maker: MarketMakerService) {}

  @Post('markets/:marketId/config')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN')
  upsertConfig(@Param('marketId') marketId: string, @Body() body: any, @Req() req: any) {
    return this.maker.upsertConfig(marketId, { ...body, marketMakerId: req.actor.id }, req.actor);
  }

  @Get('markets/:marketId/config')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN', 'AUDITOR')
  getConfig(@Param('marketId') marketId: string) {
    return this.maker.getConfig(marketId);
  }

  @Post('markets/:marketId/enable')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN')
  enable(@Param('marketId') marketId: string) {
    return this.maker.enable(marketId);
  }

  @Post('markets/:marketId/disable')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN')
  disable(@Param('marketId') marketId: string) {
    return this.maker.disable(marketId);
  }

  @Post('markets/:marketId/run')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN')
  run(@Param('marketId') marketId: string, @Body() body: any, @Req() req: any) {
    return this.maker.run(marketId, body.reason ?? 'TIMER', req.actor);
  }

  @Post('markets/:marketId/price')
  @Roles('OPS', 'ADMIN', 'MARKET_MAKER')
  setPrice(@Param('marketId') marketId: string, @Body() body: any) {
    return this.maker.setPrice(marketId, body.midPrice);
  }

  @Get('markets/:marketId/inventory')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN', 'AUDITOR')
  inventory(@Param('marketId') marketId: string) {
    return this.maker.getInventoryForMarket(marketId);
  }

  @Get('markets/:marketId/runs')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN', 'AUDITOR')
  runs(@Param('marketId') marketId: string) {
    return this.maker.listRuns(marketId);
  }

  @Get('markets/:marketId/orders')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN', 'AUDITOR')
  orders(@Param('marketId') marketId: string) {
    return this.maker.listOrders(marketId);
  }

  @Post('markets/:marketId/risk-limit')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN')
  riskLimit(@Param('marketId') marketId: string, @Body() body: any, @Req() req: any) {
    return this.maker.setRiskLimit(marketId, { ...body, marketId, marketMakerId: req.actor.id });
  }

  @Post('markets/:marketId/kill-switch')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN')
  killSwitch(@Param('marketId') marketId: string, @Body() body: any) {
    return this.maker.toggleKillSwitch(marketId, body.enabled);
  }

  @Get('markets/:marketId/status')
  @Roles('MARKET_MAKER', 'OPS', 'ADMIN', 'AUDITOR')
  status(@Param('marketId') marketId: string) {
    return this.maker.status(marketId);
  }

  @Get('audit-log')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  auditLog() {
    return this.maker.listAuditLog();
  }

  @Get('outbox-events')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  outboxEvents() {
    return this.maker.listOutboxEvents();
  }
}
