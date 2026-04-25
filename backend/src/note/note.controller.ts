import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NoteService } from './note.service';
import { CreateNoteDto, ToggleCompleteDto, UpdateNoteDto } from './note.dto';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get()
  findAll(@Request() req) {
    return this.noteService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.noteService.findOne(id, req.user.userId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateNoteDto) {
    return this.noteService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.noteService.update(id, req.user.userId, dto);
  }

  @Put(':id/complete')
  toggleComplete(@Request() req, @Param('id') id: string, @Body() dto: ToggleCompleteDto) {
    return this.noteService.toggleComplete(id, req.user.userId, dto.completed);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req, @Param('id') id: string) {
    return this.noteService.remove(id, req.user.userId);
  }
}
