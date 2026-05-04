import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { CoachPromptBuilder } from './coach-prompt.builder';
import { CoachChatRequestDto, CoachChatResponseDto, SuggestedActionDto } from './coach.dto';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachController {
  constructor(
    private readonly aiService: AiService,
    private readonly coachPromptBuilder: CoachPromptBuilder,
  ) {}

  @Throttle({ default: { limit: 5 }, ai_hourly: { ttl: 3_600_000, limit: 20 }, ai_daily: { ttl: 86_400_000, limit: 100 } })
  @Post('chat')
  async chat(
    @Body() dto: CoachChatRequestDto,
    @Req() req: RequestWithUser,
  ): Promise<CoachChatResponseDto> {
    const userId = req.user.userId;

    if (!dto.messages || dto.messages.length === 0) {
      throw new BadRequestException('messages must not be empty');
    }

    // Limit to last 5 messages to control token usage
    const trimmedMessages = dto.messages.slice(-5);

    const systemPrompt = await this.coachPromptBuilder.buildSystemPrompt(
      userId,
      dto.context,
    );

    const rawReply = await this.aiService.chat(systemPrompt, trimmedMessages);

    // Extract optional suggestedAction JSON block from reply
    const jsonMatch = rawReply.match(/```json\s*([\s\S]*?)```/);
    let suggestedAction: SuggestedActionDto | undefined;
    let reply = rawReply;

    if (jsonMatch) {
      try {
        suggestedAction = JSON.parse(jsonMatch[1]) as SuggestedActionDto;
        // Strip the JSON block from the user-facing reply
        reply = rawReply.replace(/```json[\s\S]*?```/, '').trim();
      } catch {
        // Malformed JSON — ignore and return full reply
      }
    }

    return { reply, suggestedAction };
  }
}
