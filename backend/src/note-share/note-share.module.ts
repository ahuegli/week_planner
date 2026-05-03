import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteShare } from './note-share.entity';
import { NoteShareController } from './note-share.controller';
import { NoteShareService } from './note-share.service';
import { UserModule } from '../user/user.module';
import { NoteModule } from '../note/note.module';

@Module({
  imports: [TypeOrmModule.forFeature([NoteShare]), UserModule, NoteModule],
  controllers: [NoteShareController],
  providers: [NoteShareService],
  exports: [NoteShareService],
})
export class NoteShareModule {}
