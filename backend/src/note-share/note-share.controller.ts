import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NoteShareService } from './note-share.service';
import { CreateNoteShareDto, UpdateNoteShareDto } from './note-share.dto';

@Controller('note-shares')
@UseGuards(JwtAuthGuard)
export class NoteShareController {
  constructor(private readonly noteShareService: NoteShareService) {}

  @Get('outgoing')
  findOutgoing(@Request() req) {
    return this.noteShareService.findOutgoing(req.user.userId);
  }

  @Get('incoming')
  findIncoming(@Request() req) {
    return this.noteShareService.findIncoming(req.user.userId);
  }

  @Post()
  @HttpCode(201)
  grant(@Request() req, @Body() dto: CreateNoteShareDto) {
    return this.noteShareService.grant(req.user.userId, dto);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateNoteShareDto) {
    return this.noteShareService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@Request() req, @Param('id') id: string) {
    return this.noteShareService.revoke(id, req.user.userId);
  }
}
