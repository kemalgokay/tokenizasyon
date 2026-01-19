import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LifecycleService } from './lifecycle.service';
import { Roles, RbacGuard } from '@tokenizasyon/common';

@ApiTags('token-lifecycle')
@Controller()
@UseGuards(RbacGuard)
export class LifecycleController {
  constructor(private readonly lifecycle: LifecycleService) {}

  @Post('assets')
  @Roles('ISSUER', 'ADMIN')
  createAsset(@Body() body: any, @Req() req: any) {
    return this.lifecycle.createAsset(body, req.actor);
  }

  @Get('assets')
  @Roles('AUDITOR', 'ADMIN', 'ISSUER', 'OPS')
  listAssets() {
    return this.lifecycle.listAssets();
  }

  @Post('assets/:id/submit-review')
  @Roles('ISSUER', 'ADMIN')
  submitReview(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.submitAssetReview(id, req.actor);
  }

  @Post('assets/:id/approve')
  @Roles('OPS', 'ADMIN')
  approveAsset(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.approveAsset(id, req.actor);
  }

  @Post('assets/:id/reject')
  @Roles('OPS', 'ADMIN')
  rejectAsset(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.rejectAsset(id, req.actor);
  }

  @Get('assets/:id')
  @Roles('AUDITOR', 'ADMIN', 'ISSUER', 'OPS')
  getAsset(@Param('id') id: string) {
    return this.lifecycle.getAsset(id);
  }

  @Post('tokens')
  @Roles('ISSUER', 'ADMIN')
  createToken(@Body() body: any, @Req() req: any) {
    return this.lifecycle.createToken(body, req.actor);
  }

  @Get('tokens')
  @Roles('AUDITOR', 'ADMIN', 'ISSUER', 'OPS')
  listTokens() {
    return this.lifecycle.listTokens();
  }

  @Post('tokens/:id/activate')
  @Roles('OPS', 'ADMIN')
  activateToken(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.activateToken(id, req.actor);
  }

  @Post('tokens/:id/pause')
  @Roles('OPS', 'ADMIN')
  pauseToken(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.pauseToken(id, req.actor);
  }

  @Post('tokens/:id/resume')
  @Roles('OPS', 'ADMIN')
  resumeToken(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.resumeToken(id, req.actor);
  }

  @Get('tokens/:id')
  @Roles('AUDITOR', 'ADMIN', 'ISSUER', 'OPS')
  getToken(@Param('id') id: string) {
    return this.lifecycle.getToken(id);
  }

  @Post('tokens/:id/mint')
  @Roles('OPS', 'ADMIN')
  mint(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.lifecycle.mint(id, body.toHolderId, body.amount, req.actor);
  }

  @Post('tokens/:id/burn')
  @Roles('OPS', 'ADMIN')
  burn(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.lifecycle.burn(id, body.fromHolderId, body.amount, req.actor);
  }

  @Post('tokens/:id/transfer')
  @Roles('TRADER', 'OPS', 'ADMIN')
  transfer(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.lifecycle.transfer(id, body.fromHolderId, body.toHolderId, body.amount, req.actor);
  }

  @Get('tokens/:id/positions')
  @Roles('AUDITOR', 'ADMIN', 'ISSUER', 'OPS', 'TRADER')
  listPositions(@Param('id') id: string) {
    return this.lifecycle.listPositions(id);
  }

  @Post('tokens/:id/whitelist')
  @Roles('OPS', 'ADMIN')
  addWhitelist(@Param('id') id: string, @Body() body: any) {
    return this.lifecycle.addWhitelist(id, body.holderId, 'ACTIVE');
  }

  @Delete('tokens/:id/whitelist/:holderId')
  @Roles('OPS', 'ADMIN')
  removeWhitelist(@Param('id') id: string, @Param('holderId') holderId: string) {
    return this.lifecycle.removeWhitelist(id, holderId);
  }

  @Get('tokens/:id/whitelist')
  @Roles('AUDITOR', 'ADMIN', 'ISSUER', 'OPS')
  listWhitelist(@Param('id') id: string) {
    return this.lifecycle.listWhitelist(id);
  }

  @Post('tokens/:id/corporate-actions')
  @Roles('OPS', 'ADMIN')
  scheduleCorporate(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.lifecycle.scheduleCorporateAction(id, body, req.actor);
  }

  @Get('tokens/:id/corporate-actions')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  listCorporate(@Param('id') id: string) {
    return this.lifecycle.listCorporateActions(id);
  }

  @Post('corporate-actions/:id/execute')
  @Roles('OPS', 'ADMIN')
  executeCorporate(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.executeCorporateAction(id, req.actor);
  }

  @Post('tokens/:id/corporate-actions/:actionId/execute')
  @Roles('OPS', 'ADMIN')
  executeCorporateForToken(@Param('actionId') actionId: string, @Req() req: any) {
    return this.lifecycle.executeCorporateAction(actionId, req.actor);
  }

  @Get('corporate-actions/:id')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  getCorporate(@Param('id') id: string) {
    return this.lifecycle.getCorporateAction(id);
  }

  @Post('tokens/:id/redemptions')
  @Roles('TRADER', 'OPS', 'ADMIN')
  requestRedemption(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.lifecycle.requestRedemption(id, body.holderId, body.amount, req.actor);
  }

  @Get('tokens/:id/redemptions')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  listRedemptions(@Param('id') id: string) {
    return this.lifecycle.listRedemptions(id);
  }

  @Post('redemptions/:id/approve')
  @Roles('OPS', 'ADMIN')
  approveRedemption(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.approveRedemption(id, req.actor);
  }

  @Post('tokens/:id/redemptions/:redemptionId/approve')
  @Roles('OPS', 'ADMIN')
  approveRedemptionForToken(@Param('redemptionId') redemptionId: string, @Req() req: any) {
    return this.lifecycle.approveRedemption(redemptionId, req.actor);
  }

  @Post('redemptions/:id/settle')
  @Roles('OPS', 'ADMIN')
  settleRedemption(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.settleRedemption(id, req.actor);
  }

  @Post('tokens/:id/redemptions/:redemptionId/settle')
  @Roles('OPS', 'ADMIN')
  settleRedemptionForToken(@Param('redemptionId') redemptionId: string, @Req() req: any) {
    return this.lifecycle.settleRedemption(redemptionId, req.actor);
  }

  @Post('redemptions/:id/reject')
  @Roles('OPS', 'ADMIN')
  rejectRedemption(@Param('id') id: string, @Req() req: any) {
    return this.lifecycle.rejectRedemption(id, req.actor);
  }

  @Post('tokens/:id/redemptions/:redemptionId/reject')
  @Roles('OPS', 'ADMIN')
  rejectRedemptionForToken(@Param('redemptionId') redemptionId: string, @Req() req: any) {
    return this.lifecycle.rejectRedemption(redemptionId, req.actor);
  }

  @Get('audit-log')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  listAuditLog() {
    return this.lifecycle.listAuditLog();
  }

  @Get('outbox-events')
  @Roles('AUDITOR', 'ADMIN', 'OPS')
  listOutboxEvents() {
    return this.lifecycle.listOutboxEvents();
  }
}
