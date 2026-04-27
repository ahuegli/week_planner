import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventInvitationService } from './event-invitation.service';
import { CreateEventInvitationDto, RespondToInvitationDto } from './event-invitation.dto';

@Controller('event-invitations')
@UseGuards(JwtAuthGuard)
export class EventInvitationController {
  constructor(private readonly eventInvitationService: EventInvitationService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateEventInvitationDto) {
    return this.eventInvitationService.create(req.user.userId, dto);
  }

  @Get('incoming')
  async findIncoming(@Request() req) {
    return this.eventInvitationService.findIncoming(req.user.userId);
  }

  @Get('outgoing')
  async findOutgoing(@Request() req) {
    return this.eventInvitationService.findOutgoing(req.user.userId);
  }

  @Put(':id/respond')
  async respond(@Request() req, @Param('id') id: string, @Body() dto: RespondToInvitationDto) {
    return this.eventInvitationService.respond(id, req.user.userId, dto);
  }

  @Delete(':id')
  async cancel(@Request() req, @Param('id') id: string) {
    return this.eventInvitationService.cancel(id, req.user.userId);
  }
}
