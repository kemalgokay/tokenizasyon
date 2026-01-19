import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { Roles, RbacGuard } from '@tokenizasyon/common';

@ApiTags('trading-venue')
@Controller()
@UseGuards(RbacGuard)
export class VenueController {
  constructor(private readonly matching: MatchingService) {}

  @Post('markets')
  @Roles('OPS', 'ADMIN')
  createMarket(@Body() body: any, @Req() req: any) {
    return this.matching.createMarket(body.tokenId, req.actor);
  }

  @Get('markets')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN', 'AUDITOR', 'OPS')
  listMarkets() {
    return this.matching.listMarkets();
  }

  @Post('markets/:id/pause')
  @Roles('OPS', 'ADMIN')
  pauseMarket(@Param('id') id: string, @Req() req: any) {
    return this.matching.pauseMarket(id, req.actor);
  }

  @Post('markets/:id/resume')
  @Roles('OPS', 'ADMIN')
  resumeMarket(@Param('id') id: string, @Req() req: any) {
    return this.matching.resumeMarket(id, req.actor);
  }

  @Get('markets/:id/orderbook')
  @Roles('TRADER', 'ADMIN', 'MARKET_MAKER')
  getOrderBook(@Param('id') id: string, @Query('levels') levels?: string) {
    return this.matching.getOrderBook(id, levels ? Number(levels) : 5);
  }

  @Post('markets/:id/orders')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN')
  placeOrder(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.matching.placeOrder({ ...body, marketId: id }, req.actor);
  }

  @Get('markets/:id/orders')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN', 'AUDITOR')
  listOrders(@Param('id') id: string) {
    return this.matching.listOrders(id);
  }

  @Post('markets/:id/orders/:orderId/cancel')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN')
  cancelMarketOrder(@Param('orderId') orderId: string) {
    return this.matching.cancelOrder(orderId);
  }

  @Post('orders/:id/cancel')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN')
  cancelOrder(@Param('id') id: string) {
    return this.matching.cancelOrder(id);
  }

  @Get('orders/:id')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN', 'AUDITOR')
  getOrder(@Param('id') id: string) {
    return this.matching.getOrder(id);
  }

  @Get('trades/:id')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN', 'AUDITOR')
  getTrade(@Param('id') id: string) {
    return this.matching.getTrade(id);
  }

  @Get('markets/:id/trades')
  @Roles('TRADER', 'MARKET_MAKER', 'ADMIN', 'AUDITOR')
  listTrades(@Param('id') id: string) {
    return this.matching.listTrades(id);
  }

  @Get('audit-log')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  listAuditLog() {
    return this.matching.listAuditLog();
  }

  @Get('outbox-events')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  listOutboxEvents() {
    return this.matching.listOutboxEvents();
  }
}
