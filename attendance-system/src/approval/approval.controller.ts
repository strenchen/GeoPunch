import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, Req, ParseIntPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApprovalService } from './approval.service';

@Controller('approval')
@UseGuards(AuthGuard('jwt'))
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  // ===== 请假 =====
  @Post('leave')
  createLeave(@Req() req: any, @Body() data: any) {
    return this.approvalService.createLeaveRequest(req.user.id, data);
  }

  @Get('leave')
  getLeaves(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.approvalService.getLeaveRequests(req.user.id, { 
      status, 
      page: page ? Number(page) : 1, 
      pageSize: pageSize ? Number(pageSize) : 20 
    });
  }

  @Put('leave/:id/approve')
  approveLeave(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    return this.approvalService.approveLeave(id, req.user.id, body.decision, body.comment);
  }

  @Put('leave/:id/reject')
  rejectLeave(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { comment: string },
  ) {
    return this.approvalService.approveLeave(id, req.user.id, 'REJECTED', body.comment);
  }

  @Put('leave/:id/cancel')
  cancelLeave(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { reason: string },
  ) {
    return this.approvalService.cancelLeave(id, req.user.id, body.reason);
  }

  // ===== 补卡 =====
  @Post('makeup')
  createMakeup(@Req() req: any, @Body() data: any) {
    return this.approvalService.createMakeupRequest(req.user.id, data);
  }

  @Get('makeup')
  getMakeups(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.approvalService.getMakeupRequests(req.user.id, { 
      status, 
      page: page ? Number(page) : 1, 
      pageSize: pageSize ? Number(pageSize) : 20 
    });
  }

  @Put('makeup/:id/approve')
  approveMakeup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    return this.approvalService.approveMakeup(id, req.user.id, body.decision, body.comment);
  }

  @Put('makeup/:id/reject')
  rejectMakeup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { comment: string },
  ) {
    return this.approvalService.approveMakeup(id, req.user.id, 'REJECTED', body.comment);
  }

  // 待我审批（所有类型）
  @Get('pending')
  getPending(@Req() req: any) {
    return this.approvalService.getPendingApprovals(req.user.id);
  }
}